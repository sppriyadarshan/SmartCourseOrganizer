/**
 * UploadPage.jsx — Upload a new course material
 */
import React from "react";
import UploadForm from "../components/UploadForm";

const UploadPage = ({ showToast, onUploadSuccess }) => {
  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">⬆️ Upload Material</h2>
        <p className="page-subtitle">
          Add a new PDF, DOCX, or TXT file with course and topic metadata.
        </p>
      </div>

      <UploadForm showToast={showToast} onUploadSuccess={onUploadSuccess} />
    </div>
  );
};

export default UploadPage;
