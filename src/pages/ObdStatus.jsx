import { useEffect, useState } from "react";
import { Activity, Battery, Gauge, Signal, WifiOff, Zap } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_OBD_API_URL || "";

export default function ObdStatus({ theme }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatuses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1.0/devices/status`);
      if (!response.ok) throw new Error("Failed to fetch device statuses");
      const data = await response.json();
      setDevices(data.devices || []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading)
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
  if (error)
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
      <div style={{ marginBottom: "32px" }}>
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "24px",
        }}
      >
        {devices.map((device) => (
          <DeviceStatusCard
            key={device.vehicle_id}
            device={device}
            theme={theme}
          />
        ))}
        {devices.length === 0 && (
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
            No devices found in the system.
          </div>
        )}
      </div>
    </div>
  );
}

function DeviceStatusCard({ device, theme }) {
  const isOnline = device.connection_status === "ONLINE";
  const isEngineOn = device.engine_status === "ON";

  const cardStyle = {
    borderRadius: "16px",
    padding: "24px",
    boxShadow:
      "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    border: `1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}`,
    backgroundColor: theme === "dark" ? "#1e293b" : "white",
    transition: "all 0.3s ease",
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
  };

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
        }}
      >
        <div>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "800", margin: 0 }}>
            {device.name || device.vehicle_id}
          </h3>
          <span
            style={{
              fontSize: "0.75rem",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {device.name ? device.vehicle_id : "Device ID"}
          </span>
        </div>
        <div style={badgeStyle}>
          {isOnline ? <Signal size={14} /> : <WifiOff size={14} />}
          {device.connection_status}
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
            style={{ opacity: isEngineOn ? 1 : 0.5 }}
          />
          <span
            style={{
              fontSize: "0.75rem",
              color: "#64748b",
              textTransform: "uppercase",
            }}
          >
            Engine
          </span>
          <span
            style={{
              fontWeight: "700",
              color: isEngineOn ? "#eab308" : "#94a3b8",
            }}
          >
            {device.engine_status}
          </span>
        </div>

        <div style={statBoxStyle}>
          <Battery
            size={20}
            color={device.telemetry.voltage > 12.5 ? "#22c55e" : "#ef4444"}
          />
          <span
            style={{
              fontSize: "0.75rem",
              color: "#64748b",
              textTransform: "uppercase",
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
          <Gauge size={16} color="#3b82f6" />
          <span style={{ fontSize: "0.875rem", fontWeight: "600" }}>
            {device.telemetry.rpm} RPM
          </span>
        </div>
        <div style={{ fontSize: "10px", color: "#64748b", textAlign: "right" }}>
          Last seen:
          <br />
          {device.last_seen
            ? isNaN(new Date(device.last_seen).getTime())
              ? device.last_seen
              : new Date(device.last_seen).toLocaleString()
            : "Never"}
        </div>
      </div>
    </div>
  );
}
