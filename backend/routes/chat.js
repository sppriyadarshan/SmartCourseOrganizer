const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { generateChatReply } = require("../services/chatService");
const { extractPdfText } = require("../services/pdfService");
const { readMaterials, writeMaterials } = require("../utils/db");

const router = express.Router();
const UPLOADS_DIR = path.join(__dirname, "../uploads");

const chatUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const chatUpload = multer({
  storage: chatUploadStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF files are supported for chat upload."), false);
      return;
    }

    cb(null, true);
  },
});

const serializeMaterial = (material) => {
  const { extractedText, textContent, ...rest } = material;
  return {
    ...rest,
    hasExtractedText: Boolean(textContent || extractedText),
  };
};

const cleanupUploadedFile = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return;
  }

  try {
    fs.unlinkSync(filePath);
  } catch (cleanupError) {}
};

router.post("/chat/upload", chatUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a PDF file." });
    }

    if (req.file.mimetype !== "application/pdf") {
      cleanupUploadedFile(req.file.path);
      return res.status(400).json({ error: "Only PDF files are supported for chat upload." });
    }

    let pdfData;

    try {
      pdfData = await extractPdfText(req.file.path);
    } catch (error) {
      cleanupUploadedFile(req.file.path);
      return res.status(400).json({ error: error.message });
    }

    const material = {
      id: uuidv4(),
      fileName: req.file.originalname,
      storedName: req.file.filename,
      fileType: "PDF",
      fileSize: req.file.size,
      course: "CHAT PDF",
      topic: path.parse(req.file.originalname).name,
      semester: "Reference",
      subject: "CHAT PDF",
      unit: "Reference",
      tags: ["chat-pdf"],
      description: "Uploaded from the chatbot panel",
      uploadDate: new Date().toISOString(),
      status: "To-do",
      isFavorite: false,
      notes: "",
      tasks: [],
      textContent: pdfData.textContent,
      textContentLength: pdfData.textContentLength,
      extractedText: pdfData.textContent,
      extractedTextLength: pdfData.textContentLength,
    };

    const materials = readMaterials();
    materials.push(material);
    writeMaterials(materials);

    return res.status(201).json({
      message: "PDF uploaded successfully.",
      file: serializeMaterial(material),
    });
  } catch (error) {
    console.error("Chat upload error:", error.message);
    return res.status(500).json({ error: error.message || "Unable to upload the PDF." });
  }
});

router.post("/chat", async (req, res) => {
  try {
    const { message, fileId } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "A non-empty message is required." });
    }

    const reply = await generateChatReply({ message, fileId });
    return res.json({ reply });
  } catch (error) {
    console.error("Chat route error:", error.message);

    const statusCode =
      error.message === "GROQ_API_KEY is not configured on the server."
        ? 500
        : error.message === "Message is required." ||
            error.message === "The selected file could not be found." ||
            error.message === "The selected PDF does not have extracted text yet." ||
            error.message === "Only PDF files are supported for chat upload." ||
            error.message === "Please upload a PDF file." ||
            error.message === "The uploaded PDF file could not be found." ||
            error.message === "Could not extract text from this PDF. Make sure the file is a valid text-based PDF." ||
            error.message === "This PDF appears to be empty or image-based, so text could not be extracted."
          ? 400
          : 502;

    return res.status(statusCode).json({
      error: error.message || "Chat request failed.",
    });
  }
});

module.exports = router;
