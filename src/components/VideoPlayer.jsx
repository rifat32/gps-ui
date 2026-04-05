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
import videojs from "video.js";
import "video.js/dist/video-js.css";

export default function VideoPlayer({ i, device, streamState, onRetry }) {
  const [kbps] = useState(() => 2500 + Math.floor(Math.random() * 1000));
  const [latency] = useState(() => (0.1 + Math.random() * 0.2).toFixed(2));
  
  // Local states to handle actual player conditions independent of backend status
  const [isBuffering, setIsBuffering] = useState(false);
  const [internalError, setInternalError] = useState(null);

  const videoContainerRef = useRef(null);
  const playerRef = useRef(null);
  const pcRef = useRef(null);
  const stallTimeoutRef = useRef(null);

  const streamUrl = streamState?.url;
  const webrtcUrl = streamState?.webrtcUrl;
  const backendStatus = streamState?.status || "idle";
  const backendError = streamState?.error;

  // --- Diagnostic Logging ---
  useEffect(() => {
    if (device?.id) {
      console.log(`[Device ${device.id}] Full Context Update:`, {
        device,
        streamState,
        kbps,
        latency,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  }, [device, streamState, kbps, latency]);

  // Determine what to show to the user
  const displayError = internalError || backendError;
  const isEffectivelyLoading = backendStatus === "loading" || isBuffering;

  // --- WebRTC/WHEP Implementation ---
  const startWebRTC = async (url, videoElement, signal) => {
    if (signal?.aborted) return;
    console.log(`[WebRTC] Starting connection to ${url}`);
    
    if (pcRef.current) {
        try { pcRef.current.close(); } catch (e) {}
    }

    const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    pcRef.current = pc;

    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("audio", { direction: "recvonly" });

    pc.ontrack = (event) => {
        if (signal?.aborted) return;
        console.log(`[WebRTC] Received track:`, event.track.kind);
        if (videoElement) {
            // Use existing stream or create new one from track
            const stream = event.streams[0] || new MediaStream([event.track]);
            videoElement.srcObject = stream;
            
            // Ensure video starts playing
            videoElement.play().catch(e => console.warn("[WebRTC] Play failed:", e));

            // Sync watchdog with actual video playback
            videoElement.onwaiting = () => { setIsBuffering(true); startWatchdog(); };
            videoElement.onplaying = () => { setIsBuffering(false); clearWatchdog(); };
        }
        setIsBuffering(false);
        setInternalError(null);
        clearWatchdog(); // CRITICAL: Stop the disconnect watchdog!
    };

    pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") setInternalError("WebRTC connection failed.");
    };

    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const response = await fetch(url, {
            method: "POST",
            body: offer.sdp,
            headers: { "Content-Type": "application/sdp" }
        });

        if (!response.ok) {
            if (response.status === 404) {
                 console.warn(`[WebRTC] Stream path not found (404), retrying in 2s...`);
                 setTimeout(() => {
                     if (pcRef.current === pc) startWebRTC(url, videoElement);
                 }, 2000);
                 return;
            }
            throw new Error(`WHEP HTTP error: ${response.status}`);
        }
        
        const answerSdp = await response.text();
        if (pcRef.current !== pc) return; // Cleanup check
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
        console.log(`[WebRTC] Connected successfully`);
        
    } catch (err) {
        if (pcRef.current !== pc) return;
        console.error(`[WebRTC] Error:`, err);
        setInternalError(`WebRTC Error: ${err.message}`);
    }
  };

  // --- Watchdog / Reconnect Helpers ---
  const clearWatchdog = () => {
    if (stallTimeoutRef.current) {
      clearTimeout(stallTimeoutRef.current);
      stallTimeoutRef.current = null;
    }
  };

  const startWatchdog = () => {
    clearWatchdog();
    stallTimeoutRef.current = setTimeout(() => {
      console.warn(`[Device ${device?.id}] Stream stalled. Forcing reconnect...`);
      setInternalError("Stream stalled. Retrying...");
      if (onRetry) onRetry();
    }, 30000);
  };

  useEffect(() => {
    const abortController = new AbortController();

    // Teardown logic
    const cleanup = () => {
        abortController.abort();
        clearWatchdog();
        if (playerRef.current) {
            playerRef.current.dispose();
            playerRef.current = null;
        }
        if (pcRef.current) {
            try { pcRef.current.close(); } catch (e) {}
            pcRef.current = null;
        }
    };

    if (backendStatus !== "live" || (!streamUrl && !webrtcUrl)) {
      cleanup();
      setIsBuffering(false);
      return;
    }

    if (videoContainerRef.current) {
      setInternalError(null);
      setIsBuffering(true);
      videoContainerRef.current.innerHTML = "";

      const videoElement = document.createElement("video");
      videoElement.style.width = "100%";
      videoElement.style.height = "100%";
      videoElement.style.backgroundColor = "black";
      videoElement.setAttribute("playsinline", "true");
      videoElement.setAttribute("autoplay", "true");
      videoElement.muted = true;
      videoContainerRef.current.appendChild(videoElement);

      if (webrtcUrl) {
          startWebRTC(webrtcUrl, videoElement, abortController.signal);
          startWatchdog(); 
      } else if (streamUrl) {
          videoElement.classList.add("video-js", "vjs-big-play-centered");
          const player = (playerRef.current = videojs(videoElement, {
            autoplay: true, muted: true, controls: true, responsive: true, fluid: true, liveui: true,
            html5: { vhs: { overrideNative: true, fastQualityChange: true, handlePartialData: true } }
          }));
          
          player.src({ src: streamUrl, type: "application/x-mpegURL" });
          player.on("playing", () => { setIsBuffering(false); setInternalError(null); clearWatchdog(); });
          player.on("waiting", () => { setIsBuffering(true); startWatchdog(); });
          player.on("error", () => { setInternalError("HLS Playback Error"); clearWatchdog(); });
          startWatchdog();
      }
    }

    return cleanup;
  }, [backendStatus, streamUrl, webrtcUrl]);

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
        border: i === 0 ? "2px solid #3b82f6" : "1px solid var(--surface-border)",
        boxShadow: i === 0 ? "0 0 20px rgba(59, 130, 246, 0.15)" : "none",
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        height: "100%",
        minHeight: "200px",
      }}
    >
      {/* Top Left Label Overlay */}
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
          color: backendStatus === "live" && !isBuffering ? "#3b82f6" : "#f8fafc",
          zIndex: 20,
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            background: backendStatus === "live" && !isBuffering ? "#3b82f6" : "#475569",
            borderRadius: "50%",
            animation: backendStatus === "live" && !isBuffering ? "pulse 1.5s infinite" : "none",
          }}
        />
        {backendStatus === "live"
          ? isBuffering
            ? "BUFFERING"
            : "LIVE"
          : "STANDBY"}{" "}
        • CH {String(streamState?.channel || 1).padStart(2, "0")}
      </div>

      {/* Top Right Stats Overlay */}
      {backendStatus === "live" && !isBuffering && !displayError && (
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
          <div style={{ color: "#22c55e", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}>
            <Zap size={10} /> {kbps} kbps
          </div>
          <div style={{ opacity: 0.8 }}>{latency}s latency</div>
        </div>
      )}

      {/* Main Video Container */}
      <div
        ref={videoContainerRef}
        style={{
          width: "100%",
          height: "100%",
          display: backendStatus === "live" && !displayError ? "block" : "none",
        }}
      />

      {/* Loading / Error / Standby Overlays */}
      {(backendStatus !== "live" || displayError || isBuffering) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(2, 6, 23, 0.8)",
            backdropFilter: "blur(4px)",
            gap: "12px",
            zIndex: 10,
          }}
        >
          {displayError ? (
            <>
              <AlertCircle size={40} color="#ef4444" />
              <div style={{ fontSize: "13px", color: "#f8fafc", fontWeight: "600" }}>
                Stream Disconnected
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", maxWidth: "240px", textAlign: "center" }}>
                {displayError}
              </div>
              <button
                onClick={() => {
                  setInternalError(null);
                  if (onRetry) onRetry();
                }}
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
                <RefreshCw size={14} /> Reconnect
              </button>
            </>
          ) : isEffectivelyLoading ? (
            <>
              <Loader2
                size={40}
                style={{
                  color: "#3b82f6",
                  animation: "spin 1s linear infinite",
                }}
              />
              <div style={{ fontSize: "13px", color: "#f8fafc", fontWeight: "600", marginTop: "8px" }}>
                {isBuffering ? "Waiting for signal..." : "Establishing Connection..."}
              </div>
              {isBuffering && (
                <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>
                  Poor network conditions detected.
                </div>
              )}
            </>
          ) : (
            <Video size={80} color={i === 0 ? "#3b82f622" : "#47556922"} />
          )}
        </div>
      )}

      {/* Bottom Device Info Overlay */}
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
          {/* Visual indicator of stream health based on buffering state */}
          <Signal size={16} color={isBuffering ? "#eab308" : "currentColor"} />
          <Wifi size={16} />
        </div>
      </div>
    </div>
  );
}
