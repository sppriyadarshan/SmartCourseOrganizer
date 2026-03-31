/**
 * Smart Course Material Organizer - Express Server
 * Main entry point for the backend API
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const mime = require("mime"); // npm install mime

// Import route handlers
const materialsRouter = require("./routes/materials");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Ensure required directories exist ───────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, "uploads");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "materials.json");

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors()); // Allow requests from the React frontend
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Serve uploaded files with custom inline/download options ────────────────
app.get("/files/:filename", (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  const mimeType = mime.getType(filePath) || "application/octet-stream";

  // If the file is viewable in browser, open inline; else force download
  const viewableTypes = ["application/pdf", "image/png", "image/jpeg", "image/gif", "image/svg+xml", "text/plain", "video/mp4", "video/webm", "audio/mpeg", "audio/wav"];

  if (viewableTypes.includes(mimeType)) {
    res.setHeader("Content-Disposition", `inline; filename="${req.params.filename}"`);
  } else {
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.filename}"`);
  }

  res.setHeader("Content-Type", mimeType);
  res.sendFile(filePath);
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api", materialsRouter);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ message: "Smart Course Organizer API is running ✅" });
});

// ─── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Server Error:", err.message);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// ─── Start server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});