import { useState, useEffect, useRef } from "react";
import { Monitor, Signal, Wifi, Zap, Video } from "lucide-react";
import Hls from "hls.js";

export default function VideoPlayer({ i, MOCK_DEVICES, streamUrl }) {
  const [kbps] = useState(() => 2500 + Math.floor(Math.random() * 1000));
  const [latency] = useState(() => (0.1 + Math.random() * 0.2).toFixed(2));
  const videoRef = useRef(null);

  useEffect(() => {
    if (!streamUrl) return;

    let hls;
    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef.current.play().catch((e) => console.error("Play error:", e));
      });
      hls.on(Hls.Events.ERROR, function (event, data) {
        console.error("HLS Error:", data);
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
              console.log("cannot recover");
              hls.destroy();
              break;
          }
        }
      });
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = streamUrl;
      videoRef.current.addEventListener("error", (e) =>
        console.error("Native Video Error:", e),
      );
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [streamUrl]);

  return (
    <div
      className="video-cell"
      style={{
        position: "relative",
        background: "#1e293b",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border:
          i === 0
            ? "2px solid var(--accent-color)"
            : "1px solid var(--surface-border)",
        boxShadow: i === 0 ? "0 0 20px rgba(59, 130, 246, 0.15)" : "none",
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: "pointer",
      }}
    >
      {/* Mock Video Placeholder */}
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
          color: i === 0 ? "#3b82f6" : "#f8fafc",
          zIndex: 10,
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            background: i === 0 ? "#3b82f6" : "#ef4444",
            borderRadius: "50%",
            animation: "pulse 1.5s infinite",
          }}
        ></div>
        LIVE • CH 0{i + 1}
      </div>

      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          fontSize: "10px",
          color: "#94a3b8",
          textAlign: "right",
          zIndex: 10,
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

      {streamUrl ? (
        <video
          ref={videoRef}
          width="100%"
          height="100%"
          controls
          autoPlay
          muted
          style={{ objectFit: "cover" }}
        />
      ) : (
        <Video
          size={100}
          color={i === 0 ? "#3b82f611" : "#47556911"}
          style={{ transition: "transform 0.5s ease" }}
        />
      )}

      {/* Overlay Info */}
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
              {MOCK_DEVICES[i % MOCK_DEVICES.length].name}
            </div>
            <div style={{ fontSize: "10px", color: "#64748b" }}>
              {MOCK_DEVICES[i % MOCK_DEVICES.length].id}
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
