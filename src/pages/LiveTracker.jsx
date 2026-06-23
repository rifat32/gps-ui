import { useState } from "react";
import RealTimeMap from "./RealTimeMap";
import { Map as MapIcon, Gauge, MapPin } from "lucide-react";

export default function LiveTracker() {
  const [activeTab, setActiveTab] = useState("AI_DASHCAM");

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
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {activeTab === "AI_DASHCAM" ? (
          <RealTimeMap deviceType="AI_DASHCAM" />
        ) : activeTab === "OBD" ? (
          <RealTimeMap deviceType="OBD" />
        ) : (
          <RealTimeMap deviceType="J42" />
        )}
      </div>
    </div>
  );
}
