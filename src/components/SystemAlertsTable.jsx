import React, { useState, useEffect } from "react";
import { Check, CheckCircle2, AlertOctagon, HelpCircle, MapPin } from "lucide-react";
import { formatDeviceDateTime } from "../utils/deviceTime";

const SEVERITY_STYLES = {
  CRITICAL: { bg: "#7f1d1d25", color: "#f87171", border: "#f8717150" },
  HIGH: { bg: "#7c2d1225", color: "#fb923c", border: "#fb923c50" },
  NORMAL: { bg: "#0c4a6e25", color: "#38bdf8", border: "#38bdf850" },
  LOW: { bg: "#14532d25", color: "#4ade80", border: "#4ade8050" },
};

const getSeverityStyle = (severity) => {
  return SEVERITY_STYLES[String(severity).toUpperCase()] || SEVERITY_STYLES.NORMAL;
};

const formatEventType = (type) => {
  if (!type) return "Unknown Event";
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const thStyle = {
  padding: "14px 20px",
  color: "#94a3b8",
  fontSize: "11px",
  fontWeight: "800",
  textTransform: "uppercase",
  borderBottom: "1px solid #1e293b",
  letterSpacing: "0.5px",
};

const tdStyle = {
  padding: "16px 20px",
  verticalAlign: "middle",
  borderBottom: "1px solid #1e293b",
};

export default function SystemAlertsTable({
  alerts,
  pagination,
  onPageChange,
  onMarkAsRead,
  onResolve,
  statusFilter,
  onStatusFilterChange,
  loading,
  
  deviceTypeFilter,
  onDeviceTypeFilterChange,
  deviceIdFilter,
  onDeviceIdFilterChange,
  devicesList,
  onMarkAllAsRead,
}) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return (
    <div
      style={{
        background: "var(--sidebar-bg)",
        border: "1px solid var(--surface-border)",
        borderRadius: "12px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        boxShadow: "0 4px 20px -2px rgba(0,0,0,0.3)",
      }}
    >
      {/* Table Header Controls */}
      <div
        style={{
          padding: "16px 20px",
          background: "var(--header-bg)",
          borderBottom: "1px solid var(--surface-border)",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "center",
          gap: isMobile ? "12px" : "20px",
        }}
      >
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", gap: isMobile ? "12px" : "20px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: "700",
                color: "var(--header-text)",
              }}
            >
              System Alarm Logs
            </h3>
            {isMobile && (
              <span style={{ fontSize: "11px", color: "var(--header-text)", opacity: 0.8, fontWeight: "600", marginLeft: "10px" }}>
                Total: {pagination?.total || alerts.length}
              </span>
            )}
          </div>

          {/* Device Type Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>Type:</span>
            <select
              value={deviceTypeFilter}
              onChange={(e) => onDeviceTypeFilterChange && onDeviceTypeFilterChange(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                background: "rgba(15, 23, 42, 0.45)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: "600",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="AI_DASHCAM">Dashcam</option>
              <option value="OBD">OBD</option>
              <option value="J42">Tracker</option>
            </select>
          </div>

          {/* Device ID Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>Device:</span>
            <select
              value={deviceIdFilter}
              onChange={(e) => onDeviceIdFilterChange && onDeviceIdFilterChange(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                background: "rgba(15, 23, 42, 0.45)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: "600",
                outline: "none",
                cursor: "pointer",
                maxWidth: "180px",
              }}
            >
              <option value="">All Devices</option>
              {(() => {
                const filtered = (devicesList || [])
                  .filter((d) => d.device_type === deviceTypeFilter || (deviceTypeFilter === "J42" && d.device_type === "TRACKER"));
                return filtered.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name || d.id}
                    </option>
                  ));
              })()}
            </select>
          </div>

          {/* Status Filters */}
          {isMobile ? (
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange && onStatusFilterChange(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                background: "var(--card-bg)",
                border: "1px solid var(--surface-border)",
                color: "var(--text-primary)",
                fontSize: "13px",
                fontWeight: "600",
                outline: "none",
                cursor: "pointer",
                width: "100%"
              }}
            >
              <option value="UNREAD">UNREAD</option>
              <option value="READ">READ</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          ) : (
            <div style={{ display: "flex", gap: "4px", background: "rgba(15, 23, 42, 0.45)", padding: "3px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              {["UNREAD", "READ", "RESOLVED"].map((status) => {
                const active = statusFilter === status;
                return (
                  <button
                    key={status}
                    onClick={() => onStatusFilterChange && onStatusFilterChange(status)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      background: active ? "#ffffff" : "transparent",
                      color: active ? "#1e293b" : "rgba(255, 255, 255, 0.7)",
                      border: "none",
                      fontSize: "11px",
                      fontWeight: active ? "800" : "600",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", justifyContent: isMobile ? "space-between" : "flex-end", width: isMobile ? "100%" : "auto" }}>
          {statusFilter === "UNREAD" && (
            <button
              onClick={() => onMarkAllAsRead && onMarkAllAsRead()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                color: "#ffffff",
                border: "none",
                fontWeight: "bold",
                fontSize: "12px",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(239, 68, 68, 0.2)",
                transition: "all 0.15s ease",
              }}
            >
              <CheckCircle2 size={14} />
              Mark All as Read
            </button>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(15, 23, 42, 0.25)",
              padding: "4px 10px",
              borderRadius: "8px",
              border: "1px solid var(--surface-border)",
              justifyContent: "space-between",
              width: isMobile ? "100%" : "auto",
              marginTop: isMobile ? "4px" : "0px",
            }}>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "700" }}>
                Page {pagination.page}/{pagination.totalPages}
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "4px",
                    background: pagination.page > 1 ? "#3b82f6" : "var(--btn-disabled-bg)",
                    color: pagination.page > 1 ? "#ffffff" : "var(--text-disabled)",
                    border: "none",
                    fontSize: "11px",
                    fontWeight: "bold",
                    cursor: pagination.page > 1 ? "pointer" : "not-allowed",
                  }}
                >
                  Prev
                </button>
                <button
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "4px",
                    background: pagination.page < pagination.totalPages ? "#3b82f6" : "var(--btn-disabled-bg)",
                    color: pagination.page < pagination.totalPages ? "#ffffff" : "var(--text-disabled)",
                    border: "none",
                    fontSize: "11px",
                    fontWeight: "bold",
                    cursor: pagination.page < pagination.totalPages ? "pointer" : "not-allowed",
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {!isMobile && !pagination && (
            <span style={{ fontSize: "11px", color: "var(--header-text)", opacity: 0.8, fontWeight: "600" }}>
              Total Alerts: {pagination?.total || alerts.length}
            </span>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {loading ? (
          <div style={{ padding: "40px", display: "flex", justifyContent: "center", alignItems: "center", color: "var(--text-secondary)" }}>
            <div style={{ border: "2px solid transparent", borderTopColor: "#3b82f6", borderRadius: "50%", width: "24px", height: "24px", animation: "spin 0.8s linear infinite", marginRight: "10px" }} />
            <span>Fetching alert database logs...</span>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead style={{ position: "sticky", top: 0, background: "#0f172a", zIndex: 10 }}>
              <tr>
                <th style={thStyle}>Vehicle / Device</th>
                <th style={thStyle}>Time Triggered</th>
                <th style={thStyle}>Policy / Name</th>
                <th style={thStyle}>Alarm Type</th>
                <th style={thStyle}>Severity</th>
                <th style={thStyle}>Location & Speed</th>
                <th style={thStyle}>Status / Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length > 0 ? (
                alerts.map((alert) => {
                  const style = getSeverityStyle(alert.severity);
                  return (
                    <tr
                      key={alert.id}
                      style={{ borderBottom: "1px solid #1e293b", transition: "background 0.2s" }}
                      className="table-row-hover"
                    >
                      {/* Vehicle / Device */}
                      <td style={tdStyle}>
                        <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>
                          {alert.licensePlate || "N/A"}
                        </div>
                        <div style={{ fontSize: "10px", color: "var(--text-secondary)", opacity: 0.7 }}>
                          IMEI / ID: {alert.deviceId}
                        </div>
                      </td>

                      {/* Time Triggered */}
                      <td style={tdStyle}>
                        <div style={{ color: "var(--text-secondary)" }}>
                          {alert.eventTime ? formatDeviceDateTime(alert.eventTime) : "N/A"}
                        </div>
                      </td>

                      {/* Policy / Name */}
                      <td style={tdStyle}>
                        <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>
                          {alert.alertPolicyName || "Default Policy"}
                        </div>
                      </td>

                      {/* Alarm Type */}
                      <td style={tdStyle}>
                        <div style={{ fontWeight: "600", color: "#38bdf8", textTransform: "uppercase", fontSize: "11px" }}>
                          {formatEventType(alert.eventType)}
                        </div>
                      </td>

                      {/* Severity */}
                      <td style={tdStyle}>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "800",
                            padding: "3px 8px",
                            borderRadius: "5px",
                            background: style.bg,
                            color: style.color,
                            border: `1px solid ${style.border}`,
                            textTransform: "uppercase",
                          }}
                        >
                          {alert.severity || "NORMAL"}
                        </span>
                      </td>

                      {/* Location & Speed */}
                      <td style={tdStyle}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <div style={{ color: "var(--text-secondary)", fontWeight: "600" }}>
                            {alert.speed !== undefined && alert.speed !== null ? `${Math.round(alert.speed * 0.621371)} mph` : "N/A"}
                          </div>
                          {alert.latitude && alert.longitude && (
                            <a
                              href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: "flex", alignItems: "center", gap: "4px", color: "#3b82f6", fontSize: "10px", textDecoration: "none" }}
                            >
                              <MapPin size={10} /> Maps Link
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Status / Action */}
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          {alert.status === "UNREAD" && (
                            <>
                              <button
                                onClick={() => onMarkAsRead && onMarkAsRead(alert.id)}
                                style={actionBtnStyle("#1e293b", "#38bdf8", "#38bdf8")}
                                title="Mark as Read"
                              >
                                <Check size={14} />
                                <span>Read</span>
                              </button>
                              <button
                                onClick={() => onResolve && onResolve(alert.id)}
                                style={actionBtnStyle("#14532d", "#4ade80", "#4ade80")}
                                title="Resolve Alarm"
                              >
                                <CheckCircle2 size={14} />
                                <span>Resolve</span>
                              </button>
                            </>
                          )}
                          {alert.status === "READ" && (
                            <button
                              onClick={() => onResolve && onResolve(alert.id)}
                              style={actionBtnStyle("#14532d", "#4ade80", "#4ade80")}
                              title="Resolve Alarm"
                            >
                              <CheckCircle2 size={14} />
                              <span>Resolve</span>
                            </button>
                          )}
                          {alert.status === "RESOLVED" && (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#4ade80", fontWeight: "700", fontSize: "11px" }}>
                              <CheckCircle2 size={16} />
                              <span>RESOLVED</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                    No system alerts found for status "{statusFilter}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
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
          <button
            disabled={pagination.page <= 1}
            onClick={() => onPageChange && onPageChange(pagination.page - 1)}
            style={paginationBtnStyle(pagination.page <= 1)}
          >
            Previous
          </button>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange && onPageChange(pagination.page + 1)}
            style={paginationBtnStyle(pagination.page >= pagination.totalPages)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

const actionBtnStyle = (bg, color, border) => ({
  background: bg,
  color: color,
  border: `1px solid ${border}40`,
  padding: "6px 12px",
  borderRadius: "6px",
  fontSize: "11px",
  fontWeight: "700",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  transition: "all 0.15s ease",
});

const paginationBtnStyle = (disabled) => ({
  padding: "6px 14px",
  borderRadius: "6px",
  background: disabled ? "rgba(255, 255, 255, 0.05)" : "#1e293b",
  color: disabled ? "#64748b" : "#ffffff",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  fontSize: "11px",
  fontWeight: "700",
  cursor: disabled ? "not-allowed" : "pointer",
  transition: "all 0.15s ease",
});
