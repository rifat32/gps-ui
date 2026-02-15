import { useEffect, useRef, useState, Fragment } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
  Polyline,
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

      const apiVehiclesMap = (json.data || []).reduce((acc, v) => {
        const deviceId = String(v.device_id); // Force String ID
        const lat = Number(v.latitude || 0);
        const lng = Number(v.longitude || 0);

        if (lat === 0 && lng === 0) return acc;

        if (!acc[deviceId]) {
          acc[deviceId] = {
            id: deviceId,
            name: v.deviceName || deviceId,
            lat: lat,
            lng: lng,
            speed: Number(v.speed || 0),
            heading: Number(v.direction || 0),
            timestamp: v.gps_time,
            status: Number(v.speed || 0) > 0 ? "Moving" : "Stopped",
            path: [],
          };
        }
        // Push to path (SQL returns DESC, we want chronological order for Polyline)
        acc[deviceId].path.unshift({ lat, lng });
        return acc;
      }, {});

      setVehicles((prev) => {
        // Merge API data with any updates received via socket while fetching
        const mergedMap = { ...apiVehiclesMap };

        prev.forEach((socketVehicle) => {
          const id = String(socketVehicle.id);
          const apiVehicle = mergedMap[id];

          if (apiVehicle) {
            // We have both API history and Socket updates.
            // Socket data is likely newer (or same).
            // Append socket path to API path (avoiding duplicates if possible, but simple append is safer than missing data)
            // Filter out path points that might be duplicates based on weak comparison if needed, 
            // but for now, just append socket updates to the end of API history.

            // However, 'socketVehicle.path' might contain the *first* point which is exactly the *last* point of API if overlap?
            // Usually API fetch is a snapshot. Socket is "live".
            // If socket update happened *after* DB write but *before* API read... 
            // actually API read includes it.
            // If socket update happened *after* API read... API misses it.
            // So if socketVehicle.timestamp > apiVehicle.timestamp, it's new.

            const socketTime = new Date(socketVehicle.timestamp).getTime();
            const apiTime = new Date(apiVehicle.timestamp).getTime();

            if (socketTime > apiTime) {
              // Socket is newer. Adopt socket position/status, append path.
              mergedMap[id] = {
                ...apiVehicle,
                ...socketVehicle, // Takes latest lat/lng/speed/status
                path: [...apiVehicle.path, ...socketVehicle.path].slice(-100) // Combine paths
              };
            } else {
              // API is newer or same. Ignore this specific socket "initial" state if it was just a raw update.
              // But wait, 'prev' in this context is whatever 'setVehicles' has.
              // If this is the FIRST fetch, 'prev' is empty or contains only socket updates.
              // If prev was created by socket, its path is [point].
              // So we append that point if it's newer.
              if (socketVehicle.path.length > 0) {
                // Check if last API point is same as first socket point?
                // Let's just assume socket update is authoritative if timestamp is newer.
              }
            }
          } else {
            // Vehicle only exists in socket updates (very new), keep it.
            mergedMap[id] = socketVehicle;
          }
        });

        return Object.values(mergedMap);
      });

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
        const deviceId = String(update.deviceId); // Force String ID
        const index = prev.findIndex((v) => String(v.id) === deviceId);

        const newCoords = {
          lat: Number(update.latitude),
          lng: Number(update.longitude),
        };

        const updatedVehicle = {
          id: deviceId,
          name: update.name || deviceId || "Unknown",
          ...newCoords,
          speed: Number(update.speed),
          heading: Number(update.heading || 0),
          status: (Number(update.speed) || 0) > 0 ? "Moving" : "Stopped",
          timestamp: update.gpsTime,
          path: index !== -1
            ? [...prev[index].path, newCoords].slice(-100)
            : [newCoords],
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
            <Fragment key={vehicle.id}>
              <Polyline
                path={vehicle.path}
                options={{
                  strokeColor: vehicle.status === "Moving" ? "#22c55e" : "#ef4444",
                  strokeOpacity: 0.8,
                  strokeWeight: 4,
                  geodesic: true,
                }}
              />
              <Marker
                position={{ lat: vehicle.lat, lng: vehicle.lng }}
                icon={{
                  ...carSvg,
                  rotation: vehicle.heading,
                  fillColor: vehicle.status === "Moving" ? "#22c55e" : "#ef4444",
                }}
                onClick={() => setSelectedVehicle(vehicle)}
              />
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
