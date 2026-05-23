import { useEffect, useRef, useState, Fragment } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
  OverlayView,
} from "@react-google-maps/api";
import { Loader2, Bell, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";

import deviceApi from "../services/deviceApi";

// Configuration
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAP_API;
const WS_URL_DASHCAM = import.meta.env.VITE_WS_URL;
const WS_URL_OBD = import.meta.env.VITE_OBD_API_URL;

const mapContainerStyle = { width: "100%", height: "100vh" };
const defaultCenter = { lat: 51.5074, lng: -0.1278 }; // London

const normalizeDeviceId = (id) => String(id || "").replace(/^device_/, "");

const parseTimeMs = (value) => {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const isOfflineStatus = (status) => String(status || "").toUpperCase() === "OFFLINE";

const mergeVehicleByFreshness = (existing, incoming) => {
  if (!existing) return incoming;

  const existingFreshness = existing.lastUpdatedAt || parseTimeMs(existing.receivedAt || existing.timestamp);
  const incomingFreshness = incoming.lastUpdatedAt || parseTimeMs(incoming.receivedAt || incoming.timestamp);

  if (incomingFreshness && existingFreshness && incomingFreshness < existingFreshness) {
    return existing;
  }

  return {
    ...existing,
    ...incoming,
    vehicle: incoming.vehicle || existing.vehicle,
    name: incoming.name || existing.name,
  };
};

// Custom Car SVG
const VehicleMarker = ({ size = 48, status = "ONLINE" }) => {
  const isOnline = status === "ONLINE";
  const color = isOnline ? "#3b82f6" : "#94a3b8";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))", opacity: isOnline ? 1 : 0.7 }}>
      <path d="M50 5 L15 85 L50 70 L85 85 Z" fill={color} stroke="white" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
};

const getPixelPositionOffset = (width, height) => ({
  x: -(width / 2),
  y: -(height / 2),
});

