import React from 'react';

const MergeOptions = ({ outputFormat, onFormatChange }) => {
  return (
    <div className="merge-options">
      <h3>אפשרויות פלט</h3>
      
      <div className="format-options">
        <div className="format-option">
          <input
            type="radio"
            id="pdf-format"
            name="output-format"
            checked={outputFormat === 'pdf'}
            onChange={() => onFormatChange('pdf')}
          />
          <label htmlFor="pdf-format">PDF</label>
        </div>
        
        <div className="format-option">
          <input
            type="radio"
            id="docx-format"
            name="output-format"
            checked={outputFormat === 'docx'}
            onChange={() => onFormatChange('docx')}
          />
          <label htmlFor="docx-format">Word (DOCX)</label>
        </div>
      </div>
      
      <div className="rtl">
        <p>הערה: המערכת תשמור על פורמט בסיסי של הטקסט, אך ייתכן שיהיו הבדלים קלים בעיצוב.</p>
      </div>
    </div>
  );
};

export default MergeOptions; 