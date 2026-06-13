<<<<<<< HEAD
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

const getBatteryDisplay = (voltage, deviceType) => {
  if (voltage === undefined || voltage === null || voltage === "") return "N/A";
  const val = parseFloat(voltage);
  if (isNaN(val) || val <= 0) return "N/A";

  if (deviceType === "OBD") {
    return `${val.toFixed(2)}V`;
  }

  // J42 device uses Li-SOCl2 3.6V nominal dry-cell (2.6V - 3.5V range) or rechargeable 3.7V/4.2V range
  let percent = 0;
  if (val >= 3.65) {
    percent = Math.round(((val - 3.4) / (4.2 - 3.4)) * 100);
  } else {
    percent = Math.round(((val - 2.6) / (3.5 - 2.6)) * 100);
  }

  percent = Math.max(0, Math.min(100, percent));
  return `${percent}% (${val.toFixed(2)}V)`;
};

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
    batteryVoltage: v.battery_voltage ?? v.batteryVoltage ?? v.bettary ?? null,
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
    batteryVoltage: update.batteryVoltage ?? update.battery_voltage ?? update.bettary ?? null,
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
      if (index === -1) {
        const incomingType = String(incoming.deviceType || "").toUpperCase();
        if (incomingType !== String(deviceType).toUpperCase()) return prev;
        return [...prev, incoming];
      }

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
            display: "flex",
            flexDirection: "row",
          }}
        >
          {deviceType === "J42" && (
            <div style={{
              width: "350px",
              minWidth: "300px",
              height: "100%",
              backgroundColor: "white",
              borderRight: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              padding: "20px"
            }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", color: "#1e293b" }}>J42 Trackers</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => {
                      setSelectedVehicle(v);
                      if (mapRef.current) {
                        mapRef.current.panTo({ lat: v.lat, lng: v.lng });
                        mapRef.current.setZoom(15);
                      }
                    }}
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: `1px solid ${selectedVehicle?.id === v.id ? "#3b82f6" : "#e2e8f0"}`,
                      backgroundColor: selectedVehicle?.id === v.id ? "#f0f9ff" : "white",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontWeight: "700", fontSize: "14px", color: "#1e293b" }}>{v.name}</span>
                      <span style={{
                        fontSize: "10px",
                        fontWeight: "700",
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        backgroundColor: v.status?.toLowerCase() === "online" || v.status?.toLowerCase() === "moving" || v.status?.toLowerCase() === "stopped" ? "#dcfce7" : "#f1f5f9",
                        color: v.status?.toLowerCase() === "online" || v.status?.toLowerCase() === "moving" || v.status?.toLowerCase() === "stopped" ? "#15803d" : "#475569"
                      }}>
                        {v.status}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div>ID: <code style={{ backgroundColor: "#f1f5f9", padding: "2px 4px", borderRadius: "4px" }}>{v.id}</code></div>
                      <div>Battery: <strong style={{ color: "#0f172a" }}>{getBatteryDisplay(v.batteryVoltage, deviceType)}</strong></div>
                      <div>Last Seen: {v.lastSeen ? new Date(v.lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : "Never"}</div>
                      {v.speed > 0 && <div>Speed: {Math.round(v.speed * 0.621371)} mph</div>}
                    </div>
                  </div>
                ))}
                {vehicles.length === 0 && (
                  <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>No active J42 trackers found.</div>
                )}
              </div>
            </div>
          )}

          <GoogleMap
            mapContainerStyle={{ flex: 1, height: "100%" }}
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
                    {selectedVehicle.batteryVoltage !== undefined && selectedVehicle.batteryVoltage !== null && (
                      <p>Battery: {getBatteryDisplay(selectedVehicle.batteryVoltage, deviceType)}</p>
                    )}
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
=======
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

const getBatteryDisplay = (voltage, deviceType) => {
  if (voltage === undefined || voltage === null || voltage === "") return "N/A";
  const val = parseFloat(voltage);
  if (isNaN(val) || val <= 0) return "N/A";

  if (deviceType === "OBD") {
    return `${val.toFixed(2)}V`;
  }

  // J42 device: Map voltage (2.6V - 3.1V or 3.4V - 4.2V) to percentage
  let percent = 0;
  if (val >= 3.5) {
    percent = Math.round(((val - 3.4) / (4.2 - 3.4)) * 100);
  } else {
    percent = Math.round(((val - 2.6) / (3.1 - 2.6)) * 100);
  }

  percent = Math.max(0, Math.min(100, percent));
  return `${percent}% (${val.toFixed(2)}V)`;
};

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
    batteryVoltage: v.battery_voltage ?? v.batteryVoltage ?? v.bettary ?? null,
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
    batteryVoltage: update.batteryVoltage ?? update.battery_voltage ?? update.bettary ?? null,
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
      if (index === -1) {
        const incomingType = String(incoming.deviceType || "").toUpperCase();
        if (incomingType !== String(deviceType).toUpperCase()) return prev;
        return [...prev, incoming];
      }

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
            display: "flex",
            flexDirection: "row",
          }}
        >
          {deviceType === "J42" && (
            <div style={{
              width: "350px",
              minWidth: "300px",
              height: "100%",
              backgroundColor: "white",
              borderRight: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              padding: "20px"
            }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", color: "#1e293b" }}>J42 Trackers</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => {
                      setSelectedVehicle(v);
                      if (mapRef.current) {
                        mapRef.current.panTo({ lat: v.lat, lng: v.lng });
                        mapRef.current.setZoom(15);
                      }
                    }}
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: `1px solid ${selectedVehicle?.id === v.id ? "#3b82f6" : "#e2e8f0"}`,
                      backgroundColor: selectedVehicle?.id === v.id ? "#f0f9ff" : "white",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontWeight: "700", fontSize: "14px", color: "#1e293b" }}>{v.name}</span>
                      <span style={{
                        fontSize: "10px",
                        fontWeight: "700",
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        backgroundColor: v.status?.toLowerCase() === "online" || v.status?.toLowerCase() === "moving" || v.status?.toLowerCase() === "stopped" ? "#dcfce7" : "#f1f5f9",
                        color: v.status?.toLowerCase() === "online" || v.status?.toLowerCase() === "moving" || v.status?.toLowerCase() === "stopped" ? "#15803d" : "#475569"
                      }}>
                        {v.status}
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div>ID: <code style={{ backgroundColor: "#f1f5f9", padding: "2px 4px", borderRadius: "4px" }}>{v.id}</code></div>
                      <div>Battery: <strong style={{ color: "#0f172a" }}>{getBatteryDisplay(v.batteryVoltage, deviceType)}</strong></div>
                      <div>Last Seen: {v.lastSeen ? new Date(v.lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : "Never"}</div>
                      {v.speed > 0 && <div>Speed: {Math.round(v.speed * 0.621371)} mph</div>}
                    </div>
                  </div>
                ))}
                {vehicles.length === 0 && (
                  <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>No active J42 trackers found.</div>
                )}
              </div>
            </div>
          )}

          <GoogleMap
            mapContainerStyle={{ flex: 1, height: "100%" }}
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
                    {selectedVehicle.batteryVoltage !== undefined && selectedVehicle.batteryVoltage !== null && (
                      <p>Battery: {getBatteryDisplay(selectedVehicle.batteryVoltage, deviceType)}</p>
                    )}
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
>>>>>>> aafad2b71f9add06be3b3e70f527e958379a6174
