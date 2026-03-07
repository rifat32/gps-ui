import { Outlet } from "react-router-dom";
import NavigationSidebar from "./NavigationSidebar";

export default function Layout({ theme, toggleTheme }) {
  return (
    <div className={`app-main-layout ${theme}`}>
      <NavigationSidebar theme={theme} toggleTheme={toggleTheme} />
      <main className="content-area">
        <Outlet />
      </main>
    </div>
  );
}
