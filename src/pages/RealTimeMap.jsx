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

// Configuration
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAP_API;
const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/live/gps`;
const WS_URL = import.meta.env.VITE_WS_URL;

const mapContainerStyle = { width: "100%", height: "100vh" };
const defaultCenter = { lat: 51.5074, lng: -0.1278 }; // London

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

export default function RealTimeMap() {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const socketRef = useRef(null);

  const fetchInitialPositions = async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("Failed to fetch initial data");
      const json = await response.json();

      const apiVehicles = (json.data || [])
        .map((v) => {
          const deviceId = String(v.device_id);
          const lat = Number(v.latitude || 0);
          const lng = Number(v.longitude || 0);

          if (lat === 0 && lng === 0) return null;

          // Check if data is older than 5 minutes
          const gpsTime = new Date(v.gps_time);
          const now = new Date();
          const isStale = (now - gpsTime) > 5 * 60 * 1000; // 5 minutes in ms

          return {
            id: deviceId,
            name: v.deviceName || deviceId,
            lat: lat,
            lng: lng,
            speed: Number(v.speed || 0),
            heading: Number(v.direction || 0),
            timestamp: v.gps_time,
            // If data is stale, show Offline, otherwise check speed
            status: isStale ? "Offline" : (Number(v.speed || 0) > 0 ? "Moving" : "Stopped"),
          };
        })
        .filter(Boolean);


      setVehicles(apiVehicles);
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialPositions();

    // Initialize Socket.io
    socketRef.current = io(WS_URL);

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
        const deviceId = String(update.deviceId);
        const index = prev.findIndex((v) => String(v.id) === deviceId);

        const updatedVehicle = {
          id: deviceId,
          name: update.name || deviceId || "Unknown",
          lat,
          lng,
          speed: Number(update.speed || 0),
          heading: Number(update.heading || 0),
          status: (Number(update.speed) || 0) > 0 ? "Moving" : "Stopped",
          timestamp: update.gpsTime,
        };

        if (index !== -1) {
          const newVehicles = [...prev];
          newVehicles[index] = updatedVehicle;
          return newVehicles;
        } else {
          return [...prev, updatedVehicle];
        }
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Auto-center map on first load of vehicles
  useEffect(() => {
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
          height: "100vh",
          width: "100vw",
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
              <Fragment key={vehicle.id}>
                <OverlayView
                  position={{ lat: vehicle.lat, lng: vehicle.lng }}
                  mapPaneName="overlayMouseTarget"
                  getPixelPositionOffset={() => getPixelPositionOffset(44, 44)}
                >
                    <div
                      style={{
                        transform: `rotate(${vehicle.heading}deg)`,
                        width: "44px",
                        height: "44px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.5s ease-out",
                        position: "relative"
                      }}
                      onClick={() => setSelectedVehicle(vehicle)}
                    >
                      <VehicleMarker size={44} status={vehicle.status === "Offline" ? "OFFLINE" : "ONLINE"} />
                      {vehicle.status === "Offline" && (
                        <div style={{
                          position: "absolute",
                          top: -5,
                          right: -10,
                          backgroundColor: "#f1f5f9",
                          border: "1px solid #e2e8f0",
                          borderRadius: "4px",
                          padding: "1px 4px",
                          fontSize: "9px",
                          fontWeight: "800",
                          color: "#64748b",
                          whiteSpace: "nowrap",
                          zIndex: 10
                        }}>OFFLINE</div>
                      )}
                    </div>
                </OverlayView>
              </Fragment>
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
                            selectedVehicle.status === "Moving" ? "#22c55e" :
                              selectedVehicle.status === "Offline" ? "#94a3b8" : "#ef4444",
                          fontWeight: "bold",
                        }}
                      >
                        {selectedVehicle.status}
                      </span>
                    </p>

                    <p>Time: {selectedVehicle.timestamp}</p>
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
