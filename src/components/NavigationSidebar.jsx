import {
  Map as MapIcon,
  Video,
  History,
  Settings,
  PlayCircle,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  FileText,
  Cpu,
  Image as ImageIcon,
  ShieldAlert,
  Terminal,
  MonitorSmartphone,
} from "lucide-react";

import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { path: "/", icon: MapIcon, label: "Live Tracker" },
  { path: "/dashcam", icon: LayoutDashboard, label: "AI Dashcam" },
  { path: "/ai-notifications", icon: Bell, label: "AI Notifications" },
  { path: "/playback", icon: PlayCircle, label: "History Playback" },
  { path: "/obd-playback", icon: History, label: "OBD Playback" },
  { path: "/obd-status", icon: LayoutDashboard, label: "OBD Status" },
  { path: "/saved-videos", icon: History, label: "Media Center" },
  { path: "/video-settings", icon: Settings, label: "Configuration" },
  { path: "/devices", icon: Cpu, label: "Device Management" },
  { path: "/logs", icon: FileText, label: "System Logs" },
  { path: "/media-logs", icon: FileText, label: "Media Logs" },
  { path: "/media-gallery", icon: ImageIcon, label: "Media Gallery" },
  { path: "/vehicle-health", icon: ShieldAlert, label: "Vehicle Health" },
  { path: "/pm2-logs", icon: Terminal, label: "Server Logs" },
  { path: "/remote-access", icon: MonitorSmartphone, label: "Remote Access" },

];

export default function NavigationSidebar({ theme, toggleTheme }) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="mobile-nav-toggle"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        <Menu size={24} />
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div className="nav-overlay" onClick={() => setIsMobileOpen(false)} />
      )}

      <aside
        className={`nav-sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileOpen ? "mobile-open" : ""}`}
      >
        <div className="nav-logo">
          <div className="logo-icon">GPS</div>
          {!isCollapsed && <span className="logo-text">FLEET PRO</span>}
        </div>

        <nav className="nav-items">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? "active" : ""}`}
              title={isCollapsed ? item.label : ""}
            >
              <item.icon size={20} className="nav-icon" />
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
              {isActive(item.path) && !isCollapsed && (
                <div className="active-indicator" />
              )}
            </Link>
          ))}
        </nav>

        <div className="nav-footer">
          <button
            className="collapse-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <>
                <ChevronLeft size={18} />
                <span>Collapse</span>
              </>
            )}
          </button>

          <div className="user-profile">
            <div className="avatar">A</div>
            {!isCollapsed && (
              <div className="user-info">
                <span className="user-name">Admin User</span>
                <span className="user-role">Super Admin</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
