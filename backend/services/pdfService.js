const fs = require("fs");
const pdfParse = require("pdf-parse");

const PDF_TEXT_LIMIT = 4000;

const normalizePdfText = (text) =>
  text.replace(/\s+/g, " ").trim();

const extractPdfText = async (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error("The uploaded PDF file could not be found.");
  }

  let parsed;

  try {
    parsed = await pdfParse(fs.readFileSync(filePath));
  } catch (error) {
    throw new Error("Could not extract text from this PDF. Make sure the file is a valid text-based PDF.");
  }

  const normalizedText = normalizePdfText(parsed.text || "");

  if (!normalizedText) {
    throw new Error("This PDF appears to be empty or image-based, so text could not be extracted.");
  }

  return {
    textContent: normalizedText.slice(0, PDF_TEXT_LIMIT),
    textContentLength: normalizedText.length,
  };
};

module.exports = {
  extractPdfText,
  PDF_TEXT_LIMIT,
};
