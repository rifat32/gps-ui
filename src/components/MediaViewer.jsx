import { X, ExternalLink, Download, ChevronLeft, ChevronRight, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { useState, useEffect } from "react";

export default function MediaViewer({ media, onClose }) {
  if (!media) return null;

  const baseUrl = import.meta.env.VITE_DASHCAM_API_URL || import.meta.env.VITE_API_BASE_URL || "";

  // 1. Resolve media list
  const mediaList = (() => {
    if (media.mediaList && Array.isArray(media.mediaList) && media.mediaList.length > 0) {
      return media.mediaList;
    }
    // Fallback if single media passed without list
    const cleanUrl = media.url.split("?")[0];
    const isVid = cleanUrl.toLowerCase().endsWith(".mp4") || cleanUrl.toLowerCase().endsWith(".avi") || media.type === "video";
    return [{
      path: media.url,
      media_type: isVid ? "video" : "image",
      channel: media.title.includes("Cabin") ? 2 : 1,
      column: isVid ? (media.title.includes("Cabin") ? "video_path_back" : "video_path") : (media.title.includes("Cabin") ? "file_path_back" : "file_path")
    }];
  })();

  // 2. Initialize active index
  const initialIdx = media.initialIndex !== undefined ? media.initialIndex : 0;
  const [activeIndex, setActiveIndex] = useState(initialIdx);
  const [loading, setLoading] = useState(true);

  const activeItem = mediaList[activeIndex] || mediaList[0];

  // Keydown listener for keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, mediaList]);

  // Reset loading spinner on index change
  useEffect(() => {
    setLoading(true);
  }, [activeIndex]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? mediaList.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === mediaList.length - 1 ? 0 : prev + 1));
  };

  // Helper to build full URL with auth token
  const getFullUrl = (path) => {
    if (!path) return "";
    let url = path.startsWith("http") ? path : `${baseUrl}/${path}`;
    if (url.includes("downloads/") && !url.includes("?token=")) {
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          const token = user.accessToken || user.token;
          if (token) {
            url = `${url}${url.includes("?") ? "&" : "?"}token=${token}`;
          }
        }
      } catch (e) {
        // ignore
      }
    }
    return url;
  };

  const activeUrl = getFullUrl(activeItem?.path);
  const isVideo = activeItem?.media_type === "video" || activeItem?.path?.toLowerCase().endsWith(".mp4") || activeItem?.path?.toLowerCase().endsWith(".avi");

  const getFriendlyName = (item, idx) => {
    const isImage = item.media_type === 'image';
    const chName = item.channel === 2 ? 'Cabin/Back' : 'Front';
    const sameType = mediaList.filter(m => m.channel === item.channel && m.media_type === item.media_type);
    if (sameType.length > 1) {
      const typeIndex = sameType.indexOf(item) + 1;
      return `${chName} ${isImage ? 'Image' : 'Video'} ${typeIndex}`;
    }
    return `${chName} ${isImage ? 'Image' : 'Video'}`;
  };

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
        justifyContent: "space-between",
        padding: "20px 40px",
        backdropFilter: "blur(12px)",
      }}
      onClick={onClose}
    >
      {/* Top Header Section */}
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 1010,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 style={{ margin: "0 0 4px 0", fontSize: "20px", fontWeight: "800", color: "#f8fafc" }}>
            {media.title || "AI Alert Evidence"}
          </h3>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px" }}>
            {media.time} • Device: {media.deviceId} • Asset {activeIndex + 1} of {mediaList.length}
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <a
            href={activeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="viewer-btn"
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#e2e8f0",
              padding: "8px 16px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              fontWeight: "600",
              textDecoration: "none",
              transition: "all 0.2s"
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
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
              transition: "transform 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area with Carousel Controls */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "1200px",
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "20px 0"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Arrow */}
        {mediaList.length > 1 && (
          <button
            onClick={handlePrev}
            style={{
              position: "absolute",
              left: "-10px",
              background: "rgba(30, 41, 59, 0.7)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white",
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 1020,
              backdropFilter: "blur(4px)",
              transition: "all 0.2s"
            }}
            className="carousel-nav-btn"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Media Container */}
        <div
          className="media-content-container"
          style={{
            width: "100%",
            height: "100%",
            maxHeight: "55vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
            background: "#000000",
            position: "relative"
          }}
        >
          {loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.5)",
                zIndex: 10
              }}
            >
              <div className="media-viewer-spinner"></div>
            </div>
          )}

          {isVideo ? (
            <video
              key={activeUrl}
              src={activeUrl}
              controls
              autoPlay
              onCanPlay={() => setLoading(false)}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                display: "block"
              }}
            />
          ) : (
            <img
              src={activeUrl}
              alt={getFriendlyName(activeItem, activeIndex)}
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                display: "block"
              }}
            />
          )}
        </div>

        {/* Right Arrow */}
        {mediaList.length > 1 && (
          <button
            onClick={handleNext}
            style={{
              position: "absolute",
              right: "-10px",
              background: "rgba(30, 41, 59, 0.7)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white",
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 1020,
              backdropFilter: "blur(4px)",
              transition: "all 0.2s"
            }}
            className="carousel-nav-btn"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Playlist Drawer/Selector at Bottom */}
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          zIndex: 1010,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            gap: "12px",
            overflowX: "auto",
            padding: "10px 4px",
            justifyContent: mediaList.length > 4 ? "flex-start" : "center",
          }}
          className="custom-scrollbar"
        >
          {mediaList.map((item, idx) => {
            const isActive = idx === activeIndex;
            const isImage = item.media_type === "image";
            const isCabin = item.channel === 2;

            return (
              <div
                key={idx}
                onClick={() => setActiveIndex(idx)}
                style={{
                  flex: "0 0 160px",
                  height: "72px",
                  background: isActive ? "rgba(59, 130, 246, 0.15)" : "rgba(30, 41, 59, 0.5)",
                  border: isActive
                    ? `2.5px solid ${isCabin ? '#a855f7' : '#3b82f6'}`
                    : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  padding: "8px",
                  boxSizing: "border-box",
                  boxShadow: isActive ? "0 4px 14px rgba(59, 130, 246, 0.2)" : "none"
                }}
                className={`playlist-item ${isActive ? 'active' : ''}`}
              >
                <div
                  style={{
                    color: isActive ? (isCabin ? '#c084fc' : '#60a5fa') : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "4px"
                  }}
                >
                  {isImage ? <ImageIcon size={16} /> : <VideoIcon size={16} />}
                  <span style={{ fontSize: "10px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {isImage ? 'Image' : 'Video'}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: isActive ? "#ffffff" : "#cbd5e1",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    width: "100%"
                  }}
                >
                  {getFriendlyName(item, idx)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>
        {`
          .carousel-nav-btn:hover {
            transform: scale(1.1);
            background: rgba(30, 41, 59, 0.9) !important;
            border-color: rgba(255,255,255,0.2) !important;
          }
          .playlist-item:hover {
            background: rgba(30, 41, 59, 0.8) !important;
            transform: translateY(-2px);
          }
          .playlist-item.active:hover {
            background: rgba(59, 130, 246, 0.2) !important;
          }
          .media-viewer-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255,255,255,0.1);
            border-top: 4px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
