/**
 * routes/materials.js — All API routes for course materials
 *
 * Routes (accessible at both /api/* and /materials/*):
 *   POST   /upload               → Upload a file with metadata
 *   GET    /materials            → List all materials (with optional filters)
 *   GET    /search?query=        → Search materials by keyword/course/tag
 *   GET    /download/:id         → Download a specific material file
 *   DELETE /materials/:id        → Delete a material
 *   GET    /dashboard            → Dashboard stats (counts per course)
 */

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const mime = require("mime");

const multer = require("multer");
const { readMaterials, writeMaterials } = require("../utils/db");
const { extractPdfText } = require("../services/pdfService");

const UPLOADS_DIR = path.join(__dirname, "../uploads");
const serializeMaterial = (material) => {
  const { extractedText, textContent, ...rest } = material;
  return {
    ...rest,
    hasExtractedText: Boolean(textContent || extractedText),
  };
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const deleteFileWithRetries = async (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  let lastError = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.unlinkSync(filePath);
      return;
    } catch (error) {
      lastError = error;

      if (!["EPERM", "EBUSY"].includes(error.code)) {
        throw error;
      }

      await wait(150 * (attempt + 1));
    }
  }

  throw lastError;
};

// ─── Helper: normalize course name (uppercase, trim) ─────────────────────────
const normalizeCourse = (course) => course.trim().toUpperCase();

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
router.post("/upload", upload.single("file"), async (req, res) => {
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

    const isPdf = path.extname(req.file.originalname).toLowerCase() === ".pdf";
    let pdfData = { extractedText: "", extractedTextLength: 0 };

    if (isPdf) {
      if (req.file.mimetype !== "application/pdf") {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Only PDF files can be processed for document chat." });
      }

      try {
        pdfData = await extractPdfText(req.file.path);
      } catch (pdfError) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: pdfError.message });
      }
    }

    // Build the material metadata object
    const material = {
      id: uuidv4(),                          // Unique ID
      fileName: req.file.originalname,       // Original file name
      storedName: req.file.filename,         // Name on disk
      fileType: path.extname(req.file.originalname).replace(".", "").toUpperCase(),
      fileSize: req.file.size,               // In bytes
      course: normalizeCourse(course),
      topic: topic.trim(),
      semester: semester.trim(),
      subject: subject ? normalizeCourse(subject) : normalizeCourse(course),
      unit: unit ? unit.trim() : topic.trim(),
      tags: tagsArray,
      description: description ? description.trim() : "",
      uploadDate: new Date().toISOString(),  // ISO timestamp
      status: "To-do",                     // Initial study status
      isFavorite: false,                    // Default: not starred
      notes: "",                           // Empty notes by default
      tasks: [],                            // Unit-level task checklist
      textContent: pdfData.textContent,
      textContentLength: pdfData.textContentLength,
      extractedText: pdfData.textContent,
      extractedTextLength: pdfData.textContentLength,
    };

    // Persist to JSON store
    const materials = readMaterials();
    materials.push(material);
    writeMaterials(materials);

    res.status(201).json({ message: "File uploaded successfully.", material: serializeMaterial(material) });
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
      const normalizedQuery = normalizeCourse(course);
      materials = materials.filter((m) =>
        m.course.includes(normalizedQuery)
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

    res.json(materials.map(serializeMaterial));
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
      return res.json(readMaterials().map(serializeMaterial));
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

    res.json(results.map(serializeMaterial));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /download/:id ────────────────────────────────────────────────────────
// Downloads a material file (accessible at /materials/download/:id or /api/download/:id)
router.get("/download/:id", (req, res) => {
  try {
    const materialId = req.params.id;
    console.log(`[DOWNLOAD REQUEST] ID: ${materialId}`);

    const materials = readMaterials();
    const material = materials.find((m) => m.id === materialId);

    if (!material) {
      console.log(`[DOWNLOAD ERROR] Material not found for ID: ${materialId}`);
      // Return plain text error, not JSON, to prevent JSON downloads
      res.status(404).setHeader("Content-Type", "text/plain");
      res.send(`Material with ID '${materialId}' not found.`);
      return;
    }

    console.log(`[DOWNLOAD FOUND] File: ${material.fileName} (${material.storedName}) - Size: ${material.fileSize} bytes`);

    const filePath = path.join(UPLOADS_DIR, material.storedName);
    console.log(`[DOWNLOAD PATH] Full path: ${filePath}`);

    // Verify file exists on disk
    if (!fs.existsSync(filePath)) {
      console.log(`[DOWNLOAD ERROR] File not found on disk: ${filePath}`);
      res.status(404).setHeader("Content-Type", "text/plain");
      res.send(`File '${material.fileName}' not found on server.`);
      return;
    }

    // Get actual file size from disk for verification
    const stats = fs.statSync(filePath);
    console.log(`[DOWNLOAD VERIFIED] File size on disk: ${stats.size} bytes (expected: ${material.fileSize} bytes)`);

    // Use res.download() to properly handle file download with correct MIME type and headers
    console.log(`[DOWNLOAD SENDING] Sending ${material.fileName}...`);
    res.download(filePath, material.fileName, (err) => {
      if (err) {
        console.error(`[DOWNLOAD ERROR] Failed to send file: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).setHeader("Content-Type", "text/plain");
          res.send("Could not download file. Please try again.");
        }
      } else {
        console.log(`[DOWNLOAD SUCCESS] File sent: ${material.fileName}`);
      }
    });
  } catch (err) {
    console.error(`[DOWNLOAD EXCEPTION] ${err.message}`, err);
    res.status(500).setHeader("Content-Type", "text/plain");
    res.send(`Server error: ${err.message}`);
  }
});

// ─── DELETE /api/materials/:id ────────────────────────────────────────────────
// Deletes a material and its associated file
router.delete("/materials/:id", async (req, res) => {
  try {
    let materials = readMaterials();
    const index = materials.findIndex((m) => m.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: "Material not found." });
    }

    const material = materials[index];
    const filePath = path.join(UPLOADS_DIR, material.storedName);

    // Remove file from disk
    await deleteFileWithRetries(filePath);

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
router.post("/materials/batch-delete", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No IDs provided." });
    }

    let materials = readMaterials();
    const toDelete = materials.filter((m) => ids.includes(m.id));

    for (const material of toDelete) {
      const filePath = path.join(UPLOADS_DIR, material.storedName);
      await deleteFileWithRetries(filePath);
    }

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
    res.json({ message: "Material updated successfully.", material: serializeMaterial(materials[index]) });
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

// ─── GET /debug/materials ──────────────────────────────────────────────────────
// Debug endpoint: shows all material IDs and file info for troubleshooting
router.get("/debug/materials", (req, res) => {
  try {
    const materials = readMaterials();
    const debugInfo = materials.map((m) => {
      const filePath = path.join(UPLOADS_DIR, m.storedName);
      const fileExists = fs.existsSync(filePath);
      const fileSize = fileExists ? fs.statSync(filePath).size : null;
      return {
        id: m.id,
        fileName: m.fileName,
        storedName: m.storedName,
        recordedSize: m.fileSize,
        actualSize: fileSize,
        fileExists: fileExists,
        uploadDate: m.uploadDate,
      };
    });
    res.json({
      totalMaterials: materials.length,
      materials: debugInfo,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
