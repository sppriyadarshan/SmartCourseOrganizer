/**
 * db.js — Simple JSON file-based database helper
 * Reads and writes the materials metadata to data/materials.json
 */

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "../data/materials.json");

/**
 * Read all materials from the JSON store
 * @returns {Array} Array of material objects
 */
function readMaterials() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading materials file:", err.message);
    return [];
  }
}

/**
 * Write the updated materials array back to the JSON store
 * @param {Array} materials - Array of material objects to persist
 */
function writeMaterials(materials) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(materials, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing materials file:", err.message);
    throw new Error("Could not save material data.");
  }
}

module.exports = { readMaterials, writeMaterials };
