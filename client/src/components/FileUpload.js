import React, { useRef, useState } from 'react';

const FileUpload = ({ onFilesAdded }) => {
  const fileInputRef = useRef();
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesAdded(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };
  
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(e.target.files);
    }
  };
  
  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <div 
      className={`drop-area ${isDragging ? 'active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={openFileDialog}
    >
      <div className="upload-icon">📂</div>
      <p className="upload-text">גרור קבצים לכאן, או לחץ לבחירת קבצים</p>
      <p className="upload-hint">ניתן לבחור מספר קבצים בו-זמנית</p>
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        multiple
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,.rtf,.odt,.ppt,.pptx,.odp,.xls,.xlsx,.ods,.csv,.txt,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf,application/vnd.oasis.opendocument.text,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.oasis.opendocument.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,text/csv,image/jpeg,image/png,image/gif,image/bmp,image/tiff,image/webp,text/plain"
      />
    </div>
  );
};

export default FileUpload; 