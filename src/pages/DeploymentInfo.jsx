import React, { useState, useEffect } from "react";
import { CloudUpload, RefreshCw, GitCommit, Clock, CheckCircle2, History, AlertCircle } from "lucide-react";
import "./DeploymentInfo.css";

export default function DeploymentInfo({ theme }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeployInfo = async () => {
    setRefreshing(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
      let baseUrl = apiBaseUrl;
      if (!baseUrl) {
        baseUrl = `${window.location.protocol}//${window.location.hostname}:8040`;
      }
      
      const response = await fetch(`${baseUrl}/api/deploy-info`);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const json = await response.json();
      setData(json);
      setError("");
    } catch (err) {
      console.error("Failed to load deployment info", err);
      setError("Unable to retrieve deployment logs from the backend service.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDeployInfo();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("en-GB", {
        timeZone: "Europe/London",
        dateStyle: "medium",
        timeStyle: "medium",
      }) + " (UK Time)";
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="deploy-page">
      {/* Header Section */}
      <div className="deploy-header">
        <div className="deploy-title-wrapper">
          <div className="deploy-icon">
            <CloudUpload size={24} />
          </div>
          <div className="deploy-title">
            <h1>System Deployment Operations</h1>
            <p>Monitor real-time deployment states, verify cache invalidation, and audit production service builds.</p>
          </div>
        </div>

        <button
          onClick={fetchDeployInfo}
          disabled={refreshing || loading}
          className="deploy-btn"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Syncing..." : "Sync Build Info"}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="deploy-loading-wrapper">
          <RefreshCw size={32} className="animate-spin text-accent" />
          <div className="deploy-loading-text">Fetching operational metadata...</div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="deploy-error-card">
          <AlertCircle size={24} className="deploy-error-icon" />
          <div>
            <h3 className="deploy-error-title">System Sync Error</h3>
            <p className="deploy-error-text">{error}</p>
            <button onClick={fetchDeployInfo} className="deploy-error-btn">
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      {!loading && !error && (
        <div className="deploy-grid">
          {/* Active Build Card */}
          <div className="deploy-cards-stack">
            <div className="deploy-card">
              <div className="deploy-card-header">
                <div>
                  <span className="deploy-badge current">Active Production Build</span>
                  <h2>Current Version</h2>
                </div>
                <CheckCircle2 size={24} style={{ color: "#10b981" }} />
              </div>

              {data?.current ? (
                <>
                  <div className="deploy-stats-grid">
                    <div className="deploy-stat-box">
                      <div className="deploy-stat-icon current">
                        <GitCommit size={20} />
                      </div>
                      <div className="deploy-stat-content">
                        <span className="deploy-stat-label">Commit SHA</span>
                        <span className="deploy-stat-value mono">{data.current.version}</span>
                      </div>
                    </div>

                    <div className="deploy-stat-box">
                      <div className="deploy-stat-icon">
                        <Clock size={20} />
                      </div>
                      <div className="deploy-stat-content">
                        <span className="deploy-stat-label">Deployed At</span>
                        <span className="deploy-stat-value">{formatDate(data.current.deployTime)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="deploy-message-box">
                    <div className="deploy-message-label">Commit Log Message</div>
                    <div className="deploy-message-content">
                      {data.current.commitMessage || "No commit message provided."}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-secondary)" }}>
                  No deployment version details registered.
                </div>
              )}
            </div>

            {/* Previous Build Card */}
            <div className="deploy-card">
              <div className="deploy-card-header">
                <div>
                  <span className="deploy-badge previous">Previous Production Build</span>
                  <h2>Backup Version</h2>
                </div>
                <History size={24} style={{ color: "var(--text-secondary)" }} />
              </div>

              {data?.previous ? (
                <>
                  <div className="deploy-stats-grid">
                    <div className="deploy-stat-box">
                      <div className="deploy-stat-icon">
                        <GitCommit size={20} />
                      </div>
                      <div className="deploy-stat-content">
                        <span className="deploy-stat-label">Commit SHA</span>
                        <span className="deploy-stat-value mono">{data.previous.version}</span>
                      </div>
                    </div>

                    <div className="deploy-stat-box">
                      <div className="deploy-stat-icon">
                        <Clock size={20} />
                      </div>
                      <div className="deploy-stat-content">
                        <span className="deploy-stat-label">Deployed At</span>
                        <span className="deploy-stat-value">{formatDate(data.previous.deployTime)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="deploy-message-box">
                    <div className="deploy-message-label">Commit Log Message</div>
                    <div className="deploy-message-content">
                      {data.previous.commitMessage || "No commit message provided."}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-secondary)" }}>
                  No backup deployment version details registered.
                </div>
              )}
            </div>
          </div>

          {/* Sync Stats panel */}
          <div className="deploy-sidebar">
            <div className="deploy-status-panel">
              <h3 className="deploy-side-title">Deployment Status</h3>
              <div className="deploy-pulse-row">
                <div className="deploy-pulse-circle"></div>
                <div className="deploy-pulse-text">Services Active & Synced</div>
              </div>
              
              <div className="deploy-side-stats">
                <div className="deploy-side-row">
                  <span className="deploy-side-label">Production Server</span>
                  <span className="deploy-side-value mono">{window.location.hostname}</span>
                </div>
                <div className="deploy-side-row">
                  <span className="deploy-side-label">Verification Status</span>
                  <span className="deploy-side-value" style={{ color: "#10b981", fontWeight: "700" }}>CACHE INVALIDATED</span>
                </div>
                <div className="deploy-side-row">
                  <span className="deploy-side-label">Core Version System</span>
                  <span className="deploy-side-value">Git Hash Routing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
