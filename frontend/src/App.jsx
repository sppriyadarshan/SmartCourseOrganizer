/**
 * App.jsx — Root component
 * Handles navigation state and renders the appropriate page.
 * Toast notifications are managed here so they work globally.
 */
import React, { useState, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";
import Dashboard from "./components/Dashboard";
import ChatbotPanel from "./components/ChatbotPanel";
import MaterialsPage from "./pages/MaterialsPage";
import UploadPage from "./pages/UploadPage";

// Map of page key → page title/subtitle for the topbar
const PAGE_META = {
  dashboard: { title: "Dashboard",       subtitle: "Your course material overview" },
  materials:  { title: "All Materials",   subtitle: "Browse and manage your files" },
  upload:     { title: "Upload Material", subtitle: "Add new course materials" },
};

const App = () => {
  // ── Navigation state ──────────────────────────────────────────────
  const [activePage, setActivePage] = useState({ page: "dashboard", filters: {} });
  const [isChatOpen, setIsChatOpen] = useState(false);

  // ── Toast notification state ──────────────────────────────────────
  const [toast, setToast] = useState(null); // { message, type }

  // Show a toast notification; any previous one is replaced
  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  // After upload success: navigate to materials page
  const handleUploadSuccess = useCallback(() => {
    setActivePage({ page: "materials", filters: {} });
  }, []);

  const meta = PAGE_META[activePage.page] || PAGE_META.dashboard;

  // ── Render correct page based on activePage ───────────────────────
  const renderPage = () => {
    switch (activePage.page) {
      case "dashboard":
        return <Dashboard onNavigate={setActivePage} />;
      case "materials":
        return <MaterialsPage showToast={showToast} initialFilters={activePage.filters} />;
      case "upload":
        return <UploadPage showToast={showToast} onUploadSuccess={handleUploadSuccess} />;
      default:
        return <Dashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="app-container">
      <div className="main-layout">
        {/* ── Left Sidebar ── */}
        <Sidebar activePage={activePage} onNavigate={setActivePage} />

        {/* ── Main Content Area ── */}
        <div className={`content-shell ${isChatOpen ? "chat-open" : "chat-closed"}`}>
          {/* Top bar */}
          <header className="topbar">
            <div>
              <div className="topbar-title">{meta.title}</div>
              <div className="topbar-subtitle">{meta.subtitle}</div>
            </div>
            {/* Quick upload button in topbar */}
            {activePage.page !== "upload" && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setActivePage({ page: "upload", filters: {} })}
                id="quick-upload-btn"
              >
                ⬆️ Upload
              </button>
            )}
          </header>

          {/* Page content */}
          <main className="page-content">
            {renderPage()}
          </main>
        </div>

        <ChatbotPanel
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen((currentValue) => !currentValue)}
        />
      </div>

      {/* ── Global Toast ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={dismissToast}
        />
      )}
    </div>
  );
};

export default App;
