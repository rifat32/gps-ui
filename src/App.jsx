import { lazy, useEffect, useState, Suspense } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";
const LiveTracker = lazy(() => import("./pages/LiveTracker"));
const Dashcam = lazy(() => import("./pages/Dashcam"));
const Playback = lazy(() => import("./pages/Playback"));
const SavedVideos = lazy(() => import("./pages/SavedVideos"));
const VideoSettings = lazy(() => import("./pages/VideoSettings"));
const Layout = lazy(() => import("./components/Layout"));
const AiNotifications = lazy(() => import("./pages/AiNotifications"));
const Logs = lazy(() => import("./pages/Logs"));
const DeviceManagement = lazy(() => import("./pages/DeviceManagement"));
const ObdPlayback = lazy(() => import("./pages/ObdPlayback"));
const ObdStatus = lazy(() => import("./pages/ObdStatus"));
const MediaLogs = lazy(() => import("./pages/MediaLogs"));
const MediaGallery = lazy(() => import("./pages/MediaGallery"));
const VehicleHealth = lazy(() => import("./pages/VehicleHealth"));
const Pm2Logs = lazy(() => import("./pages/Pm2Logs"));
const RemoteAccess = lazy(() => import("./pages/RemoteAccess"));


function PrivateRoute({ children }) {
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const isAuthenticated = !!user?.accessToken;
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  if (!isAuthenticated || !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-8">
        <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-md border border-gray-200">
          <div className="text-red-500 text-6xl mb-6">⚠️</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Access Restricted</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            {isAuthenticated 
              ? "This console is reserved for Super Administrators. Your current account does not have sufficient permissions."
              : "You are not authorized to access the GPS Fleet Management Console. Please log in through the main portal to continue."}
          </p>
          <button 
            onClick={() => window.location.href = "/"}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            Return to Portal
          </button>
        </div>
      </div>
    );
  }

  // Optional: Check for Super Admin role if needed
  // if (user.role !== 'SUPER_ADMIN') { ... }

  return children;
}

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  useEffect(() => {
    localStorage.setItem("theme", theme);
    if (theme === "dark") {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <Router>
      <Suspense fallback={<div className="p-4">Loading Fleet Pro...</div>}>
        <Routes>
          <Route element={
            <PrivateRoute>
              <Layout theme={theme} toggleTheme={toggleTheme} />
            </PrivateRoute>
          }>
            <Route
              path="/playback"
              element={<Playback theme={theme} toggleTheme={toggleTheme} />}
            />
            <Route
              path="/dashcam"
              element={<Dashcam theme={theme} toggleTheme={toggleTheme} />}
            />
            <Route
              path="/saved-videos"
              element={<SavedVideos theme={theme} toggleTheme={toggleTheme} />}
            />
            <Route
              path="/video-settings"
              element={<VideoSettings theme={theme} toggleTheme={toggleTheme} />}
            />
            <Route
              path="/logs"
              element={<Logs theme={theme} toggleTheme={toggleTheme} />}
            />
            <Route
              path="/devices"
              element={<DeviceManagement theme={theme} toggleTheme={toggleTheme} />}
            />
            <Route
              path="/media-logs"
              element={<MediaLogs theme={theme} toggleTheme={toggleTheme} />}
            />
            <Route
              path="/media-gallery"
              element={<MediaGallery theme={theme} toggleTheme={toggleTheme} />}
            />
            <Route
              path="/vehicle-health"
              element={<VehicleHealth theme={theme} toggleTheme={toggleTheme} />}
            />
            <Route
              path="/pm2-logs"
              element={<Pm2Logs theme={theme} toggleTheme={toggleTheme} />}
            />
            <Route
              path="/remote-access"
              element={<RemoteAccess theme={theme} />}
            />


            <Route
              path="/ai-notifications"
              element={
                <AiNotifications theme={theme} toggleTheme={toggleTheme} />
              }
            />
            <Route
              path="/obd-live"
              element={<LiveTracker theme={theme} toggleTheme={toggleTheme} />}
            />
            <Route
              path="/obd-playback"
              element={<ObdPlayback theme={theme} toggleTheme={toggleTheme} />}
            />
            <Route
              path="/obd-status"
              element={<ObdStatus theme={theme} toggleTheme={toggleTheme} />}
            />
            <Route
              path="/"
              element={<LiveTracker theme={theme} toggleTheme={toggleTheme} />}
            />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
