import React, { useState, useEffect } from "react";
import { api } from "../api";

const MaterialDetail = ({ material, onClose, onUpdate, showToast }) => {
  const [notes, setNotes] = useState(material.notes || "");
  const [tasks, setTasks] = useState(material.tasks || []);
  const [newTaskText, setNewTaskText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when material changes
  useEffect(() => {
    setNotes(material.notes || "");
    setTasks(material.tasks || []);
  }, [material]);

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      await api.updateMaterial(material.id, { notes });
      showToast("Notes saved.");
      onUpdate();
    } catch (err) {
      showToast("Failed to save notes.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const saveTasks = async (nextTasks) => {
    setIsSaving(true);
    try {
      await api.updateMaterial(material.id, { tasks: nextTasks });
      setTasks(nextTasks);
      onUpdate();
    } catch (err) {
      showToast("Failed to save tasks.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTask = (index) => {
    const nextTasks = tasks.map((task, idx) =>
      idx === index ? { ...task, done: !task.done } : task
    );
    saveTasks(nextTasks);
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const nextTasks = [...tasks, { text: newTaskText.trim(), done: false }];
    setNewTaskText("");
    saveTasks(nextTasks);
  };

  const deleteTask = (index) => {
    const nextTasks = tasks.filter((_, idx) => idx !== index);
    saveTasks(nextTasks);
  };

  const completedCount = tasks.filter((t) => t.done).length;
  const taskProgress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);


  // Auto-save logic (optional, but good for efficiency)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (notes !== (material.notes || "")) {
        handleSaveNotes();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [notes]);

  return (
    <div className="detail-drawer-overlay" onClick={onClose}>
      <div className="detail-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>Material Details</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="drawer-body">
          <div className="detail-section">
            <label className="form-label">File Name</label>
            <div className="detail-value">{material.fileName}</div>
          </div>

          <div className="form-row">
            <div className="detail-section">
              <label className="form-label">Course</label>
              <div className="badge badge-purple">{material.course}</div>
            </div>
            <div className="detail-section">
              <label className="form-label">Subject</label>
              <div className="badge badge-green">{material.subject || material.course}</div>
            </div>
            <div className="detail-section">
              <label className="form-label">Unit</label>
              <div className="badge badge-blue">{material.unit || material.topic}</div>
            </div>
            <div className="detail-section">
              <label className="form-label">Status</label>
              <div className="badge badge-blue">{material.status || "To-do"}</div>
            </div>
          </div>

          <div className="detail-section" style={{ marginTop: 24 }}>
            <label className="form-label">📝 Study Notes</label>
            <textarea
              className="form-control"
              style={{ minHeight: 250, resize: "vertical", marginTop: 8 }}
              placeholder="Jot down key points, formulas, or reminders here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {isSaving ? "Saving..." : "All changes saved"}
              </span>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={handleSaveNotes}
                disabled={isSaving}
              >
                Save Now
              </button>
            </div>
          </div>

          <div className="detail-section" style={{ marginTop: 32 }}>
            <label className="form-label">✅ Task Checklist</label>
            <div style={{ marginBottom: 10 }}>
              <div style={{
                height: 8,
                borderRadius: 999,
                background: "rgba(255,255,255,0.2)",
                overflow: "hidden",
              }}>
                <div style={{
                  width: `${taskProgress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #6c63ff, #ff6584)",
                  transition: "width 0.3s ease",
                }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                {completedCount}/{tasks.length} tasks completed
              </div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {tasks.map((task, idx) => (
                <div key={`${task.text}-${idx}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(idx)}
                  />
                  <span style={{ textDecoration: task.done ? "line-through" : "none", flex: 1 }}>
                    {task.text}
                  </span>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ padding: "4px 8px" }}
                    onClick={() => deleteTask(idx)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Add task (e.g., Read Chapter 2)"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
              />
              <button className="btn btn-primary btn-sm" onClick={addTask}>
                + Add
              </button>
            </div>
          </div>

          <div className="detail-section" style={{ marginTop: 32 }}>
            <label className="form-label">Common Actions</label>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <a 
                href={api.downloadUrl(material.id)} 
                download={material.fileName}
                className="btn btn-outline btn-sm"
                style={{ flex: 1, justifyContent: "center" }}
              >
                ⬇️ Download
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialDetail;
