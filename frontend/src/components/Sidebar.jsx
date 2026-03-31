import React, { useState, useEffect } from "react";
import PomodoroTimer from "./PomodoroTimer";

const Sidebar = ({ activePage, onNavigate }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Sync theme with document attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const NAV_ITEMS = [
    { key: "dashboard", icon: "📊", label: "Dashboard" },
    { key: "materials", icon: "📚", label: "All Materials" },
    { key: "upload",    icon: "⬆️",  label: "Upload File" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">📖</div>
        <div>
          <h1>Study<br />Space</h1>
          <span>Efficiency First</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.key}>
              <button
                className={activePage.page === item.key ? "active" : ""}
                onClick={() => onNavigate({ page: item.key, filters: {} })}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Focus Tool */}
      <PomodoroTimer />

      {/* Theme Toggle */}
      <div className="theme-toggle">
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
