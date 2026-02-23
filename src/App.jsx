import { lazy, useEffect, useState, Suspense } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";
import Dashcam from "./pages/Dashcam";
import Playback from "./pages/Playback";
import SavedVideos from "./pages/SavedVideos";

const RealTimeMap = lazy(() => import("./pages/RealTimeMap"));

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
          path="/"
          element={
            <Suspense fallback={<div className="p-4">Loading Map...</div>}>
              <RealTimeMap />
            </Suspense>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
