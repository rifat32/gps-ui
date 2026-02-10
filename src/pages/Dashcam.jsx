import React, { useState, useEffect } from "react";
import {
  Camera,
  ArrowLeft,
  LayoutGrid,
  Grid2X2,
  Grid3X3,
  Maximize,
  Search,
  ShieldAlert,
  Activity,
  Signal,
  Wifi,
  MapPin,
  Clock,
  ChevronRight,
  Monitor,
  Video,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Sun, Moon } from "lucide-react";

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
          <div
            key={i}
            className="video-cell"
            style={{
              position: "relative",
              background: "#1e293b",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border:
                i === 0
                  ? "2px solid var(--accent-color)"
                  : "1px solid var(--surface-border)",
              boxShadow: i === 0 ? "0 0 20px rgba(59, 130, 246, 0.15)" : "none",
              overflow: "hidden",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              cursor: "pointer",
            }}
          >
            {/* Mock Video Placeholder */}
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                background: "rgba(15, 23, 42, 0.85)",
                padding: "4px 10px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                fontWeight: "700",
                color: i === 0 ? "#3b82f6" : "#f8fafc",
                zIndex: 10,
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  background: i === 0 ? "#3b82f6" : "#ef4444",
                  borderRadius: "50%",
                  animation: "pulse 1.5s infinite",
                }}
              ></div>
              LIVE • CH 0{i + 1}
            </div>

            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                fontSize: "10px",
                color: "#94a3b8",
                textAlign: "right",
                zIndex: 10,
                background: "rgba(15, 23, 42, 0.6)",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div
                style={{
                  color: "#22c55e",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Zap size={10} /> {2500 + Math.floor(Math.random() * 1000)} kbps
              </div>
              <div style={{ opacity: 0.8 }}>
                {(0.1 + Math.random() * 0.2).toFixed(2)}s latency
              </div>
            </div>

            <Video
              size={100}
              color={i === 0 ? "#3b82f611" : "#47556911"}
              style={{ transition: "transform 0.5s ease" }}
            />

            {/* Overlay Info */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background:
                  "linear-gradient(transparent, rgba(2, 6, 23, 0.95))",
                padding: "15px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12px",
                borderTop: "1px solid rgba(255,255,255,0.03)",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    background: "#3b82f615",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Monitor size={16} color="#3b82f6" />
                </div>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "13px" }}>
                    {MOCK_DEVICES[i % MOCK_DEVICES.length].name}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>
                    {MOCK_DEVICES[i % MOCK_DEVICES.length].id}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", color: "#94a3b8" }}>
                <Signal size={16} />
                <Wifi size={16} />
              </div>
            </div>
          </div>
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
              <div
                key={dev.id}
                onClick={() => setSelectedDevice(dev)}
                style={{
                  margin: "4px 0",
                  padding: "12px 14px",
                  cursor: "pointer",
                  background:
                    selectedDevice.id === dev.id ? "#3b82f615" : "transparent",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  transition: "all 0.2s",
                  border:
                    selectedDevice.id === dev.id
                      ? "1px solid #3b82f633"
                      : "1px solid transparent",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: 40,
                    height: 40,
                    background:
                      dev.status === "online" ? "#22c55e10" : "#47556910",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Monitor
                    size={20}
                    color={dev.status === "online" ? "#22c55e" : "#475569"}
                  />
                  {dev.status === "online" && (
                    <div
                      style={{
                        position: "absolute",
                        top: -2,
                        right: -2,
                        width: 10,
                        height: 10,
                        background: "#22c55e",
                        borderRadius: "50%",
                        border: "2px solid #0f172a",
                      }}
                    ></div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "700" }}>
                    {dev.name}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#475569",
                      fontWeight: "500",
                    }}
                  >
                    {dev.id}
                  </div>
                </div>
                {dev.alert !== "none" && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      background: "#ef4444",
                      borderRadius: "50%",
                      boxShadow: "0 0 8px #ef4444",
                    }}
                  ></div>
                )}
              </div>
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
              <div
                key={alert.id}
                className="alert-card"
                style={{
                  background: "var(--surface-color)",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "12px",
                  border: "1px solid var(--surface-border)",
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "800",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      background:
                        alert.type === "DSM" ? "#f59e0b15" : "#ef444415",
                      color: alert.type === "DSM" ? "#f59e0b" : "#ef4444",
                      border: `1px solid ${alert.type === "DSM" ? "#f59e0b33" : "#ef444433"}`,
                      textTransform: "uppercase",
                    }}
                  >
                    {alert.type}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#475569",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      fontWeight: "600",
                    }}
                  >
                    <Clock size={12} /> {alert.time}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    marginBottom: "8px",
                    lineHeight: "1.4",
                  }}
                >
                  {alert.message}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
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
                        width: 16,
                        height: 16,
                        background: "#3b82f610",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Monitor size={10} color="#3b82f6" />
                    </div>
                    {alert.deviceId}
                  </div>
                  <ChevronRight size={14} color="#334155" />
                </div>
              </div>
            ))}
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
