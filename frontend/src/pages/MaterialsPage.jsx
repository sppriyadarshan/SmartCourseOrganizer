import React, { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import SearchBar from "../components/SearchBar";
import MaterialList from "../components/MaterialList";
import MaterialDetail from "../components/MaterialDetail";

const DEFAULT_FILTERS = {
  course: "",
  semester: "",
  subject: "",
  unit: "",
  tag: "",
  status: "",
  sort: "",
};

const MaterialsPage = ({ showToast, initialFilters = {} }) => {
  const [allMaterials, setAllMaterials] = useState([]); // Full list from API
  const [displayed, setDisplayed]       = useState([]); // Filtered/searched subset
  const [loading, setLoading]           = useState(true);
  const [query, setQuery]               = useState("");
  const [filters, setFilters]           = useState({ ...DEFAULT_FILTERS, ...initialFilters });
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  // ── Fetch all materials from backend ────────────────────────────────
  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMaterials(filters);
      setAllMaterials(res.data);
      if (selectedMaterial) {
        const updated = res.data.find(m => m.id === selectedMaterial.id);
        if (updated) setSelectedMaterial(updated);
      }
    } catch (err) {
      showToast("Failed to load materials.", "error");
    } finally {
      setLoading(false);
    }
  }, [filters, selectedMaterial, showToast]);

  useEffect(() => {
    fetchMaterials();
  }, [filters]); // Removed fetchMaterials from deps to avoid loop; keeping filters

  // ── Apply keyword search client-side after fetch ─────────────────────
  useEffect(() => {
    if (!query.trim()) {
      setDisplayed(allMaterials);
      return;
    }
    const q = query.toLowerCase();
    setDisplayed(
      allMaterials.filter(
        (m) =>
          m.fileName.toLowerCase().includes(q) ||
          m.course.toLowerCase().includes(q) ||
          m.topic.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.tags?.some((t) => t.toLowerCase().includes(q))
      )
    );
  }, [query, allMaterials]);

  // ── Handle filter changes ──────────────────────────────────────────
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // ── Clear everything ───────────────────────────────────────────────
  const handleClearAll = () => {
    setQuery("");
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div style={{ position: "relative", minHeight: "100%" }}>
      <div className="page-header">
        <h2 className="page-title">📚 Study Deck</h2>
        <p className="page-subtitle">
          Efficiently organize and review your course materials.
        </p>
      </div>

      <SearchBar
        query={query}
        onQueryChange={setQuery}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearAll}
      />

      <div className="result-count">
        Showing <span>{displayed.length}</span> result
        {displayed.length !== 1 ? "s" : ""}
        {query && ` for "${query}"`}
      </div>

      <MaterialList
        materials={displayed}
        loading={loading}
        onRefresh={fetchMaterials}
        onSelectMaterial={setSelectedMaterial}
        showToast={showToast}
      />

      {selectedMaterial && (
        <MaterialDetail
          material={selectedMaterial}
          onClose={() => setSelectedMaterial(null)}
          onUpdate={fetchMaterials}
          showToast={showToast}
        />
      )}
    </div>
  );
};

export default MaterialsPage;
