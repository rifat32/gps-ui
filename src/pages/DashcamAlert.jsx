import { ChevronRight, Clock, Monitor } from "lucide-react";

export default function DashcamAlert({ alert }) {
  return (
    <div
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
            background: alert.type === "DSM" ? "#f59e0b15" : "#ef444415",
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
  );
}
