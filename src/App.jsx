import {
  GoogleMap,
  InfoWindow,
  LoadScript,
  Marker,
  Polyline,
  OverlayView,
} from "@react-google-maps/api";
import { Loader2, Pause, Play, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// =========================================================================
// 1. CONFIGURATION
// =========================================================================
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAP_API;
const API_URL = "https://gps.quickreview.app/api-proxy/api/parse";

const mapContainerStyle = { width: "100%", height: "100%" };

// Speed Color Configuration
const SPEED_COLORS = {
  low: "#3b82f6", // Blue: < 20 km/h
  normal: "#22c55e", // Green: 20-80 km/h
  over: "#ef4444", // Red: 80-120 km/h
  critical: "#7f1d1d", // Dark Red: > 120 km/h
};

const getSpeedColor = (speed) => {
  if (speed < 20) return SPEED_COLORS.low;
  if (speed < 80) return SPEED_COLORS.normal;
  if (speed < 120) return SPEED_COLORS.over;
  return SPEED_COLORS.critical;
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

export default function App() {
  const [trackingData, setTrackingData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default to last 7 days for a better initial view
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [center, setCenter] = useState({ lat: 51.5278, lng: 0.0694 });
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [thresholds, setThresholds] = useState({
    low: 20,
    normal: 80,
    over: 120,
  });
  const [showPlayTooltip, setShowPlayTooltip] = useState(true);
  const playInterval = useRef(null);
  const mapRef = useRef(null);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
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

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Failed to fetch tracking data");
        const json = await response.json();
        const rawPackets = json.packets || [];
        setAllData(rawPackets);
        processAndSetData(rawPackets, startDate, endDate);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (allData.length > 0) {
      processAndSetData(allData, startDate, endDate);
      setCurrentIndex(0);
      setIsPlaying(false);
    }
  }, [startDate, endDate]);

  const processAndSetData = (packets, start, end) => {
    let tripCount = 0;
    let isStopped = true;

    const filtered = packets
      .filter((p) => {
        if (p.messageIdHex !== "0200") return false;
        const packetDate = p.timestamp.split(" ")[0];
        return packetDate >= start && packetDate <= end;
      })
      .map((p, index) => {
        const lat =
          p.detailed?.body?.latitude?.degrees ||
          p.detailed?.body?.latitude?.decimal / 1000000;
        const lon =
          p.detailed?.body?.longitude?.degrees ||
          p.detailed?.body?.longitude?.decimal / 1000000;
        const speed = p.detailed?.body?.speed?.decimal || 0;
        const mileage = p.detailed?.body?.mileage?.decimal
          ? (p.detailed.body.mileage.decimal / 10).toFixed(1)
          : 0;

        return {
          id: index + 1,
          timestamp: p.timestamp,
          time: p.timestamp.split(" ")[1],
          date: p.timestamp.split(" ")[0],
          lat,
          lng: lon,
          speed,
          status: speed > 0 ? "Moving" : "Stopped",
          mileage: `${mileage}km`,
          rawMileage: parseFloat(mileage),
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
      }, 1000 / playbackSpeed);
    } else {
      clearInterval(playInterval.current);
    }
    return () => clearInterval(playInterval.current);
  }, [isPlaying, trackingData, playbackSpeed]);

  // Quick Date Helpers
  const setQuickDate = (type) => {
    const today = new Date();
    const start = new Date();

    if (type === "Today") {
      // Already set
    } else if (type === "Yesterday") {
      start.setDate(today.getDate() - 1);
      today.setDate(today.getDate() - 1);
    } else if (type === "ThisWeek") {
      start.setDate(today.getDate() - 7);
    } else if (type === "LastWeek") {
      start.setDate(today.getDate() - 14);
      today.setDate(today.getDate() - 7);
    }

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
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

  if (loading)
    return (
      <div style={styles.loaderContainer}>
        <Loader2 size={48} className="animate-spin" color="#3b82f6" />
        <p>Loading GPS Data...</p>
      </div>
    );

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
      <div style={styles.appContainer}>
        {/* --- SIDEBAR --- */}
        <aside style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <h1 style={styles.sidebarTitle}>Playback</h1>
          </div>

          <div style={styles.sidebarContent}>
            {/* Device Info */}
            <div style={styles.section}>
              <div style={styles.inputGroup}>
                <Search size={16} color="#94a3b8" />
                <input
                  style={styles.textInput}
                  placeholder="Input Name or IMEI No."
                  defaultValue="JT8088985963"
                />
              </div>
              <div style={styles.locateTypeTags}>
                <span style={styles.tagActive}>GPS+BDS/LBS/WIFI</span>
                <span style={styles.tag}>GPS+BDS</span>
              </div>
            </div>

            {/* Date Selection */}
            <div style={styles.section}>
              <div style={styles.dateLabel}>February 2026</div>
              <div style={styles.calendarMini}>
                {/* Mock calendar for visual alignment */}
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <span key={d} style={styles.calDay}>
                    {d}
                  </span>
                ))}
                {[...Array(31)].map((_, i) => (
                  <span
                    key={i}
                    style={{
                      ...styles.calDate,
                      color: i + 1 === 7 ? "#3b82f6" : "#334155",
                      fontWeight: i + 1 === 7 ? "bold" : "normal",
                    }}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
              <div style={styles.dateTimeField}>
                <label style={styles.fieldLabel}>*Time for start:</label>
                <input
                  type="datetime-local"
                  value={`${startDate}T00:00`}
                  onChange={(e) => setStartDate(e.target.value.split("T")[0])}
                  style={styles.dateTimeInput}
                />
              </div>
              <div style={styles.dateTimeField}>
                <label style={styles.fieldLabel}>*Time for end:</label>
                <input
                  type="datetime-local"
                  value={`${endDate}T23:59`}
                  onChange={(e) => setEndDate(e.target.value.split("T")[0])}
                  style={styles.dateTimeInput}
                />
              </div>
            </div>

            {/* Playback Controls */}
            <div style={styles.section}>
              <div style={styles.controlRow}>
                <span style={styles.label}>Speed:</span>
                <div style={styles.speedSliderContainer}>
                  <span style={styles.speedText}>Slow</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
                    style={styles.slider}
                  />
                  <span style={styles.speedText}>Fast</span>
                </div>
              </div>
              <div style={styles.controlRow}>
                <span style={styles.label}>Play Tooltip:</span>
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
              <div style={styles.legendWrapper}>
                <div style={styles.thresholdBadges}>
                  <div style={styles.inputBadgeWrapper}>
                    <input
                      type="number"
                      value={thresholds.low}
                      onChange={(e) =>
                        setThresholds({
                          ...thresholds,
                          low: parseInt(e.target.value) || 0,
                        })
                      }
                      style={{
                        ...styles.speedInput,
                        backgroundColor: SPEED_COLORS.low,
                      }}
                    />
                    <span style={styles.unit}>km/h</span>
                  </div>
                  <div style={styles.inputBadgeWrapper}>
                    <input
                      type="number"
                      value={thresholds.normal}
                      onChange={(e) =>
                        setThresholds({
                          ...thresholds,
                          normal: parseInt(e.target.value) || 0,
                        })
                      }
                      style={{
                        ...styles.speedInput,
                        backgroundColor: SPEED_COLORS.normal,
                      }}
                    />
                    <span style={styles.unit}>km/h</span>
                  </div>
                  <div style={styles.inputBadgeWrapper}>
                    <input
                      type="number"
                      value={thresholds.over}
                      onChange={(e) =>
                        setThresholds({
                          ...thresholds,
                          over: parseInt(e.target.value) || 0,
                        })
                      }
                      style={{
                        ...styles.speedInput,
                        backgroundColor: SPEED_COLORS.over,
                      }}
                    />
                    <span style={styles.unit}>km/h</span>
                  </div>
                </div>
                <div style={styles.legendContainer}>
                  <div style={styles.legendItem}>
                    <span
                      style={{
                        ...styles.dot,
                        backgroundColor: SPEED_COLORS.low,
                      }}
                    ></span>
                    <span style={styles.legendText}>lowSpeed</span>
                  </div>
                  <div style={styles.legendItem}>
                    <span
                      style={{
                        ...styles.dot,
                        backgroundColor: SPEED_COLORS.normal,
                      }}
                    ></span>
                    <span style={styles.legendText}>normal</span>
                  </div>
                  <div style={styles.legendItem}>
                    <span
                      style={{
                        ...styles.dot,
                        backgroundColor: SPEED_COLORS.over,
                      }}
                    ></span>
                    <span style={styles.legendText}>OverSpeed</span>
                  </div>
                  <div style={styles.legendItem}>
                    <span
                      style={{
                        ...styles.dot,
                        backgroundColor: SPEED_COLORS.critical,
                      }}
                    ></span>
                    <span style={styles.legendText}>OverSpeed (1.5)</span>
                  </div>
                  <div style={styles.legendItem}>
                    <span
                      style={{ ...styles.dot, backgroundColor: "#f97316" }}
                    ></span>
                    <span style={styles.legendText}>Revisit</span>
                  </div>
                </div>
              </div>

              {/* Quick Date Selectors */}
              <div style={styles.quickDates}>
                <button
                  onClick={() => setQuickDate("LastWeek")}
                  style={styles.quickBtn}
                >
                  Last...
                </button>
                <button
                  onClick={() => setQuickDate("ThisWeek")}
                  style={styles.quickBtn}
                >
                  This...
                </button>
                <button style={styles.quickBtn}>Before...</button>
                <button
                  onClick={() => setQuickDate("Yesterday")}
                  style={styles.quickBtn}
                >
                  Yester...
                </button>
                <button
                  onClick={() => setQuickDate("Today")}
                  style={styles.quickBtn}
                >
                  Today
                </button>
              </div>

              <button
                style={{
                  ...styles.startBtn,
                  backgroundColor: isPlaying ? "#ef4444" : "#3b82f6",
                }}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                {isPlaying ? "STOP" : "START"}
              </button>
            </div>

            {/* Event List */}
            <div style={styles.tabs}>
              <span style={styles.tabActive}>Remain(2)</span>
              <span style={styles.tab}>event(0)</span>
            </div>
            <div style={styles.eventList}>
              {stops.map((stop, ix) => (
                <div
                  key={ix}
                  style={{
                    ...styles.eventItem,
                    borderLeft: stop.isRevisit ? "4px solid #f97316" : "none",
                  }}
                >
                  <div
                    style={{
                      ...styles.eventPin,
                      backgroundColor: stop.isRevisit ? "#f97316" : "#3b82f6",
                    }}
                  >
                    P{ix + 1}
                  </div>
                  <div style={styles.eventDetail}>
                    <p style={styles.eventAddr}>
                      {stop.isRevisit
                        ? "🔄 REVISITED LOCATION"
                        : "London Borough of Barking and Dagenham..."}
                    </p>
                    <p style={styles.eventTime}>
                      {stop.startTime} - {stop.endTime || "Ongoing"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* --- MAP AREA --- */}
        <main style={styles.mapArea}>
          {/* Map Header Overlay */}
          <div style={styles.mapHeader}>
            <div style={styles.mapActions}>
              <button style={styles.mapBtnActive}>Map</button>
              <button style={styles.mapBtn}>Satellite</button>
              <button style={styles.mapBtn}>Bing</button>
            </div>
            <div style={styles.mapRightActions}>
              <button style={styles.topBtn}>AllView location</button>
              <button style={styles.topBtn}>View Speed Graph</button>
              <button style={styles.topBtnActive}>Detail</button>
              <button style={styles.topBtn}>Print</button>
            </div>
          </div>

          <GoogleMap
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
                  <div style={styles.tooltipPlay}>
                    <p style={styles.tooltipLine}>
                      <strong>Device name:</strong> JT8088985963
                    </p>
                    <p style={styles.tooltipLine}>
                      <strong>Speed:</strong> {currentPos.speed}Km/h
                    </p>
                    <p style={styles.tooltipLine}>
                      <strong>Mileage:</strong>{" "}
                      {currentPos.rawMileage.toFixed(3)}Kilometer
                    </p>
                    <p style={styles.tooltipLine}>
                      <strong>Locate:</strong> {currentPos.timestamp}
                    </p>
                    <p style={styles.tooltipLine}>
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
                <div style={styles.tooltip}>
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
          <div style={styles.bottomStats}>
            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${trackingData.length > 0 ? (currentIndex / (trackingData.length - 1)) * 100 : 0}%`,
                }}
              />
            </div>
            <div style={styles.statsBar}>
              <span>Time: {currentPos.timestamp}</span>
              <span>Speed: {currentPos.speed} km/h</span>
              <span>Mileage: {currentPos.mileage}</span>
              <button
                onClick={() => setCurrentIndex(0)}
                style={styles.resetBtn}
              >
                <RotateCcw size={14} /> Reset
              </button>
            </div>
          </div>
        </main>
      </div>
    </LoadScript>
  );
}

const styles = {
  appContainer: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    overflow: "hidden",
  },
  sidebar: {
    width: "320px",
    height: "100%",
    backgroundColor: "#ffffff",
    borderRight: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    zIndex: 20,
  },
  sidebarHeader: {
    padding: "16px",
    backgroundColor: "#3b82f6",
    color: "white",
  },
  sidebarTitle: {
    fontSize: "20px",
    fontWeight: "600",
    margin: 0,
  },
  sidebarContent: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    paddingBottom: "16px",
    borderBottom: "1px solid #f1f5f9",
  },
  inputGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#f8fafc",
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
  },
  textInput: {
    border: "none",
    backgroundColor: "transparent",
    fontSize: "13px",
    outline: "none",
    width: "100%",
    color: "#00cc00",
    fontWeight: "bold",
  },
  locateTypeTags: {
    display: "flex",
    gap: "4px",
  },
  tagActive: {
    backgroundColor: "#3b82f6",
    color: "white",
    fontSize: "11px",
    padding: "4px 8px",
    borderRadius: "4px",
    cursor: "pointer",
  },
  tag: {
    backgroundColor: "#f1f5f9",
    color: "#64748b",
    fontSize: "11px",
    padding: "4px 8px",
    borderRadius: "4px",
    cursor: "pointer",
  },
  dateLabel: {
    textAlign: "center",
    fontSize: "14px",
    fontWeight: "bold",
    color: "#1e293b",
    padding: "4px 0",
  },
  calendarMini: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "4px",
    fontSize: "11px",
    textAlign: "center",
  },
  calDay: { color: "#00cc00", fontWeight: "bold" },
  calDate: { padding: "2px" },
  dateTimeField: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  fieldLabel: {
    fontSize: "11px",
    color: "#ef4444",
  },
  dateTimeInput: {
    fontSize: "12px",
    padding: "4px",
    borderRadius: "4px",
    border: "1px solid #e2e8f0",
  },
  controlRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
  },
  label: { minWidth: "80px", color: "#64748b" },
  speedSliderContainer: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  speedText: { fontSize: "10px", color: "#94a3b8" },
  slider: { flex: 1 },
  select: {
    flex: 1,
    padding: "4px",
    fontSize: "12px",
    borderRadius: "4px",
    border: "1px solid #e2e8f0",
  },
  legendWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "8px",
  },
  thresholdBadges: {
    display: "flex",
    gap: "4px",
  },
  inputBadgeWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
    backgroundColor: "#f1f5f9",
    paddingRight: "4px",
    borderRadius: "4px",
    overflow: "hidden",
  },
  speedInput: {
    width: "40px",
    fontSize: "10px",
    color: "white",
    padding: "2px 4px",
    border: "none",
    fontWeight: "bold",
    outline: "none",
    textAlign: "center",
  },
  unit: {
    fontSize: "8px",
    color: "#64748b",
    fontWeight: "bold",
  },
  legendContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  dot: {
    width: "24px",
    height: "10px",
    borderRadius: "2px",
  },
  legendText: { fontSize: "10px", color: "#64748b" },
  quickDates: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "4px",
  },
  quickBtn: {
    fontSize: "10px",
    padding: "4px 2px",
    backgroundColor: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "4px",
    cursor: "pointer",
  },
  startBtn: {
    width: "100%",
    padding: "10px",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontWeight: "bold",
    marginTop: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
  },
  tabs: {
    display: "flex",
    borderBottom: "1px solid #e2e8f0",
  },
  tabActive: {
    flex: 1,
    padding: "8px",
    textAlign: "center",
    fontSize: "12px",
    color: "#3b82f6",
    borderBottom: "2px solid #3b82f6",
    fontWeight: "bold",
  },
  tab: {
    flex: 1,
    padding: "8px",
    textAlign: "center",
    fontSize: "12px",
    color: "#64748b",
  },
  eventList: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "12px",
  },
  eventItem: {
    display: "flex",
    gap: "8px",
    padding: "8px",
    backgroundColor: "#f9fafb",
    borderRadius: "6px",
  },
  eventPin: {
    backgroundColor: "#3b82f6",
    color: "white",
    fontSize: "10px",
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    fontWeight: "bold",
  },
  eventDetail: {
    flex: 1,
  },
  eventAddr: {
    fontSize: "11px",
    margin: 0,
    color: "#334155",
  },
  eventTime: {
    fontSize: "10px",
    margin: "2px 0 0 0",
    color: "#94a3b8",
  },
  mapArea: {
    flex: 1,
    position: "relative",
    height: "100%",
  },
  mapHeader: {
    position: "absolute",
    top: "12px",
    left: "12px",
    right: "12px",
    display: "flex",
    justifyContent: "space-between",
    zIndex: 10,
  },
  mapActions: {
    display: "flex",
    backgroundColor: "white",
    padding: "4px",
    borderRadius: "6px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  },
  mapBtnActive: {
    padding: "4px 12px",
    fontSize: "13px",
    border: "none",
    backgroundColor: "white",
    color: "#334155",
    cursor: "pointer",
  },
  mapBtn: {
    padding: "4px 12px",
    fontSize: "13px",
    border: "none",
    backgroundColor: "white",
    color: "#94a3b8",
    cursor: "pointer",
  },
  mapRightActions: {
    display: "flex",
    gap: "8px",
    zIndex: 10,
  },
  topBtn: {
    padding: "4px 12px",
    fontSize: "12px",
    backgroundColor: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "4px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    cursor: "pointer",
  },
  topBtnActive: {
    padding: "4px 12px",
    fontSize: "12px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "4px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    cursor: "pointer",
  },
  bottomStats: {
    position: "absolute",
    bottom: "24px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "500px",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: "12px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    padding: "16px",
    zIndex: 15,
  },
  progressTrack: {
    width: "100%",
    height: "6px",
    backgroundColor: "#e2e8f0",
    borderRadius: "3px",
    marginBottom: "12px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    transition: "width 0.1s linear",
  },
  statsBar: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    color: "#334155",
    fontWeight: "500",
    alignItems: "center",
  },
  resetBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 8px",
    backgroundColor: "#f1f5f9",
    border: "none",
    borderRadius: "4px",
    fontSize: "11px",
    cursor: "pointer",
  },
  tooltip: {
    padding: "8px",
    fontSize: "12px",
    lineHeight: "1.6",
    minWidth: "220px",
  },
  tooltipPlay: {
    padding: "12px",
    fontSize: "12px",
    minWidth: "200px",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(10px)",
    borderRadius: "12px",
    boxShadow:
      "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    animation: "fadeInUp 0.3s ease-out",
  },
  tooltipHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
    paddingBottom: "8px",
    borderBottom: "1px solid #f1f5f9",
  },
  tooltipTitle: {
    fontWeight: "700",
    color: "#1e293b",
    fontSize: "13px",
    letterSpacing: "-0.01em",
  },
  tooltipGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  tooltipItem: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  tooltipLabel: {
    fontSize: "10px",
    color: "#64748b",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: "0.02em",
  },
  tooltipValue: {
    fontSize: "12px",
    color: "#334155",
    fontWeight: "600",
  },
  tooltipFooter: {
    marginTop: "10px",
    paddingTop: "6px",
    borderTop: "1px solid #f8fafc",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "10px",
    color: "#94a3b8",
  },
  loaderContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    width: "100vw",
    gap: "16px",
  },
};
