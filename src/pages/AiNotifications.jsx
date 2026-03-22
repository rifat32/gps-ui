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
import NotificationTable from "../components/NotificationTable";
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

export default function AiNotifications({ theme, toggleTheme }) {
  const [gridSize, setGridSize] = useState(4); // Default 2x2
  const [alerts, setAlerts] = useState([]);
  const [devices, setDevices] = useState({ active: [], historical: [] });
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
          event_code: event.event_code,
          speed: event.speed,
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
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Main Content - Grid */}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "#020617",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* BOTTOM TABLE PANEL */}
          <div
            style={{
              height: "90vh",
              background: "#ffffffff",
              borderTop: "1px solid var(--surface-border)",
              padding: "16px",
            }}
          >
            <NotificationTable alerts={alerts} onOpenMedia={setSelectedMedia} />
          </div>
        </main>
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
