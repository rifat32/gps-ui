import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Playback from "./pages/Playback";
import Dashcam from "./pages/Dashcam";
import "./App.css";

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
          path="/"
          element={<Playback theme={theme} toggleTheme={toggleTheme} />}
        />
        <Route
          path="/dashcam"
          element={<Dashcam theme={theme} toggleTheme={toggleTheme} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
