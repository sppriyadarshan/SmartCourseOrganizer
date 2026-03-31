/**
 * Dashboard.jsx — Overview stats page
 * Shows total materials, per-course counts with visual bars,
 * semester breakdown, file type stats, and recent uploads.
 */
import React, { useEffect, useState } from "react";
import { api } from "../api";

// ── Helper: format bytes ────────────────────────────────────────────────────
const formatSize = (bytes) => {
  if (!bytes) return "0 B";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// ── Helper: nice date ───────────────────────────────────────────────────────
const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

// ── File type emoji ─────────────────────────────────────────────────────────
const TYPE_EMOJI = { PDF: "📕", DOCX: "📘", DOC: "📘", TXT: "📄" };

// ────────────────────────────────────────────────────────────────────────────

const Dashboard = ({ onNavigate }) => {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    api.getDashboard()
      .then((res) => setStats(res.data))
      .catch(() => setError("Could not load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state"><span className="spinner" /></div>;
  if (error) return <div className="empty-state"><p>❌ {error}</p></div>;

  const { courseCounts, semesterCounts, fileTypeCounts, recentUploads, starredMaterials, statusCounts } = stats;
  const maxCourseCount = Math.max(...Object.values(courseCounts), 1);
  const total = stats.totalMaterials || 0;
  const completed = statusCounts["Completed"] || 0;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card" onClick={() => onNavigate({ page: "materials", filters: {} })} style={{ cursor: "pointer" }}>
          <div className="stat-icon purple">📚</div>
          <div><div className="stat-value">{total}</div><div className="stat-label">Materials</div></div>
        </div>
        <div className="stat-card" onClick={() => onNavigate({ page: "materials", filters: { status: "Completed" } })} style={{ cursor: "pointer" }}>
          <div className="stat-icon green">✅</div>
          <div><div className="stat-value">{completed}</div><div className="stat-label">Completed</div></div>
        </div>
        <div className="stat-card" onClick={() => onNavigate({ page: "materials", filters: { starred: "true" } })} style={{ cursor: "pointer" }}>
          <div className="stat-icon orange">⭐</div>
          <div><div className="stat-value">{starredMaterials?.length || 0}</div><div className="stat-label">Starred</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pink">📈</div>
          <div><div className="stat-value">{progressPercent}%</div><div className="stat-label">Progress</div></div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Progress Card */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: 15, color: "var(--text-secondary)" }}>🎯 Study Progress</h3>
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: 44, fontWeight: 800, color: "var(--primary)" }}>{progressPercent}%</div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              You've mastered {completed} out of {total} materials!
            </p>
            <div className="course-bar-track" style={{ marginTop: 20, height: 12 }}>
              <div className="course-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Starred Materials */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: 15, color: "var(--text-secondary)" }}>⭐ Starred Materials</h3>
          {(!starredMaterials || starredMaterials.length === 0) ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No favorite files yet.</p>
          ) : (
            <div className="recent-list">
              {starredMaterials.map((m) => (
                <div className="recent-item" key={m.id}>
                  <div style={{ fontSize: 20 }}>{TYPE_EMOJI[m.fileType] || "📄"}</div>
                  <div className="recent-info">
                    <div className="recent-name">{m.fileName}</div>
                    <div className="recent-meta">{m.course} · {m.status}</div>
                  </div>
                  <a href={api.downloadUrl(m.id)} download className="btn btn-outline btn-sm">⬇️</a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Course distribution */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: 15, color: "var(--text-secondary)" }}>📊 Materials by Course</h3>
          <div className="course-bars">
            {Object.entries(courseCounts).map(([course, count]) => (
              <div className="course-bar-row" key={course}>
                <div className="course-bar-label"><span>{course}</span><span>{count}</span></div>
                <div className="course-bar-track"><div className="course-bar-fill" style={{ width: `${(count / maxCourseCount) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent uploads */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: 15, color: "var(--text-secondary)" }}>🕒 Recent Activity</h3>
          <div className="recent-list">
            {recentUploads.map((m) => (
              <div className="recent-item" key={m.id}>
                <div style={{ fontSize: 20 }}>{TYPE_EMOJI[m.fileType] || "📄"}</div>
                <div className="recent-info"><div className="recent-name">{m.fileName}</div><div className="recent-meta">{m.course}</div></div>
                <a href={api.downloadUrl(m.id)} download className="btn btn-outline btn-sm">⬇️</a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
