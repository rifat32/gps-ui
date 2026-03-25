import { useEffect, useRef, useState, Fragment } from "react";
import {
  GoogleMap,
  LoadScript,
  InfoWindow,
  OverlayView,
} from "@react-google-maps/api";
import { Loader2, Zap, Thermometer, Gauge, Activity, Navigation } from "lucide-react";
import { io } from "socket.io-client";

// Configuration
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAP_API;
const OBD_WS_URL = "http://54.37.225.65:4031"; // Direct to OBD Server Port
const DEFAULT_DEVICE_ID = "069252500651";

const mapContainerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 51.5074, lng: -0.1278 };

const getPixelPositionOffset = (width, height) => ({
  x: -(width / 2),
  y: -(height / 2),
});

export default function ObdLive({ theme }) {
  const [deviceData, setDeviceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(true);
  const mapRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize Socket.io connecting specifically to the OBD server
    socketRef.current = io(OBD_WS_URL);

    socketRef.current.on("connect", () => {
      console.log("Connected to OBD Socket.io server");
      setLoading(false);
    });

    socketRef.current.on(`live-location-${DEFAULT_DEVICE_ID}`, (data) => {
      console.log("Received OBD Live Update:", data);
      
      // Validation Filter: Ignore malformed data
      const lat = parseFloat(data.lat);
      const lng = parseFloat(data.lon || data.lng);
      if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) {
        console.warn("Discarding invalid coordinates:", { lat, lng });
        return;
      }

      setDeviceData(data);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Auto-center on movement
  useEffect(() => {
    if (deviceData && mapRef.current) {
        mapRef.current.panTo({ lat: deviceData.lat, lng: deviceData.lon });
    }
  }, [deviceData?.lat, deviceData?.lon]);

  const obd = deviceData?.vehicleCondition || {};

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
      <div className={`obd-page-wrapper obd-live-container ${theme}`}>
        
        {/* Sidebar Info */}
        <div className="obd-sidebar" style={{
            backgroundColor: theme === "dark" ? "#1e293b" : "white",
            borderRight: "1px solid #e2e8f0",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            color: theme === "dark" ? "white" : "black"
        }}>
            <div style={{ marginBottom: "10px" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "4px" }}>Vehicle Live Diagnostics</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.875rem", color: "#64748b" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: deviceData ? "#22c55e" : "#94a3b8" }}></div>
                    {deviceData ? "Connected" : "Waiting for device..."}
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Stats Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <StatCard icon={<Zap size={18} color="#eab308" />} label="Battery" value={`${obd.batteryVoltage || "--"} V`} theme={theme} />
                    <StatCard icon={<Gauge size={18} color="#3b82f6" />} label="RPM" value={obd.rpm || "0"} theme={theme} />
                    <StatCard icon={<Thermometer size={18} color="#ef4444" />} label="Coolant" value={`${obd.coolantTemp || "--"} °C`} theme={theme} />
                    <StatCard icon={<Activity size={18} color="#22c55e" />} label="Speed" value={`${Math.round((deviceData?.speed || 0) * 0.621371)} mph`} theme={theme} />
                </div>

                <div style={{ marginTop: "10px", padding: "15px", borderRadius: "12px", backgroundColor: theme === "dark" ? "#0f172a" : "#f8fafc" }}>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "8px", textTransform: "uppercase", fontWeight: "600" }}>Location Details</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <DetailRow icon={<Navigation size={14} />} label="Heading" value={`${deviceData?.direction || 0}°`} />
                        <DetailRow icon={<Activity size={14} />} label="Mileage" value={`${deviceData?.mileage || 0} km`} />
                        <DetailRow icon={<Activity size={14} />} label="Last Seen" value={deviceData?.time ? new Date(deviceData.time).toLocaleTimeString() : "--"} />
                    </div>
                </div>
            </div>
        </div>

        {/* Map Area */}
        <div className="obd-map-container">
            {loading && (
                <div style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.8)" }}>
                    <Loader2 className="animate-spin text-blue-500" size={48} />
                </div>
            )}

            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={deviceData ? { lat: deviceData.lat, lng: deviceData.lon } : defaultCenter}
                zoom={15}
                onLoad={(map) => (mapRef.current = map)}
            >
                {deviceData && (
                    <Fragment>
                        <OverlayView
                            position={{ lat: deviceData.lat, lng: deviceData.lon }}
                            mapPaneName="overlayMouseTarget"
                            getPixelPositionOffset={() => getPixelPositionOffset(50, 50)}
                        >
                            <div style={{
                                transform: `rotate(${deviceData.direction}deg)`,
                                width: "50px",
                                height: "50px",
                                cursor: "pointer",
                                transition: "all 0.5s ease-out"
                            }} onClick={() => setSelected(!selected)}>
                                <img src="/car-icon.png" alt="Car" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))" }} />
                            </div>
                        </OverlayView>

                        {selected && (
                            <InfoWindow 
                                position={{ lat: deviceData.lat, lng: deviceData.lon }}
                                onCloseClick={() => setSelected(false)}
                            >
                                <div style={{ padding: "5px" }}>
                                    <strong>Device ID:</strong> {DEFAULT_DEVICE_ID}<br/>
                                    <strong>Speed:</strong> {Math.round(deviceData.speed * 0.621371)} mph
                                </div>
                            </InfoWindow>
                        )}
                    </Fragment>
                )}
            </GoogleMap>
        </div>
      </div>
    </LoadScript>
  );
}

function StatCard({ icon, label, value, theme }) {
    return (
        <div style={{
            padding: "12px",
            borderRadius: "12px",
            backgroundColor: theme === "dark" ? "#334155" : "#f1f5f9",
            display: "flex",
            flexDirection: "column",
            gap: "4px"
        }}>
            {icon}
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{label}</div>
            <div style={{ fontSize: "1rem", fontWeight: "700" }}>{value}</div>
        </div>
    );
}

function DetailRow({ icon, label, value }) {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.875rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b" }}>
                {icon}
                <span>{label}</span>
            </div>
            <span style={{ fontWeight: "600" }}>{value}</span>
        </div>
    );
}
