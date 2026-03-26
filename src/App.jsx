import { lazy, useEffect, useState, Suspense } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";
import Dashcam from "./pages/Dashcam";
import Playback from "./pages/Playback";
import SavedVideos from "./pages/SavedVideos";
import VideoSettings from "./pages/VideoSettings";
import Layout from "./components/Layout";
import AiNotifications from "./pages/AiNotifications";

const RealTimeMap = lazy(() => import("./pages/RealTimeMap"));
const ObdLive = lazy(() => import("./pages/ObdLive"));
const ObdPlayback = lazy(() => import("./pages/ObdPlayback"));
const ObdStatus = lazy(() => import("./pages/ObdStatus"));

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
      <Routes>
        <Route element={<Layout theme={theme} toggleTheme={toggleTheme} />}>
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
            path="/ai-notifications"
            element={
              <AiNotifications theme={theme} toggleTheme={toggleTheme} />
            }
          />
          <Route
            path="/obd-live"
            element={
              <Suspense fallback={<div className="p-4">Loading OBD Live...</div>}>
                <ObdLive theme={theme} toggleTheme={toggleTheme} />
              </Suspense>
            }
          />
          <Route
            path="/obd-playback"
            element={
              <Suspense fallback={<div className="p-4">Loading OBD Playback...</div>}>
                <ObdPlayback theme={theme} toggleTheme={toggleTheme} />
              </Suspense>
            }
          />
          <Route
            path="/obd-status"
            element={
              <Suspense fallback={<div className="p-4">Loading OBD Status...</div>}>
                <ObdStatus theme={theme} toggleTheme={toggleTheme} />
              </Suspense>
            }
          />
          <Route
            path="/"
            element={
              <Suspense fallback={<div className="p-4">Loading Map...</div>}>
                <RealTimeMap />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
