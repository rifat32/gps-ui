import React, { useState, useEffect, useRef } from "react";
import { FileText, Terminal, RefreshCw, Download, Search, AlertCircle, ChevronDown, Clock } from "lucide-react";
import "./Logs.css";

const API_BASE_URL = import.meta.env.VITE_LOGS_API_URL || "http://localhost:8000";
const API_BASE = `${API_BASE_URL}/api`;

const Pm2Logs = ({ theme }) => {
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState("");
  const [logType, setLogType] = useState("out");
  const [logFiles, setLogFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [logContent, setLogContent] = useState("");
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // Ref to track and cancel pending requests
  const abortControllerRef = useRef(null);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const response = await fetch(`${API_BASE}/logs/pm2-list`);
      const data = await response.json();
      if (data.success) {
        setApps(data.apps);
        if (data.apps.length > 0 && !selectedApp) {
          setSelectedApp(data.apps[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch apps", err);
    }
  };

  // Immediate cleanup when app or type changes
  useEffect(() => {
    // 1. Cancel any pending fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 2. Clear current view state to prevent stale data display
    setLogContent("");
    setMetadata(null);
    setSelectedFile("");
    setLogFiles([]);
    
    if (selectedApp) {
      fetchLogFiles();
    }
  }, [selectedApp, logType]);

  const fetchLogFiles = async () => {
    try {
      const response = await fetch(`${API_BASE}/logs/pm2-files/${selectedApp}?type=${logType}`);
      const data = await response.json();
      if (data.success) {
        setLogFiles(data.files);
        // Find current log or default to first one
        const current = data.files.find(f => f.isCurrent);
        if (current) {
          setSelectedFile(current.name);
        } else if (data.files.length > 0) {
          setSelectedFile(data.files[0].name);
        }
      }
    } catch (err) {
      console.error("Failed to fetch log files", err);
    }
  };

  useEffect(() => {
    if (selectedApp && selectedFile) {
      fetchLogs();
    }
  }, [selectedApp, logType, selectedFile]);

  useEffect(() => {
    let interval;
    if (autoRefresh && selectedApp && selectedFile) {
      const current = logFiles.find(f => f.name === selectedFile && f.isCurrent);
      if (current) {
        interval = setInterval(fetchLogs, 5000);
      }
    }
    return () => clearInterval(interval);
  }, [autoRefresh, selectedApp, logType, selectedFile, logFiles]);

  const fetchLogs = async () => {
    // Cancel previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setError("");
      const url = `${API_BASE}/logs/pm2/${selectedApp}?type=${logType}${selectedFile ? `&fileName=${selectedFile}` : ""}`;
      
      const response = await fetch(url, { signal: controller.signal });
      const data = await response.json();
      
      if (data.success) {
        setLogContent(data.content);
        setMetadata({
          fileSize: data.fileSize,
          isTruncated: data.isTruncated,
          fileName: data.fileName
        });
      } else {
        setError(data.message || "Failed to fetch logs");
        setLogContent("");
        setMetadata(null);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError("Failed to connect to the server");
        setLogContent("");
        setMetadata(null);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const downloadLogs = () => {
    const url = `${API_BASE}/logs/pm2-download/${selectedApp}?type=${logType}${selectedFile ? `&fileName=${selectedFile}` : ""}`;
    window.open(url, '_blank');
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    if (bytes === undefined || bytes === null) return 'N/A';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Improved sanitization for binary-heavy logs while preserving structure
  const sanitizeForDisplay = (str) => {
    if (!str) return "";
    // Replace non-printable ASCII chars (except common whitespace) with placeholders 
    // to avoid invisible lines or browser rendering issues with binary blobs
    return str.replace(/[^\x20-\x7E\n\t]/g, (match) => {
      if (match === "\r") return ""; // Normalize line endings
      return ""; // Unicode replacement character for binary/invalid chars
    });
  };

  const filteredLines = sanitizeForDisplay(logContent)
    .split("\n")
    .filter((line) => line.toLowerCase().includes(searchTerm.toLowerCase()));

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
            title="Only available for current (non-rotated) logs"
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
            
            <div className="form-group flex-1">
              <label><Clock size={14} /> Log Version</label>
              <select 
                value={selectedFile} 
                onChange={(e) => setSelectedFile(e.target.value)}
                className="logs-select"
              >
                {logFiles.map(file => (
                  <option key={file.name} value={file.name}>
                    {file.isCurrent ? "Current Log" : file.name} ({formatSize(file.size)})
                  </option>
                ))}
                {logFiles.length === 0 && <option value="">No logs found</option>}
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
            Download Full Log
          </button>
        </div>
      </div>

      <div className="logs-viewer-container pm2-viewer">
        <div className="logs-viewer-header">
          <span>{selectedApp} - {metadata?.fileName || (logType === 'out' ? 'standard output' : 'error log')}</span>
          <div className="viewer-meta">
            {metadata && (
              <span className="file-info">
                Size: {formatSize(metadata.fileSize)}
                {metadata.isTruncated && <span className="trunc-warn"> (Previewing last 10MB)</span>}
              </span>
            )}
            {logContent && <span>Lines: {filteredLines.length}</span>}
          </div>
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
        <div className="logs-viewer-footer">
          <Terminal size={14} />
          <span>System Status: {metadata?.isTruncated 
            ? "Showing last 10MB. Download for full unmodified file." 
            : `Showing full content of ${metadata?.fileName || "log"}.`}</span>
        </div>
      </div>
    </div>
  );
};

export default Pm2Logs;
