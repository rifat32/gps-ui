import React, { useState, useEffect, useCallback } from "react";
import { 
  Search, 
  Cpu, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Battery,
  BatteryCharging,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  RefreshCw,
  Clock,
  Info
} from "lucide-react";
import deviceApi from "../services/deviceApi";
import "./DeviceManagement.css";
import "./J42Status.css";

const getBatteryDetails = (voltage, rawVoltage = null) => {
  if (voltage === undefined || voltage === null || voltage === "") {
    return { percent: null, text: "N/A", color: "#64748b", icon: Battery };
  }
  const val = parseFloat(voltage);
  if (isNaN(val) || val <= 0) {
    return { percent: null, text: "N/A", color: "#64748b", icon: Battery };
  }

  let percent = 0;
  let displayVolts = "";

  // If the parsed value is greater than 5.0, it is already the percentage (0-100)
  if (val > 5.0) {
    percent = Math.round(val);
    if (rawVoltage && parseFloat(rawVoltage) > 0) {
      displayVolts = ` (${parseFloat(rawVoltage).toFixed(3)}V)`;
    }
  } else {
    // Fallback/legacy calculation based on voltage range
    if (val >= 3.65) {
      percent = Math.round(((val - 3.0) / (4.2 - 3.0)) * 100);
    } else {
      percent = Math.round(((val - 2.4) / (3.6 - 2.4)) * 100);
    }
    displayVolts = ` (${val.toFixed(3)}V)`;
  }

  percent = Math.max(0, Math.min(100, percent));
  
  let color = "#22c55e"; // Green
  let Icon = Battery;
  
  if (percent > 75) {
    Icon = Battery;
  } else if (percent > 50) {
    Icon = BatteryMedium;
  } else if (percent > 20) {
    Icon = BatteryLow;
    color = "#f59e0b"; // Amber
  } else {
    Icon = BatteryWarning;
    color = "#ef4444"; // Red
  }

  return {
    percent,
    text: `${percent}%${displayVolts}`,
    color,
    icon: Icon
  };
};

const getExternalPowerDetails = (voltage) => {
  if (voltage === undefined || voltage === null || voltage === "") {
    return { isConnected: false, text: "N/A", color: "#64748b", icon: XCircle };
  }
  const val = parseFloat(voltage);
  if (isNaN(val) || val < 5.0) {
    return { isConnected: false, text: `Disconnected (${val > 0 ? val.toFixed(2) + "V" : "0V"})`, color: "#ef4444", icon: XCircle };
  }

  let statusText = "Connected";
  if (val >= 13.0 && val <= 15.0) {
    statusText = "Charging (12V System)";
  } else if (val >= 26.0 && val <= 30.0) {
    statusText = "Charging (24V System)";
  } else {
    statusText = `Connected (${val.toFixed(2)}V)`;
  }

  return {
    isConnected: true,
    text: `${statusText}`,
    color: "#22c55e",
    icon: BatteryCharging
  };
};

// Simple global sequential geocode queue to satisfy Nominatim's strict 1 request per second rate limit
let geocodeQueue = Promise.resolve();

