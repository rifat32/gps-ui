import { useState } from "react";
import RealTimeMap from "./RealTimeMap";
import { Map as MapIcon, Gauge, MapPin, Shield } from "lucide-react";

export default function LiveTracker() {
  const [activeTab, setActiveTab] = useState("AI_DASHCAM");
  const [showRealOnly, setShowRealOnly] = useState(false);

  const tabs = [
    { id: "AI_DASHCAM", label: "AI Dashcam Live", icon: MapIcon },
    { id: "OBD", label: "OBD Live", icon: Gauge },
    { id: "J42", label: "J42 Tracker Live", icon: MapPin },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      {/* Tab Header */}
      <div style={{ 
        display: "flex", 
        backgroundColor: "white", 
        borderBottom: "1px solid #e2e8f0",
        padding: "0 20px",
        height: "56px",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 100,
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
      }}>
        {/* Tabs */}
        <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "0 24px",
                height: "100%",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
                color: activeTab === tab.id ? "#3b82f6" : "#64748b",
                fontWeight: activeTab === tab.id ? "600" : "500",
                fontSize: "14px",
                position: "relative",
                transition: "all 0.2s"
              }}
            >
              <tab.icon size={18} />
              {tab.label}
              {activeTab === tab.id && (
                <div style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  backgroundColor: "#3b82f6",
                  borderRadius: "3px 3px 0 0"
                }} />
              )}
            </button>
          ))}
        </div>

        {/* Real Devices Only Toggle */}
        <button
          id="toggle-real-devices-only"
          onClick={() => setShowRealOnly(prev => !prev)}
          title={showRealOnly ? "Showing real devices only — click to show all" : "Click to show real devices only"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 14px",
            height: "36px",
            border: `1.5px solid ${showRealOnly ? "#22c55e" : "#e2e8f0"}`,
            borderRadius: "9999px",
            backgroundColor: showRealOnly ? "#f0fdf4" : "#f8fafc",
            cursor: "pointer",
            color: showRealOnly ? "#15803d" : "#64748b",
            fontWeight: "600",
            fontSize: "13px",
            transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: showRealOnly ? "0 0 0 3px rgba(34,197,94,0.15)" : "none",
            userSelect: "none",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <Shield size={14} style={{ flexShrink: 0 }} />
          {/* Toggle pill */}
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            width: "34px",
            height: "18px",
            borderRadius: "9999px",
            backgroundColor: showRealOnly ? "#22c55e" : "#cbd5e1",
            transition: "background-color 0.25s",
            position: "relative",
            flexShrink: 0,
          }}>
            <span style={{
              position: "absolute",
              left: showRealOnly ? "18px" : "2px",
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              backgroundColor: "white",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              transition: "left 0.25s cubic-bezier(0.4,0,0.2,1)",
            }} />
          </span>
          Real Devices Only
        </button>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {activeTab === "AI_DASHCAM" ? (
          <RealTimeMap deviceType="AI_DASHCAM" showRealOnly={showRealOnly} />
        ) : activeTab === "OBD" ? (
          <RealTimeMap deviceType="OBD" showRealOnly={showRealOnly} />
        ) : (
          <RealTimeMap deviceType="J42" showRealOnly={showRealOnly} />
        )}
      </div>
    </div>
  );
}
