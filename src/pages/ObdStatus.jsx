import { useEffect, useState, useCallback } from "react";
import { Activity, Battery, Gauge, Signal, WifiOff, Zap, ChevronLeft, ChevronRight } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_OBD_API_URL || "";

export default function ObdStatus({ theme }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    totalDevices: 0,
    totalPages: 0
  });

  const fetchStatuses = useCallback(async (page = pagination.page) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/logs/v1.0/devices/status?page=${page}&limit=${pagination.limit}`);
      if (!response.ok) throw new Error("Failed to fetch device statuses");
      const data = await response.json();
      
      setDevices(data.devices || []);
      setPagination(prev => ({
        ...prev,
        page: data.current_page || page,
        totalDevices: data.total_devices || 0,
        totalPages: data.total_pages || 0
      }));
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [pagination.limit, pagination.page]);

  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(() => fetchStatuses(pagination.page), 10000); // Refresh current page every 10s
    return () => clearInterval(interval);
  }, [fetchStatuses, pagination.page]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setLoading(true);
      setPagination(prev => ({ ...prev, page: newPage }));
      fetchStatuses(newPage);
    }
  };

  if (loading && pagination.totalDevices === 0)
    return (
      <div
        style={{
          padding: "32px",
          textAlign: "center",
          color: theme === "dark" ? "white" : "#1e293b",
        }}
      >
        <Activity className="animate-spin inline mr-2" /> Loading Device
        Status...
      </div>
    );

  if (error && pagination.totalDevices === 0)
    return (
      <div style={{ padding: "32px", color: "#ef4444", textAlign: "center" }}>
        Error: {error}
      </div>
    );

  return (
    <div
      style={{
        padding: "24px",
        minHeight: "100vh",
        backgroundColor: theme === "dark" ? "#0f172a" : "#f8fafc",
        color: theme === "dark" ? "white" : "#1e293b",
      }}
    >
      <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: "800",
              marginBottom: "8px",
            }}
          >
            OBD Device Status
          </h1>
          <p style={{ color: "#64748b" }}>
            Real-time connectivity and engine diagnostics for all vehicles.
          </p>
        </div>
        <div style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: "600" }}>
          Showing {devices.length} of {pagination.totalDevices} devices
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "24px",
          marginBottom: "40px"
        }}
      >
        {devices.map((device) => (
          <DeviceStatusCard
            key={device.vehicle_id}
            device={device}
            theme={theme}
          />
        ))}
        {devices.length === 0 && !loading && (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: "48px",
              textAlign: "center",
              border: "2px dashed #e2e8f0",
              borderRadius: "12px",
              opacity: 0.5,
            }}
          >
            No devices found on this page.
          </div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <PaginationControls 
          pagination={pagination} 
          onPageChange={handlePageChange} 
          theme={theme} 
        />
      )}
    </div>
  );
}

function PaginationControls({ pagination, onPageChange, theme }) {
  const { page, totalPages } = pagination;
  
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const buttonBaseStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    fontSize: "0.875rem",
    fontWeight: "600",
    border: "none",
    userSelect: "none"
  };

  const activeStyle = {
    backgroundColor: "#3b82f6",
    color: "white",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)"
  };

  const inactiveStyle = {
    backgroundColor: theme === "dark" ? "#1e293b" : "white",
    color: theme === "dark" ? "#94a3b8" : "#64748b",
    border: `1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}`
  };

  const navButtonStyle = {
    ...buttonBaseStyle,
    ...inactiveStyle,
    width: "auto",
    padding: "0 16px",
    gap: "8px"
  };

  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      gap: "8px",
      marginTop: "40px",
      padding: "16px",
      borderRadius: "16px",
      backgroundColor: theme === "dark" ? "rgba(30, 41, 59, 0.5)" : "rgba(255, 255, 255, 0.5)",
      backdropFilter: "blur(8px)",
      border: `1px solid ${theme === "dark" ? "rgba(51, 65, 85, 0.5)" : "rgba(226, 232, 240, 0.5)"}`
    }}>
      <button 
        style={{ ...navButtonStyle, opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? "default" : "pointer" }}
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
      >
        <ChevronLeft size={16} /> Previous
      </button>

      {getPageNumbers().map(p => (
        <button
          key={p}
          style={p === page ? { ...buttonBaseStyle, ...activeStyle } : { ...buttonBaseStyle, ...inactiveStyle }}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}

      <button 
        style={{ ...navButtonStyle, opacity: page === totalPages ? 0.5 : 1, cursor: page === totalPages ? "default" : "pointer" }}
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
      >
        Next <ChevronRight size={16} />
      </button>
    </div>
  );
}

function DeviceStatusCard({ device, theme }) {
  const isOnline = device.connection_status === "ONLINE";
  const isEngineOn = device.engine_status === "ON";

  const cardStyle = {
    position: "relative",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: theme === "dark" 
      ? "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)"
      : "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    border: `1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}`,
    backgroundColor: theme === "dark" ? "#1e293b" : "white",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    cursor: "default"
  };

  const badgeStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "4px 12px",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: "700",
    backgroundColor: isOnline
      ? "rgba(34, 197, 94, 0.1)"
      : "rgba(239, 68, 68, 0.1)",
    color: isOnline ? "#22c55e" : "#ef4444",
  };

  const statBoxStyle = {
    padding: "16px",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    backgroundColor: theme === "dark" ? "rgba(15, 23, 42, 0.5)" : "#f8fafc",
    transition: "background-color 0.2s ease"
  };

  return (
    <div 
      style={cardStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = theme === "dark"
          ? "0 10px 15px -3px rgba(0, 0, 0, 0.4)"
          : "0 10px 15px -3px rgba(0, 0, 0, 0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = theme === "dark"
          ? "0 4px 6px -1px rgba(0, 0, 0, 0.3)"
          : "0 1px 3px 0 rgba(0, 0, 0, 0.1)";
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
        }}
      >
        <div>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "800", margin: 0, letterSpacing: "-0.025em" }}>
            {device.name || device.vehicle_id}
          </h3>
          <span
            style={{
              fontSize: "0.75rem",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontWeight: "600"
            }}
          >
            {device.name ? device.vehicle_id : "Device ID"}
          </span>
        </div>
        <div style={badgeStyle}>
          {isOnline ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#22c55e", display: "inline-block", boxShadow: "0 0 8px #22c55e" }} />
              ONLINE
            </div>
          ) : (
             <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <WifiOff size={14} />
              OFFLINE
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div style={statBoxStyle}>
          <Zap
            size={20}
            color={isEngineOn ? "#eab308" : "#94a3b8"}
            fill={isEngineOn ? "#eab308" : "none"}
            style={{ opacity: isEngineOn ? 1 : 0.5 }}
          />
          <span
            style={{
              fontSize: "0.75rem",
              color: "#64748b",
              textTransform: "uppercase",
              fontWeight: "600"
            }}
          >
            Engine
          </span>
          <span
            style={{
              fontWeight: "700",
              color: isEngineOn ? "#eab308" : "#64748b",
            }}
          >
            {device.engine_status}
          </span>
        </div>

        <div style={statBoxStyle}>
          <Battery
            size={20}
            color={device.telemetry.voltage > 12.5 ? "#22c55e" : "#ef4444"}
            style={{ opacity: isOnline ? 1 : 0.5 }}
          />
          <span
            style={{
              fontSize: "0.75rem",
              color: "#64748b",
              textTransform: "uppercase",
              fontWeight: "600"
            }}
          >
            Battery
          </span>
          <span style={{ fontWeight: "700" }}>
            {device.telemetry.voltage.toFixed(2)}V
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "16px",
          borderTop: `1px solid ${theme === "dark" ? "#334155" : "#f1f5f9"}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Gauge size={16} color="#3b82f6" style={{ opacity: isOnline ? 1 : 0.5 }} />
          <span style={{ fontSize: "0.875rem", fontWeight: "700" }}>
            {device.telemetry.rpm} <span style={{ fontSize: "0.75rem", fontWeight: "400", color: "#64748b" }}>RPM</span>
          </span>
        </div>
        <div style={{ fontSize: "10px", color: "#64748b", textAlign: "right", fontWeight: "500" }}>
          Last seen:
          <br />
          <span style={{ color: theme === "dark" ? "#94a3b8" : "#475569" }}>
            {device.last_seen
              ? isNaN(new Date(device.last_seen).getTime())
                ? device.last_seen
                : new Date(device.last_seen).toLocaleString()
              : "Never"}
          </span>
        </div>
      </div>
    </div>
  );
}
