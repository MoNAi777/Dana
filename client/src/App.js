import React, { useState, useEffect } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import axios from 'axios';
import FileUpload from './components/FileUpload';
import FileList from './components/FileList';
import MergeOptions from './components/MergeOptions';

// API URL definition
const API_URL = 'http://localhost:5000/api';

// הגדרה של סוגי קבצים מותרים
const ALLOWED_TYPES = [
  // PDF
  'application/pdf',
  
  // Word documents
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',
  
  // Presentations
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.presentation',
  
  // Spreadsheets
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.spreadsheet',
  'text/csv',
  
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/webp',
  
  // Text
  'text/plain'
];

// בדיקה האם סיומת הקובץ היא תקינה
const hasValidExtension = (filename) => {
  if (!filename) return false;
  const lowerName = filename.toLowerCase();
  
  // Document formats
  if (lowerName.endsWith('.pdf') || 
      lowerName.endsWith('.doc') || 
      lowerName.endsWith('.docx') ||
      lowerName.endsWith('.rtf') ||
      lowerName.endsWith('.odt')) {
    return true;
  }
  
  // Presentation formats
  if (lowerName.endsWith('.ppt') || 
      lowerName.endsWith('.pptx') ||
      lowerName.endsWith('.odp')) {
    return true;
  }
  
  // Spreadsheet formats
  if (lowerName.endsWith('.xls') || 
      lowerName.endsWith('.xlsx') ||
      lowerName.endsWith('.ods') ||
      lowerName.endsWith('.csv')) {
    return true;
  }
  
  // Image formats
  if (lowerName.match(/\.(jpg|jpeg|png|gif|bmp|tiff|tif|webp)$/)) {
    return true;
  }
  
  // Text format
  if (lowerName.endsWith('.txt')) {
    return true;
  }
  
  return false;
};

