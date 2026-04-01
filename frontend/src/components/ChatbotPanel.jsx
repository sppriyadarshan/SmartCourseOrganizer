import React, { useEffect, useRef, useState } from "react";
import { api } from "../api";

const CHATBOT_PDF_MIME = "application/x-studyspace-pdf";
const INITIAL_MESSAGE = {
  id: "welcome",
  sender: "ai",
  text: "Hi! Upload a PDF and I will answer questions using that document.",
};

const ChatbotPanel = ({ isOpen, onToggle }) => {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [pdfOptions, setPdfOptions] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const selectedFile = pdfOptions.find((file) => file.id === selectedFileId) || null;

  const loadPdfOptions = async () => {
    try {
      const { data } = await api.getMaterials();
      setPdfOptions(
        data.filter((material) => material.fileType?.toLowerCase() === "pdf")
      );
    } catch (requestError) {
      setError("Unable to load PDF files for chat.");
    }
  };

  useEffect(() => {
    loadPdfOptions();
    window.addEventListener("focus", loadPdfOptions);

    return () => {
      window.removeEventListener("focus", loadPdfOptions);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const appendUserMessage = (text) => {
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `user-${Date.now()}`,
        sender: "user",
        text,
      },
    ]);
  };

  const appendAiMessage = (text, suffix = "ai") => {
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `${suffix}-${Date.now()}`,
        sender: "ai",
        text,
      },
    ]);
  };

  const attachFile = (fileId) => {
    setSelectedFileId(fileId);
    setError("");
  };

  const clearAttachment = () => {
    setSelectedFileId("");
  };

  const handleUpload = async (file) => {
    if (!file) {
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Only PDF files can be uploaded to the chatbot.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setError("");
    setIsUploading(true);
    setUploadProgress(25);

    try {
      const { data } = await api.uploadChatPdf(formData);
      setUploadProgress(100);
      await loadPdfOptions();
      attachFile(data.file.id);
      appendAiMessage(`Uploaded and attached "${data.file.fileName}". You can ask questions about it now.`, "ai-upload");
    } catch (requestError) {
      const message =
        requestError.response?.data?.error ||
        "Unable to upload the PDF right now.";

      setError(message);
      appendAiMessage(message, "ai-upload-error");
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 700);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleInputFileChange = async (event) => {
    const file = event.target.files?.[0];
    await handleUpload(file);
  };

  const handleExistingPdfDrop = async (event) => {
    event.preventDefault();
    setIsDragOver(false);

    const payload = event.dataTransfer.getData(CHATBOT_PDF_MIME);

    if (!payload) {
      return;
    }

    try {
      const droppedFile = JSON.parse(payload);
      await loadPdfOptions();
      attachFile(droppedFile.id);
      appendAiMessage(`Attached "${droppedFile.fileName}" from your uploaded materials.`, "ai-attach");
    } catch (dropError) {
      setError("Could not attach that PDF. Please try again.");
    }
  };

  const sendPrompt = async (promptText) => {
    const trimmedMessage = promptText.trim();

    if (!trimmedMessage || isLoading) {
      return;
    }

    appendUserMessage(trimmedMessage);
    setError("");
    setIsLoading(true);

    try {
      const { data } = await api.sendChatMessage(trimmedMessage, selectedFileId || null);
      appendAiMessage(data.reply);
    } catch (requestError) {
      const message =
        requestError.response?.data?.error ||
        "Unable to reach the chat server. Check that the backend is running.";

      setError(message);
      appendAiMessage(message, "ai-error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    const currentInput = input;
    setInput("");
    await sendPrompt(currentInput);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSend();
  };

  return (
    <aside className={`chatbot-panel ${isOpen ? "open" : "closed"}`}>
      <button
        type="button"
        className="chatbot-toggle"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Collapse study assistant" : "Open study assistant"}
      >
        <span className="chatbot-toggle-text">
          {isOpen ? "Hide assistant" : "Study assistant"}
        </span>
        <span className="chatbot-toggle-icon" aria-hidden="true">
          {isOpen ? ">" : "<"}
        </span>
      </button>

      <div className="chatbot-header">
        <div>
          <h2>Study Assistant</h2>
          <p>Upload a PDF, then ask questions about it.</p>
        </div>
      </div>

      <div className="chatbot-toolbar">
        <button
          type="button"
          className={`btn btn-outline chatbot-upload-btn ${isDragOver ? "drag-over" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isLoading}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes(CHATBOT_PDF_MIME)) {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
              setIsDragOver(true);
            }
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleExistingPdfDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="chat-upload-input"
            onChange={handleInputFileChange}
          />
          {isUploading ? "Uploading PDF..." : isDragOver ? "Drop PDF To Attach" : "Upload PDF"}
        </button>

        {uploadProgress > 0 && (
          <div className="upload-progress chatbot-upload-progress">
            <div
              className="upload-progress-bar"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      <div className="chatbot-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message chat-message-${message.sender}`}
          >
            <div className="chat-bubble">{message.text}</div>
          </div>
        ))}

        {isLoading && (
          <div className="chat-message chat-message-ai">
            <div className="chat-bubble chat-bubble-loading">Thinking...</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chatbot-input-area" onSubmit={handleSubmit}>
        {selectedFile && (
          <div className="chat-attachment-chip">
            <span className="chat-attachment-name">{selectedFile.fileName}</span>
            <button
              type="button"
              className="chat-attachment-remove"
              onClick={clearAttachment}
              disabled={isLoading}
            >
              Remove
            </button>
          </div>
        )}

        {error && <div className="chatbot-error">{error}</div>}

        <input
          className="chatbot-input"
          type="text"
          placeholder={selectedFileId ? "Ask about the attached PDF..." : "Ask a study question..."}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={isLoading}
        />

        <button
          className="btn btn-primary chatbot-send-btn"
          type="submit"
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </aside>
  );
};

export default ChatbotPanel;
