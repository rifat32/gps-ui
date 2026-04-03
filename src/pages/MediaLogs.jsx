import React, { useState, useEffect } from "react";
import { FileVideo, Calendar, HardDrive, RefreshCw, Download, Search } from "lucide-react";
import "./Logs.css";

// Use environment variable for API base URL, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_LOGS_API_URL || "http://localhost:8000";
const API_BASE = `${API_BASE_URL}/api`;

const MediaLogs = ({ theme }) => {
  const [selectedDate, setSelectedDate] = useState("");
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
    fetchDevices(today);
  }, []);

  const fetchDevices = async (date) => {
    if (!date) return;
    try {
      setLoading(true);
      setError("");
      // Reset dependent state
      setDevices([]);
      setLogContent("");
      setSelectedDevice("");

      const response = await fetch(`${API_BASE}/media-logs/dates/${date}/devices?service=dashcam`);
      const data = await response.json();
      if (data.success) {
        setDevices(data.devices || []);
      }
    } catch (err) {
      setError("Failed to fetch devices with media logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (date, deviceId) => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_BASE}/media-logs/dates/${date}/devices/${deviceId}?service=dashcam`);
      const data = await response.json();
      if (data.success) {
        setLogContent(data.content);
      }
    } catch (err) {
      setError("Failed to fetch media log content");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    setSelectedDate(val);
    if (val) fetchDevices(val);
    else {
      setDevices([]);
      setSelectedDevice("");
      setLogContent("");
    }
  };

  const handleDeviceChange = (e) => {
    const val = e.target.value;
    setSelectedDevice(val);
    if (val && selectedDate) fetchLogs(selectedDate, val);
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
    a.download = `media_logs_${selectedDate}_${selectedDevice}.log`;
    a.click();
  };

  return (
    <div className="logs-page">
      <div className="logs-header">
        <div className="logs-header-left">
          <div className="logs-icon-wrapper" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <FileVideo size={24} />
          </div>
          <div className="logs-title">
            <h1>Media Server Logs</h1>
            <p>Raw AI uploads and media control signatures</p>
          </div>
        </div>
        <button 
          onClick={() => selectedDate && selectedDevice ? fetchLogs(selectedDate, selectedDevice) : (selectedDate && fetchDevices(selectedDate))}
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
              <label><HardDrive size={14} /> Device ID</label>
              <select 
                value={selectedDevice} 
                onChange={handleDeviceChange}
                disabled={!selectedDate}
                className="logs-select"
              >
                <option value="">{devices.length > 0 ? "-- Select Device --" : "-- No media logs found --"}</option>
                {devices.map((dev) => (
                  <option key={dev} value={dev}>{dev}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="logs-card">
          <div className="form-group">
            <label><Search size={14} /> Filter Output</label>
            <input 
              type="text" 
              placeholder="Search in media logs..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="logs-input"
            />
          </div>
          <button
            onClick={downloadLogs}
            disabled={!logContent}
            className="download-btn"
            style={{ backgroundColor: '#ef4444' }}
          >
            <Download size={18} />
            Download Log
          </button>
        </div>
      </div>

      <div className="logs-viewer-container">
        <div className="logs-viewer-header">
          <span>media_logs.log output</span>
          {selectedDevice && <span className="device-tag">Device: {selectedDevice}</span>}
        </div>
        <div className="logs-viewport">
          {logContent ? (
            <pre>
              {filteredLines.length > 0 ? filteredLines.join("\n") : "No matches found for current filter"}
            </pre>
          ) : (
            <div className="placeholder-text">
              {loading ? "Loading logs..." : "Select a date and device to view media logs"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaLogs;
