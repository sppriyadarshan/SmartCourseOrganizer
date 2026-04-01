const path = require("path");
const Groq = require("groq-sdk");
const { readMaterials, writeMaterials } = require("../utils/db");
const { extractPdfText, PDF_TEXT_LIMIT } = require("./pdfService");

const MODEL_NAME = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const UPLOADS_DIR = path.join(__dirname, "../uploads");

const getClient = () => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }

  return new Groq({ apiKey });
};

const findMaterialById = (fileId) => {
  if (!fileId) {
    return null;
  }

  const materials = readMaterials();
  const materialIndex = materials.findIndex((material) => material.id === fileId);

  if (materialIndex === -1) {
    return null;
  }

  return {
    material: materials[materialIndex],
    materials,
    materialIndex,
  };
};

const ensurePdfContext = async (materialLookup) => {
  if (!materialLookup) {
    return null;
  }

  const { material, materials, materialIndex } = materialLookup;
  const isPdf = material.fileType?.toLowerCase() === "pdf";

  if (!isPdf) {
    return material;
  }

  const existingText = material.textContent || material.extractedText || "";

  if (existingText.trim()) {
    return material;
  }

  const filePath = path.join(UPLOADS_DIR, material.storedName);
  const pdfData = await extractPdfText(filePath);

  materials[materialIndex] = {
    ...material,
    textContent: pdfData.textContent,
    textContentLength: pdfData.textContentLength,
    extractedText: pdfData.textContent,
    extractedTextLength: pdfData.textContentLength,
  };

  writeMaterials(materials);
  return materials[materialIndex];
};

const buildMessages = ({ message, material }) => {
  const systemPrompt = material
    ? "You are a helpful study assistant. Answer based only on the provided PDF content. If the answer is not in the PDF content, say that clearly."
    : "You are a helpful study assistant for students. Give concise, clear, and accurate study help.";

  if (!material) {
    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ];
  }

  const pdfContext = (material.textContent || material.extractedText || "").slice(0, PDF_TEXT_LIMIT);

  if (!pdfContext) {
    throw new Error("The selected PDF does not have extracted text yet.");
  }

  return [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `PDF title: ${material.fileName}

PDF content:
${pdfContext}

Student question:
${message}`,
    },
  ];
};

const generateChatReply = async ({ message, fileId }) => {
  const trimmedMessage = typeof message === "string" ? message.trim() : "";

  if (!trimmedMessage) {
    throw new Error("Message is required.");
  }

  const materialLookup = fileId ? findMaterialById(fileId) : null;

  if (fileId && !materialLookup) {
    throw new Error("The selected file could not be found.");
  }

  const material = await ensurePdfContext(materialLookup);
  const messages = buildMessages({ message: trimmedMessage, material });
  const client = getClient();
  let completion;

  try {
    completion = await client.chat.completions.create({
      model: MODEL_NAME,
      messages,
      temperature: 0.3,
    });
  } catch (error) {
    const providerMessage =
      error?.error?.message ||
      error?.response?.error?.message ||
      error?.message;

    throw new Error(providerMessage || "The AI service request failed.");
  }

  const reply = completion.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error("The AI service returned an empty response.");
  }

  return reply;
};

module.exports = { generateChatReply };
