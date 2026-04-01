/**
 * api.js — Centralized API calls using axios
 * All backend URLs are defined here so they can be easily changed.
 */
import axios from "axios";

// Base URL — React's proxy (in package.json) routes this to localhost:5000
const BASE = "/api";

export const api = {

  /**
   * Upload a file with metadata as multipart/form-data
   * @param {FormData} formData
   */
  uploadMaterial: (formData) =>
    axios.post(`${BASE}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  /**
   * Get all materials with optional filters
   * @param {Object} params - { course, semester, tag, sort }
   */
  getMaterials: (params = {}) => axios.get(`${BASE}/materials`, { params }),

  /**
   * Search materials by keyword
   * @param {string} query
   */
  searchMaterials: (query) => axios.get(`${BASE}/search`, { params: { query } }),

  /**
   * Delete a material by ID
   * @param {string} id
   */
  deleteMaterial: (id) => axios.delete(`${BASE}/materials/${id}`),

  /**
   * Update a material by ID (partial update)
   * @param {string} id
   * @param {Object} data - Field updates (e.g., { status: "Read", isFavorite: true })
   */
  updateMaterial: (id, data) => axios.patch(`${BASE}/materials/${id}`, data),

  /**
   * Delete multiple materials by IDs
   * @param {string[]} ids
   */
  batchDelete: (ids) => axios.post(`${BASE}/materials/batch-delete`, { ids }),

  /**
   * Get dashboard statistics
   */
  getDashboard: () => axios.get(`${BASE}/dashboard`),

  /**
   * Send a chat prompt to the AI assistant
   * @param {string} message
   * @param {string | null} fileId
   */
  sendChatMessage: (message, fileId = null) => axios.post(`${BASE}/chat`, { message, fileId }),

  /**
   * Upload a PDF directly for chat usage
   * @param {FormData} formData
   */
  uploadChatPdf: (formData) =>
    axios.post(`${BASE}/chat/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  /**
   * Build the download URL for a given material ID
   * @param {string} id
   */
  downloadUrl: (id) => `${BASE}/download/${id}`,

  /**
   * Download material by stored filename (alternative method)
   * @param {string} storedName
   */
  downloadByFileName: (storedName) => `/files/${encodeURIComponent(storedName)}`,
};
