import { Image, PlaySquare, Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const ALERT_CATEGORY_TABS = [
  { id: "", label: "All Alerts" },
  { id: "ADAS", label: "ADAS" },
  { id: "DSM", label: "DSM" },
  { id: "BEHAVIOR", label: "G-Sensor (G-Shock)" },
  { id: "HARDWARE", label: "Hardware / Video" },
  { id: "IO", label: "IO / Physical" },
  { id: "SPEED_GPS", label: "Speed / GPS" },
  { id: "GEOFENCE", label: "Geofence / Route" },
  { id: "VIDEO", label: "Video" },
];

const CATEGORY_STYLES = {
  ADAS: { bg: "#ef444415", color: "#ef4444", border: "#ef444433" },
  DSM: { bg: "#f59e0b15", color: "#f59e0b", border: "#f59e0b33" },
  BEHAVIOR: { bg: "#a855f715", color: "#a855f7", border: "#a855f733" },
  HARDWARE: { bg: "#0ea5e915", color: "#0ea5e9", border: "#0ea5e933" },
  IO: { bg: "#22c55e15", color: "#22c55e", border: "#22c55e33" },
  SPEED_GPS: { bg: "#eab30815", color: "#eab308", border: "#eab30833" },
  GEOFENCE: { bg: "#14b8a615", color: "#14b8a6", border: "#14b8a633" },
  VIDEO: { bg: "#6366f115", color: "#6366f1", border: "#6366f133" },
};

const getCategoryStyle = (type) => CATEGORY_STYLES[type] || CATEGORY_STYLES.ADAS;

export default function NotificationTable({ 
  alerts, 
  onOpenMedia, 
  pagination, 
  onPageChange,
  devices = [],
  filterDeviceId = "",
  onDeviceChange,
  activeCategory = "",
  onCategoryChange
}) {
  const [copiedType, setCopiedType] = useState(null); // { id: 123, type: 'image' | 'video' }

  const getProperUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;

    // If the path is absolute (contains /home/), extract the relative part
    if (path.includes("downloads/")) {
      const relativePart = path.substring(path.indexOf("downloads/"));
      const dashcamBase = BASE_URL ? BASE_URL.replace(":8040", ":4020") : "http://54.37.225.65:4020";
      return `${dashcamBase}/${relativePart}`;
    }

    return path.startsWith("/") ? `${BASE_URL}${path}` : `${BASE_URL}/${path}`;
  };

  const handleCopy = (path, id, type) => {
    const fullPath = getProperUrl(path);
    if (!fullPath) return;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(fullPath)
        .then(() => {
          setCopiedType({ id, type });
          setTimeout(() => setCopiedType(null), 2000);
        })
        .catch((err) => console.error("Clipboard copy failed:", err));
    } else {
      // Fallback for non-HTTPS HTTP environments (e.g. http://54.37.225.65)
      try {
        const textArea = document.createElement("textarea");
        textArea.value = fullPath;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
        setCopiedType({ id, type });
        setTimeout(() => setCopiedType(null), 2000);
      } catch (err) {
        console.error("Fallback copy failed:", err);
      }
    }
  };

  const isCopied = (id, type) =>
    copiedType?.id === id && copiedType?.type === type;

  return (
    <div
      className="notification-table-container custom-scrollbar"
      style={{
        background: "var(--sidebar-bg)",
        border: "1px solid var(--surface-border)",
        borderRadius: "12px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        marginBottom: "100px",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          background: "var(--header-bg)",
          borderBottom: "1px solid var(--surface-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px", flex: 1 }}>
          <h3
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: "700",
              color: "var(--header-text)",
              whiteSpace: "nowrap"
            }}
          >
            AI Notifications
          </h3>

          <select
            value={filterDeviceId}
            onChange={(e) => onDeviceChange && onDeviceChange(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              background: "var(--card-bg)",
              border: "1px solid var(--surface-border)",
              color: "var(--text-primary)",
              fontSize: "12px",
              fontWeight: "600",
              outline: "none",
              cursor: "pointer",
              minWidth: "180px",
              maxWidth: "250px"
            }}
          >
            <option value="">-- All AI Dashcams --</option>
            {devices.map(dev => (
              <option key={dev.device_id || dev.id} value={dev.device_id || dev.id}>
                {dev.device_id || dev.id} {dev.status === 'online' ? '(Online)' : '(Offline)'}
              </option>
            ))}
          </select>

          {/* Category Tabs */}
          <div style={{ 
            display: "flex", 
            gap: "2px", 
            marginLeft: "24px",
            background: "rgba(15, 23, 42, 0.45)", // Semi-transparent dark slate
            padding: "3px",
            borderRadius: "10px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            flexWrap: "wrap",
            maxWidth: "720px",
          }}>
            {ALERT_CATEGORY_TABS.map(tab => {
              const active = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onCategoryChange && onCategoryChange(tab.id)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "7px",
                    background: active ? "#ffffff" : "transparent",
                    color: active ? "#1e293b" : "rgba(255, 255, 255, 0.8)",
                    border: "none",
                    fontSize: "11px",
                    fontWeight: active ? "800" : "600",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: active ? "0 4px 12px rgba(0, 0, 0, 0.2)" : "none",
                  }}
                  onMouseOver={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = "#ffffff";
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <span
          style={{
            fontSize: "11px",
            color: "var(--header-text)",
            opacity: 0.8,
            fontWeight: "600",
          }}
        >
          Total: {pagination?.total || alerts.length}
        </span>
      </div>

      <div style={{ flex: 1, overflow: "auto" }} className="custom-scrollbar">
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
            textAlign: "left",
          }}
        >
          <thead
            style={{
              position: "sticky",
              top: 0,
              background: "#0f172a",
              zIndex: 10,
            }}
          >
            <tr>
              <th style={thStyle}>Device</th>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>Alert Type</th>
              <th style={thStyle}>Intelligence Event</th>
              <th style={thStyle}>Speed</th>
              <th style={thStyle}>Media View</th>
              <th style={thStyle}>Copy Links</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <tr
                  key={alert.id}
                  className="table-row-hover"
                  style={{ borderBottom: "1px solid #1e293b" }}
                >
                  <td style={tdStyle}>
                    <div
                      style={{
                        fontWeight: "700",
                        color: "var(--text-primary)",
                      }}
                    >
                      {alert.deviceId}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ color: "var(--text-secondary)" }}>
                      {alert.time}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "800",
                        padding: "3px 8px",
                        borderRadius: "5px",
                        background: getCategoryStyle(alert.type).bg,
                        color: getCategoryStyle(alert.type).color,
                        border: `1px solid ${getCategoryStyle(alert.type).border}`,
                        textTransform: "uppercase",
                      }}
                    >
                      {alert.type || "AI"}
                    </span>
                  </td>

                  <td style={tdStyle}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <div
                        style={{
                          fontWeight: "800",
                          color: "var(--text-primary)",
                          fontSize: "12px",
                          textTransform: "uppercase",
                        }}
                      >
                        {alert.friendly_name || "Unknown Event"}
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "var(--text-secondary)",
                          opacity: 0.7,
                          fontStyle: "italic",
                        }}
                      >
                        {alert.description || "No description available"}
                      </div>
                      <div
                        style={{
                          fontSize: "9px",
                          color: "#64748b",
                          fontWeight: "bold",
                        }}
                      >
                        Code: {alert.event_code}
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ color: "var(--text-secondary)" }}>
                      {Math.round(alert.speed * 0.621371)}  mph
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {alert.file_path ? (
                        <button
                          onClick={() =>
                            onOpenMedia &&
                            onOpenMedia({
                              url: getProperUrl(alert.file_path),
                              title: `${alert.message || alert.friendly_name} (Front)`,
                              time: alert.time,
                              deviceId: alert.deviceId,
                              type: "image",
                            })
                          }
                          className="media-btn image"
                          title="View Front Image"
                        >
                          <Image size={14} />
                        </button>
                      ) : (
                        <div className="media-btn disabled" title="No Front Image">
                          <Image size={14} />
                        </div>
                      )}
                      {alert.video_path ? (
                        <button
                          onClick={() =>
                            onOpenMedia &&
                            onOpenMedia({
                              url: getProperUrl(alert.video_path),
                              title: `${alert.message || alert.friendly_name} (Front)`,
                              time: alert.time,
                              deviceId: alert.deviceId,
                              type: "video",
                            })
                          }
                          className="media-btn video"
                          title="Play Front Video"
                        >
                          <PlaySquare size={14} />
                        </button>
                      ) : (
                        <div className="media-btn disabled" title="No Front Video">
                          <PlaySquare size={14} />
                        </div>
                      )}

                      {alert.file_path_back ? (
                        <button
                          onClick={() =>
                            onOpenMedia &&
                            onOpenMedia({
                              url: getProperUrl(alert.file_path_back),
                              title: `${alert.message || alert.friendly_name} (Cabin/Back)`,
                              time: alert.time,
                              deviceId: alert.deviceId,
                              type: "image",
                            })
                          }
                          className="media-btn cabin-image"
                          title="View Cabin Image"
                        >
                          <Image size={14} />
                        </button>
                      ) : (
                        <div className="media-btn disabled" title="No Cabin Image">
                          <Image size={14} />
                        </div>
                      )}

                      {alert.video_path_back ? (
                        <button
                          onClick={() =>
                            onOpenMedia &&
                            onOpenMedia({
                              url: getProperUrl(alert.video_path_back),
                              title: `${alert.message || alert.friendly_name} (Cabin/Back)`,
                              time: alert.time,
                              deviceId: alert.deviceId,
                              type: "video",
                            })
                          }
                          className="media-btn cabin-video"
                          title="Play Cabin Video"
                        >
                          <PlaySquare size={14} />
                        </button>
                      ) : (
                        <div className="media-btn disabled" title="No Cabin Video">
                          <PlaySquare size={14} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                      {alert.file_path && (
                        <button
                          onClick={() =>
                            handleCopy(alert.file_path, alert.id, "image")
                          }
                          style={{
                            background: "transparent",
                            border: "none",
                            color: isCopied(alert.id, "image")
                              ? "#22c55e"
                              : "#3b82f6",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            fontWeight: "600",
                            padding: "4px",
                            transition: "all 0.2s",
                          }}
                        >
                          {isCopied(alert.id, "image") ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                          Front Image
                        </button>
                      )}
                      {alert.video_path && (
                        <button
                          onClick={() =>
                            handleCopy(alert.video_path, alert.id, "video")
                          }
                          style={{
                            background: "transparent",
                            border: "none",
                            color: isCopied(alert.id, "video")
                              ? "#22c55e"
                              : "#22c55e",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            fontWeight: "600",
                            padding: "4px",
                            transition: "all 0.2s",
                          }}
                        >
                          {isCopied(alert.id, "video") ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                          Front Video
                        </button>
                      )}

                      {alert.file_path_back && (
                        <button
                          onClick={() =>
                            handleCopy(alert.file_path_back, alert.id, "image_back")
                          }
                          style={{
                            background: "transparent",
                            border: "none",
                            color: isCopied(alert.id, "image_back")
                              ? "#22c55e"
                              : "#a855f7",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            fontWeight: "600",
                            padding: "4px",
                            transition: "all 0.2s",
                          }}
                        >
                          {isCopied(alert.id, "image_back") ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                          Cabin Image
                        </button>
                      )}
                      {alert.video_path_back && (
                        <button
                          onClick={() =>
                            handleCopy(alert.video_path_back, alert.id, "video_back")
                          }
                          style={{
                            background: "transparent",
                            border: "none",
                            color: isCopied(alert.id, "video_back")
                              ? "#22c55e"
                              : "#eab308",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            fontWeight: "600",
                            padding: "4px",
                            transition: "all 0.2s",
                          }}
                        >
                          {isCopied(alert.id, "video_back") ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                          Cabin Video
                        </button>
                      )}

                      {!alert.file_path && !alert.video_path && !alert.file_path_back && !alert.video_path_back && (
                        <span style={{ color: "#475569", fontSize: "11px" }}>
                          No Links
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="5"
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "#475569",
                  }}
                >
                  No notifications found
                </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div
          style={{
            padding: "12px 20px",
            background: "var(--header-bg)",
            borderTop: "1px solid var(--surface-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                background: pagination.hasPrev ? "var(--btn-primary-bg)" : "var(--btn-disabled-bg)",
                border: "1px solid var(--surface-border)",
                color: pagination.hasPrev ? "var(--text-primary)" : "var(--text-disabled)",
                cursor: pagination.hasPrev ? "pointer" : "not-allowed",
                fontSize: "12px",
                fontWeight: "600",
                transition: "all 0.2s",
              }}
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                background: pagination.hasNext ? "var(--btn-primary-bg)" : "var(--btn-disabled-bg)",
                border: "1px solid var(--surface-border)",
                color: pagination.hasNext ? "var(--text-primary)" : "var(--text-disabled)",
                cursor: pagination.hasNext ? "pointer" : "not-allowed",
                fontSize: "12px",
                fontWeight: "600",
                transition: "all 0.2s",
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <style>
        {`
          .th-style {
            padding: 12px 20px;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
          }
          .td-style {
            padding: 12px 20px;
          }
          .table-row-hover:hover {
            background: rgba(59, 130, 246, 0.05);
          }
          .media-btn {
            width: 30px;
            height: 30px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid transparent;
          }
          .media-btn.image {
            background: #3b82f615;
            color: #3b82f6;
            border-color: #3b82f633;
          }
          .media-btn.video {
            background: #22c55e15;
            color: #22c55e;
            border-color: #22c55e33;
          }
          .media-btn.cabin-image {
            background: #a855f715;
            color: #a855f7;
            border-color: #a855f733;
          }
          .media-btn.cabin-video {
            background: #eab30815;
            color: #eab308;
            border-color: #eab30833;
          }
          .media-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .media-btn.disabled {
            background: #1e293b;
            color: #475569;
            cursor: not-allowed;
            opacity: 0.5;
          }
        `}
      </style>
    </div>
  );
}

const thStyle = {
  padding: "12px 12px", // Reduced padding to fit more content
  fontWeight: "700",
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  fontSize: "11px",
  letterSpacing: "0.5px",
  borderBottom: "1px solid var(--surface-border)",
  background: "var(--card-bg)",
};

const tdStyle = {
  padding: "12px 12px", // Reduced padding
};