function App() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [outputFormat, setOutputFormat] = useState('pdf');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [serverReady, setServerReady] = useState(false);
  
  // בדיקת חיבור לשרת
  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/health');
        if (response.data && response.data.status === 'ok') {
          setServerReady(true);
        }
      } catch (err) {
        console.log('Server not ready yet, will retry...');
        setTimeout(checkServer, 2000); // נסה שוב בעוד 2 שניות
      }
    };
    
    checkServer();
  }, []);
  
  const handleFilesAdded = (newFiles) => {
    // בדיקת קבצים ריקים
    if (!newFiles || newFiles.length === 0) {
      return;
    }
    
    // סינון קבצים לפי סוג וגודל
    const validFiles = Array.from(newFiles).filter(file => {
      // בדיקת סוג קובץ
      const isValidType = ALLOWED_TYPES.includes(file.type) || hasValidExtension(file.name);
      
      if (!isValidType) {
        setError(`הקובץ ${file.name} אינו נתמך. יש להעלות רק קבצי PDF או Word.`);
        return false;
      }
      
      // בדיקת גודל קובץ (מקסימום 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        setError(`הקובץ ${file.name} גדול מדי. גודל מקסימלי מותר: 50MB.`);
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length === 0) return;
    
    const fileArray = validFiles.map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));
    
    setFiles(prevFiles => [...prevFiles, ...fileArray]);
    setError('');
  };
  
  const handleRemoveFile = (id) => {
    setFiles(files.filter(file => file.id !== id));
  };
  
  const handleClearAll = () => {
    setFiles([]);
    setMessage('');
    setError('');
  };
  
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(files);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setFiles(items);
  };
  
  const handleFormatChange = (format) => {
    setOutputFormat(format);
  };
  
  /**
   * Function to download file
   */
  const downloadFile = async (filePath) => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Downloading file:', filePath);
      
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`${API_URL}/download?file=${encodeURIComponent(filePath)}&t=${timestamp}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        let errorText = '';
        try {
          const errorResponse = await response.json();
          errorText = errorResponse.message || `שגיאה ${response.status}: ${response.statusText}`;
        } catch (parseError) {
          errorText = `שגיאה ${response.status}: ${response.statusText}`;
        }
        
        setError(`שגיאה בהורדת הקובץ: ${errorText}`);
        setLoading(false);
        return;
      }
      
      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || (!contentType.includes('pdf') && !contentType.includes('application/octet-stream'))) {
        console.warn('Unexpected content type:', contentType);
      }
      
      // Check content size
      const contentLength = response.headers.get('content-length');
      if (!contentLength || parseInt(contentLength) < 100) {
        console.warn('File might be too small or empty:', contentLength);
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create an object URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a download link
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Get the filename from the Content-Disposition header if possible
      const contentDisposition = response.headers.get('content-disposition');
      let filename = '';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      // If no filename in the header, use the path
      if (!filename) {
        const parts = filePath.split('/');
        filename = parts[parts.length - 1];
      }
      
      a.download = filename;
      
      // Append the link to the body
      document.body.appendChild(a);
      
      // Click the link to trigger the download
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setLoading(false);
      setMessage('הקובץ הורד בהצלחה. אם הקובץ לא נפתח כראוי, נסה להוריד שוב או בדוק את הקבצים המקוריים.');
      
      // After 5 seconds, clear the success message
      setTimeout(() => {
        setMessage('');
      }, 5000);
    } catch (downloadError) {
      console.error('Error downloading file:', downloadError);
      setError(`שגיאה בהורדת הקובץ: ${downloadError.message}`);
      setLoading(false);
    }
  };
  
  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      setMessage('');
      
      // Validate files are selected
      if (!files.length) {
        setError('אנא בחר קבצים למיזוג');
        setLoading(false);
        return;
      }
      
      // Create FormData
      const formData = new FormData();
      
      // Add files to form data
      files.forEach((file) => {
        formData.append('files', file.file);
      });
      
      // Add output format (make sure it's a string, not an array)
      formData.append('outputFormat', outputFormat);
      
      // Log the exact request details for debugging
      console.log('Making API request to:', `${API_URL}/merge`);
      console.log('Output format:', outputFormat);
      
      // Make the API request with axios 
      const response = await axios.post(`${API_URL}/merge`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'blob'
      });
      
      // Log response headers for debugging
      console.log('Response headers:', response.headers);
      
      // Check if we got a valid response
      if (response.status !== 200) {
        setError(`שגיאה בעיבוד הקבצים: ${response.status}`);
        setLoading(false);
        return;
      }
      
      // Handle successful response
      const blob = response.data;
      
      // Check if the blob is valid
      if (!blob || blob.size === 0) {
        setError('התקבל קובץ ריק מהשרת');
        setLoading(false);
        return;
      }
      
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Get filename from headers if possible
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'merged';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      // Add extension based on output format if not already in filename
      if (!filename.includes('.')) {
        filename = `${filename}.${outputFormat}`;
      }
      
      a.download = filename;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setLoading(false);
      setMessage('הקובץ הורד בהצלחה');
      
    } catch (error) {
      console.error('Error during merge:', error);
      setError(`שגיאה: ${error.message}`);
      setLoading(false);
    }
  };
  
  return (
    <div className="container rtl">
      <h1>מיזוג קבצי Word ו-PDF</h1>
      
      {!serverReady && (
        <div className="warning-message">
          מתחבר לשרת, אנא המתן...
        </div>
      )}
      
      <div className="app-intro">
        <p>גרור קבצי PDF, Word, מצגות, גיליונות אלקטרוניים, תמונות או טקסט לכאן, או לחץ לבחירת קבצים. ניתן לשנות את סדר הקבצים באמצעות גרירה.</p>
        <p className="file-types">סוגי קבצים נתמכים: PDF, DOC, DOCX, RTF, ODT, PPT, PPTX, XLS, XLSX, CSV, JPG, PNG, TXT ועוד</p>
      </div>
      
      <FileUpload onFilesAdded={handleFilesAdded} />
      
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <FileList files={files} onRemoveFile={handleRemoveFile} />
      </DragDropContext>
      
      {files.length > 0 && (
        <>
          <MergeOptions 
            outputFormat={outputFormat} 
            onFormatChange={handleFormatChange} 
          />
          
          <div className="button-group">
            <button 
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading || files.length === 0 || !serverReady}
            >
              {loading ? 'מעבד...' : 'מזג קבצים'}
            </button>
            <button 
              className="btn btn-secondary"
              onClick={handleClearAll}
              disabled={loading || files.length === 0}
            >
              נקה הכל
            </button>
          </div>
        </>
      )}
      
      <footer className="app-footer">
        <p>DocMerger &copy; {new Date().getFullYear()} - כלי מיזוג קבצים מאובטח</p>
      </footer>
    </div>
  );
}

export default App; 