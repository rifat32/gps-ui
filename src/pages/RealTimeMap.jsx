import { useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { Loader2 } from "lucide-react";

// Configuration
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAP_API;
const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/packets/gps/all`;
const POLL_INTERVAL = 10000; // 10 seconds

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

export default function RealTimeMap() {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  const fetchVehicles = async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("Failed to fetch data");
      const json = await response.json();

      // Parse data: The API returns nested structure. We need the LATEST log for each device.
      // Structure: [ { deviceId, logs: [...] }, ... ] or { data: [...] }
      const deviceGroups = Array.isArray(json) ? json : json.data || [];

      const latestPositions = deviceGroups
        .map((device) => {
          const logs = device.logs || [];
          if (logs.length === 0) return null;

          // Assuming logs are sorted or we take the last one?
          // Usually logs are historical, so last one is latest?
          // Or we should sort by timestamp. Let's assume standard order for now or sort.
          // Actually Playback.jsx reverse()s them, so they might be newest first or last?
          // Let's sort to be safe.
          const sortedLogs = [...logs].sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
          );
          const latest = sortedLogs[0];

          const parsed = latest.detailed?.body?.parsed || {};

          return {
            id: device.deviceId || device.id,
            name: device.deviceName || device.deviceId || "Unknown",
            lat: Number(latest.latitude ?? parsed.latitude ?? 0),
            lng: Number(latest.longitude ?? parsed.longitude ?? 0),
            speed: Number(latest.speed ?? parsed.speed ?? 0),
            heading: Number(latest.azimuth ?? parsed.azimuth ?? 0), // Assuming heading/azimuth field
            timestamp: latest.timestamp,
            status:
              Number(latest.speed ?? parsed.speed ?? 0) > 0
                ? "Moving"
                : "Stopped",
          };
        })
        .filter((v) => v !== null && v.lat !== 0 && v.lng !== 0); // Filter out invalid positions

      setVehicles(latestPositions);
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    const interval = setInterval(fetchVehicles, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
      <div style={{ position: "relative", height: "100vh", width: "100vw" }}>
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

        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={defaultCenter}
          zoom={12}
          onLoad={(map) => (mapRef.current = map)}
        >
          {vehicles.map((vehicle) => (
            <Marker
              key={vehicle.id}
              position={{ lat: vehicle.lat, lng: vehicle.lng }}
              icon={{
                ...carSvg,
                rotation: vehicle.heading,
                fillColor: vehicle.status === "Moving" ? "#22c55e" : "#ef4444",
              }}
              onClick={() => setSelectedVehicle(vehicle)}
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
                  <p>Speed: {selectedVehicle.speed} km/h</p>
                  <p>
                    Status:{" "}
                    <span
                      style={{
                        color:
                          selectedVehicle.status === "Moving" ? "green" : "red",
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
    </LoadScript>
  );
}
