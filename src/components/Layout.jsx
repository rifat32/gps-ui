import { Outlet } from "react-router-dom";
import { LogOut } from "lucide-react";
import NavigationSidebar from "./NavigationSidebar";
import authApi from "../services/authApi";

export default function Layout({ theme, toggleTheme }) {
  return (
    <div className={`app-main-layout ${theme}`}>
      <NavigationSidebar theme={theme} toggleTheme={toggleTheme} />
      
      {/* Top Right Logout Button */}
      <button 
        className="top-right-logout"
        onClick={() => { authApi.logout(); window.location.reload(); }}
        title="Sign Out System"
      >
        <LogOut size={20} />
        <span>Sign Out</span>
      </button>

      <main className="content-area">
        <Outlet />
      </main>
    </div>
  );
}
