import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Download,
  FileVideo,
  Monitor,
  Loader2,
  Calendar,
  Camera,
  Server,
} from "lucide-react";
import { Link } from "react-router-dom";
import deviceApi from "../services/deviceApi";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/live/gps`;

export default function SavedVideos() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [vpsFiles, setVpsFiles] = useState([]);

  // Fetch devices on mount
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Failed to fetch devices");
        const json = await response.json();
        const apiDevices = (json.data || []).map((v) => ({
          id: String(v.device_id),
          name: v.deviceName || String(v.device_id),
          status: v.speed > 0 ? "Moving" : "Stopped",
        }));
        setDevices(apiDevices);
      } catch (err) {
        console.error("Error fetching devices:", err);
      }
    };
    fetchDevices();
  }, []);

  const handleDeviceSelect = (dev) => {
    setSelectedDevice(dev);
    setSelectedChannel(null);
    setFiles([]);
  };

  const handleChannelSelect = async (channel) => {
    setSelectedChannel(channel);
    setLoading(true);

    // Example time range: Feb 2026
    const startTime = "260201000000";
    const endTime = "260229235959";

    try {
      // 1. Query Files
      await deviceApi.sendCommand({
        deviceId: selectedDevice.id,
        commandType: "QUERY_FILES",
        parameters: { channel, startTime, endTime },
      });

      // 2. Download Video (Simulated instant call to trigger VPS sync)
      await deviceApi.sendCommand({
        deviceId: selectedDevice.id,
        commandType: "DOWNLOAD_VIDEO",
        parameters: {
          channel,
          startTime: "260213150641",
          endTime: "260213150949",
          storageType: 1,
        },
      });

      // Fetch VPS files to show initial state
      fetchVpsFiles();

      // Since QUERY_FILES is often async, we show a message or wait
      setFiles([
        {
          id: 1,
          name: "video_260213150641.mp4",
          date: "2026-02-13 15:06",
          size: "45MB",
        },
        {
          id: 2,
          name: "video_260213151000.mp4",
          date: "2026-02-13 15:10",
          size: "38MB",
        },
      ]);
    } catch (err) {
      console.error("Error querying files:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVpsFiles = async () => {
    if (!selectedDevice) return;
    try {
      const response = await deviceApi.getFiles(selectedDevice.id);
      setVpsFiles(response.files || []);
    } catch (err) {
      console.error("Error fetching VPS files:", err);
    }
  };

  const handleDownload = async () => {
    try {
      // 3. GET /api/files to start VPS sync/download
      await deviceApi.getFiles(selectedDevice.id);
      alert("Download triggered on VPS for " + selectedDevice.id);
      fetchVpsFiles();
    } catch (err) {
      console.error("Download trigger failed:", err);
    }
  };

  return (
    <div
      className="saved-videos-page"
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#020617",
        color: "white",
      }}
    >
      {/* Header */}
      <header
        style={{
          height: "64px",
          background: "#0f172a",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: "20px",
        }}
      >
        <Link to="/dashcam" style={{ color: "#94a3b8" }}>
          <ArrowLeft size={20} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: "#3b82f6",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FileVideo size={20} color="white" />
          </div>
          <h1 style={{ fontSize: "16px", fontWeight: "800", margin: 0 }}>
            SAVED VIDEOS
          </h1>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar - Devices */}
        <aside
          style={{
            width: "300px",
            background: "#0f172a",
            borderRight: "1px solid #1e293b",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "20px",
              fontWeight: "700",
              fontSize: "12px",
              color: "#64748b",
              textTransform: "uppercase",
            }}
          >
            Registered Devices
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
            {devices.map((dev) => (
              <div
                key={dev.id}
                onClick={() => handleDeviceSelect(dev)}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  marginBottom: "8px",
                  cursor: "pointer",
                  background:
                    selectedDevice?.id === dev.id ? "#3b82f615" : "transparent",
                  border:
                    selectedDevice?.id === dev.id
                      ? "1px solid #3b82f644"
                      : "1px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  transition: "all 0.2s",
                }}
              >
                <Monitor
                  size={18}
                  color={selectedDevice?.id === dev.id ? "#3b82f6" : "#64748b"}
                />
                <div>
                  <div style={{ fontWeight: "600", fontSize: "14px" }}>
                    {dev.name}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    {dev.id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            background: "#020617",
            padding: "30px",
            overflowY: "auto",
          }}
        >
          {!selectedDevice ? (
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#475569",
              }}
            >
              <Monitor
                size={64}
                style={{ marginBottom: "20px", opacity: 0.2 }}
              />
              <p>Select a device to view recordings</p>
            </div>
          ) : (
            <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "30px",
                }}
              >
                <div>
                  <h2
                    style={{ margin: 0, fontSize: "24px", fontWeight: "800" }}
                  >
                    {selectedDevice.name}
                  </h2>
                  <p
                    style={{
                      margin: "5px 0 0",
                      color: "#64748b",
                      fontSize: "14px",
                    }}
                  >
                    Manage recorded footage from this device
                  </p>
                </div>

                {/* Cam Select */}
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    background: "#1e293b",
                    padding: "4px",
                    borderRadius: "12px",
                  }}
                >
                  <button
                    onClick={() => handleChannelSelect(1)}
                    style={{
                      background:
                        selectedChannel === 1 ? "#3b82f6" : "transparent",
                      color: selectedChannel === 1 ? "white" : "#94a3b8",
                      border: "none",
                      padding: "10px 20px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "700",
                      fontSize: "13px",
                    }}
                  >
                    Front Cam
                  </button>
                  <button
                    onClick={() => handleChannelSelect(2)}
                    style={{
                      background:
                        selectedChannel === 2 ? "#3b82f6" : "transparent",
                      color: selectedChannel === 2 ? "white" : "#94a3b8",
                      border: "none",
                      padding: "10px 20px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "700",
                      fontSize: "13px",
                    }}
                  >
                    Back Cam
                  </button>
                </div>
              </div>

              {loading ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "100px 0",
                  }}
                >
                  <Loader2
                    size={40}
                    className="animate-spin"
                    style={{ color: "#3b82f6", marginBottom: "20px" }}
                  />
                  <p style={{ color: "#94a3b8" }}>
                    Querying device filesystem...
                  </p>
                </div>
              ) : selectedChannel ? (
                <div
                  style={{
                    background: "#0f172a",
                    borderRadius: "16px",
                    border: "1px solid #1e293b",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "20px",
                      borderBottom: "1px solid #1e293b",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <Calendar size={18} color="#3b82f6" />
                    <span style={{ fontWeight: "700" }}>Recent Recordings</span>
                  </div>

                  {files.length === 0 ? (
                    <div
                      style={{
                        padding: "60px",
                        textAlign: "center",
                        color: "#475569",
                      }}
                    >
                      No files found for this channel
                    </div>
                  ) : (
                    <div style={{ padding: "10px" }}>
                      {files.map((file) => (
                        <div
                          key={file.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "16px",
                            borderRadius: "12px",
                            transition: "background 0.2s",
                            cursor: "default",
                            borderBottom: "1px solid #1e293b44",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "15px",
                            }}
                          >
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                background: "#1e293b",
                                borderRadius: "10px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <FileVideo size={20} color="#3b82f6" />
                            </div>
                            <div>
                              <div
                                style={{ fontWeight: "600", fontSize: "14px" }}
                              >
                                {file.name}
                              </div>
                              <div
                                style={{ fontSize: "12px", color: "#64748b" }}
                              >
                                {file.date} • {file.size}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={handleDownload}
                            style={{
                              background: "#3b82f6",
                              color: "white",
                              border: "none",
                              width: "36px",
                              height: "36px",
                              borderRadius: "10px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              transition: "transform 0.2s",
                            }}
                          >
                            <Download size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sync Status Overlay */}
                  <div
                    style={{
                      padding: "15px 20px",
                      background: "#1e293b44",
                      borderTop: "1px solid #1e293b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      color: "#94a3b8",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Server size={14} />
                      <span>
                        {vpsFiles.length} files currently stored on VPS{" "}
                      </span>
                    </div>
                    <button
                      onClick={fetchVpsFiles}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#3b82f6",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      Refresh Server
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: "100px 0",
                    textAlign: "center",
                    color: "#475569",
                  }}
                >
                  <Camera
                    size={48}
                    style={{ marginBottom: "20px", opacity: 0.1 }}
                  />
                  <p>Please select Front or Back camera to view files</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
