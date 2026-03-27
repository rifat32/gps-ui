import { useEffect, useRef, useState, Fragment, useMemo } from "react";
import {
  GoogleMap,
  LoadScript,
  InfoWindow,
  OverlayView,
} from "@react-google-maps/api";
import { Loader2, Zap, Thermometer, Gauge, Activity, Navigation, Car } from "lucide-react";
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

const VehicleMarker = ({ size = 48, status = "ONLINE", theme = "light" }) => {
  const isOnline = status === "ONLINE";
  const isStandby = status === "STANDBY";
  
  // ONLINE = Blue (Active), STANDBY = Grey (Engine Off), OFFLINE = Dim Grey (Disconnected)
  let color = "#3b82f6"; // Blue default
  if (isStandby) color = "#94a3b8"; // Grey for standby
  if (status === "OFFLINE") color = "#64748b"; // Darker grey for offline
  
  return (
    <div style={{ position: "relative" }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ 
        filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))", 
        opacity: status === "OFFLINE" ? 0.6 : 1,
        transition: "all 0.3s ease"
      }}>
        <path d="M50 5 L15 85 L50 70 L85 85 Z" fill={color} stroke="white" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      {status === "OFFLINE" && (
        <div style={{
          position: "absolute",
          top: -10,
          right: -10,
          backgroundColor: "#f1f5f9",
          border: "1px solid #e2e8f0",
          borderRadius: "4px",
          padding: "2px 4px",
          fontSize: "10px",
          fontWeight: "700",
          color: "#64748b",
          whiteSpace: "nowrap"
        }}>OFFLINE</div>
      )}
      {status === "STANDBY" && (
        <div style={{
            position: "absolute",
            top: -10,
            right: -10,
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "4px",
            padding: "2px 4px",
            fontSize: "10px",
            fontWeight: "700",
            color: "#b45309",
            whiteSpace: "nowrap"
          }}>STANDBY</div>
      )}
    </div>
  );
};

