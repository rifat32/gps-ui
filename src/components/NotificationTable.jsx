import { Image, PlaySquare, Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";

const BASE_URL = "http://54.37.225.65:4020";

export default function NotificationTable({ 
  alerts, 
  onOpenMedia, 
  pagination, 
  onPageChange,
  devices = [],
  filterDeviceId = "",
  onDeviceChange
}) {
  const [copiedType, setCopiedType] = useState(null); // { id: 123, type: 'image' | 'video' }

  const getProperUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;

    // If the path is absolute (contains /home/), extract the relative part
    if (path.includes("downloads/")) {
      const relativePart = path.substring(path.indexOf("downloads/"));
      return `${BASE_URL}/${relativePart}`;
    }

    return path.startsWith("/") ? `${BASE_URL}${path}` : `${BASE_URL}/${path}`;
  };

  const handleCopy = (path, id, type) => {
    const fullPath = getProperUrl(path);
    if (!fullPath) return;
    navigator.clipboard.writeText(fullPath);
    setCopiedType({ id, type });
    setTimeout(() => setCopiedType(null), 2000);
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
            <option value="">-- All Dashcams --</option>
            {devices.map(dev => (
              <option key={dev.device_id || dev.id} value={dev.device_id || dev.id}>
                {dev.device_id || dev.id} {dev.status === 'online' ? '(Online)' : '(Offline)'}
              </option>
            ))}
          </select>
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
              <th style={thStyle}>Event Code</th>
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
                        background:
                          alert.type === "DSM" ? "#f59e0b15" : "#ef444415",
                        color: alert.type === "DSM" ? "#f59e0b" : "#ef4444",
                        border: `1px solid ${alert.type === "DSM" ? "#f59e0b33" : "#ef444433"}`,
                        textTransform: "uppercase",
                      }}
                    >
                      {alert.type || "AI"}
                    </span>
                  </td>

                  <td style={tdStyle}>
                    <div style={{ color: "var(--text-secondary)" }}>
                      {alert.event_code}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ color: "var(--text-secondary)" }}>
                      {Math.round(alert.speed * 0.621371)}  mph
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {alert.file_path ? (
                        <button
                          onClick={() =>
                            onOpenMedia &&
                            onOpenMedia({
                              url: getProperUrl(alert.file_path),
                              title: alert.message,
                              time: alert.time,
                              deviceId: alert.deviceId,
                              type: "image",
                            })
                          }
                          className="media-btn image"
                          title="View Image"
                        >
                          <Image size={14} />
                        </button>
                      ) : (
                        <div className="media-btn disabled" title="No Image">
                          <Image size={14} />
                        </div>
                      )}
                      {alert.video_path ? (
                        <button
                          onClick={() =>
                            onOpenMedia &&
                            onOpenMedia({
                              url: getProperUrl(alert.video_path),
                              title: alert.message,
                              time: alert.time,
                              deviceId: alert.deviceId,
                              type: "video",
                            })
                          }
                          className="media-btn video"
                          title="Play Video"
                        >
                          <PlaySquare size={14} />
                        </button>
                      ) : (
                        <div className="media-btn disabled" title="No Video">
                          <PlaySquare size={14} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "12px" }}>
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
                          Image
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
                          Video
                        </button>
                      )}
                      {!alert.file_path && !alert.video_path && (
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
