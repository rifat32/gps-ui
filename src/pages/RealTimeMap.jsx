import { useEffect, useRef, useState, Fragment } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
  OverlayView,
} from "@react-google-maps/api";
import { Loader2 } from "lucide-react";
import { io } from "socket.io-client";

// Configuration
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAP_API;
const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/live/gps`;
const WS_URL = import.meta.env.VITE_WS_URL;

const mapContainerStyle = { width: "100%", height: "100vh" };
const defaultCenter = { lat: 51.5074, lng: -0.1278 }; // London

// Custom Car SVG
const carSvg = {
  path: "M21 11.5V16a1 1 0 0 1-1 1h-1.5m2.5-5.5h-7m7 0-1.736-3.906A1 1 0 0 0 18.35 7H14M5.5 17H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1M5.5 17a2 2 0 1 0 4 0m-4 0a2 2 0 1 1 4 0m0 0H14m0 0h.5m-.5 0v-5.5m.5 5.5a2 2 0 1 0 4 0m-4 0a2 2 0 1 1 4 0M14 11.5V7",
  fillColor: "#3b82f6",
  fillOpacity: 1,
  strokeWeight: 1,
  strokeColor: "#ffffff",
  scale: 1.5,
  anchor: { x: 12, y: 12 },
  rotation: 0,
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

          return {
            id: deviceId,
            name: v.deviceName || deviceId,
            lat: lat,
            lng: lng,
            speed: Number(v.speed || 0),
            heading: Number(v.direction || 0),
            timestamp: v.gps_time,
            status: Number(v.speed || 0) > 0 ? "Moving" : "Stopped",
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
      setVehicles((prev) => {
        const deviceId = String(update.deviceId);
        const index = prev.findIndex((v) => String(v.id) === deviceId);

        const updatedVehicle = {
          id: deviceId,
          name: update.name || deviceId || "Unknown",
          lat: Number(update.latitude),
          lng: Number(update.longitude),
          speed: Number(update.speed),
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
    if (vehicles.length > 0 && mapRef.current) {
      const bounds = new window.google.maps.LatLngBounds();
      vehicles.forEach((v) => bounds.extend({ lat: v.lat, lng: v.lng }));
      mapRef.current.fitBounds(bounds);

      // Don't zoom in too much for a single vehicle
      if (vehicles.length === 1) {
        setTimeout(() => mapRef.current.setZoom(15), 100);
      }
    }
  }, [vehicles.length > 0]); // Run once when vehicles are first found

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
                      filter: vehicle.status === "Stopped" ? "grayscale(100%) opacity(0.8)" : "none",
                    }}
                    onClick={() => setSelectedVehicle(vehicle)}
                  >
                    <img
                      src="/car-icon.png"
                      alt="Car"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))",
                      }}
                    />
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
                    <p>Speed: {selectedVehicle.speed} km/h</p>
                    <p>
                      Status:{" "}
                      <span
                        style={{
                          color: selectedVehicle.status === "Moving" ? "#22c55e" : "#ef4444",
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
        </div>
      </div>
    </LoadScript>
  );
}
