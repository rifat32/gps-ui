import { useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { Loader2, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";

import deviceApi from "../services/deviceApi";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAP_API;
const WS_URL_DASHCAM = import.meta.env.VITE_WS_URL;
const WS_URL_OBD = import.meta.env.VITE_OBD_API_URL;

const mapContainerStyle = { width: "100%", height: "100vh" };
const defaultCenter = { lat: 51.5074, lng: -0.1278 };

const normalizeId = (value) => String(value || "").replace(/^device[_:-]/i, "");

const getMillis = (value) => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const MOVING_SPEED_THRESHOLD = Number(import.meta.env.VITE_LIVE_DEVICE_MOVING_SPEED_THRESHOLD || 1);

const formatStatus = (status, speed) => {
  const normalized = String(status || "").toUpperCase();
  const hasSpeed = speed !== undefined && speed !== null && speed !== "";
  const numericSpeed = Number(speed);

  if (normalized === "OFFLINE") return "Offline";
  if (normalized === "MOVING") return "Moving";
  if (normalized === "STOPPED") return "Stopped";

  if (normalized === "ONLINE") {
    if (hasSpeed && Number.isFinite(numericSpeed)) {
      return numericSpeed > MOVING_SPEED_THRESHOLD ? "Moving" : "Stopped";
    }
    return "Online";
  }

  if (hasSpeed && Number.isFinite(numericSpeed)) {
    return numericSpeed > MOVING_SPEED_THRESHOLD ? "Moving" : "Stopped";
  }

  return "Online";
};

const mapApiVehicle = (v) => {
  const id = normalizeId(v.device_id || v.deviceId || v.id);
  const lat = Number(v.latitude ?? v.lat ?? 0);
  const lng = Number(v.longitude ?? v.lng ?? v.lon ?? 0);

  if (!id || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return null;
  }

  const speed = Number(v.speed || 0);
  const lastSeen = v.last_seen || v.lastSeen || v.lastSeenAt || v.received_at || v.receivedAt || v.timestamp || null;
  const gpsTime = v.gps_time || v.gpsTime || v.time || v.timestamp || null;

  return {
    id,
    name: v.deviceName || v.name || id,
    lat,
    lng,
    speed,
    heading: Number(v.direction ?? v.heading ?? 0),
    status: formatStatus(v.liveStatus || v.status, speed),
    timestamp: gpsTime,
    gpsTime,
    lastSeen,
    lastUpdatedAt: getMillis(lastSeen) || Date.now(),
    deviceType: v.device_type || v.type,
  };
};

const mapSocketVehicle = (update) => {
  const id = normalizeId(update.deviceId || update.device_id || update.id);
  const lat = Number(update.latitude ?? update.lat ?? 0);
  const lng = Number(update.longitude ?? update.lng ?? update.lon ?? 0);

  if (!id || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return null;
  }

  const speed = Number(update.speed || 0);
  const lastSeen = update.receivedAt || update.received_at || update.lastSeen || update.lastSeenAt || new Date().toISOString();
  const gpsTime = update.gpsTime || update.gps_time || update.time || null;

  return {
    id,
    name: update.name || update.deviceName || id,
    lat,
    lng,
    speed,
    heading: Number(update.direction ?? update.heading ?? 0),
    status: formatStatus(update.liveStatus || update.status, speed),
    timestamp: gpsTime,
    gpsTime,
    lastSeen,
    lastUpdatedAt: Date.now(),
    deviceType: update.deviceType || update.device_type || "OBD",
  };
};

export default function RealTimeMap({ deviceType = "AI_DASHCAM" }) {
  const currentWsUrl = deviceType === "OBD" ? WS_URL_OBD : WS_URL_DASHCAM;

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const socketRef = useRef(null);

  const mergeVehicle = (incoming) => {
    if (!incoming) return;

    setVehicles((prev) => {
      const index = prev.findIndex((v) => normalizeId(v.id) === incoming.id);
      if (index === -1) return [...prev, incoming];

      const existing = prev[index];
      const existingTime = existing.lastUpdatedAt || getMillis(existing.lastSeen) || getMillis(existing.gpsTime);
      const incomingTime = incoming.lastUpdatedAt || getMillis(incoming.lastSeen) || getMillis(incoming.gpsTime);

      // Do not let an older API/socket packet overwrite a newer live packet.
      if (existingTime && incomingTime && incomingTime < existingTime) return prev;

      const next = [...prev];
      next[index] = { ...existing, ...incoming, name: incoming.name || existing.name };
      return next;
    });

    setSelectedVehicle((current) => {
      if (!current || normalizeId(current.id) !== incoming.id) return current;
      return { ...current, ...incoming, name: incoming.name || current.name };
    });
  };

  const fetchInitialPositions = async () => {
    try {
      setError(null);
      const json = await deviceApi.getLiveGpsData({ device_type: deviceType });
      const apiVehicles = (json.data || []).map(mapApiVehicle).filter(Boolean);
      setVehicles(apiVehicles);
    } catch (err) {
      console.error("Error fetching vehicles:", err);
      setError("Failed to load live GPS data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setVehicles([]);
    setSelectedVehicle(null);
    fetchInitialPositions();

    socketRef.current = io(currentWsUrl, { transports: ["websocket", "polling"] });

    socketRef.current.on("connect", () => {
      console.log("Connected to Socket.io server");
    });

    socketRef.current.on("gps_update", (update) => {
      console.log("Received GPS update:", update);

      const incomingType = String(update.deviceType || update.device_type || "").toUpperCase();
      if (incomingType && incomingType !== String(deviceType).toUpperCase()) return;

      const vehicle = mapSocketVehicle(update);
      if (!vehicle) {
        console.warn("Discarding invalid GPS update:", update);
        return;
      }

      mergeVehicle(vehicle);
    });

    const stalenessInterval = setInterval(() => {
      const TEN_MINUTES = 10 * 60 * 1000;
      setVehicles((prev) =>
        prev.map((v) => {
          const lastUpdate = v.lastUpdatedAt || getMillis(v.lastSeen) || getMillis(v.gpsTime);
          const isStale = !lastUpdate || Date.now() - lastUpdate > TEN_MINUTES;
          if (isStale && String(v.status).toUpperCase() !== "OFFLINE") {
            return { ...v, status: "Offline" };
          }
          return v;
        })
      );
    }, 60000);

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      clearInterval(stalenessInterval);
    };
  }, [deviceType, currentWsUrl]);

  useEffect(() => {
    if (vehicles.length > 0 && mapRef.current && window.google) {
      const bounds = new window.google.maps.LatLngBounds();
      let hasValidCoords = false;

      vehicles.forEach((v) => {
        if (Number.isFinite(v.lat) && Number.isFinite(v.lng)) {
          bounds.extend({ lat: v.lat, lng: v.lng });
          hasValidCoords = true;
        }
      });

      if (hasValidCoords) {
        mapRef.current.fitBounds(bounds);
        if (vehicles.length === 1) {
          setTimeout(() => {
            if (mapRef.current) mapRef.current.setZoom(15);
          }, 100);
        }
      }
    }
  }, [vehicles.length]);

  const markerColor = (status) => {
    const normalized = String(status).toUpperCase();
    if (normalized === "OFFLINE") return "#94a3b8";
    if (normalized === "MOVING") return "#22c55e";
    if (normalized === "STOPPED") return "#ef4444";
    return "#3b82f6";
  };

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
      <div
        style={{
          position: "relative",
          height: "100%",
          width: "100%",
          backgroundColor: "#f8fafc",
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

        {error && (
          <div style={{ position: "absolute", top: 16, left: 16, zIndex: 60, color: "#dc2626", background: "white", padding: 8, borderRadius: 8 }}>
            {error}
          </div>
        )}

        <div
          className="realtime-map-card"
          style={{
            width: "calc(100% - 60px)",
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
                  fillColor: markerColor(vehicle.status),
                  fillOpacity: 1,
                  strokeColor: "white",
                  strokeWeight: 2,
                  scale: 1,
                  rotation: vehicle.heading || 0,
                  anchor: new window.google.maps.Point(50, 25),
                } : null}
              />
            ))}

            {selectedVehicle && (
              <InfoWindow
                position={{ lat: selectedVehicle.lat, lng: selectedVehicle.lng }}
                onCloseClick={() => setSelectedVehicle(null)}
              >
                <div style={{ padding: "8px", minWidth: "190px" }}>
                  <h3 style={{ fontWeight: "bold", marginBottom: "4px" }}>
                    {selectedVehicle.name}
                  </h3>
                  <div style={{ fontSize: "12px", color: "#555" }}>
                    <p>ID: {selectedVehicle.id}</p>
                    <p>Speed: {Math.round(selectedVehicle.speed * 0.621371)} mph</p>
                    <p>
                      Status:{" "}
                      <span style={{ color: markerColor(selectedVehicle.status), fontWeight: "bold" }}>
                        {selectedVehicle.status}
                      </span>
                    </p>
                    <p>Last Seen: {selectedVehicle.lastSeen || "N/A"}</p>
                    {selectedVehicle.gpsTime && <p>GPS Time: {selectedVehicle.gpsTime}</p>}
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>

          <Link
            to="/dashcam"
            style={{
              position: "fixed",
              bottom: "24px",
              right: "24px",
              backgroundColor: "#3b82f6",
              color: "white",
              padding: "12px 20px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
              fontWeight: "600",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              zIndex: 1000,
              transition: "transform 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <Bell size={20} />
            AI Notifications
          </Link>
        </div>
      </div>
    </LoadScript>
  );
}
