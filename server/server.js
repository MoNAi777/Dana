const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { mergeFiles } = require('./fileProcessor');

const app = express();
const PORT = process.env.PORT || 5000;

// Create required directories
const uploadDir = path.join(__dirname, 'uploads');
const tmpDir = path.join(__dirname, 'tmp');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());

// Setup file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    // Get file extension safely
    let ext = path.extname(file.originalname || '').toLowerCase();
    if (!ext && file.mimetype) {
      // If no extension, try to get it from mime type
      if (file.mimetype.includes('pdf')) ext = '.pdf';
      else if (file.mimetype.includes('msword')) ext = '.doc';
      else if (file.mimetype.includes('openxmlformats-officedocument')) ext = '.docx';
    }
    
    // Default to .tmp if no extension could be determined
    if (!ext) ext = '.tmp';
    
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept a wider range of file types
  const mimeType = (file.mimetype || '').toLowerCase();
  const originalName = (file.originalname || '').toLowerCase();
  
  // PDF files
  if (mimeType.includes('pdf') || originalName.endsWith('.pdf')) {
    return cb(null, true);
  }
  
  // Word files (doc, docx, rtf, odt)
  if (
    mimeType.includes('msword') ||
    mimeType.includes('openxmlformats-officedocument.wordprocessingml') ||
    mimeType.includes('rtf') ||
    mimeType.includes('opendocument.text') ||
    originalName.endsWith('.doc') ||
    originalName.endsWith('.docx') ||
    originalName.endsWith('.rtf') ||
    originalName.endsWith('.odt')
  ) {
    return cb(null, true);
  }
  
  // Presentation files (ppt, pptx, odp)
  if (
    mimeType.includes('presentation') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('opendocument.presentation') ||
    originalName.endsWith('.ppt') ||
    originalName.endsWith('.pptx') ||
    originalName.endsWith('.odp')
  ) {
    return cb(null, true);
  }
  
  // Spreadsheet files (xls, xlsx, ods, csv)
  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType.includes('csv') ||
    mimeType.includes('opendocument.spreadsheet') ||
    originalName.endsWith('.xls') ||
    originalName.endsWith('.xlsx') ||
    originalName.endsWith('.ods') ||
    originalName.endsWith('.csv')
  ) {
    return cb(null, true);
  }
  
  // Text files
  if (
    mimeType.includes('text/plain') ||
    originalName.endsWith('.txt')
  ) {
    return cb(null, true);
  }
  
  // Image files (common formats that can be converted to PDF)
  if (
    mimeType.includes('image/') ||
    originalName.match(/\.(jpg|jpeg|png|gif|bmp|tiff|tif|webp)$/)
  ) {
    return cb(null, true);
  }
  
  // Reject other file types
  cb(new Error('סוג קובץ זה אינו נתמך. קבצים נתמכים: PDF, Word, PowerPoint, Excel, CSV, תמונות וקבצי טקסט.'), false);
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Simple health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.post('/api/merge', upload.array('files'), async (req, res) => {
  try {
    console.log('Merge request received');
    const files = req.files;
    
    if (!files || files.length === 0) {
      console.log('No files uploaded');
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    console.log(`Received ${files.length} files`);
    console.log(`Files: ${files.map(f => f.originalname || 'unnamed').join(', ')}`);
    
    // Get output format from the request
    const outputFormat = req.body.outputFormat || 'pdf';
    console.log(`Output format: ${outputFormat}`);
    
    // Get file order from the request
    const fileOrder = req.body.fileOrder || [];
    console.log(`File order: ${fileOrder}`);
    
    // Sort files based on the order
    let sortedFiles = Array.from(files);
    if (fileOrder.length > 0) {
      console.log('Sorting files based on order');
      
      // Map fileOrder to actual files
      try {
        const newSortedFiles = [];
        for (let i = 0; i < fileOrder.length; i++) {
          const index = parseInt(fileOrder[i]);
          if (index >= 0 && index < files.length) {
            newSortedFiles.push(files[index]);
          }
        }
        
        // If we mapped all files, use the sorted array
        if (newSortedFiles.length === files.length) {
          sortedFiles = newSortedFiles;
          console.log('Successfully sorted files based on order');
        } else {
          console.log(`Could not map all files: got ${newSortedFiles.length}, expected ${files.length}`);
        }
      } catch (error) {
        console.error('Error sorting files:', error);
      }
    }
    
    // Validate files before processing
    const validFiles = sortedFiles.filter(file => {
      if (!file || !file.path) {
        console.warn(`Invalid file object encountered`);
        return false;
      }
      
      if (!fs.existsSync(file.path)) {
        console.warn(`File does not exist: ${file.path}`);
        return false;
      }
      
      try {
        const stats = fs.statSync(file.path);
        if (stats.size === 0) {
          console.warn(`Empty file: ${file.path}`);
          return false;
        }
      } catch (err) {
        console.warn(`Error checking file: ${file.path}`, err);
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length === 0) {
      console.warn('No valid files found');
      return res.status(400).json({ error: 'No valid files to process. Files may be empty or corrupted.' });
    }
    
    console.log(`Proceeding with ${validFiles.length} valid files of ${sortedFiles.length} total`);
    
    // Process the files
    console.log('Processing files...');
    let outputFile;
    try {
      outputFile = await mergeFiles(validFiles, outputFormat);
      console.log(`Output file created: ${outputFile}`);
      
      // Check that the output file exists
      if (!fs.existsSync(outputFile)) {
        throw new Error(`Output file was not created: ${outputFile}`);
      }
      
      // Check output file size
      const stats = fs.statSync(outputFile);
      if (stats.size === 0) {
        throw new Error(`Output file is empty: ${outputFile}`);
      }
      
    } catch (processingError) {
      console.error('Error in file processing:', processingError);
      return res.status(500).json({ error: 'Error processing files', details: processingError.message });
    }
    
    // Send the merged file
    try {
      // Set better MIME types for the document formats
      const mimeType = outputFormat === 'pdf' 
        ? 'application/pdf' 
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      
      // Verify the file exists and is valid
      if (!fs.existsSync(outputFile)) {
        throw new Error(`Output file not found: ${outputFile}`);
      }
      
      const fileStats = fs.statSync(outputFile);
      if (fileStats.size === 0) {
        throw new Error(`Output file is empty: ${outputFile}`);
      }
      
      const fileName = `merged.${outputFormat}`;
      
      // Setting proper headers
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fileStats.size);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Read the file and pipe it to the response
      const fileStream = fs.createReadStream(outputFile);
      
      // Handle stream errors
      fileStream.on('error', (streamErr) => {
        console.error('Error streaming file:', streamErr);
        
        try {
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error streaming file', details: streamErr.message });
          }
        } catch (resErr) {
          console.error('Error sending error response:', resErr);
        }
        
        // Clean up
        cleanupFiles(validFiles, outputFile);
      });
      
      // Handle response finish (success or error)
      res.on('finish', () => {
        console.log(`File sent successfully: ${outputFile}`);
        // Clean up after sending
        cleanupFiles(validFiles, outputFile);
      });
      
      // Stream the file to the client
      fileStream.pipe(res);
    } catch (downloadError) {
      console.error('Error sending file:', downloadError);
      
      // Cleanup on error
      try {
        cleanupFiles(validFiles, outputFile);
      } catch (cleanupErr) {
        console.error('Error cleaning up on download failure:', cleanupErr);
      }
      
      return res.status(500).json({ error: 'Error sending merged file', details: downloadError.message });
    }
  } catch (error) {
    console.error('Error processing files:', error);
    console.error(error.stack);
    
    // Clean up any files that might have been uploaded
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        try {
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupErr) {
          console.error(`Error deleting file on error: ${file.path}`, cleanupErr);
        }
      });
    }
    
    res.status(500).json({ error: 'Server error processing files', details: error.message });
  }
});

