import { X, ExternalLink, Download } from "lucide-react";

export default function MediaViewer({ media, onClose }) {
  if (!media) return null;

  const isVideo = media.url.toLowerCase().endsWith(".mp4") || media.url.toLowerCase().endsWith(".avi");
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://54.37.225.65:4020";
  const fullUrl = media.url.startsWith("http") ? media.url : `${baseUrl}/${media.url}`;

  return (
    <div
      className="media-viewer-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(2, 6, 23, 0.95)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
        backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
    >
      <div 
        style={{ 
          position: "absolute", 
          top: "24px", 
          right: "24px", 
          display: "flex", 
          gap: "12px" 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <a 
          href={fullUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="viewer-btn"
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "white",
            padding: "8px 16px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            fontWeight: "600",
            textDecoration: "none"
          }}
        >
          <ExternalLink size={16} /> Open Origin
        </a>
        <button
          onClick={onClose}
          style={{
            background: "#ef4444",
            color: "white",
            border: "none",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)"
          }}
        >
          <X size={20} />
        </button>
      </div>

      <div
        className="media-content-container"
        style={{
          width: "100%",
          maxWidth: "1100px",
          maxHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          background: "#000"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            src={fullUrl}
            controls
            autoPlay
            style={{
              width: "100%",
              height: "auto",
              display: "block"
            }}
          />
        ) : (
          <img
            src={fullUrl}
            alt="AI Event"
            style={{
              maxWidth: "100%",
              maxHeight: "80vh",
              objectFit: "contain",
              display: "block"
            }}
          />
        )}
      </div>

      <div 
        style={{ 
          marginTop: "24px", 
          textAlign: "center",
          color: "white"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "700" }}>
          {media.title || "AI Alert Evidence"}
        </h3>
        <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>
          {media.time} • Device: {media.deviceId}
        </p>
      </div>
    </div>
  );
}
