import React, { useState, useEffect } from "react";
import { Folder, File, ImageIcon, Video, ChevronRight, Home, RefreshCw, ArrowLeft, Download, Maximize2 } from "lucide-react";
import "./MediaGallery.css";

const API_BASE_URL = import.meta.env.VITE_LOGS_API_URL || "http://localhost:8000";

const MediaGallery = () => {
    const [currentPath, setCurrentPath] = useState("");
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [previewItem, setPreviewItem] = useState(null);

    const fetchItems = async (path) => {
        try {
            setLoading(true);
            setError("");
            const response = await fetch(`${API_BASE_URL}/api/media/browse?path=${encodeURIComponent(path)}`);
            const data = await response.json();
            if (data.success) {
                setItems(data.items);
                setCurrentPath(data.currentPath);
            } else {
                setError(data.error || "Failed to load files");
            }
        } catch (err) {
            console.error("Fetch media error:", err);
            setError("Network error. Please make sure the service is running.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems("");
    }, []);

    const handleFolderClick = (path) => {
        fetchItems(path);
    };

    const handleBack = () => {
        const parts = currentPath.split("/").filter(Boolean);
        parts.pop();
        fetchItems(parts.join("/"));
    };

    const handleBreadcrumbClick = (index) => {
        const parts = currentPath.split("/").filter(Boolean);
        const newPath = parts.slice(0, index + 1).join("/");
        fetchItems(newPath);
    };

    const formatSize = (bytes) => {
        if (!bytes) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleString();
    };

    const isImage = (name) => /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
    const isVideo = (name) => /\.(mp4|webm|ogg)$/i.test(name);

    return (
        <div className="media-gallery-page">
            <div className="gallery-header">
                <div className="header-left">
                    <div className="header-icon-wrapper">
                        <ImageIcon size={24} />
                    </div>
                    <div>
                        <h1>Media Gallery</h1>
                        <p>Browse downloaded dashcam captures</p>
                    </div>
                </div>
                <button onClick={() => fetchItems(currentPath)} disabled={loading} className="refresh-btn">
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <div className="breadcrumb-nav">
                <button onClick={() => fetchItems("")} className="breadcrumb-item home">
                    <Home size={16} />
                </button>
                {currentPath.split("/").filter(Boolean).map((part, index, arr) => (
                    <React.Fragment key={index}>
                        <ChevronRight size={14} className="separator" />
                        <button 
                            className={`breadcrumb-item ${index === arr.length - 1 ? "active" : ""}`}
                            onClick={() => handleBreadcrumbClick(index)}
                        >
                            {part}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {error && <div className="error-banner">{error}</div>}

            <div className="gallery-content">
                {currentPath && (
                    <div className="gallery-item back-folder" onClick={handleBack}>
                        <div className="item-icon-container folder-icon">
                            <ArrowLeft size={32} />
                        </div>
                        <div className="item-info">
                            <span className="item-name">.. Back</span>
                        </div>
                    </div>
                )}

                {items.map((item, index) => (
                    <div 
                        key={index} 
                        className={`gallery-item ${item.isDir ? "folder" : "file"}`}
                        onClick={() => item.isDir ? handleFolderClick(item.path) : setPreviewItem(item)}
                    >
                        <div className={`item-icon-container ${item.isDir ? "folder-icon" : "file-icon"}`}>
                            {item.isDir ? (
                                <Folder size={40} />
                            ) : isImage(item.name) ? (
                                <div className="thumb-preview">
                                    <img src={`${API_BASE_URL}${item.url}`} alt={item.name} />
                                    <Maximize2 className="hover-overlay-icon" size={24} />
                                </div>
                            ) : isVideo(item.name) ? (
                                <div className="video-thumb">
                                    <Video size={40} />
                                    <Maximize2 className="hover-overlay-icon" size={24} />
                                </div>
                            ) : (
                                <File size={40} />
                            )}
                        </div>
                        <div className="item-info">
                            <span className="item-name" title={item.name}>{item.name}</span>
                            {!item.isDir && (
                                <div className="item-meta">
                                    <span>{formatSize(item.size)}</span>
                                    <span>{formatDate(item.modified)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {!loading && items.length === 0 && (
                    <div className="empty-state">
                        <Folder size={64} />
                        <p>This directory is empty</p>
                    </div>
                )}
            </div>

            {previewItem && (
                <div className="preview-overlay" onClick={() => setPreviewItem(null)}>
                    <div className="preview-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{previewItem.name}</h3>
                            <div className="modal-actions">
                                <a 
                                    href={`${API_BASE_URL}${previewItem.url}`} 
                                    download 
                                    className="download-link"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <Download size={18} />
                                    Download
                                </a>
                                <button className="close-modal" onClick={() => setPreviewItem(null)}>✕</button>
                            </div>
                        </div>
                        <div className="modal-body">
                            {isImage(previewItem.name) ? (
                                <img src={`${API_BASE_URL}${previewItem.url}`} alt={previewItem.name} />
                            ) : isVideo(previewItem.name) ? (
                                <video controls autoPlay src={`${API_BASE_URL}${previewItem.url}`}>
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <div className="unsupported-preview">
                                    <File size={64} />
                                    <p>Preview not available for this file type.</p>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <div className="meta-group">
                                <label>Size:</label>
                                <span>{formatSize(previewItem.size)}</span>
                            </div>
                            <div className="meta-group">
                                <label>Modified:</label>
                                <span>{formatDate(previewItem.modified)}</span>
                            </div>
                            <div className="meta-group">
                                <label>Path:</label>
                                <span>{previewItem.path}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaGallery;
