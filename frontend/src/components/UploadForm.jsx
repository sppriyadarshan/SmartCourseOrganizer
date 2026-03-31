/**
 * UploadForm.jsx — File upload form component
 * Handles file selection, form validation, and submission to POST /api/upload.
 */
import React, { useState, useRef } from "react";
import { api } from "../api";

// Predefined semester options for the dropdown
const SEMESTERS = [
  "Semester 1", "Semester 2", "Semester 3", "Semester 4",
  "Semester 5", "Semester 6", "Semester 7", "Semester 8",
];

const UploadForm = ({ onUploadSuccess, showToast }) => {
  // ── Local form state ──────────────────────────────────────────────
  const [file, setFile]             = useState(null);
  const [course, setCourse]         = useState("");
  const [topic, setTopic]           = useState("");
  const [semester, setSemester]     = useState("");
  const [tags, setTags]             = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading]       = useState(false);
  const [dragging, setDragging]     = useState(false);
  const [progress, setProgress]     = useState(0);
  const fileInputRef = useRef(null);

  // ── Handle file selection ─────────────────────────────────────────
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  };

  // ── Drag & Drop handlers ──────────────────────────────────────────
  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  // ── Validate & Submit ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      showToast("Please select a file to upload.", "error");
      return;
    }

    if (!course.trim() || !topic.trim() || !semester) {
      showToast("Course, Topic, and Semester are required.", "error");
      return;
    }

    // Build FormData — required for multipart file upload
    const formData = new FormData();
    formData.append("file", file);
    formData.append("course", course);
    formData.append("topic", topic);
    formData.append("semester", semester);
    formData.append("tags", tags);
    formData.append("description", description);

    try {
      setLoading(true);
      setProgress(30);

      await api.uploadMaterial(formData);
      setProgress(100);

      showToast("File uploaded successfully! 🎉", "success");

      // Reset the form after successful upload
      setFile(null);
      setCourse("");
      setTopic("");
      setSemester("");
      setTags("");
      setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Notify parent to refresh the material list
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      const msg = err.response?.data?.error || "Upload failed. Please try again.";
      showToast(msg, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  // ── Helper: format file size ──────────────────────────────────────
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="upload-form-card">
      <form onSubmit={handleSubmit} encType="multipart/form-data" id="upload-form">

        {/* ── File Drop Zone ── */}
        <div
          className={`dropzone ${dragging ? "dragging" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileChange}
            ref={fileInputRef}
            id="file-input"
            style={{ display: "none" }}
          />
          <span className="dropzone-icon">
            {file ? "📄" : "⬆️"}
          </span>
          <p className="dropzone-text">
            {file ? file.name : "Drop your file here or click to browse"}
          </p>
          <p className="dropzone-hint">
            {file
              ? `${file.type || "Document"} · ${formatSize(file.size)}`
              : "Supported: PDF, DOCX, TXT (max 50 MB)"}
          </p>
          {file && (
            <div className="file-selected">
              ✅ File selected
            </div>
          )}
        </div>

        {/* Upload progress bar */}
        {loading && (
          <div className="upload-progress">
            <div
              className="upload-progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <br />

        {/* ── Metadata Fields ── */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="course">Course *</label>
            <input
              id="course"
              className="form-control"
              placeholder="e.g. Data Structures"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="topic">Topic *</label>
            <input
              id="topic"
              className="form-control"
              placeholder="e.g. Binary Trees"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="semester">Semester *</label>
            <select
              id="semester"
              className="form-control"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              required
            >
              <option value="">Select semester…</option>
              {SEMESTERS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="tags">Tags</label>
            <input
              id="tags"
              className="form-control"
              placeholder="e.g. exam, notes, important"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="description">Description</label>
          <textarea
            id="description"
            className="form-control"
            placeholder="Brief description of this material…"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ resize: "vertical" }}
          />
        </div>

        {/* ── Submit Button ── */}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          id="upload-submit-btn"
          style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Uploading…
            </>
          ) : (
            <>⬆️ Upload Material</>
          )}
        </button>
      </form>
    </div>
  );
};

export default UploadForm;
