/**
 * routes/materials.js — All API routes for course materials
 *
 * Routes:
 *   POST   /api/upload          → Upload a file with metadata
 *   GET    /api/materials        → List all materials (with optional filters)
 *   GET    /api/search?query=    → Search materials by keyword/course/tag
 *   GET    /api/download/:id     → Download a specific material file
 *   DELETE /api/materials/:id   → Delete a material
 *   GET    /api/dashboard        → Dashboard stats (counts per course)
 */

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const multer = require("multer");
const { readMaterials, writeMaterials } = require("../utils/db");

const UPLOADS_DIR = path.join(__dirname, "../uploads");

// ─── Multer storage configuration ────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR); // Save files to /uploads directory
  },
  filename: (req, file, cb) => {
    // Prefix with timestamp to avoid name collisions
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// Only allow PDF, DOCX, TXT file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/msword",
  ];
  const allowedExts = [".pdf", ".docx", ".txt", ".doc"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true); // Accept file
  } else {
    cb(new Error("Only PDF, DOCX, and TXT files are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
});

// ─── POST /api/upload ─────────────────────────────────────────────────────────
// Accepts multipart/form-data with file + metadata fields
router.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const { course, topic, semester, tags, description, subject, unit } = req.body;

    if (!course || !topic || !semester) {
      // Clean up the orphaned file if metadata is missing
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "course, topic, and semester are required." });
    }

    // Parse comma-separated tags into an array
    const tagsArray = tags
      ? tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    // Build the material metadata object
    const material = {
      id: uuidv4(),                          // Unique ID
      fileName: req.file.originalname,       // Original file name
      storedName: req.file.filename,         // Name on disk
      fileType: path.extname(req.file.originalname).replace(".", "").toUpperCase(),
      fileSize: req.file.size,               // In bytes
      course: course.trim(),
      topic: topic.trim(),
      semester: semester.trim(),
      subject: subject ? subject.trim() : course.trim(),
      unit: unit ? unit.trim() : topic.trim(),
      tags: tagsArray,
      description: description ? description.trim() : "",
      uploadDate: new Date().toISOString(),  // ISO timestamp
      status: "To-do",                     // Initial study status
      isFavorite: false,                    // Default: not starred
      notes: "",                           // Empty notes by default
      tasks: [],                            // Unit-level task checklist
    };

    // Persist to JSON store
    const materials = readMaterials();
    materials.push(material);
    writeMaterials(materials);

    res.status(201).json({ message: "File uploaded successfully.", material });
  } catch (err) {
    console.error("Upload error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/materials ───────────────────────────────────────────────────────
// Returns all materials; supports ?course=, ?semester=, ?tag=, ?sort=, ?starred=, ?status= filters
router.get("/materials", (req, res) => {
  try {
    let materials = readMaterials();
    const { course, semester, tag, sort, starred, status, subject, unit } = req.query;

    // Filter by course (case-insensitive)
    if (course) {
      materials = materials.filter((m) =>
        m.course.toLowerCase().includes(course.toLowerCase())
      );
    }

    // Filter by semester
    if (semester) {
      materials = materials.filter((m) =>
        m.semester.toLowerCase() === semester.toLowerCase()
      );
    }

    // Filter by subject
    if (subject) {
      materials = materials.filter((m) =>
        (m.subject || "").toLowerCase().includes(subject.toLowerCase())
      );
    }

    // Filter by unit
    if (unit) {
      materials = materials.filter((m) =>
        (m.unit || "").toLowerCase().includes(unit.toLowerCase())
      );
    }

    // Filter by tag
    if (tag) {
      materials = materials.filter((m) =>
        m.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
      );
    }

    // Filter by starred
    if (starred === "true") {
      materials = materials.filter((m) => m.isFavorite);
    }

    // Filter by status
    if (status) {
      materials = materials.filter((m) =>
        m.status.toLowerCase() === status.toLowerCase()
      );
    }

    // Sorting
    if (sort === "date_asc") {
      materials.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
    } else if (sort === "date_desc") {
      materials.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    } else if (sort === "name_asc") {
      materials.sort((a, b) => a.fileName.localeCompare(b.fileName));
    } else if (sort === "course") {
      materials.sort((a, b) => a.course.localeCompare(b.course));
    } else {
      // Default: newest first
      materials.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    }

    res.json(materials);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/search?query= ───────────────────────────────────────────────────
// Full-text search across fileName, course, topic, tags, description
router.get("/search", (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim() === "") {
      return res.json(readMaterials());
    }

    const q = query.toLowerCase().trim();
    const materials = readMaterials();

    const results = materials.filter((m) => {
      return (
        m.fileName.toLowerCase().includes(q) ||
        m.course.toLowerCase().includes(q) ||
        m.topic.toLowerCase().includes(q) ||
        m.semester.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
      );
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/download/:id ────────────────────────────────────────────────────
// Sends the file for inline viewing (like PDFs in browser)
router.get("/download/:id", (req, res) => {
  try {
    const materials = readMaterials();
    const material = materials.find((m) => m.id === req.params.id);

    if (!material) {
      return res.status(404).json({ error: "Material not found." });
    }

    const filePath = path.join(UPLOADS_DIR, material.storedName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on server." });
    }

    // Send file for inline viewing (browsers will display PDFs, etc.)
    res.setHeader('Content-Disposition', 'inline; filename="' + material.fileName + '"');
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/materials/:id ────────────────────────────────────────────────
// Deletes a material and its associated file
router.delete("/materials/:id", (req, res) => {
  try {
    let materials = readMaterials();
    const index = materials.findIndex((m) => m.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: "Material not found." });
    }

    const material = materials[index];
    const filePath = path.join(UPLOADS_DIR, material.storedName);

    // Remove file from disk
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from JSON store
    materials.splice(index, 1);
    writeMaterials(materials);

    res.json({ message: "Material deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/materials/batch-delete ─────────────────────────────────────────
// Deletes multiple materials by their IDs
router.post("/materials/batch-delete", (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No IDs provided." });
    }

    let materials = readMaterials();
    const toDelete = materials.filter((m) => ids.includes(m.id));

    toDelete.forEach((material) => {
      const filePath = path.join(UPLOADS_DIR, material.storedName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    const remaining = materials.filter((m) => !ids.includes(m.id));
    writeMaterials(remaining);

    res.json({ message: `${toDelete.length} materials deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/materials/:id ────────────────────────────────────────────────
// Partial update of a material's metadata (e.g., status, star, notes)
router.patch("/materials/:id", (req, res) => {
  try {
    const materials = readMaterials();
    const index = materials.findIndex((m) => m.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: "Material not found." });
    }

    // Only allow updating specific fields
    const allowedUpdates = ["status", "isFavorite", "notes", "reminderDate", "tags", "tasks", "subject", "unit"];
    const updates = req.body;

    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        materials[index][key] = updates[key];
      }
    });

    writeMaterials(materials);
    res.json({ message: "Material updated successfully.", material: materials[index] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/dashboard ──────────────────────────────────────────────────────
// Returns stats: total count, per-course counts, per-semester counts, file types
router.get("/dashboard", (req, res) => {
  try {
    const materials = readMaterials();

    // Count materials per course
    const courseCounts = {};
    const semesterCounts = {};
    const fileTypeCounts = {};
    const statusCounts = { "To-do": 0, "In Progress": 0, "Completed": 0 };
    let totalSize = 0;
    const starredMaterials = [];

    materials.forEach((m) => {
      courseCounts[m.course] = (courseCounts[m.course] || 0) + 1;
      semesterCounts[m.semester] = (semesterCounts[m.semester] || 0) + 1;
      fileTypeCounts[m.fileType] = (fileTypeCounts[m.fileType] || 0) + 1;
      statusCounts[m.status || "To-do"] = (statusCounts[m.status || "To-do"] || 0) + 1;
      totalSize += m.fileSize || 0;
      if (m.isFavorite) starredMaterials.push(m);
    });

    res.json({
      totalMaterials: materials.length,
      totalSizeBytes: totalSize,
      courseCounts,
      semesterCounts,
      fileTypeCounts,
      statusCounts,
      starredMaterials: starredMaterials.slice(0, 10), // Limit top 10 stars
      recentUploads: materials
        .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))
        .slice(0, 5), // Latest 5
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
