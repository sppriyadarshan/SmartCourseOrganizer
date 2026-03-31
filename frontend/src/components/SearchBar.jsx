/**
 * SearchBar.jsx — Search and filter controls for the materials list
 * Provides a search input, course filter, semester filter, and sort dropdown.
 */
import React from "react";

const SORT_OPTIONS = [
  { value: "",          label: "Newest First" },
  { value: "date_asc",  label: "Oldest First" },
  { value: "name_asc",  label: "Name A→Z" },
  { value: "course",    label: "By Course" },
];

const SearchBar = ({ query, onQueryChange, filters, onFilterChange, onClearAll }) => {
  return (
    <div>
      {/* ── Main Search Input ── */}
      <div className="search-container">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            id="search-input"
            type="text"
            className="form-control search-input"
            placeholder="Search by name, course, topic, tag…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label="Search materials"
          />

          {/* Clear search button */}
          {query && (
            <button
              className="search-clear"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Filters Row ── */}
      <div className="filters-bar">
        <span className="filters-label">Filter:</span>

        {/* Course filter */}
        <input
          id="filter-course"
          type="text"
          className="form-control"
          placeholder="Course…"
          value={filters.course}
          onChange={(e) => onFilterChange("course", e.target.value)}
          style={{ maxWidth: 160 }}
        />

        {/* Semester filter */}
        <select
          id="filter-semester"
          className="form-control"
          value={filters.semester}
          onChange={(e) => onFilterChange("semester", e.target.value)}
          style={{ maxWidth: 160 }}
        >
          <option value="">All Semesters</option>
          {["Semester 1","Semester 2","Semester 3","Semester 4",
            "Semester 5","Semester 6","Semester 7","Semester 8"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Subject filter */}
        <input
          id="filter-subject"
          type="text"
          className="form-control"
          placeholder="Subject…"
          value={filters.subject}
          onChange={(e) => onFilterChange("subject", e.target.value)}
          style={{ maxWidth: 140 }}
        />

        {/* Unit filter */}
        <input
          id="filter-unit"
          type="text"
          className="form-control"
          placeholder="Unit…"
          value={filters.unit}
          onChange={(e) => onFilterChange("unit", e.target.value)}
          style={{ maxWidth: 140 }}
        />

        {/* Tag filter */}
        <input
          id="filter-tag"
          type="text"
          className="form-control"
          placeholder="Tag…"
          value={filters.tag}
          onChange={(e) => onFilterChange("tag", e.target.value)}
          style={{ maxWidth: 120 }}
        />

        {/* Status filter */}
        <select
          id="filter-status"
          className="form-control"
          value={filters.status}
          onChange={(e) => onFilterChange("status", e.target.value)}
          style={{ maxWidth: 140 }}
        >
          <option value="">All Statuses</option>
          <option value="To-do">To-do</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>

        {/* Sort control */}
        <span className="filters-label" style={{ marginLeft: 8 }}>Sort:</span>
        <select
          id="sort-select"
          className="form-control"
          value={filters.sort}
          onChange={(e) => onFilterChange("sort", e.target.value)}
          style={{ maxWidth: 150 }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Clear all filters/search */}
        {(query || filters.course || filters.semester || filters.subject || filters.unit || filters.tag || filters.status || filters.sort) && (
          <button
            id="clear-all-btn"
            className="btn btn-outline btn-sm"
            onClick={onClearAll}
            title="Reset all filters"
          >
            ✕ Clear All
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
