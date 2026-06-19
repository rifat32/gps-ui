import { useEffect, useState, useRef } from "react";
import { Outlet } from "react-router-dom";
import { LogOut, X, AlertTriangle, Bell } from "lucide-react";
import { io } from "socket.io-client";
import NavigationSidebar from "./NavigationSidebar";
import authApi from "../services/authApi";

// Double-chime chime using Web Audio API
const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    
    const playTone = (freq, startTime, duration) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    const now = audioCtx.currentTime;
    playTone(880, now, 0.35);       // A5
    playTone(1046.5, now + 0.12, 0.45); // C6
  } catch (err) {
    console.error("Audio playback failed:", err);
  }
};

const formatEventType = (type) => {
  if (!type) return "Unknown Alert";
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const severityColors = {
    CRITICAL: { bg: "#7f1d1d", border: "#ef4444", text: "#fee2e2", accent: "#ef4444" },
    HIGH: { bg: "#7c2d12", border: "#f97316", text: "#ffedd5", accent: "#f97316" },
    NORMAL: { bg: "#0f172a", border: "#0ea5e9", text: "#e0f2fe", accent: "#0ea5e9" },
    LOW: { bg: "#0f172a", border: "#38bdf8", text: "#e0f2fe", accent: "#38bdf8" },
  };

  const style = severityColors[String(toast.severity).toUpperCase()] || severityColors.NORMAL;

  return (
    <div
      style={{
        background: style.bg,
        border: `2px solid ${style.border}`,
        borderRadius: "12px",
        padding: "16px",
        color: style.text,
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)",
        minWidth: "320px",
        maxWidth: "420px",
        position: "relative",
        animation: "toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        backdropFilter: "blur(8px)",
        pointerEvents: "auto",
        transition: "all 0.2s ease",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          background: "transparent",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          opacity: 0.6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4px",
          borderRadius: "50%",
          transition: "opacity 0.2s",
        }}
        onMouseOver={e => e.currentTarget.style.opacity = 1}
        onMouseOut={e => e.currentTarget.style.opacity = 0.6}
      >
        <X size={16} />
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ color: style.accent, display: "flex" }}>
          <AlertTriangle size={20} />
        </div>
        <div style={{ fontWeight: "800", fontSize: "14px", letterSpacing: "0.5px" }}>
          {toast.title}
        </div>
      </div>

      <div style={{ fontSize: "12px", opacity: 0.95, lineHeight: "1.4" }}>
        {toast.message}
      </div>

      <div style={{ fontSize: "10px", opacity: 0.6, alignSelf: "flex-end", marginTop: "4px", fontWeight: "600" }}>
        {toast.time}
      </div>
    </div>
  );
};

export default function Layout({ theme, toggleTheme }) {
  const [toasts, setToasts] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    // Get token
    const userStr = localStorage.getItem("user");
    let token = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user.accessToken || user.token;
      } catch (e) {
        console.error("❌ Failed to parse user token for alert socket:", e);
      }
    }

    // Determine target URL and path
    const serverType = import.meta.env.VITE_SERVER_TYPE;
    let socketUrl = "";
    let socketPath = "";

    if (serverType === "new") {
      socketUrl = "http://77.68.52.203";
      socketPath = "/api-backend/socket.io";
    } else {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://54.37.225.65:8040";
      try {
        const parsed = new URL(apiBaseUrl);
        socketUrl = `${parsed.protocol}//${parsed.host}`;
        const basePath = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname.replace(/\/$/, "") : "";
        socketPath = `${basePath}/socket.io`;
      } catch {
        socketUrl = apiBaseUrl;
        socketPath = "/socket.io";
      }
    }

    console.log(`🔌 Connecting to system alert socket: ${socketUrl} (path: ${socketPath})`);

    const socket = io(socketUrl, {
      path: socketPath,
      reconnectionAttempts: 10,
      auth: token ? { token } : undefined,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    const handleNewAlert = (alert) => {
      console.log("🔔 Real-time alert received:", alert);
      
      playNotificationSound();

      const newToast = {
        id: alert.id || Date.now() + Math.random(),
        title: alert.alertPolicyName || formatEventType(alert.eventType),
        message: `Device ${alert.deviceId || "unknown"} triggered ${formatEventType(alert.eventType)} (Vehicle: ${alert.licensePlate || "N/A"})`,
        severity: alert.severity || "NORMAL",
        time: new Date(alert.eventTime || Date.now()).toLocaleTimeString(),
      };

      setToasts(prev => [newToast, ...prev].slice(0, 5)); // Keep last 5 toasts
    };

    socket.on("connect", () => {
      console.log("✅ System alert socket connected successfully.");
      socket.emit("alert:subscribe");
    });

    socket.on("alert_notification", handleNewAlert);
    socket.on("alert:event", handleNewAlert);

    socket.on("connect_error", (error) => {
      console.warn("⚠️ System alert socket connection error:", error.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className={`app-main-layout ${theme}`}>
      <NavigationSidebar theme={theme} toggleTheme={toggleTheme} />
      
      {/* Top Right Logout Button */}
      <button 
        className="top-right-logout"
        onClick={() => { authApi.logout(); window.location.reload(); }}
        title="Sign Out System"
      >
        <LogOut size={20} />
        <span>Sign Out</span>
      </button>

      {/* Toast Notification Stack */}
      <div
        style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          pointerEvents: "none",
        }}
      >
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            toast={toast}
            onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          />
        ))}
      </div>

      {/* Global Toast Styles */}
      <style>
        {`
          @keyframes toastSlideIn {
            from {
              transform: translateX(120%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>

      <main className="content-area">
        <Outlet />
      </main>
    </div>
  );
}
