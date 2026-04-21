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
  Activity,
  Navigation,
  Calendar,
  Clock,
  ChevronDown,
  Signal,
  Wind,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import "./Playback.css";

// =========================================================================
// 1. CONFIGURATION
// =========================================================================
const GOOGLE_MAP_API_KEY = import.meta.env.VITE_GOOGLE_MAP_API;
const DASHCAM_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const mapContainerStyle = { width: "100%", height: "100%" };
const defaultCenter = { lat: 51.5074, lng: -0.1278 };

const getPixelPositionOffset = (width, height) => ({
  x: -(width / 2),
  y: -(height / 2),
});

const VehicleMarker = ({ size = 48, status = "ONLINE" }) => {
  const isOnline = status === "ONLINE";
  const color = isOnline ? "#3b82f6" : "#94a3b8";
  return (
    <div style={{ position: "relative" }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))" }}>
        <path d="M50 5 L15 85 L50 70 L85 85 Z" fill={color} stroke="white" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

export default function Playback({ theme }) {
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
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [startDateTime, setStartDateTime] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    // Local time string for datetime-local input
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  });
  const [endDateTime, setEndDateTime] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  });

  const mapRef = useRef(null);
  const playInterval = useRef(null);

  // Helper for formatting time (HH:mm:ss) from ISO/Date
  const formatTime = (dateInput) => {
    if (!dateInput) return "--";
    const d = new Date(dateInput);
    return d.toLocaleTimeString([], { hour12: false });
  };

  // 1. Fetch Device List
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch(`${DASHCAM_API_BASE_URL}/api/devices/logs?service=dashcam`);
        if (!response.ok) throw new Error("Failed to fetch devices");
        const data = await response.json();
        setDeviceList(Array.isArray(data) ? data : (data.devices || data.data || []));
      } catch (err) {
        console.error("Device fetch error:", err);
      }
    };
    fetchDevices();
  }, []);

  // 2. Fetch Playback Data (Points for a trip)
  const handleFetchData = async (start, end) => {
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
      const queryStart = start || new Date(startDateTime).toISOString();
      const queryEnd = end || new Date(endDateTime).toISOString();

      const url = `${DASHCAM_API_BASE_URL}/api/v1.0/dashcam/${selectedDeviceId}/playback/duration?start=${queryStart}&end=${queryEnd}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch playback data");
      const data = await response.json();
      
      if (data.points && data.points.length > 0) {
        const validPoints = data.points.filter(p => {
          const lat = parseFloat(p.lat);
          const lng = parseFloat(p.lng);
          return !isNaN(lat) && !isNaN(lng) && 
                 Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
                 (Math.abs(lat) > 0.001 || Math.abs(lng) > 0.001);
        });

        if (validPoints.length > 0) {
          const pointsWithBearing = validPoints.map((p, idx) => {
            if (idx < validPoints.length - 1) {
              const next = validPoints[idx + 1];
              const dLon = (next.lng - p.lng) * (Math.PI / 180);
              const lat1 = p.lat * (Math.PI / 180);
              const lat2 = next.lat * (Math.PI / 180);
              const y = Math.sin(dLon) * Math.cos(lat2);
              const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
              const bearing = (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
              return { ...p, calculatedBearing: bearing };
            }
            return { ...p, calculatedBearing: idx > 0 ? validPoints[idx-1].calculatedBearing : (p.direction || 0) };
          });

          setPoints(pointsWithBearing);
          if (mapRef.current) {
            mapRef.current.panTo({ lat: validPoints[0].lat, lng: validPoints[0].lng });
          }
        } else {
          setError("No valid coordinates found for this trip");
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

  const filteredDevices = deviceList.filter(dev => 
    dev.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 3. Fetch Trip List (Analyze)
  const handleFetchTrips = async () => {
    if (!selectedDeviceId) {
        setError("Please select a device first");
        return;
    }
    setLoading(true);
    setError(null);
    setTrips([]);
    setSelectedTripId(null);
    try {
      const startTime = new Date(startDateTime).toISOString();
      const endTime = new Date(endDateTime).toISOString();
      const url = `${DASHCAM_API_BASE_URL}/api/v1.0/dashcam/trips?device_id=${selectedDeviceId}&start_time=${startTime}&end_time=${endTime}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch trips");
      const data = await response.json();
      setTrips(data.trips || []);
      if (data.trips && data.trips.length === 0) {
          setError("No trips detected for the selected date range");
      }
    } catch (err) {
      setError("Failed to fetch trips: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTripSelect = (trip, idx) => {
    setSelectedTripId(idx);
    
    const formatForInput = (isoStr) => {
        const date = new Date(isoStr);
        const tzOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    };
    
    setStartDateTime(formatForInput(trip.start_time));
    setEndDateTime(formatForInput(trip.end_time));
    handleFetchData(trip.start_time, trip.end_time);
  };

  // 4. Playback Logic
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

  // 5. Auto-center map
  useEffect(() => {
    if (isPlaying && points[currentIndex] && mapRef.current) {
        mapRef.current.panTo({ lat: points[currentIndex].lat, lng: points[currentIndex].lng });
    }
  }, [currentIndex, isPlaying, points]);

  const currentPoint = points[currentIndex] || {};
  const polylinePath = useMemo(() => points.map(p => ({ lat: p.lat, lng: p.lng })), [points]);

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAP_API_KEY}>
      <div className={`obd-playback-container ${theme}`} style={{ backgroundColor: theme === "dark" ? "#0f172a" : "#f8fafc" }}>
        
        {/* Sidebar */}
        <div className={`obd-sidebar ${isSidebarOpen ? "open" : ""}`} style={{
            backgroundColor: theme === "dark" ? "#1e293b" : "white",
            borderRight: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            boxShadow: "10px 0 15px -3px rgba(0,0,0,0.05)",
            overflowX: "hidden"
        }}>
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px", minWidth: "350px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between" }}>
                    <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: theme === "dark" ? "#f8fafc" : "#1e293b", margin: 0 }}>Dashcam Playback</h2>
                    <button onClick={() => setIsSidebarOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ position: "relative" }}>
                        <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "8px", display: "block" }}>Select Dashcam</label>
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
                                maxHeight: "250px",
                                overflowY: "hidden",
                                display: "flex",
                                flexDirection: "column"
                            }}>
                                <div style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}>
                                    <div style={{ position: "relative" }}>
                                        <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                                        <input 
                                            type="text" 
                                            placeholder="Search Dashcam..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            autoFocus
                                            style={{
                                                width: "100%",
                                                padding: "8px 8px 8px 32px",
                                                borderRadius: "8px",
                                                border: "1px solid #e2e8f0",
                                                fontSize: "0.875rem",
                                                backgroundColor: theme === "dark" ? "#0f172a" : "#f8fafc",
                                                color: theme === "dark" ? "white" : "black",
                                                outline: "none"
                                            }}
                                        />
                                    </div>
                                </div>
                                <div style={{ overflowY: "auto", flex: 1 }}>
                                    {filteredDevices.length > 0 ? (
                                        filteredDevices.map(dev => (
                                            <div 
                                                key={dev} 
                                                onClick={() => { setSelectedDeviceId(dev); setIsDeviceDropdownOpen(false); setSearchTerm(""); }}
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
                                        ))
                                    ) : (
                                        <div style={{ padding: "12px", textAlign: "center", color: "#94a3b8", fontSize: "0.875rem" }}>
                                            No devices found
                                        </div>
                                    )}
                                </div>
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
                                        padding: "12px 12px 12px(40px)",
                                        borderRadius: "12px",
                                        border: "2px solid #e2e8f0",
                                        backgroundColor: theme === "dark" ? "#0f172a" : "white",
                                        color: theme === "dark" ? "white" : "black",
                                        fontSize: "0.875rem",
                                        paddingLeft: "40px"
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
                        onClick={handleFetchTrips}
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
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                        {loading ? "Discovering Trips..." : "Analyze Trips"}
                    </button>

                    {trips.length > 0 && (
                        <div style={{ marginTop: "16px" }}>
                            <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "12px", display: "block" }}>Detected Trips ({trips.length})</label>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto", paddingRight: "4px" }}>
                                {trips.map((trip, idx) => (
                                    <div 
                                        key={idx}
                                        onClick={() => handleTripSelect(trip, idx)}
                                        style={{
                                            padding: "12px",
                                            borderRadius: "12px",
                                            border: `2px solid ${selectedTripId === idx ? "#3b82f6" : "#e2e8f0"}`,
                                            backgroundColor: selectedTripId === idx ? (theme === "dark" ? "#1e3a8a" : "#eff6ff") : "transparent",
                                            cursor: "pointer",
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                            <span style={{ fontWeight: "700", fontSize: "0.875rem", color: theme === "dark" ? "white" : "#1e293b" }}>Trip #{idx + 1}</span>
                                            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{trip.distance_km} km</span>
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                            {formatTime(trip.start_time).slice(0, 5)} - {formatTime(trip.end_time).slice(0, 5)} ({Math.floor(trip.duration_sec / 60)} min)
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: "#fef2f2", color: "#dc2626", fontSize: "0.875rem", border: "1px solid #fecaca" }}>
                            {error}
                        </div>
                    )}
                </div>

                {/* Diagnostics Panel */}
                {points.length > 0 && (
                    <div className="sidebar-diagnostics" style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                         <h3 style={{ fontSize: "0.875rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", margin: "0 0 4px 0" }}>Point Details</h3>
                         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            <StatCard 
                                icon={<Activity size={18} color="#22c55e" />} 
                                label="Speed" 
                                value={`${currentPoint.speed || "0"} km/h`} 
                                theme={theme} 
                            />
                            <StatCard 
                                icon={<Navigation size={18} color="#3b82f6" />} 
                                label="Heading" 
                                value={`${Math.round(currentPoint.calculatedBearing || 0)}°`} 
                                theme={theme} 
                            />
                            <StatCard 
                                icon={<Signal size={18} color="#ef4444" />} 
                                label="Signal" 
                                value={currentPoint.signal_strength || "--"} 
                                theme={theme} 
                            />
                            <StatCard 
                                icon={<Wind size={18} color="#eab308" />} 
                                label="Altitude" 
                                value={`${currentPoint.altitude || "--"}m`} 
                                theme={theme} 
                            />
                        </div>
                        <div style={{ marginTop: "8px", padding: "15px", borderRadius: "12px", backgroundColor: theme === "dark" ? "#0f172a" : "#f8fafc" }}>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "8px", textTransform: "uppercase", fontWeight: "600" }}>Time Info</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <DetailRow icon={<Clock size={14} />} label="Point Time" value={currentPoint.timestamp ? formatTime(currentPoint.timestamp) : "--"} />
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
        <div className="obd-map-container" style={{ position: "relative", flex: 1, height: "100%" }}>
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
                                transform: `rotate(${currentPoint.calculatedBearing || 0}deg)`,
                                width: "48px",
                                height: "48px",
                                transition: "transform 0.1s linear",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}>
                                <VehicleMarker size={48} />
                            </div>
                        </OverlayView>
                    </>
                )}
            </GoogleMap>

            {/* Playback Controls Overlay */}
            {points.length > 0 && (
                <div className="playback-controls-overlay" style={{
                    backgroundColor: theme === "dark" ? "rgba(30, 41, 59, 0.95)" : "rgba(255, 255, 255, 0.95)"
                }}>
                    <div className="playback-main-row">
                        <div className="control-btns" style={{ display: "flex", gap: "10px" }}>
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
                        </div>

                        <div className="progress-container" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
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
                                <span>{formatTime(points[0].timestamp)}</span>
                                <span style={{ color: "#3b82f6" }}>{formatTime(points[currentIndex].timestamp)}</span>
                                <span>{formatTime(points[points.length-1].timestamp)}</span>
                            </div>
                        </div>

                        <select 
                            className="speed-select"
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
