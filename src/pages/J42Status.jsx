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

const getBatteryDetails = (voltage) => {
  if (voltage === undefined || voltage === null || voltage === "") {
    return { percent: null, text: "N/A", color: "#64748b", icon: Battery };
  }
  const val = parseFloat(voltage);
  if (isNaN(val) || val <= 0) {
    return { percent: null, text: "N/A", color: "#64748b", icon: Battery };
  }

  // J42 device uses Li-SOCl2 3.6V nominal dry-cell (2.6V - 3.5V range) or rechargeable 3.7V/4.2V range
  let percent = 0;
  if (val >= 3.65) {
    percent = Math.round(((val - 3.4) / (4.2 - 3.4)) * 100);
  } else {
    percent = Math.round(((val - 2.6) / (3.5 - 2.6)) * 100);
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
    text: `${percent}% (${val.toFixed(3)}V)`,
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

export default function J42Status({ theme }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDevices = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await deviceApi.getDevicesV2();
      if (response.success) {
        // Filter specifically for J42 devices
        const j42Devices = response.data.filter(d => d.device_type === "J42");
        setDevices(j42Devices);
        setError(null);
      } else {
        throw new Error(response.message || "Failed to load devices");
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

  const filteredDevices = devices.filter(
    (device) =>
      device.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.imei?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="stats-indicator">
          <span>Total: <strong>{devices.length}</strong></span>
          <span className="online-count">Online: <strong>{devices.filter(d => d.status?.toLowerCase() === "online").length}</strong></span>
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
            const battery = getBatteryDetails(device.batteryVoltage);
            const BatteryIcon = battery.icon;
            const extPower = getExternalPowerDetails(device.externalVoltage);
            const ExtPowerIcon = extPower.icon;
            const isOnline = device.status?.toLowerCase() === "online";
            
            return (
              <div key={device.id} className="device-card glass-panel hover-lift">
                <div className="device-card-header">
                  <div className={`status-badge ${isOnline ? "online" : "offline"}`}>
                    {isOnline ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    <span>{isOnline ? "Online" : "Offline"}</span>
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

                    {/* External Vehicle Power */}
                    <div className="j42-battery-section" style={{ margin: 0, padding: "0.75rem 1rem" }}>
                      <div className="battery-header" style={{ marginBottom: "0.5rem" }}>
                        <span className="label" style={{ fontSize: "0.6875rem" }}>External Power</span>
                        <span className="battery-value" style={{ color: extPower.color, fontSize: "0.8125rem" }}>
                          {extPower.isConnected && device.externalVoltage ? `${device.externalVoltage.toFixed(2)}V` : extPower.text}
                        </span>
                      </div>
                      <div className="battery-level-container" style={{ gap: "0.5rem" }}>
                        <div className="battery-icon-wrapper" style={{ padding: 0 }}>
                          <ExtPowerIcon size={18} style={{ color: extPower.color }} />
                        </div>
                        <span style={{ fontSize: "0.75rem", color: extPower.isConnected ? extPower.color : "#94a3b8", fontWeight: 600 }}>
                          {extPower.isConnected ? extPower.text : "Backup Power Only"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="info-item full-width last-seen-item">
                    <span className="label"><Clock size={12} className="inline mr-1" /> Last Report</span>
                    <span className="value">{device.lastSeen}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