export default function RealTimeMap({ deviceType = "AI_DASHCAM" }) {
  const currentWsUrl = deviceType === "OBD" ? WS_URL_OBD : WS_URL_DASHCAM;

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const socketRef = useRef(null);
  const [error, setError] = useState(null);

  const fetchInitialPositions = async () => {
    try {
      const json = await deviceApi.getLiveGpsData({ device_type: deviceType });

      const apiVehicles = (json.data || [])
        .map((v) => {
          const deviceId = normalizeDeviceId(v.device_id || v.deviceId);
          const lat = Number(v.latitude || v.lat || 0);
          const lng = Number(v.longitude || v.lng || v.lon || 0);

          if (!deviceId || !isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) return null;

          const receivedAt = v.received_at || v.receivedAt || v.lastSeen || null;
          const gpsTime = v.gps_time || v.gpsTime || v.time || v.timestamp || null;
          const freshnessTime = receivedAt || gpsTime;
          const TEN_MINUTES = 10 * 60 * 1000;
          const freshnessMs = parseTimeMs(freshnessTime);
          const isStale = !freshnessMs || Date.now() - freshnessMs > TEN_MINUTES;

          return {
            id: deviceId,
            name: v.deviceName || v.name || deviceId,
            lat,
            lng,
            speed: Number(v.speed || 0),
            heading: Number(v.direction || v.heading || 0),
            timestamp: freshnessTime,
            receivedAt,
            gpsTime,
            vehicle: v.vehicle,
            status: v.status || (isStale ? "Offline" : (Number(v.speed || 0) > 0 ? "Moving" : "Stopped")),
            lastUpdatedAt: freshnessMs || 0,
          };
        })
        .filter(Boolean);

      setVehicles((prev) => {
        const map = new Map();
        for (const vehicle of prev) map.set(normalizeDeviceId(vehicle.id), vehicle);
        for (const vehicle of apiVehicles) {
          const key = normalizeDeviceId(vehicle.id);
          map.set(key, mergeVehicleByFreshness(map.get(key), vehicle));
        }
        return Array.from(map.values());
      });
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setVehicles([]);
    fetchInitialPositions();

    // Initialize Socket.io
    socketRef.current = io(currentWsUrl);

    socketRef.current.on("connect", () => {
      console.log("Connected to Socket.io server");
    });

    socketRef.current.on("gps_update", (update) => {
      console.log("Received GPS update:", update);
      
      const lat = Number(update.latitude);
      const lng = Number(update.longitude || update.lng || update.lon);

      if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) {
        console.warn("Discarding invalid GPS update:", update);
        return;
      }

      setVehicles((prev) => {
        const deviceId = normalizeDeviceId(update.deviceId || update.device_id);
        const index = prev.findIndex((v) => normalizeDeviceId(v.id) === deviceId);
        const existing = index !== -1 ? prev[index] : null;
        const receivedAt = update.receivedAt || update.received_at || new Date().toISOString();
        const gpsTime = update.gpsTime || update.gps_time || update.time || null;

        const updatedVehicle = mergeVehicleByFreshness(existing, {
          id: deviceId,
          name: update.name || existing?.name || deviceId || "Unknown",
          lat,
          lng,
          speed: Number(update.speed || 0),
          heading: Number(update.direction || update.heading || 0),
          status: (Number(update.speed) || 0) > 0 ? "Moving" : "Stopped",
          timestamp: receivedAt || gpsTime,
          receivedAt,
          gpsTime,
          lastUpdatedAt: Date.now(),
        });

        if (index !== -1) {
          const newVehicles = [...prev];
          newVehicles[index] = updatedVehicle;
          return newVehicles;
        }
        return [...prev, updatedVehicle];
      });
    });

    // Periodically check if any vehicle has gone stale (no update in 10 minutes)
    const stalenessInterval = setInterval(() => {
      const TEN_MINUTES = 10 * 60 * 1000;
      setVehicles((prev) =>
        prev.map((v) => {
          const lastUpdate = v.lastUpdatedAt || parseTimeMs(v.receivedAt || v.timestamp);
          const isStale = !lastUpdate || Date.now() - lastUpdate > TEN_MINUTES;
          if (isStale && !isOfflineStatus(v.status)) {
            return { ...v, status: "Offline" };
          }
          return v;
        })
      );
    }, 60000); // Check every 1 minute

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      clearInterval(stalenessInterval);
    };
  }, [deviceType]);

  useEffect(() => {
    if (!selectedVehicle) return;
    const latest = vehicles.find((v) => normalizeDeviceId(v.id) === normalizeDeviceId(selectedVehicle.id));
    if (latest && latest !== selectedVehicle) {
      setSelectedVehicle(latest);
    }
  }, [vehicles, selectedVehicle]);

  // Auto-center map on first load of vehicles
  useEffect(() => {
    console.log(`📊 Total vehicles in state: ${vehicles.length}`, vehicles);
    if (vehicles.length > 0 && mapRef.current && window.google) {
      const bounds = new window.google.maps.LatLngBounds();
      let hasValidCoords = false;

      vehicles.forEach((v) => {
        if (isFinite(v.lat) && isFinite(v.lng)) {
          bounds.extend({ lat: v.lat, lng: v.lng });
          hasValidCoords = true;
        }
      });

      if (hasValidCoords) {
        mapRef.current.fitBounds(bounds);
        // Don't zoom in too much for a single vehicle
        if (vehicles.length === 1) {
          setTimeout(() => {
             if (mapRef.current) mapRef.current.setZoom(15);
          }, 100);
        }
      }
    }
  }, [vehicles.length]); // Run when vehicles count changes

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
      <div
        style={{
          position: "relative",
          height: "100%",
          width: "100%",
          backgroundColor: "#f8fafc", // Light gray background
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.8)",
            }}
          >
            <Loader2 className="animate-spin text-blue-500" size={48} />
          </div>
        )}

        <div
          className="realtime-map-card"
          style={{
            width: "calc(100% - 60px)", // 30px margin on each side
            height: "calc(100% - 60px)",
            backgroundColor: "white",
            borderRadius: "16px",
            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
            overflow: "hidden",
            border: "1px solid #e2e8f0",
          }}
        >
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={defaultCenter}
            zoom={12}
            onLoad={(map) => (mapRef.current = map)}
            options={{
              disableDefaultUI: false,
              styles: [
                {
                  featureType: "poi",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }],
                },
              ],
            }}
          >
            {vehicles.map((vehicle) => (
              <Marker
                key={vehicle.id}
                position={{ lat: vehicle.lat, lng: vehicle.lng }}
                onClick={() => setSelectedVehicle(vehicle)}
                icon={window.google ? {
                  path: "M25,50 L50,5 L75,50 L50,40 Z", 
                  fillColor: 
                    String(vehicle.status).toUpperCase() === "OFFLINE" ? "#94a3b8" : 
                    String(vehicle.status).toUpperCase() === "MOVING" ? "#22c55e" : "#ef4444",
                  fillOpacity: 1,
                  strokeColor: "white",
                  strokeWeight: 2,
                  scale: 1,
                  rotation: (vehicle.heading || 0), 
                  anchor: new window.google.maps.Point(50, 25),
                } : null}
              />
            ))}

            {selectedVehicle && (
              <InfoWindow
                position={{ lat: selectedVehicle.lat, lng: selectedVehicle.lng }}
                onCloseClick={() => setSelectedVehicle(null)}
              >
                <div style={{ padding: "8px", minWidth: "150px" }}>
                  <h3 style={{ fontWeight: "bold", marginBottom: "4px" }}>
                    {selectedVehicle.name}
                  </h3>
                  <div style={{ fontSize: "12px", color: "#555" }}>
                    <p>ID: {selectedVehicle.id}</p>
                    <p>Speed: {Math.round(selectedVehicle.speed * 0.621371)} mph</p>
                    <p>
                      Status:{" "}
                      <span
                        style={{
                          color:
                            String(selectedVehicle.status).toUpperCase() === "MOVING" ? "#22c55e" :
                            String(selectedVehicle.status).toUpperCase() === "OFFLINE" ? "#94a3b8" : "#ef4444",
                          fontWeight: "bold",
                        }}
                      >
                        {selectedVehicle.status}
                      </span>
                    </p>

                    <p>Last Seen: {selectedVehicle.receivedAt || selectedVehicle.timestamp || "N/A"}</p>
                    {selectedVehicle.gpsTime && selectedVehicle.gpsTime !== selectedVehicle.receivedAt && (
                      <p>GPS Time: {selectedVehicle.gpsTime}</p>
                    )}
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>

      {/* Floating AI Notification Link */}
      <Link 
        to="/dashcam" 
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
          fontWeight: '600',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          zIndex: 1000,
          transition: 'transform 0.2s',
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Bell size={20} />
        AI Notifications
      </Link>
        </div>
      </div>
    </LoadScript>
  );
}