// Clean up tmp directory on startup
try {
  if (fs.existsSync(tmpDir)) {
    fs.readdirSync(tmpDir).forEach(file => {
      try {
        fs.unlinkSync(path.join(tmpDir, file));
      } catch (err) {
        console.error(`Error cleaning up tmp file: ${file}`, err);
      }
    });
  }
  
  if (fs.existsSync(uploadDir)) {
    fs.readdirSync(uploadDir).forEach(file => {
      try {
        fs.unlinkSync(path.join(uploadDir, file));
      } catch (err) {
        console.error(`Error cleaning up upload file: ${file}`, err);
      }
    });
  }
} catch (err) {
  console.error('Error cleaning up directories:', err);
}

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Function to clean up files
function cleanupFiles(uploadedFiles, outputFile) {
  try {
    // Delete the merged file
    if (outputFile && fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
      console.log(`Cleaned up output file: ${outputFile}`);
    }
    
    // Delete the uploaded files
    if (uploadedFiles && uploadedFiles.length > 0) {
      uploadedFiles.forEach(file => {
        try {
          if (file && file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
            console.log(`Cleaned up uploaded file: ${file.path}`);
          }
        } catch (err) {
          console.error(`Error deleting file ${file.path}:`, err);
        }
      });
    }
  } catch (err) {
    console.error('Error in cleanup function:', err);
  }
} 