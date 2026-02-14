import {
  GoogleMap,
  InfoWindow,
  LoadScript,
  Marker,
  Polyline,
  OverlayView,
} from "@react-google-maps/api";
import {
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Search,
  Menu,
  X,
  Sun,
  Moon,
  Video as VideoIcon,
  ChevronDown,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

// =========================================================================
// 1. CONFIGURATION
// =========================================================================
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAP_API;
const API_URL_FOR_DEVICE_LIST = `${import.meta.env.VITE_API_BASE_URL}/api/devices/logs`;
const API_URL_FOR_ALL_PACKETS = `${import.meta.env.VITE_API_BASE_URL}/api/packets/gps/all`;
const API_URL_FOR_PARSED_PACKETS = `${import.meta.env.VITE_API_BASE_URL}/api/packets/parsed`;

const mapContainerStyle = { width: "100%", height: "100%" };

// Speed Color Configuration
const SPEED_COLORS = {
  low: "#3b82f6", // Blue: < 20 km/h
  normal: "#22c55e", // Green: 20-80 km/h
  over: "#ef4444", // Red: 80-120 km/h
  critical: "#7f1d1d", // Dark Red: > 120 km/h
};

// Custom icons
const CAR_ICON = {
  // Detailed top-down car SVG
  path: "M21 11.5V16a1 1 0 0 1-1 1h-1.5m2.5-5.5h-7m7 0-1.736-3.906A1 1 0 0 0 18.35 7H14M5.5 17H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1M5.5 17a2 2 0 1 0 4 0m-4 0a2 2 0 1 1 4 0m0 0H14m0 0h.5m-.5 0v-5.5m.5 5.5a2 2 0 1 0 4 0m-4 0a2 2 0 1 1 4 0M14 11.5V7",
  fillColor: "#1e293b",
  fillOpacity: 1,
  strokeWeight: 1.5,
  strokeColor: "#ffffff",
  rotation: 0,
  scale: 2,
  anchor: { x: 11, y: 10 },
};

const REVISIT_ICON = {
  path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
  fillColor: "#f97316",
  fillOpacity: 1,
  strokeWeight: 1,
  strokeColor: "#ffffff",
  scale: 1.8,
  anchor: { x: 12, y: 22 },
};

export default function Playback({ theme, toggleTheme }) {
  const [trackingData, setTrackingData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [startDateTime, setStartDateTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default to last 7 days
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
  });
  const [endDateTime, setEndDateTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // Default to tomorrow
    d.setHours(23, 59, 0, 0);
    return d.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
  });
  const [center, setCenter] = useState({ lat: 51.5278, lng: 0.0694 });
  const [playbackInterval, setPlaybackInterval] = useState(1000);
  const [thresholds, setThresholds] = useState({
    low: 20,
    normal: 80,
    over: 120,
  });
  const [showPlayTooltip, setShowPlayTooltip] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const playInterval = useRef(null);
  const mapRef = useRef(null);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const [deviceList, setDeviceList] = useState([]);
  // GET ALL DEVICES
  useEffect(() => {
    const fetchDeviceList = async () => {
      try {
        const response = await fetch(`${API_URL_FOR_DEVICE_LIST}`);
        if (!response.ok) throw new Error("Failed to fetch device list");
        const json = await response.json();
        const list = Array.isArray(json) ? json : json.data || [];
        setDeviceList(list);
        console.log({ deviceList: list });
      } catch (err) {
        setError(err.message);
      }
    };
    fetchDeviceList();
  }, []);

  // Auto-pan map when playing
  useEffect(() => {
    if (isPlaying && trackingData[currentIndex] && mapRef.current) {
      const position = {
        lat: trackingData[currentIndex].lat,
        lng: trackingData[currentIndex].lng,
      };

      // Check if PanTo is available
      if (typeof mapRef.current.panTo === "function") {
        mapRef.current.panTo(position);
      } else {
        setCenter(position);
      }
    }
  }, [currentIndex, isPlaying, trackingData]);

  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);

  const toggleDeviceSelection = (deviceId) => {
    setSelectedDeviceIds((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : [...prev, deviceId],
    );
  };

  const [filterType, setFilterType] = useState("all");
  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setAllData([]); // Clear previous data
      setTrackingData([]); // Clear map
      setCurrentIndex(0); // Reset playback
      try {
        // Convert datetime-local format to API format
        const startFormatted = startDateTime.replace("T", " ") + ":00";
        const endFormatted = endDateTime.replace("T", " ") + ":59";

        if (filterType === "all") {
          const queryParams = new URLSearchParams({
            startTime: startFormatted,
            endTime: endFormatted,
            nopaging: "true",
          });

          if (selectedDeviceIds.length > 0) {
            queryParams.append("device_ids", selectedDeviceIds.join(","));
          }

          const response = await fetch(
            `${API_URL_FOR_ALL_PACKETS}?${queryParams}`,
          );
          if (!response.ok) throw new Error("Failed to fetch tracking data");
          const json = await response.json();

          // Flatten data: API returns { data: [ { deviceId, logs: [] }, ... ] }
          const rawPackets = Array.isArray(json)
            ? json
            : json.data && Array.isArray(json.data) && json.data[0]?.logs
              ? json.data.flatMap((d) => d.logs || [])
              : json.data || [];

          setAllData(rawPackets);
          // Process data immediately after fetching
          processAndSetData(rawPackets);
        } else {
          const queryParams = new URLSearchParams({
            startTime: startFormatted,
            endTime: endFormatted,
            nopaging: "true", // Ensure we get all points for the track
          });

          const response = await fetch(
            `${API_URL_FOR_PARSED_PACKETS}?${queryParams}`,
          );
          if (!response.ok) throw new Error("Failed to fetch tracking data");
          const json = await response.json();
          // Handle if response is array or object with packets key
          const rawPackets = Array.isArray(json) ? json : json.data || [];
          console.log({ rawPackets });
          setAllData(rawPackets);
          // Process data immediately after fetching
          processAndSetData(rawPackets);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startDateTime, endDateTime, filterType, selectedDeviceIds]);

  const processAndSetData = (packets) => {
    let tripCount = 0;
    let isStopped = true;

    const filtered = packets
      .filter((p) => {
        // Handle both messageIdHex and messageId
        const msgId = p.messageIdHex || p.messageId;
        // If data comes from database, it's already filtered to GPS records, 
        // so we don't strictly require msgId to be 0200 if it's missing.
        if (msgId && msgId !== "0200") return false;
        return true;
      })
      .map((p, index) => {
        // Extract data from top-level or detailed.body.parsed
        const parsed = p.detailed?.body?.parsed || {};

        const lat = p.latitude ?? parsed.latitude ?? 0;
        const lon = p.longitude ?? parsed.longitude ?? 0;
        const speed = p.speed ?? parsed.speed ?? 0;
        const mileageVal = p.mileage ?? parsed.mileage ?? 0;

        return {
          id: index + 1,
          timestamp: p.gps_time || p.timestamp,
          time: (p.gps_time || p.timestamp).split(" ")[1],
          date: (p.gps_time || p.timestamp).split(" ")[0],
          lat: Number(lat),
          lng: Number(lon),
          speed: Number(speed),
          status: Number(speed) > 0 ? "Moving" : "Stopped",
          mileage: `${Number(mileageVal).toFixed(1)}km`,
          rawMileage: Number(mileageVal),
        };
      })
      .reverse() // Sort chronologically
      .map((p, index, arr) => {
        // Detect trip changes (Start moving after being stopped)
        if (p.speed > 0 && isStopped) {
          tripCount++;
          isStopped = false;
        } else if (p.speed === 0) {
          isStopped = true;
        }

        // Apply a small offset based on trip number to separate overlapping lines
        // 0.00008 is approx 8-10 meters. We alternate offset directions.
        const offset = (tripCount - 1) * 0.00008;

        return {
          ...p,
          tripId: tripCount,
          lat: p.lat + offset,
          lng: p.lng + offset,
        };
      });

    setTrackingData(filtered);
    if (filtered.length > 0) {
      setCenter({ lat: filtered[0].lat, lng: filtered[0].lng });
    }
  };

  const getSpeedColor = useCallback(
    (speed) => {
      if (speed < thresholds.low) return SPEED_COLORS.low;
      if (speed < thresholds.normal) return SPEED_COLORS.normal;
      if (speed < thresholds.over) return SPEED_COLORS.over;
      return SPEED_COLORS.critical;
    },
    [thresholds],
  );

  const getPixelPositionOffset = useCallback(() => ({ x: -20, y: -20 }), []);

  // Group data into segments by speed for colored polyline
  const segments = useMemo(() => {
    if (trackingData.length < 2) return [];
    const colorSegments = [];
    let currentSegment = {
      path: [{ lat: trackingData[0].lat, lng: trackingData[0].lng }],
      color: getSpeedColor(trackingData[0].speed),
      tripId: trackingData[0].tripId,
    };

    for (let i = 1; i < trackingData.length; i++) {
      const point = trackingData[i];
      const color = getSpeedColor(point.speed);

      // Breakdown segment if color OR trip changes
      if (
        color === currentSegment.color &&
        point.tripId === currentSegment.tripId
      ) {
        currentSegment.path.push({ lat: point.lat, lng: point.lng });
      } else {
        colorSegments.push(currentSegment);
        currentSegment = {
          path: [
            { lat: trackingData[i - 1].lat, lng: trackingData[i - 1].lng }, // Add previous point to close gap
            { lat: point.lat, lng: point.lng },
          ],
          color: color,
          tripId: point.tripId,
        };
      }
    }
    colorSegments.push(currentSegment);
    return colorSegments;
  }, [trackingData, getSpeedColor]);

  // Identify Stops (Points where speed is 0)
  const stops = useMemo(() => {
    const result = [];
    let currentStop = null;

    trackingData.forEach((p, idx) => {
      if (p.speed === 0) {
        if (!currentStop) {
          currentStop = {
            ...p,
            startTime: p.timestamp,
            stopIndex: idx,
            count: 1,
          };
        } else {
          currentStop.endTime = p.timestamp;
          currentStop.count++;
        }
      } else {
        if (currentStop && currentStop.count > 5) {
          // Only count as stop if it stays for some time
          // Revisit detection (~50m threshold)
          const isRevisit = result.some(
            (prev) =>
              Math.abs(prev.lat - currentStop.lat) < 0.0005 &&
              Math.abs(prev.lng - currentStop.lng) < 0.0005,
          );
          result.push({ ...currentStop, isRevisit });
        }
        currentStop = null;
      }
    });

    if (currentStop && currentStop.count > 5) {
      const isRevisit = result.some(
        (prev) =>
          Math.abs(prev.lat - currentStop.lat) < 0.0005 &&
          Math.abs(prev.lng - currentStop.lng) < 0.0005,
      );
      result.push({ ...currentStop, isRevisit });
    }
    return result;
  }, [trackingData]);

  // Playback
  useEffect(() => {
    if (isPlaying && trackingData.length > 0) {
      playInterval.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= trackingData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackInterval);
    } else {
      clearInterval(playInterval.current);
    }
    return () => clearInterval(playInterval.current);
  }, [isPlaying, trackingData, playbackInterval]);

  // Quick Date Helpers
  const setQuickDate = (type) => {
    const today = new Date();
    const start = new Date();

    if (type === "Today") {
      start.setHours(0, 0, 0, 0);
      today.setHours(23, 59, 0, 0);
    } else if (type === "Yesterday") {
      start.setDate(today.getDate() - 1);
      today.setDate(today.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      today.setHours(23, 59, 0, 0);
    } else if (type === "ThisWeek") {
      start.setDate(today.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      today.setHours(23, 59, 0, 0);
    } else if (type === "LastWeek") {
      start.setDate(today.getDate() - 14);
      today.setDate(today.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      today.setHours(23, 59, 0, 0);
    }

    setStartDateTime(start.toISOString().slice(0, 16));
    setEndDateTime(today.toISOString().slice(0, 16));
  };

  // Calculate duration helper for tooltip
  const getDurationString = (index) => {
    if (index < 0 || !trackingData[index]) return "0s";
    const current = trackingData[index];
    let firstIndex = index;

    // Find the first point in this state sequence (same status and trip)
    for (let i = index - 1; i >= 0; i--) {
      if (
        trackingData[i].status === current.status &&
        trackingData[i].tripId === current.tripId
      ) {
        firstIndex = i;
      } else {
        break;
      }
    }

    const start = new Date(trackingData[firstIndex].timestamp);
    const end = new Date(current.timestamp);
    const diff = Math.abs(end - start) / 1000; // seconds

    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = Math.floor(diff % 60);

    let res = "";
    if (h > 0) res += `${h}h `;
    if (m > 0 || h > 0) res += `${m} Minute `;
    res += `${s} Second`;
    return res;
  };

  const currentPos = trackingData[currentIndex] || {
    lat: 0,
    lng: 0,
    status: "N/A",
    time: "00:00:00",
    speed: 0,
    mileage: "0km",
    rawMileage: 0,
  };

  // Calculate rotation
  const getRotation = () => {
    if (
      currentIndex > 0 &&
      trackingData[currentIndex] &&
      trackingData[currentIndex - 1]
    ) {
      const p1 = trackingData[currentIndex - 1];
      const p2 = trackingData[currentIndex];
      const angle =
        Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * (180 / Math.PI);
      return angle;
    }
    return 0;
  };

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
      <div className="app-container">
        {/* --- SIDEBAR --- */}
        <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <h1 className="sidebar-title">Playback</h1>
            <button
              className="close-sidebar-btn"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={24} />
            </button>
          </div>

          <div className="sidebar-content">
            {/* Device Info */}
            <div className="section">
              <div className="input-group" style={{ position: "relative" }}>
                <div
                  className="text-input"
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  onClick={() => setIsDeviceDropdownOpen(!isDeviceDropdownOpen)}
                >
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      marginRight: "8px",
                      color:
                        selectedDeviceIds.length > 0 ? "#334155" : "#94a3b8",
                    }}
                  >
                    {selectedDeviceIds.length > 0
                      ? `${selectedDeviceIds.length} Selected`
                      : "Select Devices"}
                  </span>
                  <ChevronDown size={16} color="#94a3b8" />
                </div>

                {isDeviceDropdownOpen && (
                  <div
                    className="device-dropdown"
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.5rem",
                      zIndex: 50,
                      maxHeight: "200px",
                      overflowY: "auto",
                      marginTop: "4px",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                  >
                    {deviceList.length === 0 && (
                      <div style={{ padding: "8px 12px", color: "#94a3b8" }}>
                        No devices found
                      </div>
                    )}
                    {deviceList.map((device) => (
                      <div
                        key={device}
                        onClick={() => toggleDeviceSelection(device)}
                        style={{
                          padding: "8px 12px",
                          cursor: "pointer",
                          backgroundColor: selectedDeviceIds.includes(device)
                            ? "#eff6ff"
                            : "transparent",
                          color: selectedDeviceIds.includes(device)
                            ? "#3b82f6"
                            : "#334155",
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDeviceIds.includes(device)}
                          readOnly
                          style={{ cursor: "pointer" }}
                        />
                        {device}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="locate-type-tags">
                <span className="tag-active">GPS+BDS/LBS/WIFI</span>
                <span className="tag">GPS+BDS</span>
              </div>
            </div>

            {/* Date Selection */}
            <div className="section">
              <div className="date-label">February 2026</div>
              <div className="calendar-mini">
                {/* Mock calendar for visual alignment */}
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <span key={d} className="cal-day">
                    {d}
                  </span>
                ))}
                {[...Array(31)].map((_, i) => (
                  <span
                    key={i}
                    className="cal-date"
                    style={{
                      color: i + 1 === 7 ? "#3b82f6" : "#334155",
                      fontWeight: i + 1 === 7 ? "bold" : "normal",
                    }}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
              <div className="date-time-field">
                <label className="field-label">*Time for start:</label>
                <input
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  className="date-time-input"
                />
              </div>
              <div className="date-time-field">
                <label className="field-label">*Time for end:</label>
                <input
                  type="datetime-local"
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                  className="date-time-input"
                />
              </div>
            </div>

            {/* Playback Controls */}
            <div className="section">
              <div className="control-row">
                <span className="label">Speed:</span>
                <select
                  value={playbackInterval}
                  onChange={(e) =>
                    setPlaybackInterval(parseInt(e.target.value, 10))
                  }
                  className="select-input"
                >
                  <option value={100}>10x Fast (0.1s)</option>
                  <option value={200}>5x Fast (0.2s)</option>
                  <option value={500}>2x Fast (0.5s)</option>
                  <option value={1000}>Normal (1s)</option>
                  <option value={2000}>Slow (2s)</option>
                  <option value={5000}>Slower (5s)</option>
                  <option value={10000}>Very Slow (10s)</option>
                  <option value={20000}>Extra Slow (20s)</option>
                  <option value={30000}>Super Slow (30s)</option>
                </select>
              </div>
              <div className="control-row">
                <span className="label">Play Tooltip:</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={showPlayTooltip}
                    onChange={(e) => setShowPlayTooltip(e.target.checked)}
                  />
                  <span className="slider-round"></span>
                </label>
              </div>

              {/* Legends */}
              <div className="legend-wrapper">
                <div className="threshold-badges">
                  <div className="input-badge-wrapper">
                    <input
                      type="number"
                      value={thresholds.low}
                      onChange={(e) =>
                        setThresholds({
                          ...thresholds,
                          low: parseInt(e.target.value) || 0,
                        })
                      }
                      className="speed-input"
                      style={{
                        backgroundColor: SPEED_COLORS.low,
                      }}
                    />
                    <span className="unit">km/h</span>
                  </div>
                  <div className="input-badge-wrapper">
                    <input
                      type="number"
                      value={thresholds.normal}
                      onChange={(e) =>
                        setThresholds({
                          ...thresholds,
                          normal: parseInt(e.target.value) || 0,
                        })
                      }
                      className="speed-input"
                      style={{
                        backgroundColor: SPEED_COLORS.normal,
                      }}
                    />
                    <span className="unit">km/h</span>
                  </div>
                  <div className="input-badge-wrapper">
                    <input
                      type="number"
                      value={thresholds.over}
                      onChange={(e) =>
                        setThresholds({
                          ...thresholds,
                          over: parseInt(e.target.value) || 0,
                        })
                      }
                      className="speed-input"
                      style={{
                        backgroundColor: SPEED_COLORS.over,
                      }}
                    />
                    <span className="unit">km/h</span>
                  </div>
                </div>
                <div className="legend-container">
                  <div className="legend-item">
                    <span
                      className="dot"
                      style={{
                        backgroundColor: SPEED_COLORS.low,
                      }}
                    ></span>
                    <span className="legend-text">lowSpeed</span>
                  </div>
                  <div className="legend-item">
                    <span
                      className="dot"
                      style={{
                        backgroundColor: SPEED_COLORS.normal,
                      }}
                    ></span>
                    <span className="legend-text">normal</span>
                  </div>
                  <div className="legend-item">
                    <span
                      className="dot"
                      style={{
                        backgroundColor: SPEED_COLORS.over,
                      }}
                    ></span>
                    <span className="legend-text">OverSpeed</span>
                  </div>
                  <div className="legend-item">
                    <span
                      className="dot"
                      style={{
                        backgroundColor: SPEED_COLORS.critical,
                      }}
                    ></span>
                    <span className="legend-text">OverSpeed (1.5)</span>
                  </div>
                  <div className="legend-item">
                    <span
                      className="dot"
                      style={{ backgroundColor: "#f97316" }}
                    ></span>
                    <span className="legend-text">Revisit</span>
                  </div>
                </div>
              </div>

              {/* Quick Date Selectors */}
              <div className="quick-dates">
                <button
                  onClick={() => setQuickDate("LastWeek")}
                  className="quick-btn"
                >
                  Last...
                </button>
                <button
                  onClick={() => setQuickDate("ThisWeek")}
                  className="quick-btn"
                >
                  This...
                </button>
                <button className="quick-btn">Before...</button>
                <button
                  onClick={() => setQuickDate("Yesterday")}
                  className="quick-btn"
                >
                  Yester...
                </button>
                <button
                  onClick={() => setQuickDate("Today")}
                  className="quick-btn"
                >
                  Today
                </button>
              </div>

              <button
                className="start-btn"
                style={{
                  backgroundColor: isPlaying ? "#ef4444" : "#3b82f6",
                }}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                {isPlaying ? "STOP" : "START"}
              </button>
            </div>

            {/* Event List */}
            <div className="tabs">
              <span className="tab-active">Remain(2)</span>
              <span className="tab">event(0)</span>
            </div>
            <div className="event-list">
              {stops.map((stop, ix) => (
                <div
                  key={ix}
                  className="event-item"
                  style={{
                    borderLeft: stop.isRevisit ? "4px solid #f97316" : "none",
                  }}
                >
                  <div
                    className="event-pin"
                    style={{
                      backgroundColor: stop.isRevisit ? "#f97316" : "#3b82f6",
                    }}
                  >
                    P{ix + 1}
                  </div>
                  <div className="event-detail">
                    <p className="event-addr">
                      {stop.isRevisit
                        ? "🔄 REVISITED LOCATION"
                        : "London Borough of Barking and Dagenham..."}
                    </p>
                    <p className="event-time">
                      {stop.startTime} - {stop.endTime || "Ongoing"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* --- MAP AREA --- */}
        <main className="map-area">
          {loading && (
            <div className="map-loader-overlay">
              <Loader2 size={48} className="animate-spin" color="#3b82f6" />
              <p>Loading GPS Data...</p>
            </div>
          )}
          {!isSidebarOpen && (
            <button
              className="menu-toggle"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} color="#334155" />
            </button>
          )}
          {/* Map Header Overlay */}
          <div className="map-header">
            <div className="map-actions">
              <button className="map-btn-active">Map</button>
              <button className="map-btn">Satellite</button>
              <button className="map-btn">Bing</button>
            </div>
            <div className="map-right-actions">
              <button className="top-btn" onClick={toggleTheme}>
                {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <Link
                to="/dashcam"
                className="top-btn"
                style={{
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <VideoIcon size={16} /> Dashcam
              </Link>
              <button className="top-btn">AllView location</button>
              <button className="top-btn">View Speed Graph</button>
              <button className="top-btn-active">Detail</button>
              <button className="top-btn">Print</button>
            </div>
          </div>

          <GoogleMap
            key={`map-${trackingData.length}`}
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={17}
            onLoad={onMapLoad}
            options={{ disableDefaultUI: false }}
          >
            {/* Colored Segments */}
            {segments.map((seg, i) => (
              <Polyline
                key={i}
                path={seg.path}
                options={{
                  strokeColor: seg.color,
                  strokeOpacity: 1,
                  strokeWeight: 5,
                  icons: [
                    {
                      icon: {
                        path: "M 0,-1 L 1,1 L -1,1 z", // Custom arrow shape
                        fillOpacity: 1,
                        fillColor: seg.color,
                        strokeWeight: 1,
                        scale: 3,
                      },
                      offset: "50px",
                      repeat: "100px",
                    },
                  ],
                }}
              />
            ))}

            {/* Stop Markers */}
            {stops.map((stop, i) => (
              <Marker
                key={i}
                position={{ lat: stop.lat, lng: stop.lng }}
                label={{
                  text: `P${i + 1}`,
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "12px",
                }}
                icon={stop.isRevisit ? REVISIT_ICON : undefined}
                onClick={() => setSelectedPoint(stop)}
              />
            ))}

            {/* Current Position (Custom Rotatable Car Image) */}
            {trackingData.length > 0 && (
              <OverlayView
                position={{ lat: currentPos.lat, lng: currentPos.lng }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                getPixelPositionOffset={getPixelPositionOffset}
              >
                <div
                  style={{
                    transform: `rotate(${getRotation()}deg)`,
                    width: "40px",
                    height: "40px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onClick={() => setSelectedPoint(currentPos)}
                >
                  <img
                    src="https://d1a3f4spazzrp4.cloudfront.net/car-types/mapIconsStandard/car_bag_x_2d.png"
                    alt="Car"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>
              </OverlayView>
            )}

            {/* Automated Play Tooltip */}
            {(isPlaying || currentIndex > 0) &&
              showPlayTooltip &&
              trackingData.length > 0 && (
                <InfoWindow
                  position={{ lat: currentPos.lat, lng: currentPos.lng }}
                  options={{
                    disableAutoPan: true,
                    pixelOffset: new window.google.maps.Size(0, -20),
                  }}
                >
                  <div className="tooltip-play">
                    <p className="tooltip-line">
                      <strong>Device name:</strong> JT8088985963
                    </p>
                    <p className="tooltip-line">
                      <strong>Speed:</strong> {currentPos.speed}Km/h
                    </p>
                    <p className="tooltip-line">
                      <strong>Mileage:</strong>{" "}
                      {currentPos.rawMileage.toFixed(3)}Kilometer
                    </p>
                    <p className="tooltip-line">
                      <strong>Locate:</strong> {currentPos.timestamp}
                    </p>
                    <p className="tooltip-line">
                      <strong>Duration:</strong>{" "}
                      {getDurationString(currentIndex)}
                    </p>
                  </div>
                </InfoWindow>
              )}

            {/* Tooltip */}
            {selectedPoint && (
              <InfoWindow
                position={{ lat: selectedPoint.lat, lng: selectedPoint.lng }}
                onCloseClick={() => setSelectedPoint(null)}
              >
                <div className="tooltip-custom">
                  <p>
                    <strong>No. :</strong> P1
                  </p>
                  <p>
                    <strong>Device name :</strong> JT8088985963
                  </p>
                  <p>
                    <strong>Speed :</strong> {selectedPoint.speed} km/h
                  </p>
                  <p>
                    <strong>Remain :</strong>{" "}
                    {selectedPoint.count > 1
                      ? `${Math.floor(selectedPoint.count / 60)}h ${selectedPoint.count % 60}m`
                      : "0m"}
                  </p>
                  <p>
                    <strong>Start :</strong>{" "}
                    {selectedPoint.startTime || selectedPoint.timestamp}
                  </p>
                  {selectedPoint.endTime && (
                    <p>
                      <strong>Stop :</strong> {selectedPoint.endTime}
                    </p>
                  )}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>

          {/* Bottom Progress Overlay */}
          <div className="bottom-stats">
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${trackingData.length > 0 ? (currentIndex / (trackingData.length - 1)) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="stats-bar">
              <span>Time: {currentPos.timestamp}</span>
              <span>Speed: {currentPos.speed} km/h</span>
              <span>Mileage: {currentPos.mileage}</span>
              <button onClick={() => setCurrentIndex(0)} className="reset-btn">
                <RotateCcw size={14} /> Reset
              </button>
            </div>
          </div>
        </main>
      </div>
    </LoadScript>
  );
}
