import React, { useState, useEffect } from "react";
import { FileText, Calendar, HardDrive, RefreshCw, Download, Search } from "lucide-react";
import "./Logs.css";

// Use environment variable for API base URL, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_LOGS_API_URL || "http://localhost:8000";
const API_BASE = `${API_BASE_URL}/api`;

const Logs = ({ theme }) => {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedService, setSelectedService] = useState("dashcam");
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [logContent, setLogContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Default to today's date
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
    fetchDevices(today, "dashcam");
  }, []);

  const fetchDevices = async (date, service) => {
    if (!date || !service) return;
    try {
      setLoading(true);
      setError("");
      // Reset dependent state
      setDevices([]);
      setLogContent("");
      setSelectedDevice("");

      const response = await fetch(`${API_BASE}/logs/dates/${date}/devices?service=${service}`);
      const data = await response.json();
      if (data.success) {
        setDevices(data.devices);
      }
    } catch (err) {
      setError("Failed to fetch devices for this date");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (date, deviceId, service) => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_BASE}/logs/dates/${date}/devices/${deviceId}?service=${service}`);
      const data = await response.json();
      if (data.success) {
        setLogContent(data.content);
      }
    } catch (err) {
      setError("Failed to fetch log content");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    setSelectedDate(val);
    if (val && selectedService) fetchDevices(val, selectedService);
    else {
      setDevices([]);
      setSelectedDevice("");
      setLogContent("");
    }
  };

  const handleServiceChange = (e) => {
    const val = e.target.value;
    setSelectedService(val);
    if (selectedDate && val) fetchDevices(selectedDate, val);
  };

  const handleDeviceChange = (e) => {
    const val = e.target.value;
    setSelectedDevice(val);
    if (val && selectedDate && selectedService) fetchLogs(selectedDate, val, selectedService);
    else setLogContent("");
  };

  const filteredLines = logContent.split("\n").filter((line) => 
    line.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadLogs = () => {
    const blob = new Blob([logContent], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raw_logs_${selectedService}_${selectedDate}_${selectedDevice}.log`;
    a.click();
  };

  return (
    <div className="logs-page">
      <div className="logs-header">
        <div className="logs-header-left">
          <div className="logs-icon-wrapper">
            <FileText size={24} />
          </div>
          <div className="logs-title">
            <h1>System Communication Logs</h1>
            <p>View raw hex data from connected devices</p>
          </div>
        </div>
        <button 
          onClick={() => selectedDate && selectedDevice ? fetchLogs(selectedDate, selectedDevice, selectedService) : (selectedDate && fetchDevices(selectedDate, selectedService))}
          disabled={loading}
          className="refresh-btn"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-toast">
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      <div className="logs-controls">
        <div className="logs-card">
          <div className="logs-row">
            <div className="form-group flex-1">
              <label><Calendar size={14} /> Log Date</label>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={handleDateChange} 
                className="logs-input"
              />
            </div>

            <div className="form-group flex-1">
              <label><RefreshCw size={14} /> Service Type</label>
              <select 
                value={selectedService} 
                onChange={handleServiceChange}
                className="logs-select"
              >
                <option value="dashcam">Dashcam Service</option>
                <option value="j42">J42 Service</option>
                <option value="obd">OBD Service</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label><HardDrive size={14} /> Select Device ID</label>
            <select 
              value={selectedDevice} 
              onChange={handleDeviceChange}
              disabled={!selectedDate || !selectedService}
              className="logs-select"
            >
              <option value="">{devices.length > 0 ? "-- Select Device --" : "-- No devices found --"}</option>
              {devices.map((dev) => (
                <option key={dev} value={dev}>{dev}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="logs-card">
          <div className="form-group">
            <label><Search size={14} /> Filter Output</label>
            <input 
              type="text" 
              placeholder="Search in logs..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="logs-input"
            />
          </div>
          <button
            onClick={downloadLogs}
            disabled={!logContent}
            className="download-btn"
          >
            <Download size={18} />
            Download Log File
          </button>
        </div>
      </div>

      <div className="logs-viewer-container">
        <div className="logs-viewer-header">
          <span>raw_logs.log output</span>
          {selectedDevice && <span>Device: {selectedDevice}</span>}
        </div>
        <div className="logs-viewport">
          {logContent ? (
            <pre>
              {filteredLines.length > 0 ? filteredLines.join("\n") : "No matches found for current filter"}
            </pre>
          ) : (
            <div className="placeholder-text">
              {loading ? "Loading logs..." : "Select a date and device to view logs"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Logs;