export default function ObdLive({ theme }) {
  const [deviceData, setDeviceData] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(true);
  const mapRef = useRef(null);
  const socketRef = useRef(null);
  const prevPosRef = useRef(null);
  const [bearing, setBearing] = useState(0);

  useEffect(() => {
    socketRef.current = io(OBD_WS_URL);

    socketRef.current.on("connect", () => {
      console.log("Connected to OBD Socket.io server");
      setLoading(false);
      setIsOnline(true);
    });

    socketRef.current.on("disconnect", () => {
      setIsOnline(false);
    });

    socketRef.current.on(`live-location-${DEFAULT_DEVICE_ID}`, (data) => {
      console.log("Received OBD Live Update:", data);
      
      const lat = parseFloat(data.lat);
      const lng = parseFloat(data.lon || data.lng);

      // Robust Validation: Skip if not a valid number or out of bounds
      if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) {
        console.warn("Discarding invalid coordinates:", { lat, lng });
        return;
      }

      // Map 'lon' to 'lng' for internal consistency
      const validatedData = {
        ...data,
        lat,
        lng
      };

      setDeviceData(validatedData);
      setLastUpdateTime(Date.now());
      setIsOnline(true);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Monitor for staleness (e.g. if we don't get data for 45s, consider it offline)
  useEffect(() => {
    const checkStaleness = setInterval(() => {
      if (lastUpdateTime && Date.now() - lastUpdateTime > 45000) {
        setIsOnline(false);
      }
    }, 10000);
    return () => clearInterval(checkStaleness);
  }, [lastUpdateTime]);

  // Auto-center on movement & calculate bearing
  useEffect(() => {
    if (deviceData && mapRef.current && isOnline) {
        const centerPos = { lat: Number(deviceData.lat), lng: Number(deviceData.lng) };
        if (isFinite(centerPos.lat) && isFinite(centerPos.lng)) {
            mapRef.current.panTo(centerPos);
        }

        if (prevPosRef.current) {
            const dist = Math.sqrt(Math.pow(deviceData.lat-prevPosRef.current.lat, 2) + Math.pow(deviceData.lng-prevPosRef.current.lng, 2));
            if (dist > 0.00001) {
                const dLon = (deviceData.lng - prevPosRef.current.lng) * (Math.PI / 180);
                const rLat1 = prevPosRef.current.lat * (Math.PI / 180);
                const rLat2 = deviceData.lat * (Math.PI / 180);
                const y = Math.sin(dLon) * Math.cos(rLat2);
                const x = Math.cos(rLat1) * Math.sin(rLat2) - Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLon);
                const b = (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
                setBearing(b);
            }
        }
        prevPosRef.current = { lat: deviceData.lat, lng: deviceData.lng };
    }
  }, [deviceData?.lat, deviceData?.lng, isOnline]);

  const obd = deviceData?.vehicleCondition || {};
  
  // Logical Status: ONLINE (Moving/Running), STANDBY (Connected but Idle), OFFLINE (No Data)
  const functionalStatus = useMemo(() => {
    if (!isOnline || !deviceData) return "OFFLINE";
    const rpm = Number(obd.rpm || 0);
    const speed = Number(deviceData.speed || 0);
    return (rpm > 0 || speed > 0) ? "ONLINE" : "STANDBY";
  }, [isOnline, deviceData, obd.rpm]);

  // Check if current center is valid
  const currentCenter = (deviceData && isFinite(deviceData.lat) && isFinite(deviceData.lng)) 
    ? { lat: deviceData.lat, lng: deviceData.lng } 
    : defaultCenter;

  const statusColors = {
    ONLINE: "#22c55e",
    STANDBY: "#f59e0b",
    OFFLINE: "#ef4444"
  };

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
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: statusColors[functionalStatus] }}></div>
                    {functionalStatus === "ONLINE" ? "Connected (Live)" : (functionalStatus === "STANDBY" ? "Standby (Engine Off)" : "Offline / Waiting")}
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Stats Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", opacity: functionalStatus === "OFFLINE" ? 0.6 : 1 }}>
                    <StatCard icon={<Zap size={18} color="#eab308" />} label="Battery" value={`${obd.batteryVoltage || "--"} V`} theme={theme} />
                    <StatCard icon={<Gauge size={18} color="#3b82f6" />} label="RPM" value={obd.rpm || "0"} theme={theme} />
                    <StatCard icon={<Thermometer size={18} color="#ef4444" />} label="Coolant" value={`${obd.coolantTemp || "--"} °C`} theme={theme} />
                    <StatCard icon={<Activity size={18} color="#22c55e" />} label="Speed" value={`${Math.round((deviceData?.speed || 0) * 0.621371)} mph`} theme={theme} />
                </div>

                <div style={{ marginTop: "10px", padding: "15px", borderRadius: "12px", backgroundColor: theme === "dark" ? "#0f172a" : "#f8fafc", opacity: functionalStatus === "OFFLINE" ? 0.6 : 1 }}>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "8px", textTransform: "uppercase", fontWeight: "600" }}>Location Details</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <DetailRow icon={<Navigation size={14} />} label="Heading" value={`${deviceData?.direction || 0}°`} />
                        <DetailRow icon={<Activity size={14} />} label="Last Seen" value={deviceData?.time ? new Date(deviceData.time).toLocaleTimeString() : "--"} />
                    </div>
                </div>
            </div>
        </div>

        {/* Map Area */}
        <div className="obd-map-container">
            {loading && !deviceData && (
                <div style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.8)" }}>
                    <Loader2 className="animate-spin text-blue-500" size={48} />
                </div>
            )}

            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={currentCenter}
                zoom={15}
                onLoad={(map) => (mapRef.current = map)}
            >
                {deviceData && isFinite(deviceData.lat) && isFinite(deviceData.lng) && (
                    <Fragment>
                        <OverlayView
                            position={{ lat: deviceData.lat, lng: deviceData.lng }}
                            mapPaneName="overlayMouseTarget"
                            getPixelPositionOffset={() => getPixelPositionOffset(50, 50)}
                        >
                            <div style={{
                                transform: `rotate(${bearing}deg)`,
                                width: "50px",
                                height: "50px",
                                cursor: "pointer",
                                transition: "all 0.5s ease-out",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }} onClick={() => setSelected(!selected)}>
                                <VehicleMarker size={50} status={functionalStatus} />
                            </div>
                        </OverlayView>

                        {selected && (
                            <InfoWindow 
                                position={{ lat: deviceData.lat, lng: deviceData.lng }}
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
