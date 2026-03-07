import { ChevronRight, Clock, Monitor, Image, PlaySquare } from "lucide-react";

export default function DashcamAlert({ alert, onOpenMedia }) {
  const hasImage = !!alert.file_path;
  const hasVideo = !!alert.video_path;

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
        cursor: (hasImage || hasVideo) ? "default" : "pointer",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
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
          {alert.type || alert.category}
        </span>
        <span
          style={{
            fontSize: "11px",
            color: "#64748b",
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
          marginBottom: "12px",
          lineHeight: "1.4",
        }}
      >
        {alert.message || alert.event_code || "AI Triggered"}
      </div>

      {(hasImage || hasVideo) && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          {hasImage && (
            <button
              onClick={() => onOpenMedia && onOpenMedia({ 
                url: alert.file_path, 
                title: alert.message || alert.event_code,
                time: alert.time,
                deviceId: alert.deviceId || alert.device_id
              })}
              style={{
                flex: 1,
                background: "#3b82f615",
                color: "#3b82f6",
                border: "1px solid #3b82f633",
                borderRadius: "8px",
                padding: "6px 0",
                fontSize: "11px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                cursor: "pointer"
              }}
            >
              <Image size={14} /> Image
            </button>
          )}
          {hasVideo && (
            <button
              onClick={() => onOpenMedia && onOpenMedia({ 
                url: alert.video_path, 
                title: alert.message || alert.event_code,
                time: alert.time,
                deviceId: alert.deviceId || alert.device_id
              })}
              style={{
                flex: 1,
                background: "#22c55e15",
                color: "#22c55e",
                border: "1px solid #22c55e33",
                borderRadius: "8px",
                padding: "6px 0",
                fontSize: "11px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                cursor: "pointer"
              }}
            >
              <PlaySquare size={14} /> Video
            </button>
          )}
        </div>
      )}

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
          {alert.deviceId || alert.device_id}
        </div>
        {!hasImage && !hasVideo && <ChevronRight size={14} color="#334155" />}
      </div>
    </div>
  );
}
