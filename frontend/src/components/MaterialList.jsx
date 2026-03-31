import React, { useState } from "react";
import { api } from "../api";

// ── Helper: format file size ────────────────────────────────────────────────
const formatSize = (bytes) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// ── Helper: format date nicely ──────────────────────────────────────────────
const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
};

// ── Helper: return color class for file type icon ───────────────────────────
const getFileIconClass = (type = "") => {
  const t = type.toLowerCase();
  if (t === "pdf") return "pdf";
  if (t === "docx" || t === "doc") return "docx";
  if (t === "txt") return "txt";
  return "other";
};

// ── Helper: pick a badge color for status ──────────────────────────────────
const STATUS_COLORS = {
  "To-do": "badge-orange",
  "In Progress": "badge-blue",
  "Completed": "badge-green",
};

// ── Helper: pick a badge color by index ────────────────────────────────────
const TAG_COLORS = ["badge-purple", "badge-blue", "badge-green", "badge-orange", "badge-pink"];
const tagColor = (i) => TAG_COLORS[i % TAG_COLORS.length];

// ────────────────────────────────────────────────────────────────────────────

const FILE_SERVER_BASE_URL = process.env.REACT_APP_FILE_SERVER_URL || "http://localhost:5000";

const MaterialList = ({ materials, loading, onRefresh, showToast, onSelectMaterial }) => {
  const [selectedIds, setSelectedIds] = useState([]);

  const getFileUrl = (material) => {
    // New server path for stored files
    const fileName = material.storedName || material.fileName;
    return `${FILE_SERVER_BASE_URL}/files/${encodeURIComponent(fileName)}`;
  };

  const viewableTypes = ["pdf", "png", "jpg", "jpeg", "gif", "txt", "md", "mp4", "webm", "ogg"];
  const getExtension = (material) => {
    if (material.fileType) return material.fileType.toLowerCase();
    const name = material.fileName || "";
    const idx = name.lastIndexOf(".");
    return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
  };

  const isViewable = (material) => {
    const type = getExtension(material);
    return viewableTypes.includes(type);
  };

  const openMaterial = (material) => {
    const url = getFileUrl(material);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const showDetails = (material) => {
    if (onSelectMaterial) {
      onSelectMaterial(material);
    }
  };

  // Handle delete with confirmation
  const handleDelete = async (material) => {
    const confirmed = window.confirm(
      `Delete "${material.fileName}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await api.deleteMaterial(material.id);
      showToast("Material deleted.", "info");
      onRefresh(); // Refresh parent list
    } catch (err) {
      showToast("Failed to delete material.", "error");
    }
  };

  // Toggle favorite status
  const toggleFavorite = async (id, current) => {
    try {
      await api.updateMaterial(id, { isFavorite: !current });
      onRefresh();
    } catch (err) {
      showToast("Could not update favorite status.", "error");
    }
  };

  // Cycle through statuses: To-do -> In Progress -> Completed
  const cycleStatus = async (id, current) => {
    const statuses = ["To-do", "In Progress", "Completed"];
    const next = statuses[(statuses.indexOf(current) + 1) % statuses.length];
    try {
      await api.updateMaterial(id, { status: next });
      onRefresh();
    } catch (err) {
      showToast("Could not update status.", "error");
    }
  };

  // Batch selection handlers
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBatchDelete = async () => {
    const confirmed = window.confirm(`Delete ${selectedIds.length} materials?`);
    if (!confirmed) return;
    try {
      await api.batchDelete(selectedIds);
      showToast(`Deleted ${selectedIds.length} materials.`);
      setSelectedIds([]);
      onRefresh();
    } catch (err) {
      showToast("Batch delete failed.", "error");
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="empty-state">
        <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        <p style={{ marginTop: 16, color: "var(--text-muted)" }}>
          Loading materials…
        </p>
      </div>
    );
  }

  // ── Empty state ──
  if (!materials || materials.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">📂</span>
        <h3>No materials found</h3>
        <p>Upload your first file or try adjusting your search/filters.</p>
      </div>
    );
  }

  return (
    <div className="materials-wrapper">
      <table className="materials-table" aria-label="Course materials list">
        <thead>
          <tr>
            <th style={{ width: 40 }}>
              <input
                type="checkbox"
                onChange={(e) =>
                  setSelectedIds(e.target.checked ? materials.map((m) => m.id) : [])
                }
                checked={selectedIds.length === materials.length && materials.length > 0}
              />
            </th>
            <th style={{ width: 30 }}></th>
            <th>File</th>
            <th>Status</th>
            <th>Subject</th>
            <th>Unit</th>
            <th>Size</th>
            <th>Uploaded</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((m) => {
            const iconClass = getFileIconClass(m.fileType);
            const isSelected = selectedIds.includes(m.id);
            return (
              <tr key={m.id} className={isSelected ? "selected" : ""}>
                {/* Checkbox */}
                <td>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(m.id)}
                  />
                </td>

                {/* Favorite */}
                <td>
                  <button
                    className={`favorite-btn ${m.isFavorite ? "active" : ""}`}
                    onClick={() => toggleFavorite(m.id, m.isFavorite)}
                    title={m.isFavorite ? "Unstar" : "Star"}
                  >
                    {m.isFavorite ? "⭐" : "☆"}
                  </button>
                </td>

                {/* File name + type icon */}
                <td>
                  <div className="file-name-cell">
                    <div className={`file-icon ${iconClass}`}>
                      {m.fileType || "?"}
                    </div>
                    <div>
                      <div 
                        className="file-name-text" 
                        title={m.fileName}
                        onClick={() => openMaterial(m)}
                        style={{ cursor: "pointer" }}
                      >
                        {m.fileName}
                      </div>
                      <div className="file-type-note">
                        {isViewable(m) ? "Previewable in browser" : "Preview unavailable (use Download)"}
                      </div>
                      <div className="tags-list" style={{ marginTop: 4 }}>
                        {m.tags?.map((tag, i) => (
                          <span key={tag} className={`badge ${tagColor(i)}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Status toggle */}
                <td>
                  <span
                    className={`badge status-toggle ${STATUS_COLORS[m.status || "To-do"]}`}
                    onClick={() => cycleStatus(m.id, m.status || "To-do")}
                    title="Click to cycle status"
                  >
                    {m.status || "To-do"}
                  </span>
                </td>

                {/* Subject */}
                <td>
                  <span className="badge badge-purple">{m.subject || m.course}</span>
                </td>

                {/* Unit */}
                <td>
                  <span className="badge badge-blue">{m.unit || m.topic}</span>
                </td>

                {/* File size */}
                <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{formatSize(m.fileSize)}</td>

                {/* Upload date */}
                <td style={{ whiteSpace: "nowrap", fontSize: 11 }}>{formatDate(m.uploadDate)}</td>

                {/* Download / Open / Details / Delete buttons */}
                <td>
                  <div className="actions-cell">
                    <button
                      className={`btn btn-view btn-sm ${isViewable(m) ? "" : "disabled"}`}
                      onClick={() => {
                        if (isViewable(m)) {
                          openMaterial(m);
                        } else {
                          showToast?.("This file type cannot be previewed. Use Download.", "warning");
                        }
                      }}
                      title={isViewable(m) ? "View in browser" : "Not viewable, use download"}
                    >
                      View
                    </button>

                    <a
                      href={api.downloadUrl(m.id)}
                      download={m.fileName}
                      className="btn btn-download btn-sm"
                      title="Download file"
                    >
                      Download
                    </a>

                    {onSelectMaterial && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => showDetails(m)}
                        title="Details"
                      >
                        ℹ️
                      </button>
                    )}

                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(m)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Batch Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="batch-actions-bar">
          <div className="selection-count">
            <span>{selectedIds.length}</span> selected
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setSelectedIds([])}>
            Deselect All
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleBatchDelete}>
            🗑️ Bulk Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default MaterialList;
