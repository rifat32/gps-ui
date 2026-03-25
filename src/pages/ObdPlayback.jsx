import {
  GoogleMap,
  LoadScript,
  Polyline,
  OverlayView,
} from "@react-google-maps/api";
import {
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Search,
  X,
  Zap,
  Thermometer,
  Gauge,
  Activity,
  Navigation,
  Calendar,
  Clock,
  ChevronDown,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// =========================================================================
// 1. CONFIGURATION
// =========================================================================
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAP_API;
const OBD_API_BASE_URL = import.meta.env.VITE_OBD_API_URL || "http://54.37.225.65:4031"; // Use env or fallback

const mapContainerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 51.5074, lng: -0.1278 };

const getPixelPositionOffset = (width, height) => ({
  x: -(width / 2),
  y: -(height / 2),
});

export default function ObdPlayback({ theme }) {
  const [deviceList, setDeviceList] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [points, setPoints] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // ms per point
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);

  const [startDateTime, setStartDateTime] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [endDateTime, setEndDateTime] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString().slice(0, 16);
  });

  const mapRef = useRef(null);
  const playInterval = useRef(null);

  // 1. Fetch Device List
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch(`${OBD_API_BASE_URL}/api/logs/devices`);
        if (!response.ok) throw new Error("Failed to fetch devices");
        const data = await response.json();
        setDeviceList(data.devices || []);
      } catch (err) {
        console.error("Device fetch error:", err);
      }
    };
    fetchDevices();
  }, []);

  // 2. Fetch Playback Data
  const handleFetchData = async () => {
    if (!selectedDeviceId) {
        setError("Please select a device first");
        return;
    }
    setLoading(true);
    setError(null);
    setPoints([]);
    setCurrentIndex(0);
    setIsPlaying(false);

    try {
      const startIso = new Date(startDateTime).toISOString();
      const endIso = new Date(endDateTime).toISOString();
      const url = `${OBD_API_BASE_URL}/api/logs/${selectedDeviceId}/playback/duration?start=${startIso}&end=${endIso}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch playback data");
      const data = await response.json();
      
      if (data.points && data.points.length > 0) {
        // Validation Filter: Ignore malformed points from backend
        const validPoints = data.points.filter(p => {
          const lat = parseFloat(p.lat);
          const lng = parseFloat(p.lng || p.lon);
          return !isNaN(lat) && !isNaN(lng) && 
                 Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
                 (lat !== 0 || lng !== 0);
        });

        if (validPoints.length > 0) {
          setPoints(validPoints);
          if (mapRef.current) {
            mapRef.current.panTo({ lat: validPoints[0].lat, lng: validPoints[0].lng });
          }
        } else {
          setError("No valid coordinates found in the data");
        }
      } else {
        setError("No data found for the selected duration");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Playback Logic
  useEffect(() => {
    if (isPlaying && points.length > 0) {
      playInterval.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= points.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    } else {
      clearInterval(playInterval.current);
    }
    return () => clearInterval(playInterval.current);
  }, [isPlaying, points, playbackSpeed]);

  // 4. Auto-center map
  useEffect(() => {
    if (isPlaying && points[currentIndex] && mapRef.current) {
        mapRef.current.panTo({ lat: points[currentIndex].lat, lng: points[currentIndex].lng });
    }
  }, [currentIndex, isPlaying, points]);

  const currentPoint = points[currentIndex] || {};
  const obd = currentPoint.obd || {};

  const polylinePath = useMemo(() => points.map(p => ({ lat: p.lat, lng: p.lng })), [points]);

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
      <div className={`obd-page-wrapper obd-playback-container ${theme}`} style={{ backgroundColor: theme === "dark" ? "#0f172a" : "#f8fafc" }}>
        
        {/* Sidebar */}
        <div className="obd-sidebar" style={{
            width: isSidebarOpen ? (window.innerWidth > 1024 ? "350px" : "100%") : "0",
            backgroundColor: theme === "dark" ? "#1e293b" : "white",
            borderRight: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            boxShadow: "10px 0 15px -3px rgba(0,0,0,0.05)"
        }}>
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px", minWidth: window.innerWidth > 1024 ? "350px" : "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between" }}>
                    <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: theme === "dark" ? "#f8fafc" : "#1e293b", margin: 0 }}>OBD Playback</h2>
                    <button onClick={() => setIsSidebarOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ position: "relative" }}>
                        <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "8px", display: "block" }}>Select Device</label>
                        <div 
                            onClick={() => setIsDeviceDropdownOpen(!isDeviceDropdownOpen)}
                            style={{
                                padding: "12px 16px",
                                borderRadius: "12px",
                                border: "2px solid #e2e8f0",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                backgroundColor: theme === "dark" ? "#0f172a" : "white"
                            }}
                        >
                            <span style={{ color: selectedDeviceId ? (theme === "dark" ? "white" : "#1e293b") : "#94a3b8" }}>
                                {selectedDeviceId || "Choose a device..."}
                            </span>
                            <ChevronDown size={18} color="#64748b" />
                        </div>
                        {isDeviceDropdownOpen && (
                            <div style={{
                                position: "absolute",
                                top: "100%",
                                left: 0,
                                right: 0,
                                marginTop: "8px",
                                backgroundColor: theme === "dark" ? "#1e293b" : "white",
                                border: "1px solid #e2e8f0",
                                borderRadius: "12px",
                                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                                zIndex: 110,
                                maxHeight: "200px",
                                overflowY: "auto"
                            }}>
                                {deviceList.map(dev => (
                                    <div 
                                        key={dev} 
                                        onClick={() => { setSelectedDeviceId(dev); setIsDeviceDropdownOpen(false); }}
                                        style={{
                                            padding: "12px 16px",
                                            cursor: "pointer",
                                            borderBottom: "1px solid #f1f5f9",
                                            color: theme === "dark" ? "#f8fafc" : "#1e293b",
                                            backgroundColor: selectedDeviceId === dev ? "#3b82f6" : "transparent"
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = selectedDeviceId === dev ? "#3b82f6" : (theme === "dark" ? "#334155" : "#f1f5f9")}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = selectedDeviceId === dev ? "#3b82f6" : "transparent"}
                                    >
                                        {dev}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div>
                            <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "8px", display: "block" }}>Start Time</label>
                            <div style={{ position: "relative" }}>
                                <Calendar size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                                <input 
                                    type="datetime-local" 
                                    value={startDateTime}
                                    onChange={(e) => setStartDateTime(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "12px 12px 12px 40px",
                                        borderRadius: "12px",
                                        border: "2px solid #e2e8f0",
                                        backgroundColor: theme === "dark" ? "#0f172a" : "white",
                                        color: theme === "dark" ? "white" : "black",
                                        fontSize: "0.875rem"
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "8px", display: "block" }}>End Time</label>
                            <div style={{ position: "relative" }}>
                                <Clock size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                                <input 
                                    type="datetime-local" 
                                    value={endDateTime}
                                    onChange={(e) => setEndDateTime(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "12px 12px 12px 40px",
                                        borderRadius: "12px",
                                        border: "2px solid #e2e8f0",
                                        backgroundColor: theme === "dark" ? "#0f172a" : "white",
                                        color: theme === "dark" ? "white" : "black",
                                        fontSize: "0.875rem"
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleFetchData}
                        disabled={loading}
                        style={{
                            marginTop: "8px",
                            padding: "14px",
                            borderRadius: "12px",
                            backgroundColor: "#3b82f6",
                            color: "white",
                            border: "none",
                            fontWeight: "700",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "10px",
                            transition: "all 0.2s"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#3b82f6"}
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                        {loading ? "Loading..." : "View Playback"}
                    </button>

                    {error && (
                        <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: "#fef2f2", color: "#dc2626", fontSize: "0.875rem", border: "1px solid #fecaca" }}>
                            {error}
                        </div>
                    )}
                </div>

                {/* Diagnostics Panel */}
                {points.length > 0 && (
                    <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                         <h3 style={{ fontSize: "0.875rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", margin: "0 0 4px 0" }}>Live Diagnostics</h3>
                         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            <StatCard 
                                icon={<Zap size={18} color="#eab308" />} 
                                label="Battery" 
                                value={`${obd.batteryVoltage || "--"} V`} 
                                theme={theme} 
                            />
                            <StatCard 
                                icon={<Gauge size={18} color="#3b82f6" />} 
                                label="RPM" 
                                value={obd.rpm || "0"} 
                                theme={theme} 
                            />
                            <StatCard 
                                icon={<Thermometer size={18} color="#ef4444" />} 
                                label="Coolant" 
                                value={`${obd.coolantTemp || "--"} °C`} 
                                theme={theme} 
                            />
                            <StatCard 
                                icon={<Activity size={18} color="#22c55e" />} 
                                label="Speed" 
                                value={`${Math.round((currentPoint.speed || 0) * 0.621371)} mph`} 
                                theme={theme} 
                            />
                        </div>
                        <div style={{ marginTop: "8px", padding: "15px", borderRadius: "12px", backgroundColor: theme === "dark" ? "#0f172a" : "#f8fafc" }}>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "8px", textTransform: "uppercase", fontWeight: "600" }}>Position Info</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <DetailRow icon={<Navigation size={14} />} label="Heading" value={`${currentPoint.direction || 0}°`} />
                                <DetailRow icon={<Clock size={14} />} label="Point Time" value={currentPoint.time ? new Date(currentPoint.timestamp).toLocaleTimeString() : "--"} />
                                <DetailRow icon={<Activity size={14} />} label="Progression" value={`${currentIndex + 1} / ${points.length}`} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Floating Sidebar Toggle (if closed) */}
        {!isSidebarOpen && (
            <button 
                onClick={() => setIsSidebarOpen(true)}
                style={{
                    position: "absolute",
                    left: "24px",
                    top: "24px",
                    zIndex: 110,
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    backgroundColor: theme === "dark" ? "#1e293b" : "white",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#3b82f6"
                }}
            >
                <Activity size={24} />
            </button>
        )}

        {/* Map Area */}
        <div className="obd-map-container">
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={points[currentIndex] ? { lat: points[currentIndex].lat, lng: points[currentIndex].lng } : defaultCenter}
                zoom={14}
                onLoad={(map) => (mapRef.current = map)}
                options={{
                    styles: theme === "dark" ? darkMapStyles : [],
                    disableDefaultUI: true,
                    zoomControl: true,
                }}
            >
                {points.length > 0 && (
                    <>
                        <Polyline 
                            path={polylinePath}
                            options={{
                                strokeColor: "#3b82f6",
                                strokeWeight: 4,
                                strokeOpacity: 0.8
                            }}
                        />
                        <OverlayView
                            position={{ lat: currentPoint.lat, lng: currentPoint.lng }}
                            mapPaneName="overlayMouseTarget"
                            getPixelPositionOffset={() => getPixelPositionOffset(48, 48)}
                        >
                            <div style={{
                                transform: `rotate(${currentPoint.direction}deg)`,
                                width: "48px",
                                height: "48px",
                                transition: "all 0.1s linear"
                            }}>
                                <img src="/car-icon.png" alt="Car" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))" }} />
                            </div>
                        </OverlayView>
                    </>
                )}
            </GoogleMap>

            {/* Playback Controls Overlay */}
            {points.length > 0 && (
                <div style={{
                    position: "absolute",
                    bottom: "24px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "80%",
                    maxWidth: "800px",
                    padding: "16px 24px",
                    borderRadius: "20px",
                    backgroundColor: theme === "dark" ? "rgba(30, 41, 59, 0.95)" : "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    zIndex: 50
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                        <button 
                            onClick={() => setIsPlaying(!isPlaying)}
                            style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "14px",
                                backgroundColor: "#3b82f6",
                                color: "white",
                                border: "none",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                        </button>

                        <button 
                            onClick={() => setCurrentIndex(0)}
                            style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "12px",
                                backgroundColor: "transparent",
                                color: "#64748b",
                                border: "2px solid #e2e8f0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer"
                            }}
                        >
                            <RotateCcw size={20} />
                        </button>

                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                            <input 
                                type="range" 
                                min="0" 
                                max={points.length - 1} 
                                value={currentIndex}
                                onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
                                style={{
                                    width: "100%",
                                    height: "6px",
                                    borderRadius: "3px",
                                    appearance: "none",
                                    backgroundColor: "#e2e8f0",
                                    outline: "none",
                                    cursor: "pointer"
                                }}
                            />
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>
                                <span>{new Date(points[0].timestamp).toLocaleTimeString()}</span>
                                <span>{new Date(points[currentIndex].timestamp).toLocaleTimeString()}</span>
                                <span>{new Date(points[points.length-1].timestamp).toLocaleTimeString()}</span>
                            </div>
                        </div>

                        <select 
                            value={playbackSpeed}
                            onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
                            style={{
                                padding: "8px 12px",
                                borderRadius: "10px",
                                border: "2px solid #e2e8f0",
                                backgroundColor: "transparent",
                                color: theme === "dark" ? "white" : "#1e293b",
                                fontWeight: "600",
                                outline: "none"
                            }}
                        >
                            <option value={2000}>0.5x</option>
                            <option value={1000}>1x</option>
                            <option value={500}>2x</option>
                            <option value={250}>4x</option>
                            <option value={100}>10x</option>
                        </select>
                    </div>
                </div>
            )}
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
      gap: "4px",
      border: theme === "dark" ? "1px solid #475569" : "1px solid #e2e8f0",
      transition: "transform 0.2s"
    }}>
      {icon}
      <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>{label}</div>
      <div style={{ fontSize: "1rem", fontWeight: "800", color: theme === "dark" ? "#f8fafc" : "#1e293b" }}>{value}</div>
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
      <span style={{ fontWeight: "700" }}>{value}</span>
    </div>
  );
}

const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];