const GeocodedAddress = ({ lat, lng }) => {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchAddress = () => {
      setLoading(true);
      // Append the lookup task to the sequential queue
      geocodeQueue = geocodeQueue
        .then(() => new Promise((resolve) => setTimeout(resolve, 1050))) // Ensure > 1 second delay between requests
        .then(async () => {
          if (!active) return;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2`,
              { headers: { "User-Agent": "FleetManagement/1.0" } }
            );
            if (res.ok) {
              const data = await res.json();
              if (active) {
                setAddress(data.display_name || `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`);
              }
            } else {
              throw new Error();
            }
          } catch (err) {
            if (active) {
              setAddress(`${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`);
            }
          } finally {
            if (active) setLoading(false);
          }
        });
    };

    fetchAddress();

    return () => {
      active = false;
    };
  }, [lat, lng]);

  if (loading && !address) {
    return <span style={{ color: "#94a3b8", fontSize: "11px" }}>Locating address...</span>;
  }

  return <span>{address || `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`}</span>;
};

export default function J42Status({ theme }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deviceAlerts, setDeviceAlerts] = useState({});
  const [lastGlobalAlert, setLastGlobalAlert] = useState(null);
  const [selectedDeviceTrajectory, setSelectedDeviceTrajectory] = useState(null); // { device, points: [], loading: false, error: null }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [realDeviceFilter, setRealDeviceFilter] = useState("all"); // "all" | "real" | "virtual"

  const fetchTrajectory = async (device) => {
    setSelectedDeviceTrajectory({ device, points: [], loading: true, error: null });
    setIsModalOpen(true);
    try {
      const end = new Date().toISOString();
      const start = new Date(Date.now() - 24 * 60 * 60 * 1000 * 30).toISOString(); // 30 days ago trajectory
      const OBD_API_URL = import.meta.env.VITE_OBD_API_URL || "";
      const url = `${OBD_API_URL}/api/logs/v1.0/${device.id}/playback/duration?start=${start}&end=${end}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load trajectory points");
      const data = await res.json();
      
      const rawPoints = data.points || [];
      const validPoints = rawPoints.filter(p => {
        const lat = parseFloat(p.lat);
        const lng = parseFloat(p.lng || p.lon);
        return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
      });

      setSelectedDeviceTrajectory({
        device,
        points: validPoints,
        loading: false,
        error: validPoints.length === 0 ? "No active trajectory location records found in the last 30 days." : null
      });
    } catch (err) {
      setSelectedDeviceTrajectory({
        device,
        points: [],
        loading: false,
        error: err.message || "Failed to load trajectory address points."
      });
    }
  };

  const fetchDevices = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const deviceResponse = await deviceApi.getDevicesV2();

      if (deviceResponse.success) {
        // Filter specifically for J42 devices
        const j42Devices = deviceResponse.data.filter(d => d.device_type === "J42");
        setDevices(j42Devices);
        setError(null);

        // Fetch latest alerts for all these J42 devices in parallel/batch
        if (j42Devices.length > 0) {
          const deviceIds = j42Devices.map(d => d.id);
          const alertsResponse = await deviceApi.getLatestAlertsForDevices(deviceIds);

          if (alertsResponse.success) {
            const alertsMap = alertsResponse.data || {};
            setDeviceAlerts(alertsMap);

            // Find the most recent overall alert from J42 devices
            const alertsList = Object.values(alertsMap);
            if (alertsList.length > 0) {
              const sorted = [...alertsList].sort(
                (a, b) => new Date(b.eventTime) - new Date(a.eventTime)
              );
              setLastGlobalAlert(sorted[0]);
            } else {
              setLastGlobalAlert(null);
            }
          }
        }
      } else {
        throw new Error(deviceResponse.message || "Failed to load devices");
      }
    } catch (err) {
      setError(err.message || "Could not retrieve tracker telemetry data.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices(true);
    
    // Automatically poll status every 10 seconds
    const interval = setInterval(() => {
      fetchDevices(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchDevices]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchDevices(false);
  };


  const filteredDevices = devices.filter((device) => {
    // 1. Text filter
    const matchesText = 
      device.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.imei?.toLowerCase().includes(searchTerm.toLowerCase());
      
    // 2. Real vs Virtual device filter
    let matchesRealType = true;
    if (realDeviceFilter === "real") {
      matchesRealType = device.isRealDevice === true;
    } else if (realDeviceFilter === "virtual") {
      matchesRealType = device.isRealDevice !== true;
    }

    return matchesText && matchesRealType;
  });

  return (
    <div className={`device-mgmt-container ${theme === "dark" ? "dark-theme" : ""}`}>
      {/* Page Header */}
      <div className="page-header glass-panel animate-fade-in">
        <div className="header-titles">
          <h1>J42 Tracker Status</h1>
          <p className="subtitle">
            Monitor real-time battery diagnostics and active connection state for your J42 hardware.
          </p>
        </div>
        <div className="header-actions">
          <button 
            className={`primary-btn ${isRefreshing ? "refreshing" : ""}`}
            onClick={handleManualRefresh}
            disabled={loading || isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? "spin-animation" : ""} />
            <span>{isRefreshing ? "Syncing..." : "Sync Status"}</span>
          </button>
        </div>
      </div>

      {/* Latest Alert Banner */}
      {lastGlobalAlert && (() => {
        const globalAlertDevice = devices.find(d => d.id === lastGlobalAlert.deviceId);
        const globalAlertDeviceName = globalAlertDevice ? globalAlertDevice.name : lastGlobalAlert.deviceId;
        return (
          <div className="last-alert-banner glass-panel animate-fade-in" style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            padding: "1rem 1.5rem",
            marginBottom: "1.5rem",
            background: lastGlobalAlert.severity === "CRITICAL" 
              ? "rgba(239, 68, 68, 0.08)" 
              : "rgba(245, 158, 11, 0.08)",
            border: `1px solid ${lastGlobalAlert.severity === "CRITICAL" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)"}`,
            borderRadius: "12px",
            color: lastGlobalAlert.severity === "CRITICAL" ? "#ef4444" : "#f59e0b"
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: "0.875rem" }}>
              <span style={{ fontWeight: 700, textTransform: "uppercase", marginRight: "0.5rem" }}>
                Last Alert:
              </span>
              <span style={{ fontWeight: 600, color: theme === "dark" ? "#f8fafc" : "#0f172a" }}>
                {lastGlobalAlert.eventType?.replace(/_/g, " ")}
              </span>
              <span style={{ margin: "0 0.5rem", color: "#64748b" }}>•</span>
              <span style={{ color: "#64748b" }}>Device:</span> <strong style={{ color: theme === "dark" ? "#f8fafc" : "#0f172a" }}>{globalAlertDeviceName}</strong>
              {lastGlobalAlert.licensePlate && (
                <>
                  <span style={{ margin: "0 0.5rem", color: "#64748b" }}>•</span>
                  <span style={{ color: "#64748b" }}>Vehicle:</span> <strong style={{ color: theme === "dark" ? "#f8fafc" : "#0f172a" }}>{lastGlobalAlert.licensePlate}</strong>
                </>
              )}
              <span style={{ margin: "0 0.5rem", color: "#64748b" }}>•</span>
              <span style={{ color: "#64748b" }}>{new Date(lastGlobalAlert.eventTime).toLocaleString()}</span>
            </div>
            <div className="status-badge" style={{ 
              background: lastGlobalAlert.status === "UNREAD" ? "rgba(59, 130, 246, 0.15)" : "rgba(148, 163, 184, 0.15)",
              color: lastGlobalAlert.status === "UNREAD" ? "#3b82f6" : "#64748b",
              fontSize: "0.75rem",
              fontWeight: 700,
              border: "none",
              padding: "0.25rem 0.5rem",
              borderRadius: "6px"
            }}>
              {lastGlobalAlert.status}
            </div>
          </div>
        );
      })()}

      {/* Control Filters */}
      <div className="controls-section glass-panel animate-fade-in">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Filter J42 devices by ID, name or IMEI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select
            value={realDeviceFilter}
            onChange={(e) => setRealDeviceFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              background: theme === "dark" ? "#1e293b" : "#f1f5f9",
              border: `1px solid ${theme === "dark" ? "#334155" : "#cbd5e1"}`,
              color: theme === "dark" ? "#f8fafc" : "#0f172a",
              fontSize: "13px",
              fontWeight: "600",
              outline: "none",
              cursor: "pointer",
              minWidth: "150px"
            }}
          >
            <option value="all">All Devices</option>
            <option value="real">Real Devices Only</option>
            <option value="virtual">Virtual Devices Only</option>
          </select>
        </div>
        <div className="stats-indicator">
          <span>Total: <strong>{filteredDevices.length}</strong></span>
          <span className="online-count">Online: <strong>{
            filteredDevices.filter(d => d.status?.toLowerCase() === "online").length
          }</strong></span>
        </div>
      </div>

      {/* Grid List */}
      <div className="devices-grid animate-slide-up">
        {loading && devices.length === 0 ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Syncing live battery logs...</p>
          </div>
        ) : error && devices.length === 0 ? (
          <div className="error-state glass-panel">
            <AlertCircle size={48} className="error-icon" />
            <p>{error}</p>
            <button className="secondary-btn" onClick={() => fetchDevices(true)}>Retry Connection</button>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="empty-state glass-panel">
            <Cpu size={48} className="empty-icon" />
            <p>No J42 trackers match your search filters.</p>
          </div>
        ) : (
          filteredDevices.map((device) => {
            const battery = getBatteryDetails(device.batteryVoltage, device.externalVoltage);
            const BatteryIcon = battery.icon;
            const extPower = getExternalPowerDetails(device.externalVoltage);
            const ExtPowerIcon = extPower.icon;
            const isOnline = device.status?.toLowerCase() === "online";
                    return (
              <div 
                key={device.id} 
                className="device-card glass-panel hover-lift"
                onClick={() => fetchTrajectory(device)}
                style={{ cursor: "pointer" }}
              >
                <div className="device-card-header">
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <div className={`status-badge ${isOnline ? "online" : "offline"}`}>
                      {isOnline ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      <span>{isOnline ? "Online" : "Offline"}</span>
                    </div>
                    <span style={{
                      fontSize: "9px",
                      fontWeight: "800",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      textTransform: "uppercase",
                      backgroundColor: device.isRealDevice ? "rgba(34, 197, 94, 0.1)" : "rgba(148, 163, 184, 0.1)",
                      color: device.isRealDevice ? "#22c55e" : "#94a3b8",
                      border: `1px solid ${device.isRealDevice ? "rgba(34, 197, 94, 0.2)" : "rgba(148, 163, 184, 0.2)"}`
                    }}>
                      {device.isRealDevice ? "Real" : "Virtual"}
                    </span>
                  </div>
                  <div className="device-type-tag">J42 Tracker</div>
                </div>

                <div className="device-info">
                  <h3>{device.name || "Unnamed J42 Tracker"}</h3>
                  <code className="device-id">{device.id}</code>
                  
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">IMEI</span>
                      <span className="value">{device.imei || "N/A"}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Model</span>
                      <span className="value">{device.model || "J42 nominal"}</span>
                    </div>
                    <div className="info-item full-width">
                      <span className="label">ICCID (SIM)</span>
                      <span className="value">{device.iccid || "N/A"}</span>
                    </div>
                  </div>

                  {/* Dual Power & Battery Status */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
                    {/* Internal Backup Battery */}
                    <div className="j42-battery-section" style={{ margin: 0, padding: "0.75rem 1rem" }}>
                      <div className="battery-header" style={{ marginBottom: "0.5rem" }}>
                        <span className="label" style={{ fontSize: "0.6875rem" }}>Backup Battery</span>
                        <span className="battery-value" style={{ color: battery.color, fontSize: "0.8125rem" }}>
                          {battery.text}
                        </span>
                      </div>
                      <div className="battery-level-container" style={{ gap: "0.5rem" }}>
                        <div className="battery-icon-wrapper" style={{ padding: 0 }}>
                          <BatteryIcon size={18} style={{ color: battery.color }} />
                        </div>
                        <div className="battery-progress-bg" style={{ height: "6px" }}>
                          <div 
                            className="battery-progress-fill" 
                            style={{ 
                              width: battery.percent !== null ? `${battery.percent}%` : "0%",
                              backgroundColor: battery.color
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Device Last Alert */}
                  {(() => {
                    const deviceAlert = deviceAlerts[device.id];
                    return deviceAlert ? (
                      <div className="info-item full-width last-seen-item" style={{ borderTop: "1px dashed rgba(0, 0, 0, 0.05)", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
                        <span className="label"><AlertCircle size={12} className="inline mr-1" /> Last Alert</span>
                        <span className="value" style={{ 
                          color: deviceAlert.severity === "CRITICAL" ? "#ef4444" : "#f59e0b", 
                          fontWeight: 600,
                          fontSize: "0.8125rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between"
                        }}>
                          <span>{deviceAlert.eventType?.replace(/_/g, ' ')}</span>
                          <span style={{ fontSize: "0.6875rem", color: "#64748b", fontWeight: 400 }}>
                            {new Date(deviceAlert.eventTime).toLocaleDateString()}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <div className="info-item full-width last-seen-item" style={{ borderTop: "1px dashed rgba(0, 0, 0, 0.05)", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
                        <span className="label"><AlertCircle size={12} className="inline mr-1" /> Last Alert</span>
                        <span className="value" style={{ color: "#94a3b8", fontSize: "0.8125rem" }}>No recent alerts</span>
                      </div>
                    );
                  })()}

                  <div className="info-item full-width last-seen-item" style={{ marginTop: "0.5rem", paddingTop: "0.5rem" }}>
                    <span className="label"><Clock size={12} className="inline mr-1" /> Last Report</span>
                    <span className="value">{device.lastSeen}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Trajectory Modal Overlay */}
      {isModalOpen && selectedDeviceTrajectory && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.8)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          backdropFilter: "blur(4px)",
        }} onClick={() => setIsModalOpen(false)}>
          <div style={{
            background: theme === "dark" ? "#1e293b" : "#ffffff",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "750px",
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            overflow: "hidden",
            color: theme === "dark" ? "#f8fafc" : "#0f172a"
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: "20px",
              borderBottom: `1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
                  Location History Log: {selectedDeviceTrajectory.device?.name || selectedDeviceTrajectory.device?.id}
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                  Displaying last 3 days of recorded location trajectory updates
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: theme === "dark" ? "#94a3b8" : "#64748b",
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }} className="custom-scrollbar">
              {selectedDeviceTrajectory.loading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
                  <div className="spin-animation" style={{
                    width: "32px",
                    height: "32px",
                    border: "3px solid #3b82f6",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    marginBottom: "12px"
                  }} />
                  <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>Fetching trajectory records...</p>
                </div>
              ) : selectedDeviceTrajectory.error ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#ef4444" }}>
                  <p style={{ margin: 0, fontSize: "14px" }}>{selectedDeviceTrajectory.error}</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}` }}>
                        <th style={{ padding: "10px", textAlign: "left", color: "#64748b", fontWeight: "600" }}>Time</th>
                        <th style={{ padding: "10px", textAlign: "left", color: "#64748b", fontWeight: "600" }}>Address / Coordinates</th>
                        <th style={{ padding: "10px", textAlign: "right", color: "#64748b", fontWeight: "600" }}>Speed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDeviceTrajectory.points.map((pt, idx) => (
                        <tr key={idx} style={{ 
                          borderBottom: `1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}`,
                          background: idx % 2 === 0 ? (theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)") : "transparent"
                        }}>
                          <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                            {new Date(pt.timestamp || pt.gps_time || pt.time).toLocaleString()}
                          </td>
                          <td style={{ padding: "10px" }}>
                            <GeocodedAddress lat={pt.lat} lng={pt.lng || pt.lon} />
                          </td>
                          <td style={{ padding: "10px", textAlign: "right" }}>
                            {Math.round((pt.speed || 0) * 0.621371)} mph
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
