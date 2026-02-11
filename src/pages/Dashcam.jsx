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
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DeviceCard from "../components/DeviceCard";
import DashcamAlert from "../components/DashcamAlert";
import VideoPlayer from "../components/VideoPlayer";

// Mock Data
const MOCK_DEVICES = [
  {
    id: "JT8088985963",
    name: "Truck-01",
    status: "online",
    speed: 45,
    alert: "none",
  },
  {
    id: "JT8088985964",
    name: "Van-02",
    status: "online",
    speed: 0,
    alert: "DSM",
  },
  {
    id: "JT8088985965",
    name: "Sedan-03",
    status: "offline",
    speed: 0,
    alert: "none",
  },
  {
    id: "JT8088985966",
    name: "Truck-04",
    status: "online",
    speed: 62,
    alert: "ADAS",
  },
  {
    id: "JT8088985967",
    name: "Bus-05",
    status: "online",
    speed: 30,
    alert: "none",
  },
];

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

export default function Dashcam({ theme, toggleTheme }) {
  const [gridSize, setGridSize] = useState(4); // Default 2x2
  const [selectedDevice, setSelectedDevice] = useState(MOCK_DEVICES[0]);
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Simulate real-time alerts
  useEffect(() => {
    const interval = setInterval(() => {
      const types = ["DSM", "ADAS", "BSD"];
      const messages = [
        "Forward Collision Warning",
        "Distraction Detected",
        "Pedestrian Warning",
      ];
      const newAlert = {
        id: Date.now(),
        type: types[Math.floor(Math.random() * types.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        time: new Date().toLocaleTimeString(),
        deviceId:
          MOCK_DEVICES[Math.floor(Math.random() * MOCK_DEVICES.length)].name,
      };
      setAlerts((prev) => [newAlert, ...prev].slice(0, 10));
    }, 7000);
    return () => clearInterval(interval);
  }, []);

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
        {cells.map((_, i) => (
          <VideoPlayer i={i} MOCK_DEVICES={MOCK_DEVICES} />
        ))}
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
            {MOCK_DEVICES.map((dev) => (
              <DeviceCard
                key={dev.id}
                dev={dev}
                selectedDevice={selectedDevice}
                setSelectedDevice={setSelectedDevice}
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
            background: "#020617",
            position: "relative",
          }}
        >
          {renderVideoGrid()}
        </main>

        {/* Right Panel - Alerts */}
        <aside
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
              padding: "24px 20px",
              borderBottom: "1px solid #1e293b",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  background: "#ef4444",
                  borderRadius: "50%",
                  animation: "pulse 1s infinite",
                }}
              ></div>
              <h2
                style={{
                  fontSize: "15px",
                  fontWeight: "800",
                  margin: 0,
                  letterSpacing: "0.5px",
                }}
              >
                LIVE ALERTS
              </h2>
            </div>
            <span
              style={{
                fontSize: "11px",
                background: "#1e293b",
                padding: "4px 8px",
                borderRadius: "6px",
                color: "#94a3b8",
              }}
            >
              Real-time
            </span>
          </div>

          <div
            style={{ flex: 1, overflowY: "auto", padding: "16px" }}
            className="custom-scrollbar"
          >
            {alerts.map((alert) => (
              <DashcamAlert key={alert.id} alert={alert} />
            ))}
          </div>

          {/* BOTTOM BUTTON  */}
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
        </aside>
      </div>

      {/* GLOBAL STYLES */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
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
