import {
  ArrowLeft,
  Camera,
  Grid2X2,
  Grid3X3,
  LayoutGrid,
  Maximize,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Server,
  Sun,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import DeviceCard from "../components/DeviceCard";
import DashcamAlert from "../components/DashcamAlert";
import VideoPlayer from "../components/VideoPlayer";
import MediaViewer from "../components/MediaViewer";
import deviceApi from "../services/deviceApi";

const WS_URL = import.meta.env.VITE_WS_URL;

// Mock Data
const MOCK_ALERTS = [
  {
    id: 1,
    type: "DSM",
    message: "Driver Drowsiness Detected",
    time: "20:45:12",
    deviceId: "Truck-01",
  },
  {
    id: 2,
    type: "ADAS",
    message: "Lane Departure Warning",
    time: "20:43:05",
    deviceId: "Truck-04",
  },
  {
    id: 3,
    type: "BSD",
    message: "Blind Spot Obstacle",
    time: "20:40:55",
    deviceId: "Van-02",
  },
];

// Mock Recordings Data
const MOCK_RECORDINGS = [
  {
    id: 101,
    thumbnail:
      "https://images.unsplash.com/photo-1566008885218-90abf9200ddb?w=800&q=80",
    duration: "05:23",
    time: "10:45 AM",
    location: "Downtown Ave",
    deviceId: "Truck-01",
  },
  {
    id: 102,
    thumbnail:
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&q=80",
    duration: "12:15",
    time: "09:30 AM",
    location: "Highway 55",
    deviceId: "Van-02",
  },
  {
    id: 103,
    thumbnail:
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80",
    duration: "08:42",
    time: "08:15 AM",
    location: "Industrial Park",
    deviceId: "Truck-04",
  },
];

export default function Dashcam({ theme, toggleTheme }) {
  const [gridSize, setGridSize] = useState(4); // Default 2x2
  const [alerts, setAlerts] = useState([]);
  const [devices, setDevices] = useState({ active: [], historical: [] });
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFilterOpen, setFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("live");
  const [activeChannel, setActiveChannel] = useState(2);
  const [selectedMedia, setSelectedMedia] = useState(null); // For viewing image/video

  // Live stream state: { [deviceId]: { url, channel, status: 'idle'|'loading'|'live'|'error', error } }
  const [liveStreams, setLiveStreams] = useState({});
  const activeStreamsRef = useRef({});
  const socketRef = useRef(null);

  // Fetch initial AI events
  const fetchInitialAlerts = async () => {
    try {
      const data = await deviceApi.getAiEvents({ limit: 20 });
      const formatted = (data.events || []).map((event) => {
        const date = new Date(event.event_time);
        // Format as YYYY-MM-DD HH:mm:ss in local time
        const timeStr = date
          .toLocaleString("sv-SE", { timeZone: "UTC" })
          .replace("T", " ");
        return {
          id: event.id,
          type: event.category,
          message: event.event_code,
          time: timeStr,
          deviceId: event.device_id,
          file_path: event.file_path,
          video_path: event.video_path,
        };
      });
      setAlerts(formatted);
    } catch (err) {
      console.error("Failed to fetch AI events:", err);
    }
  };

  // Fetch devices
  const fetchDevices = async () => {
    try {
      const data = await deviceApi.getDevices();
      const activeDevices = data.data.filter((d) => d.status === "online");
      const historicalDevices = data.data.filter((d) => d.status === "offline");
      setDevices({ active: activeDevices, historical: historicalDevices });
      if (!selectedDevice && activeDevices.length > 0) {
        setSelectedDevice(activeDevices[0]);
      }
    } catch (err) {
      console.error("Failed to fetch devices:", err);
    }
  };

  // Initialize Socket.io and fetch data
  useEffect(() => {
    fetchInitialAlerts();
    fetchDevices();

    const socket = io(WS_URL);
    socketRef.current = socket;

    socketRef.current.on("ai_event", (event) => {
      console.log("Real-time AI event:", event);
      setAlerts((prev) => {
        const newAlert = {
          id: Date.now(),
          type: event.category,
          message: event.code || event.event_code,
          time: new Date().toLocaleString("sv-SE").replace("T", " "),
          deviceId: event.deviceId || event.device_id,
          serial_no: event.hex_id || event.alarm_serial, // STORE THIS FOR MATCHING
          file_path: event.file_path,
          video_path: event.video_path,
        };
        // Avoid adding if same alert arrived via polling/refresh?
        // For simplicity, just unshift
        return [newAlert, ...prev].slice(0, 20);
      });
    });

    socketRef.current.on("ai_file_complete", (data) => {
      console.log("Media upload complete:", data);
      setAlerts((prev) =>
        prev.map((alert) => {
          // Match by serial_no (hex ID) and device_id
          if (
            alert.deviceId === data.device_id &&
            (String(alert.id).includes(data.serial_no) ||
              alert.id === data.serial_no ||
              alert.serial_no === data.serial_no)
          ) {
            return {
              ...alert,
              file_path: data.file_path || alert.file_path,
              video_path: data.video_path || alert.video_path,
            };
          }
          // The 'id' might be Date.now() for new real-time alerts, so also match by serial_no if we stored it
          // Let's ensure 'serial_no' is stored in the alert object
          if (
            alert.deviceId === data.device_id &&
            alert.serial_no === data.serial_no
          ) {
            return {
              ...alert,
              file_path: data.file_path || alert.file_path,
              video_path: data.video_path || alert.video_path,
            };
          }
          return alert;
        }),
      );
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Start live stream for a device
  const startLiveStream = async (device, channel) => {
    const key = `${device.id}_ch${channel}`;
    console.log({ key });
    // Skip if already loading or live
    if (
      activeStreamsRef.current[key] === "loading" ||
      activeStreamsRef.current[key] === "live"
    )
      return;

    if (device.status !== "online") return;

    activeStreamsRef.current[key] = "loading";
    setLiveStreams((prev) => ({
      ...prev,
      [key]: { url: null, channel, status: "loading", error: null },
    }));

    try {
      await deviceApi.startLive(device.id, channel);
      const url = deviceApi.getLiveUrl(device.id, channel);
      console.log({ url });
      activeStreamsRef.current[key] = "live";
      setLiveStreams((prev) => ({
        ...prev,
        [key]: { url, channel, status: "live", error: null },
      }));
    } catch (err) {
      console.error(`Failed to start live stream for ${device.id}:`, err);
      activeStreamsRef.current[key] = "error";
      setLiveStreams((prev) => ({
        ...prev,
        [key]: {
          url: null,
          channel,
          status: "error",
          error: err.message || "Failed to start stream",
        },
      }));
    }
  };

  // When selected device or active channel changes, start its live stream
  useEffect(() => {
    if (selectedDevice) {
      startLiveStream(selectedDevice, activeChannel);
    }
  }, [selectedDevice, activeChannel]);

  const handleDeviceSelect = (device) => {
    setSelectedDevice(device);
  };

  const getStreamForCell = (cellIndex) => {
    // Cell 0 always shows the selected device's current channel
    if (cellIndex === 0 && selectedDevice) {
      const key = `${selectedDevice.id}_ch${activeChannel}`;
      return liveStreams[key] || null;
    }
    // Other cells show other online devices
    const onlineDevices = devices.active.filter(
      (d) => d.id !== selectedDevice?.id,
    );
    const device = onlineDevices[cellIndex - 1];
    if (!device) return null;
    const key = `${device.id}_ch${activeChannel}`;
    return liveStreams[key] || null;
  };

  const getDeviceForCell = (cellIndex) => {
    if (cellIndex === 0) return selectedDevice;
    const onlineDevices = devices.active.filter(
      (d) => d.id !== selectedDevice?.id,
    );
    return onlineDevices[cellIndex - 1] || null;
  };

  const renderVideoGrid = () => {
    const cells = Array.from({ length: gridSize });
    const gridCols = Math.sqrt(gridSize);

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gap: "12px",
          height: "100%",
          padding: "12px",
          background: "var(--bg-color)",
        }}
      >
        {cells.map((_, i) => {
          const stream = getStreamForCell(i);
          const device = getDeviceForCell(i);
          return (
            <VideoPlayer
              key={i}
              i={i}
              selectedDevice={selectedDevice}
              setSelectedDevice={setSelectedDevice}
              devices={devices}
              streamState={stream}
              onRetry={() => device && startLiveStream(device, activeChannel)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="dashcam-page"
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-color)",
        color: "var(--text-primary)",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header Bar */}
      <header
        style={{
          height: "64px",
          background: "var(--sidebar-bg)",
          borderBottom: "1px solid var(--surface-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <Link
            to="/"
            style={{
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "white")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#94a3b8")}
          >
            <ArrowLeft size={20} />
          </Link>
          <div
            style={{ width: "1px", height: "24px", background: "#1e293b" }}
          ></div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: 36,
                height: 36,
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
              }}
            >
              <Camera size={20} color="white" />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "16px",
                  fontWeight: "800",
                  margin: 0,
                  letterSpacing: "0.5px",
                }}
              >
                DASHCAM AI
              </h1>
              <div
                style={{
                  fontSize: "10px",
                  color: "#3b82f6",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                }}
              >
                Live Operations Center
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <button
            onClick={toggleTheme}
            style={{
              background: "var(--btn-secondary-bg)",
              border: "1px solid var(--surface-border)",
              color: "var(--text-primary)",
              padding: "8px",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <div
            style={{
              display: "flex",
              background: "#1e293b",
              borderRadius: "10px",
              padding: "4px",
            }}
          >
            <button
              onClick={() => setGridSize(1)}
              style={{
                background: gridSize === 1 ? "#3b82f6" : "transparent",
                border: "none",
                color: gridSize === 1 ? "white" : "#64748b",
                padding: "6px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setGridSize(4)}
              style={{
                background: gridSize === 4 ? "#3b82f6" : "transparent",
                border: "none",
                color: gridSize === 4 ? "white" : "#64748b",
                padding: "6px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <Grid2X2 size={18} />
            </button>
            <button
              onClick={() => setGridSize(9)}
              style={{
                background: gridSize === 9 ? "#3b82f6" : "transparent",
                border: "none",
                color: gridSize === 9 ? "white" : "#64748b",
                padding: "6px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <Grid3X3 size={18} />
            </button>
          </div>

          <div
            style={{
              display: "flex",
              background: "#1e293b",
              borderRadius: "10px",
              padding: "4px",
            }}
          >
            <button
              onClick={() => setActiveChannel(1)}
              style={{
                background: activeChannel === 1 ? "#3b82f6" : "transparent",
                border: "none",
                color: activeChannel === 1 ? "white" : "#64748b",
                padding: "6px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              CH 1
            </button>
            <button
              onClick={() => setActiveChannel(2)}
              style={{
                background: activeChannel === 2 ? "#3b82f6" : "transparent",
                border: "none",
                color: activeChannel === 2 ? "white" : "#64748b",
                padding: "6px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              CH 2
            </button>
          </div>

          <button
            style={{
              background: "#3b82f6",
              border: "none",
              color: "white",
              padding: "10px 18px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "13px",
              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
            }}
          >
            <Maximize size={16} /> Fullscreen
          </button>
          <Link
            to="/video-settings"
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              color: "white",
              padding: "10px 18px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "13px",
              textDecoration: "none",
            }}
          >
            <Settings size={16} /> Video Settings
          </Link>
          <Link
            to="/saved-videos"
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              color: "white",
              padding: "10px 18px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "13px",
              textDecoration: "none",
            }}
          >
            <Server size={16} /> Saved Videos
          </Link>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar Trigger */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{
            position: "absolute",
            left: isSidebarOpen ? "280px" : "0",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 100,
            background: "#1e293b",
            border: "1px solid #334155",
            borderLeft: "none",
            borderRadius: "0 8px 8px 0",
            padding: "12px 4px",
            cursor: "pointer",
            color: "#94a3b8",
            transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {isSidebarOpen ? (
            <PanelLeftClose size={16} />
          ) : (
            <PanelLeftOpen size={16} />
          )}
        </button>

        {/* Sidebar - Device List */}
        <aside
          style={{
            width: isSidebarOpen ? "280px" : "0",
            background: "var(--sidebar-bg)",
            borderRight: "1px solid var(--surface-border)",
            display: "flex",
            flexDirection: "column",
            transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "20px", borderBottom: "1px solid #1e293b" }}>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#475569",
                }}
              />
              <input
                placeholder="Search devices..."
                style={{
                  width: "100%",
                  background: "var(--input-bg)",
                  border: "1px solid var(--surface-border)",
                  borderRadius: "10px",
                  padding: "10px 10px 10px 38px",
                  color: "white",
                  boxSizing: "border-box",
                  fontSize: "14px",
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
            <div
              style={{
                padding: "10px 12px",
                fontSize: "11px",
                color: "#475569",
                fontWeight: "800",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Fleet Devices
            </div>
            {[...devices.active, ...devices.historical].map((dev) => (
              <DeviceCard
                key={dev.id}
                dev={dev}
                selectedDevice={selectedDevice}
                setSelectedDevice={handleDeviceSelect}
                streamStatus={liveStreams[`${dev.id}_ch1`]?.status || "idle"}
              />
            ))}
          </div>
        </aside>

        {/* Main Content - Grid */}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "#ffffffff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              paddingBottom: "20px",
            }}
          >
            {renderVideoGrid()}
          </div>
        </main>

        {/* Right Panel - Alerts & Recordings */}
        {/* <aside
          style={{
            width: "340px",
            background: "var(--sidebar-bg)",
            borderLeft: "1px solid var(--surface-border)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #1e293b",
              display: "flex",
              gap: "8px",
            }}
          >
            <button
              onClick={() => setActiveTab("alerts")}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                background:
                  activeTab === "alerts" ? "#3b82f6" : "rgba(30, 41, 59, 0.5)",
                color: activeTab === "alerts" ? "white" : "#94a3b8",
                border: "none",
                transition: "all 0.2s",
              }}
            >
              Live Alerts
            </button>
            <button
              onClick={() => setActiveTab("recordings")}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                background:
                  activeTab === "recordings"
                    ? "#3b82f6"
                    : "rgba(30, 41, 59, 0.5)",
                color: activeTab === "recordings" ? "white" : "#94a3b8",
                border: "none",
                transition: "all 0.2s",
              }}
            >
              Recorded
            </button>
          </div>

          <div
            style={{ flex: 1, overflowY: "auto", padding: "16px" }}
            className="custom-scrollbar"
          >
            {activeTab === "alerts" ? (
              alerts.length > 0 ? (
                alerts.map((alert) => (
                  <DashcamAlert key={alert.id} alert={alert} onOpenMedia={setSelectedMedia} />
                ))
              ) : (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#475569" }}>
                  Waiting for alerts...
                </div>
              )
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {MOCK_RECORDINGS.map((rec) => (
                  <div
                    key={rec.id}
                    className="recording-card"
                    style={{
                      background: "var(--surface-color)",
                      borderRadius: "12px",
                      overflow: "hidden",
                      border: "1px solid var(--surface-border)",
                      cursor: "pointer",
                      transition: "transform 0.2s",
                    }}
                  >
                    <div style={{ position: "relative", height: "120px" }}>
                      <img
                        src={rec.thumbnail}
                        alt="Thumbnail"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: "8px",
                          right: "8px",
                          background: "rgba(0,0,0,0.7)",
                          color: "white",
                          fontSize: "10px",
                          fontWeight: "700",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {rec.duration}
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          background: "rgba(59, 130, 246, 0.8)",
                          borderRadius: "50%",
                          width: "32px",
                          height: "32px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                        }}
                      >
                        <div
                          style={{
                            width: 0,
                            height: 0,
                            borderTop: "5px solid transparent",
                            borderBottom: "5px solid transparent",
                            borderLeft: "8px solid white",
                            marginLeft: "3px",
                          }}
                        ></div>
                      </div>
                    </div>
                    <div style={{ padding: "12px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: "700",
                            color: "#f8fafc",
                          }}
                        >
                          {rec.location}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#94a3b8",
                          }}
                        >
                          {rec.time}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            background: "#3b82f610",
                            borderRadius: "3px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Camera size={10} color="#3b82f6" />
                        </div>
                        {rec.deviceId}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              padding: "20px",
              background: "#0f172a",
              borderTop: "1px solid #1e293b",
            }}
          >
            <button
              style={{
                width: "100%",
                background: "var(--btn-secondary-bg)",
                color: "var(--text-primary)",
                border: "1px solid var(--surface-border)",
                padding: "12px",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "700",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "#334155")
              }
              onMouseOut={(e) => (e.currentTarget.style.background = "#1e293b")}
            >
              View Activity Log
            </button>
          </div>
        </aside> */}
      </div>

      {/* Media Viewer Modal */}
      {selectedMedia && (
        <MediaViewer
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
        />
      )}

      {/* GLOBAL STYLES */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #1e293b;
            border-radius: 10px;
          }
          .video-cell:hover {
            transform: translateY(-2px);
            border-color: #3b82f6 !important;
            box-shadow: 0 12px 30px rgba(0,0,0,0.4) !important;
          }
          .video-cell:hover svg {
            transform: scale(1.1);
          }
          .alert-card:hover {
            background: #1e293b !important;
            transform: translateX(4px);
            border-color: #3b82f633 !important;
          }
        `}
      </style>
    </div>
  );
}
