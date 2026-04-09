import React, { useState, useEffect } from "react";
import { FileText, Terminal, RefreshCw, Download, Search, AlertCircle, ChevronDown } from "lucide-react";
import "./Logs.css";

const API_BASE_URL = import.meta.env.VITE_LOGS_API_URL || "http://localhost:8000";
const API_BASE = `${API_BASE_URL}/api`;

const Pm2Logs = ({ theme }) => {
  const [selectedApp, setSelectedApp] = useState("fleet-management-backend-dashcam-server");
  const [logType, setLogType] = useState("out");
  const [logContent, setLogContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const apps = [
    { id: "fleet-management-backend-api-server", name: "API Server" },
    { id: "fleet-management-backend-dashcam-server", name: "Dashcam Server" },
    { id: "fleet-management-backend-dashcam-worker", name: "Dashcam Worker" },
    { id: "fleet-management-backend-obd-server", name: "OBD Server" },
    { id: "fleet-management-backend-obd-worker", name: "OBD Worker" },
    { id: "fleet-management-backend-j42-server", name: "J42 Server" },
    { id: "fleet-management-backend-j42-worker", name: "J42 Worker" },
    { id: "fleet-management-backend-monitoring-server", name: "Monitoring Server" },
    { id: "fleet-management-backend-worker-service", name: "Main Worker" },
    { id: "gps-ui-v0", name: "GPS UI" },
  ];

  useEffect(() => {
    fetchLogs();
  }, [selectedApp, logType]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchLogs, 5000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, selectedApp, logType]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_BASE}/logs/pm2/${selectedApp}?type=${logType}`);
      const data = await response.json();
      if (data.success) {
        setLogContent(data.content);
      } else {
        setError(data.message || "Failed to fetch logs");
        setLogContent("");
      }
    } catch (err) {
      setError("Failed to connect to the server");
      setLogContent("");
    } finally {
      setLoading(false);
    }
  };

  const downloadLogs = () => {
    const blob = new Blob([logContent], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pm2_${selectedApp}_${logType}.log`;
    a.click();
  };

  const filteredLines = logContent.split("\n").filter((line) => 
    line.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="logs-page">
      <div className="logs-header">
        <div className="logs-header-left">
          <div className="logs-icon-wrapper server-logs-icon">
            <Terminal size={24} />
          </div>
          <div className="logs-title">
            <h1>PM2 Server Logs</h1>
            <p>Monitor real-time service activity and errors</p>
          </div>
        </div>
        <div className="logs-header-actions">
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`refresh-btn ${autoRefresh ? "active" : ""}`}
          >
            <RefreshCw size={18} className={autoRefresh || loading ? "animate-spin" : ""} />
            {autoRefresh ? "Auto-refresh On" : "Auto-refresh Off"}
          </button>
          <button 
            onClick={fetchLogs}
            disabled={loading}
            className="refresh-btn"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-toast">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError("")} className="close-error">✕</button>
        </div>
      )}

      <div className="logs-controls">
        <div className="logs-card">
          <div className="logs-row">
            <div className="form-group flex-1">
              <label><ChevronDown size={14} /> Application</label>
              <select 
                value={selectedApp} 
                onChange={(e) => setSelectedApp(e.target.value)}
                className="logs-select"
              >
                {apps.map(app => (
                  <option key={app.id} value={app.id}>{app.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group flex-1">
              <label><FileText size={14} /> Log Type</label>
              <select 
                value={logType} 
                onChange={(e) => setLogType(e.target.value)}
                className="logs-select"
              >
                <option value="out">Standard Output (out)</option>
                <option value="err">Error Log (err)</option>
              </select>
            </div>
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
            Download
          </button>
        </div>
      </div>

      <div className="logs-viewer-container pm2-viewer">
        <div className="logs-viewer-header">
          <span>{selectedApp} - {logType === 'out' ? 'standard output' : 'error log'}</span>
          {logContent && <span>Lines: {logContent.split('\n').length}</span>}
        </div>
        <div className="logs-viewport dark-mode-viewer">
          {logContent ? (
            <pre>
              {filteredLines.length > 0 ? filteredLines.join("\n") : "No matches found for current filter"}
            </pre>
          ) : (
            <div className="placeholder-text">
              {loading ? "Loading logs..." : "No logs available for this application"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Pm2Logs;
