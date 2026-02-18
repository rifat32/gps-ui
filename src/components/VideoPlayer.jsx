import { useState, useEffect, useRef } from "react";
import {
  Monitor,
  Signal,
  Wifi,
  Zap,
  Video,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Hls from "hls.js";

export default function VideoPlayer({ i, device, streamState, onRetry }) {
  const [kbps] = useState(() => 2500 + Math.floor(Math.random() * 1000));
  const [latency] = useState(() => (0.1 + Math.random() * 0.2).toFixed(2));
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const streamUrl = streamState?.url;
  const status = streamState?.status || "idle";
  const error = streamState?.error;

  useEffect(() => {
    if (!streamUrl || status !== "live") {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    let hls;
    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        maxBufferLength: 20,
        maxMaxBufferLength: 40,
        appendErrorMaxRetry: 10,
        manifestLoadingMaxRetry: 10,
        levelLoadingMaxRetry: 10,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef.current.play().catch((e) => {
          if (e.name !== "AbortError") console.error("Play error:", e);
        });
      });
      hls.on(Hls.Events.ERROR, function (event, data) {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("fatal network error encountered, try to recover");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("fatal media error encountered, try to recover");
              hls.recoverMediaError();
              break;
            default:
              console.log("cannot recover", data);
              hls.destroy();
              if (onRetry) onRetry();
              break;
          }
        }
      });
      hlsRef.current = hls;
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = streamUrl;
      videoRef.current.addEventListener("error", (e) =>
        console.error("Native Video Error:", e),
      );
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, status]);

  return (
    <div
      className="video-cell"
      style={{
        position: "relative",
        background: "#0f172a",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border:
          i === 0 ? "2px solid #3b82f6" : "1px solid var(--surface-border)",
        boxShadow: i === 0 ? "0 0 20px rgba(59, 130, 246, 0.15)" : "none",
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        height: "100%",
        minHeight: "200px",
      }}
    >
      {/* Label Overlay */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          background: "rgba(15, 23, 42, 0.85)",
          padding: "4px 10px",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "11px",
          fontWeight: "700",
          color: status === "live" ? "#3b82f6" : "#f8fafc",
          zIndex: 20,
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            background: status === "live" ? "#3b82f6" : "#475569",
            borderRadius: "50%",
            animation: status === "live" ? "pulse 1.5s infinite" : "none",
          }}
        ></div>
        {status === "live" ? "LIVE" : "STANDBY"} • CH 01
      </div>

      {/* Stats Overlay */}
      {status === "live" && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            fontSize: "10px",
            color: "#94a3b8",
            textAlign: "right",
            zIndex: 20,
            background: "rgba(15, 23, 42, 0.6)",
            padding: "4px 8px",
            borderRadius: "6px",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              color: "#22c55e",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Zap size={10} /> {kbps} kbps
          </div>
          <div style={{ opacity: 0.8 }}>{latency}s latency</div>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ width: "100%", height: "100%", position: "relative" }}>
        {status === "live" && streamUrl ? (
          <video
            ref={videoRef}
            width="100%"
            height="100%"
            controls
            autoPlay
            muted
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#020617",
              gap: "12px",
            }}
          >
            {status === "loading" ? (
              <>
                <Loader2
                  size={40}
                  className="animate-spin"
                  style={{
                    color: "#3b82f6",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <div
                  style={{
                    fontSize: "13px",
                    color: "#94a3b8",
                    fontWeight: "600",
                  }}
                >
                  Establishing Connection...
                </div>
              </>
            ) : status === "error" ? (
              <>
                <AlertCircle size={40} color="#ef4444" />
                <div
                  style={{
                    fontSize: "13px",
                    color: "#f8fafc",
                    fontWeight: "600",
                  }}
                >
                  Connection Failed
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#94a3b8",
                    maxWidth: "200px",
                    textAlign: "center",
                  }}
                >
                  {error ||
                    "Unknown error occurred while connecting to device."}
                </div>
                <button
                  onClick={onRetry}
                  style={{
                    marginTop: "8px",
                    background: "#1e293b",
                    border: "1px solid #334155",
                    color: "white",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                >
                  <RefreshCw size={14} /> Retry
                </button>
              </>
            ) : (
              <Video size={80} color={i === 0 ? "#3b82f622" : "#47556922"} />
            )}
          </div>
        )}
      </div>

      {/* Overlay Info (Bottom) */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(transparent, rgba(2, 6, 23, 0.95))",
          padding: "15px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          borderTop: "1px solid rgba(255,255,255,0.03)",
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: 32,
              height: 32,
              background: "#3b82f615",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Monitor size={16} color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontWeight: "700", fontSize: "13px" }}>
              {device?.name || "No Device"}
            </div>
            <div style={{ fontSize: "10px", color: "#64748b" }}>
              {device?.id || "---"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", color: "#94a3b8" }}>
          <Signal size={16} />
          <Wifi size={16} />
        </div>
      </div>
    </div>
  );
}
