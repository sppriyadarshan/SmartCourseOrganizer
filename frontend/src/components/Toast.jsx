/**
 * Toast.jsx — Simple notification component
 * Shows a message at the bottom-right of the screen for a few seconds.
 */
import React, { useEffect } from "react";

const ICONS = { success: "✅", error: "❌", info: "ℹ️" };

const Toast = ({ message, type = "info", onClose }) => {
  // Auto-dismiss after 3.5 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast ${type}`} role="alert" aria-live="assertive">
      <span>{ICONS[type]}</span>
      <span>{message}</span>
    </div>
  );
};

export default Toast;
