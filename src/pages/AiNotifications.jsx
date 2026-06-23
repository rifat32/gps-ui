import { formatDeviceDateTime } from "../utils/deviceTime";
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
import SystemAlertsTable from "../components/SystemAlertsTable";
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
  const [filterDeviceId, setFilterDeviceId] = useState(""); // For filtering the table
  const [activeCategory, setActiveCategory] = useState(""); // Category tabs filter
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  // Tab state: "ai-events" or "system-alerts"
  const [activeTab, setActiveTab] = useState("ai-events");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // System Alerts state
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [systemStatusFilter, setSystemStatusFilter] = useState("UNREAD");
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemPagination, setSystemPagination] = useState({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 1,
  });

  // Live stream state: { [deviceId]: { url, channel, status: 'idle'|'loading'|'live'|'error', error } }
  const [liveStreams, setLiveStreams] = useState({});
  const activeStreamsRef = useRef({});
  const socketRef = useRef(null);
  const apiSocketRef = useRef(null);
  const paginationRef = useRef(pagination);
  const filterDeviceIdRef = useRef(filterDeviceId);
  const activeCategoryRef = useRef(activeCategory);

  const systemStatusFilterRef = useRef(systemStatusFilter);
  const systemPaginationRef = useRef(systemPagination);

  // Sync refs with state
  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  useEffect(() => {
    filterDeviceIdRef.current = filterDeviceId;
  }, [filterDeviceId]);

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  useEffect(() => {
    systemStatusFilterRef.current = systemStatusFilter;
  }, [systemStatusFilter]);

  useEffect(() => {
    systemPaginationRef.current = systemPagination;
  }, [systemPagination]);

  // Fetch AI events with pagination and filter
  const fetchAlerts = async (page = 1, deviceId = filterDeviceId, category = activeCategory) => {
    try {
      const params = { page, perPage: 20, device_type: "AI_DASHCAM" };
      if (deviceId) params.deviceId = deviceId;
      if (category) params.category = category;
      const data = await deviceApi.getAiEvents(params);
      const formatted = (data.events || []).map((event) => {
        const timeStr = formatDeviceDateTime(event.event_time);
        return {
          id: event.id,
          type: event.category,
          message: event.friendly_name || event.event_code,
          friendly_name: event.friendly_name,
          description: event.description,
          time: timeStr,
          deviceId: event.device_id,
          event_code: event.event_code,
          speed: event.speed,
          file_path: event.file_path,
          video_path: event.video_path,
          file_path_back: event.file_path_back,
          video_path_back: event.video_path_back,
        };
      });
      setAlerts(formatted);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch AI events:", err);
    }
  };

  // Fetch devices
  const fetchDevices = async () => {
    try {
      const data = await deviceApi.getDevicesV2({ device_type: "AI_DASHCAM" });
      const allDevices = data.data || [];
      const dashcamDevices = allDevices.filter(d => d.device_type === "AI_DASHCAM");
      
      const activeDevices = dashcamDevices.filter((d) => d.status?.toLowerCase() === "online");
      const historicalDevices = dashcamDevices.filter((d) => d.status?.toLowerCase() === "offline");
      setDevices({ active: activeDevices, historical: historicalDevices });
      // COMMENTED OUT: Stop "ghost" live stream requests on page load
      // if (!selectedDevice && activeDevices.length > 0) {
      //   setSelectedDevice(activeDevices[0]);
      // }
    } catch (err) {
      console.error("Failed to fetch devices:", err);
    }
  };

  // Fetch general system/policy alerts
  const fetchSystemAlerts = async (page = 1, status = systemStatusFilter) => {
    setSystemLoading(true);
    try {
      const res = await deviceApi.getAlertEvents({
        page,
        perPage: 20,
        status,
      });
      if (res && res.success) {
        setSystemAlerts(res.data || []);
        if (res.meta) {
          setSystemPagination({
            page: res.meta.page,
            perPage: res.meta.limit,
            total: res.meta.total,
            totalPages: Math.ceil(res.meta.total / res.meta.limit),
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch system alerts:", err);
    } finally {
      setSystemLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const res = await deviceApi.markAlertEventAsRead(id);
      if (res && res.success) {
        fetchSystemAlerts(systemPagination.page);
      }
    } catch (err) {
      console.error("Failed to mark alert as read:", err);
    }
  };

  const handleResolve = async (id) => {
    try {
      const res = await deviceApi.markAlertEventAsResolved(id);
      if (res && res.success) {
        fetchSystemAlerts(systemPagination.page);
      }
    } catch (err) {
      console.error("Failed to resolve alert:", err);
    }
  };

  // Initialize Sockets and fetch data
  useEffect(() => {
    fetchAlerts(1);
    fetchSystemAlerts(1);
    fetchDevices();

    // 1. Dashcam Socket
    const socket = import.meta.env.VITE_SERVER_TYPE === "new"
      ? io("http://77.68.52.203", {
          path: "/dashcam-http/socket.io",
          transports: ["websocket"],
        })
      : io(WS_URL);
    socketRef.current = socket;

    socketRef.current.on("ai_event", (event) => {
      console.log("Real-time AI event:", event);
      if (paginationRef.current.page !== 1) return;

      const eventDeviceId = event.deviceId || event.device_id;
      if (filterDeviceIdRef.current && eventDeviceId !== filterDeviceIdRef.current) return;
      if (activeCategoryRef.current && event.category !== activeCategoryRef.current) return;

      setAlerts((prev) => {
        const newAlert = {
          id: Date.now(),
          type: event.category,
          message: event.friendly_name || event.code || event.event_code,
          friendly_name: event.friendly_name,
          description: event.description,
          time: formatDeviceDateTime(event.event_time || event.gps_time || event.timestamp),
          deviceId: event.deviceId || event.device_id,
          serial_no: event.hex_id || event.alarm_serial,
          speed: event.speed,
          event_code: event.code || event.event_code,
          file_path: event.file_path,
          video_path: event.video_path,
          file_path_back: event.file_path_back,
          video_path_back: event.video_path_back,
        };
        return [newAlert, ...prev].slice(0, paginationRef.current.perPage);
      });
    });

    socketRef.current.on("ai_file_complete", (data) => {
      setAlerts((prev) =>
        prev.map((alert) => {
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
              file_path_back: data.file_path_back || alert.file_path_back,
              video_path_back: data.video_path_back || alert.video_path_back,
            };
          }
          return alert;
        }),
      );
    });

    // 2. API/Alerts Socket
    const userStr = localStorage.getItem("user");
    let token = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user.accessToken || user.token;
      } catch (e) {}
    }

    const serverType = import.meta.env.VITE_SERVER_TYPE;
    let apiSocketUrl = "";
    let apiSocketPath = "";

    if (serverType === "new") {
      apiSocketUrl = "http://77.68.52.203";
      apiSocketPath = "/api-backend/socket.io";
    } else {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://54.37.225.65:8040";
      try {
        const parsed = new URL(apiBaseUrl);
        apiSocketUrl = `${parsed.protocol}//${parsed.host}`;
        const basePath = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname.replace(/\/$/, "") : "";
        apiSocketPath = `${basePath}/socket.io`;
      } catch {
        apiSocketUrl = apiBaseUrl;
        apiSocketPath = "/socket.io";
      }
    }

    const apiSocket = io(apiSocketUrl, {
      path: apiSocketPath,
      reconnectionAttempts: 10,
      auth: token ? { token } : undefined,
      transports: ["websocket", "polling"],
    });

    apiSocketRef.current = apiSocket;

    const handleSystemAlert = (alert) => {
      console.log("Real-time System Alert page event:", alert);
      if (systemPaginationRef.current.page !== 1) return;
      if (systemStatusFilterRef.current !== "UNREAD") return;

      setSystemAlerts((prev) => {
        if (prev.some((a) => a.id === alert.id)) return prev;
        return [alert, ...prev].slice(0, 20);
      });

      setSystemPagination((prev) => ({
        ...prev,
        total: prev.total + 1,
      }));
    };

    apiSocket.on("connect", () => {
      apiSocket.emit("alert:subscribe");
    });

    apiSocket.on("alert_notification", handleSystemAlert);
    apiSocket.on("alert:event", handleSystemAlert);

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (apiSocketRef.current) apiSocketRef.current.disconnect();
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
              device={device}
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
                AI_DASHCAM AI
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
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Tab Navigation / Dropdown on Mobile */}
            {isMobile ? (
              <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>
                  Select View Mode
                </label>
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #1e293b, #0f172a)",
                    border: "1.5px solid #3b82f6",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "700",
                    outline: "none",
                    cursor: "pointer",
                    width: "100%",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
                  }}
                >
                  <option value="ai-events">AI Dashcam Events</option>
                  <option value="system-alerts">System Alerts Log</option>
                </select>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                <button
                  onClick={() => setActiveTab("ai-events")}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    background: activeTab === "ai-events" ? "linear-gradient(135deg, #3b82f6, #1d4ed8)" : "rgba(30, 41, 59, 0.5)",
                    color: "#ffffff",
                    border: activeTab === "ai-events" ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
                    fontWeight: "bold",
                    fontSize: "13px",
                    cursor: "pointer",
                    boxShadow: activeTab === "ai-events" ? "0 4px 12px rgba(37, 99, 235, 0.3)" : "none",
                    transition: "all 0.2s",
                  }}
                >
                  AI Dashcam Events
                </button>
                <button
                  onClick={() => setActiveTab("system-alerts")}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    background: activeTab === "system-alerts" ? "linear-gradient(135deg, #3b82f6, #1d4ed8)" : "rgba(30, 41, 59, 0.5)",
                    color: "#ffffff",
                    border: activeTab === "system-alerts" ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
                    fontWeight: "bold",
                    fontSize: "13px",
                    cursor: "pointer",
                    boxShadow: activeTab === "system-alerts" ? "0 4px 12px rgba(37, 99, 235, 0.3)" : "none",
                    transition: "all 0.2s",
                  }}
                >
                  System Alerts Log
                </button>
              </div>
            )}

            <div style={{ flex: 1, overflow: "hidden" }}>
              {activeTab === "ai-events" ? (
                <NotificationTable
                  alerts={alerts}
                  onOpenMedia={setSelectedMedia}
                  pagination={pagination}
                  onPageChange={(page) => fetchAlerts(page)}
                  devices={[...devices.active, ...devices.historical]}
                  filterDeviceId={filterDeviceId}
                  onDeviceChange={(id) => {
                    setFilterDeviceId(id);
                    fetchAlerts(1, id);
                  }}
                  activeCategory={activeCategory}
                  onCategoryChange={(cat) => {
                    setActiveCategory(cat);
                    fetchAlerts(1, filterDeviceId, cat);
                  }}
                />
              ) : (
                <SystemAlertsTable
                  alerts={systemAlerts}
                  pagination={systemPagination}
                  onPageChange={(page) => fetchSystemAlerts(page, systemStatusFilter)}
                  onMarkAsRead={handleMarkAsRead}
                  onResolve={handleResolve}
                  statusFilter={systemStatusFilter}
                  onStatusFilterChange={(status) => {
                    setSystemStatusFilter(status);
                    fetchSystemAlerts(1, status);
                  }}
                  loading={systemLoading}
                />
              )}
            </div>
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
