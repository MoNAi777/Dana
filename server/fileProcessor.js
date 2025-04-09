const fs = require('fs-extra');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const mammoth = require('mammoth');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const pdf = require('pdf-parse');
const libre = require('libreoffice-convert');
const textract = require('textract');
const rtlDetect = require('rtl-detect');
const temp = require('temp').track(); // Auto track and cleanup temp files
const { promisify } = require('util');

// Convert libre methods to promises
const libreConvert = promisify(libre.convert);

/**
 * Extract text content from a PDF file
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<string>} - Extracted text
 */
async function extractPdfText(filePath) {
  try {
    console.log(`Extracting text from PDF: ${filePath}`);
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist: ${filePath}`);
      return "";
    }
    
    const dataBuffer = fs.readFileSync(filePath);
    if (!dataBuffer || dataBuffer.length === 0) {
      console.error(`Empty file: ${filePath}`);
      return "";
    }
    
    try {
      const data = await pdf(dataBuffer);
      const extractedText = data.text || "";
      
      // Check if the text contains Hebrew characters
      const hebrewRegex = /[\u0590-\u05FF\uFB1D-\uFB4F]/;
      const containsHebrew = hebrewRegex.test(extractedText);
      
      if (containsHebrew) {
        console.log(`Hebrew text detected in PDF: ${filePath}`);
        // Add RTL mark to ensure proper text direction - this helps in some cases
        return '\u202B' + extractedText;
      }
      
      return extractedText;
    } catch (parseError) {
      console.error(`Error parsing PDF: ${parseError.message}`);
      return "";
    }
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    return ""; // Return empty string instead of throwing
  }
}

/**
 * Extract text content from a Word file
 * @param {string} filePath - Path to the Word file
 * @returns {Promise<string>} - Extracted text
 */
async function extractWordText(filePath) {
  try {
    console.log(`Extracting text from Word: ${filePath}`);
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist: ${filePath}`);
      return "";
    }
    
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || "";
    } catch (mammothError) {
      console.error(`Error in mammoth extraction: ${mammothError.message}`);
      return "";
    }
  } catch (error) {
    console.error('Error extracting Word text:', error);
    return ""; // Return empty string instead of throwing
  }
}

/**
 * Create a Word document from text content
 * @param {string} text - Text content
 * @param {string} outputPath - Path to save the Word document
 * @returns {Promise<string>} - Path to the created Word document
 */
async function createWordDocument(textContent, outputPath) {
  try {
    console.log(`Creating Word document: ${outputPath}`);
    
    // Ensure textContent is a string
    if (typeof textContent !== 'string') {
      console.warn(`Invalid text content type: ${typeof textContent}, using empty string`);
      textContent = "";
    }
    
    // Check if the text contains Hebrew characters
    const hebrewRegex = /[\u0590-\u05FF\uFB1D-\uFB4F]/;
    const containsHebrew = hebrewRegex.test(textContent);
    
    // Split the content into paragraphs
    const paragraphs = textContent.split('\n')
      .filter(line => line && line.trim() !== '')
      .map(line => {
        // Check if this specific line contains Hebrew
        const lineContainsHebrew = hebrewRegex.test(line);
        
        return new Paragraph({
          children: [
            new TextRun({
              text: line,
              // Support for RTL text (Hebrew)
              bidirectional: lineContainsHebrew || containsHebrew
            })
          ],
          // Set paragraph direction based on content
          bidirectional: lineContainsHebrew || containsHebrew,
          rightTabStop: lineContainsHebrew ? 9000 : undefined,
          // If this line has Hebrew, set it to right-aligned
          alignment: lineContainsHebrew ? "right" : "left"
        });
      });

    // Create a new document with RTL support
    const doc = new Document({
      sections: [{
        properties: {
          // Set document direction for documents with Hebrew
          rtl: containsHebrew
        },
        children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: '' })]
      }]
    });

    // Ensure the directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save the document
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);

    return outputPath;
  } catch (error) {
    console.error('Error creating Word document:', error);
    // Create a very simple document as fallback
    try {
      console.log("Attempting to create a fallback Word document");
      const doc = new Document({
        sections: [{
          properties: {},
          children: [new Paragraph({ text: 'Error occurred while creating document' })]
        }]
      });
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(outputPath, buffer);
      return outputPath;
    } catch (fallbackError) {
      console.error('Error creating fallback document:', fallbackError);
      throw error;
    }
  }
}

/**
 * Merge multiple PDF files into one
 * @param {array} pdfFiles - Array of PDF file paths
 * @param {string} outputPath - Path to save the merged PDF
 * @returns {Promise<string>} - Path to the merged PDF
 */
async function mergePdfFiles(pdfFiles, outputPath) {
  try {
    console.log(`Starting PDF merge with ${pdfFiles.length} files to ${outputPath}`);
    
    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();
    
    // Set PDF compatibility to 1.4 for better compatibility
    mergedPdf.setCreator('DocMerger');
    mergedPdf.setProducer('DocMerger PDF Service');
    
    // Keep track of merged pages
    let totalPages = 0;
    let errorPages = 0;
    
    // Process each PDF file
    for (const pdfPath of pdfFiles) {
      try {
        console.log(`Processing PDF: ${pdfPath}`);
        
        // Validate the PDF file exists
        if (!fs.existsSync(pdfPath)) {
          console.error(`PDF file does not exist: ${pdfPath}`);
          continue;
        }
        
        // Read PDF file
        const pdfBytes = fs.readFileSync(pdfPath);
        
        // Verify PDF file is not empty
        if (pdfBytes.length === 0) {
          console.error(`PDF file is empty: ${pdfPath}`);
          continue;
        }
        
        // Try to load the PDF with multiple options for better compatibility
        let pdfDoc;
        try {
          console.log(`Attempting to load PDF: ${pdfPath}`);
          pdfDoc = await PDFDocument.load(pdfBytes, { 
            ignoreEncryption: true,
            updateMetadata: false
          });
        } catch (loadError) {
          console.error(`Error loading PDF ${pdfPath}, retrying with strict parsing disabled:`, loadError);
          try {
            // Try again with strict parsing disabled
            pdfDoc = await PDFDocument.load(pdfBytes, { 
              ignoreEncryption: true,
              updateMetadata: false,
              parseSpeed: 1500 // Increase parse time allowance
            });
          } catch (retryError) {
            console.error(`Failed to load PDF ${pdfPath} on retry:`, retryError);
            errorPages++;
            continue;
          }
        }
        
        // Get pages from the current PDF
        const pageCount = pdfDoc.getPageCount();
        console.log(`PDF has ${pageCount} pages`);
        
        if (pageCount === 0) {
          console.warn(`PDF has no pages: ${pdfPath}`);
          continue;
        }
        
        // Copy pages to merged PDF
        const pageIndices = Array.from({ length: pageCount }, (_, i) => i);
        
        // First attempt: try to copy all pages at once
        try {
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pageIndices);
          copiedPages.forEach(page => {
            mergedPdf.addPage(page);
            totalPages++;
          });
          console.log(`Successfully copied ${copiedPages.length} pages from ${pdfPath}`);
        } catch (bulkCopyError) {
          console.error(`Error copying all pages at once from ${pdfPath}, trying page by page:`, bulkCopyError);
          
          // Second attempt: try to copy pages individually
          for (let i = 0; i < pageCount; i++) {
            try {
              const [copiedPage] = await mergedPdf.copyPages(pdfDoc, [i]);
              mergedPdf.addPage(copiedPage);
              totalPages++;
              console.log(`Successfully copied page ${i + 1} from ${pdfPath}`);
            } catch (pageError) {
              console.error(`Error copying page ${i + 1} from ${pdfPath}:`, pageError);
              errorPages++;
            }
          }
        }
        
      } catch (fileError) {
        console.error(`Error processing PDF file ${pdfPath}:`, fileError);
        errorPages++;
      }
    }
    
    console.log(`Merge complete. Total pages: ${totalPages}, Failed pages: ${errorPages}`);
    
    // If no pages were successfully merged, create a simple PDF with an error message
    if (totalPages === 0) {
      console.warn('No pages were successfully merged, creating a simple PDF instead');
      return await createSimplePdf(outputPath, 'לא ניתן היה למזג אף עמוד מהקבצים שסופקו. בדוק את תקינות קבצי ה-PDF.');
    }
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save the merged PDF
    console.log(`Saving merged PDF to ${outputPath}`);
    const mergedPdfBytes = await mergedPdf.save({
      useObjectStreams: false,
      addDefaultPage: totalPages === 0,
      version: '1.4' // Use older PDF version for compatibility
    });
    
    // Check if output is valid
    if (!mergedPdfBytes || mergedPdfBytes.length === 0) {
      console.error('Generated PDF is empty, creating fallback');
      return await createSimplePdf(outputPath, 'אירעה שגיאה בעת מיזוג הקבצים - הפלט הסופי ריק.');
    }
    
    // Write to file
    fs.writeFileSync(outputPath, mergedPdfBytes);
    
    // Verify the written file
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      console.log(`Successfully wrote merged PDF to ${outputPath} (${fs.statSync(outputPath).size} bytes)`);
      
      // Double-check that the PDF is valid
      try {
        const verification = await PDFDocument.load(fs.readFileSync(outputPath), { ignoreEncryption: true });
        const pageCount = verification.getPageCount();
        console.log(`Verified merged PDF has ${pageCount} pages`);
      } catch (verifyError) {
        console.error('Merged PDF failed validation:', verifyError);
        return await createSimplePdf(outputPath, 'אירעה שגיאה בתהליך המיזוג. נוצר קובץ תחליפי.');
      }
      
      return outputPath;
    } else {
      console.error(`Failed to write merged PDF to ${outputPath}`);
      return await createSimplePdf(outputPath, 'אירעה שגיאה בעת שמירת הקובץ המיוזג.');
    }
  } catch (error) {
    console.error('Error merging PDF files:', error);
    return await createSimplePdf(outputPath, `אירעה שגיאה בעת מיזוג הקבצים: ${error.message}`);
  }
}

/**
 * Create a simple PDF with a message
 * @param {string} outputPath - Path to save the PDF
 * @param {string} message - Message to include in the PDF
 * @returns {Promise<string>} - Path to the created PDF
 */
async function createSimplePdf(outputPath, message) {
  try {
    console.log(`Creating simple PDF at ${outputPath} with message: ${message}`);
    
    const pdfDoc = await PDFDocument.create();
    
    // Set PDF metadata
    pdfDoc.setCreator('DocMerger');
    pdfDoc.setProducer('DocMerger PDF Service');
    pdfDoc.setTitle('DocMerger Message');
    
    // Create a page
    const page = pdfDoc.addPage([595, 842]); // A4 size
    
    // Prepare the message
    const lines = [];
    
    // Split message into lines with a maximum width
    let currentLine = '';
    const words = message.split(' ');
    
    for (const word of words) {
      if (currentLine.length + word.length + 1 > 60) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    // Draw the message
    const fontSize = 14;
    const lineHeight = fontSize * 1.5;
    const startY = page.getHeight() - 100;
    
    // Draw a header
    page.drawText('DocMerger - הודעת מערכת', {
      x: 170,
      y: startY + 40,
      size: 20,
      color: rgb(0, 0, 0)
    });
    
    // Draw line
    page.drawLine({
      start: { x: 50, y: startY + 20 },
      end: { x: 545, y: startY + 20 },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    
    // Draw each line of the message
    lines.forEach((line, index) => {
      page.drawText(line, {
        x: 80,
        y: startY - (index * lineHeight),
        size: fontSize,
        color: rgb(0, 0, 0)
      });
    });
    
    // Draw a footer with the current date
    const now = new Date();
    const dateString = now.toLocaleDateString();
    
    page.drawText(`נוצר בתאריך: ${dateString}`, {
      x: 250,
      y: 50,
      size: 10,
      color: rgb(0, 0, 0)
    });
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: false,
      version: '1.4' // Use older PDF version for maximum compatibility
    });
    
    fs.writeFileSync(outputPath, pdfBytes);
    console.log(`Simple PDF created at ${outputPath}`);
    
    return outputPath;
  } catch (error) {
    console.error('Error creating simple PDF:', error);
    
    // As a last resort, create an absolute minimal PDF
    try {
      console.log('Attempting to create minimal fallback PDF');
      
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Create a minimal valid PDF file manually
      const minimalPdf = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF';
      
      fs.writeFileSync(outputPath, minimalPdf);
      console.log(`Minimal fallback PDF created at ${outputPath}`);
      
      return outputPath;
    } catch (fallbackError) {
      console.error('Failed to create even a minimal PDF:', fallbackError);
      throw error; // Rethrow the original error
    }
  }
}

/**
 * Convert a Word file to PDF
 * @param {string} wordFilePath - Path to the Word file
 * @param {string} outputPath - Path to save the PDF
 * @returns {Promise<string>} - Path to the created PDF
 */
async function wordToPdf(wordFilePath, outputPath) {
  try {
    console.log(`Converting Word to PDF: ${wordFilePath} -> ${outputPath}`);
    
    // Check if file exists
    if (!fs.existsSync(wordFilePath)) {
      console.error(`Word file does not exist: ${wordFilePath}`);
      throw new Error(`File not found: ${wordFilePath}`);
    }
    
    // Extract text from Word document
    let text = '';
    try {
      text = await extractWordText(wordFilePath);
      if (!text || text.trim() === '') {
        console.warn(`Word file has no text content: ${wordFilePath}`);
        text = `[Empty document: ${path.basename(wordFilePath)}]`;
      }
    } catch (extractError) {
      console.error(`Error extracting text from Word file: ${extractError.message}`);
      text = `[Error extracting text from: ${path.basename(wordFilePath)}]`;
    }
    
    // Check if the text contains Hebrew characters
    const hebrewRegex = /[\u0590-\u05FF\uFB1D-\uFB4F]/;
    const containsHebrew = hebrewRegex.test(text);
    
    // Create PDF with the text content using PDF 1.4 for better compatibility
    const pdfDoc = await PDFDocument.create();
    
    // Split text into paragraphs
    const paragraphs = text.split(/\r?\n\r?\n/);
    
    // Add first page
    let currentPage = pdfDoc.addPage([595, 842]); // A4 size
    let y = 800; // Start position from top
    const margin = 50;
    const lineHeight = 16;
    const fontSize = 11;
    const maxLinesPerPage = 45; // Maximum lines per page
    let lineCount = 0;
    
    // Add document name at the top
    currentPage.drawText(path.basename(wordFilePath), {
      x: containsHebrew ? 545 - margin : margin,
      y: y,
      size: 14
    });
    
    y -= lineHeight * 2;
    lineCount += 2;
    
    // Process each paragraph
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue;
      
      // Split long paragraphs into lines (basic word wrap)
      const lines = [];
      const words = paragraph.split(/\s+/);
      let currentLine = '';
      
      for (const word of words) {
        if ((currentLine + ' ' + word).length > 80) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = currentLine ? `${currentLine} ${word}` : word;
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      // Check if we need a new page
      if (lineCount + lines.length > maxLinesPerPage) {
        currentPage = pdfDoc.addPage([595, 842]);
        y = 800;
        lineCount = 0;
      }
      
      // Add each line to the PDF
      for (const line of lines) {
        // Check if this specific line contains Hebrew
        const lineContainsHebrew = hebrewRegex.test(line);
        
        // Calculate appropriate x position based on text direction
        const xPosition = lineContainsHebrew ? 545 - margin : margin;
        
        // Add RTL mark for Hebrew text
        const displayText = lineContainsHebrew ? '\u202B' + line : line;
        
        currentPage.drawText(displayText, {
          x: xPosition,
          y: y,
          size: fontSize
        });
        
        y -= lineHeight;
        lineCount++;
        
        // Create a new page if needed
        if (lineCount >= maxLinesPerPage) {
          currentPage = pdfDoc.addPage([595, 842]);
          y = 800;
          lineCount = 0;
        }
      }
      
      // Add space after paragraph
      y -= 8;
      lineCount += 0.5;
      
      // Check if we need a new page after paragraph
      if (lineCount >= maxLinesPerPage) {
        currentPage = pdfDoc.addPage([595, 842]);
        y = 800;
        lineCount = 0;
      }
    }
    
    // Add a footer with page numbers
    const pageCount = pdfDoc.getPageCount();
    for (let i = 0; i < pageCount; i++) {
      const page = pdfDoc.getPage(i);
      page.drawText(`Page ${i + 1} of ${pageCount}`, {
        x: 250,
        y: 30,
        size: 10
      });
    }
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Save PDF with compatible options - version 1.4 for maximum compatibility
    const pdfBytes = await pdfDoc.save({
      version: '1.4',
      useObjectStreams: false
    });
    
    fs.writeFileSync(outputPath, pdfBytes);
    console.log(`Word converted to PDF successfully: ${outputPath}`);
    
    // Double-check the PDF is valid
    try {
      await PDFDocument.load(fs.readFileSync(outputPath), { ignoreEncryption: true });
      console.log("Verified created PDF is valid");
    } catch (verifyError) {
      console.error("Created PDF failed validation:", verifyError);
      return await createSimplePdf(outputPath, `Could not create a valid PDF from: ${path.basename(wordFilePath)}`);
    }
    
    return outputPath;
  } catch (error) {
    console.error('Error converting Word to PDF:', error);
    // Create a simple PDF as fallback
    try {
      console.log("Creating fallback PDF for Word document");
      return await createSimplePdf(
        outputPath, 
        `Failed to convert Word document: ${path.basename(wordFilePath)}\nError: ${error.message}`
      );
    } catch (fallbackError) {
      console.error('Error creating fallback PDF:', fallbackError);
      throw error; // Throw the original error
    }
  }
}

/**
 * Convert any supported file to PDF using LibreOffice
 * @param {string} filePath - Path to the file
 * @param {string} outputPath - Path to save the PDF
 * @returns {Promise<string>} - Path to the created PDF
 */
async function convertToPdf(filePath, outputPath) {
  try {
    console.log(`Converting file to PDF using LibreOffice: ${filePath} -> ${outputPath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist: ${filePath}`);
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Read file
    const fileData = await fs.readFile(filePath);
    if (!fileData || fileData.length === 0) {
      throw new Error(`Empty file: ${filePath}`);
    }
    
    // Convert to PDF format
    const pdfBuf = await libreConvert(fileData, '.pdf', undefined);
    
    // Ensure the directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Save the PDF
    await fs.writeFile(outputPath, pdfBuf);
    
    // Verify the PDF is valid
    try {
      await PDFDocument.load(fs.readFileSync(outputPath), { ignoreEncryption: true });
      console.log(`Successfully converted to PDF: ${outputPath}`);
      return outputPath;
    } catch (verifyError) {
      console.error(`Converted PDF failed validation: ${outputPath}`, verifyError);
      throw new Error(`Invalid PDF produced`);
    }
  } catch (error) {
    console.error('Error in LibreOffice conversion:', error);
    // Create fallback simple PDF
    return await createSimplePdf(
      outputPath,
      `Conversion failed for: ${path.basename(filePath)}\nError: ${error.message}`
    );
  }
}

/**
 * Extract text from any supported file using textract
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromFile(filePath) {
  return new Promise((resolve, reject) => {
    console.log(`Extracting text from file using textract: ${filePath}`);
    textract.fromFileWithPath(filePath, { preserveLineBreaks: true }, (error, text) => {
      if (error) {
        console.error(`Error extracting text: ${error.message}`);
        resolve(""); // Return empty string on error
      } else {
        resolve(text || "");
      }
    });
  });
}

/**
 * Identify file type based on extension and mime type
 * @param {object} file - File object from multer
 * @returns {string} - File type ('pdf', 'word', 'presentation', 'spreadsheet', 'image', 'other')
 */
function identifyFileType(file) {
  if (!file) return 'unknown';
  
  const fileExt = path.extname(file.path || file.originalname || '').toLowerCase();
  const mimeType = (file.mimetype || '').toLowerCase();
  
  // PDF files
  if (fileExt === '.pdf' || mimeType.includes('pdf')) {
    return 'pdf';
  }
  
  // Word documents
  if (fileExt === '.docx' || fileExt === '.doc' || fileExt === '.rtf' || fileExt === '.odt' ||
      mimeType.includes('msword') || 
      mimeType.includes('openxmlformats-officedocument.wordprocessingml') ||
      mimeType.includes('rtf') ||
      mimeType.includes('opendocument.text')) {
    return 'word';
  }
  
  // Presentations
  if (fileExt === '.pptx' || fileExt === '.ppt' || fileExt === '.odp' ||
      mimeType.includes('presentation') ||
      mimeType.includes('opendocument.presentation')) {
    return 'presentation';
  }
  
  // Spreadsheets
  if (fileExt === '.xlsx' || fileExt === '.xls' || fileExt === '.ods' ||
      fileExt === '.csv' || fileExt === '.tsv' ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('opendocument.spreadsheet') ||
      mimeType.includes('excel') ||
      mimeType.includes('csv')) {
    return 'spreadsheet';
  }
  
  // Images
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'].includes(fileExt) ||
      mimeType.includes('image/')) {
    return 'image';
  }
  
  // Text files
  if (fileExt === '.txt' || mimeType.includes('text/plain')) {
    return 'text';
  }
  
  return 'other';
}

/**
 * Main function to merge multiple files
 * @param {array} files - Array of file objects from multer
 * @param {string} outputFormat - Output format ('pdf' or 'docx')
 * @returns {Promise<string>} - Path to the merged file
 */
async function mergeFiles(files, outputFormat = 'pdf') {
  try {
    console.log(`Starting merge process with ${files ? files.length : 0} files, output format: ${outputFormat}`);
    
    // Create tmp directory
    const tmpDir = path.join(__dirname, 'tmp');
    if (!fs.existsSync(tmpDir)) {
      console.log(`Creating tmp directory: ${tmpDir}`);
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    const outputFileName = `merged_${Date.now()}.${outputFormat}`;
    const outputPath = path.join(tmpDir, outputFileName);
    console.log(`Output will be saved to: ${outputPath}`);
    
    // If no files, return a blank file
    if (!files || files.length === 0) {
      console.log('No files to merge, creating blank output');
      if (outputFormat === 'pdf') {
        return await createSimplePdf(outputPath, "No files were provided for merging");
      } else {
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'No files were provided for merging',
                    bold: true
                  })
                ]
              })
            ]
          }]
        });
        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(outputPath, buffer);
        return outputPath;
      }
    }
    
    // Validate files
    const validFiles = files.filter(file => {
      if (!file || !file.path) {
        console.warn("Invalid file object encountered");
        return false;
      }
      
      if (!fs.existsSync(file.path)) {
        console.warn(`File does not exist: ${file.path}`);
        return false;
      }
      
      // Check file size
      try {
        const stats = fs.statSync(file.path);
        if (stats.size === 0) {
          console.warn(`Empty file: ${file.path}`);
          return false;
        }
      } catch (err) {
        console.warn(`Error checking file size: ${file.path}`, err);
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length === 0) {
      console.warn('No valid files found, creating an empty file');
      if (outputFormat === 'pdf') {
        return await createSimplePdf(outputPath, "No valid files were found for merging");
      } else {
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'No valid files were found',
                    bold: true
                  })
                ]
              })
            ]
          }]
        });
        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(outputPath, buffer);
        return outputPath;
      }
    }
    
    try {
      console.log(`Processing ${validFiles.length} valid files...`);
      
      // For PDF output format
      if (outputFormat === 'pdf') {
        const pdfFiles = [];
        
        // Process files for PDF conversion
        for (const file of validFiles) {
          try {
            const fileType = identifyFileType(file);
            console.log(`Processing file: ${file.path}, identified as: ${fileType}`);
            
            if (fileType === 'pdf') {
              // Validate the PDF first
              try {
                const pdfBuffer = fs.readFileSync(file.path);
                await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
                console.log(`Adding valid PDF file to merge list: ${file.path}`);
                pdfFiles.push(file.path);
              } catch (validateError) {
                console.error(`Invalid PDF file: ${file.path}`, validateError);
                // Try to convert the file as a fallback
                try {
                  const tempPdfPath = path.join(tmpDir, `converted_${Date.now()}_${path.basename(file.path, path.extname(file.path))}.pdf`);
                  const convertedPath = await convertToPdf(file.path, tempPdfPath);
                  pdfFiles.push(convertedPath);
                } catch (conversionError) {
                  console.error(`Failed to convert file as fallback: ${file.path}`, conversionError);
                }
              }
            } else if (fileType === 'word') {
              // Convert Word to PDF
              try {
                const pdfPath = path.join(tmpDir, `${path.basename(file.path, path.extname(file.path))}_${Date.now()}.pdf`);
                await wordToPdf(file.path, pdfPath);
                if (fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 0) {
                  pdfFiles.push(pdfPath);
                }
              } catch (wordError) {
                console.error(`Error converting Word to PDF: ${file.path}`, wordError);
                // Try generic converter as fallback
                try {
                  const tempPdfPath = path.join(tmpDir, `converted_${Date.now()}_${path.basename(file.path, path.extname(file.path))}.pdf`);
                  const convertedPath = await convertToPdf(file.path, tempPdfPath);
                  pdfFiles.push(convertedPath);
                } catch (fallbackError) {
                  console.error(`Failed to convert with fallback: ${file.path}`, fallbackError);
                }
              }
            } else {
              // Use generic converter for other file types
              try {
                const pdfPath = path.join(tmpDir, `${path.basename(file.path, path.extname(file.path))}_${Date.now()}.pdf`);
                const convertedPath = await convertToPdf(file.path, pdfPath);
                pdfFiles.push(convertedPath);
              } catch (conversionError) {
                console.error(`Error converting file to PDF: ${file.path}`, conversionError);
              }
            }
          } catch (fileError) {
            console.error(`Error processing file: ${file.path}`, fileError);
            // Continue with next file
          }
        }
        
        // Now merge the collected PDF files
        if (pdfFiles.length > 0) {
          console.log(`Merging ${pdfFiles.length} PDF files to: ${outputPath}`);
          return await mergePdfFiles(pdfFiles, outputPath);
        } else {
          console.log('No PDF files to merge, creating empty PDF');
          return await createSimplePdf(outputPath, "No valid files could be processed");
        }
      } 
      // For DOCX output format
      else if (outputFormat === 'docx') {
        let combinedText = '';
        
        // Process each file to extract text
        for (const file of validFiles) {
          try {
            const fileType = identifyFileType(file);
            console.log(`Processing file for text extraction: ${file.path}, identified as: ${fileType}`);
            
            if (fileType === 'pdf') {
              // Extract text from PDF
              try {
                const text = await extractPdfText(file.path);
                combinedText += `\n\n=== ${file.originalname || 'PDF Document'} ===\n\n`;
                combinedText += text || "[No text could be extracted from this PDF]";
                combinedText += '\n\n';
              } catch (error) {
                console.error(`Error extracting text from PDF ${file.path}:`, error);
                combinedText += `\n\n=== ${file.originalname || 'PDF Document'} [Error] ===\n\n`;
                combinedText += "[Error extracting text from PDF]\n\n";
              }
            } else if (fileType === 'word') {
              // Extract text from Word
              try {
                const text = await extractWordText(file.path);
                combinedText += `\n\n=== ${file.originalname || 'Word Document'} ===\n\n`;
                combinedText += text || "[No text could be extracted from this document]";
                combinedText += '\n\n';
              } catch (error) {
                console.error(`Error extracting text from Word ${file.path}:`, error);
                // Try generic text extraction
                try {
                  const text = await extractTextFromFile(file.path);
                  combinedText += `\n\n=== ${file.originalname || 'Document'} ===\n\n`;
                  combinedText += text || "[No text could be extracted with fallback method]";
                  combinedText += '\n\n';
                } catch (fallbackError) {
                  console.error(`Fallback text extraction failed: ${file.path}`, fallbackError);
                  combinedText += `\n\n=== ${file.originalname || 'Document'} [Error] ===\n\n`;
                  combinedText += "[Error extracting text from document]\n\n";
                }
              }
            } else {
              // Use generic text extraction for other file types
              try {
                const text = await extractTextFromFile(file.path);
                combinedText += `\n\n=== ${file.originalname || fileType.charAt(0).toUpperCase() + fileType.slice(1) + ' Document'} ===\n\n`;
                combinedText += text || `[No text could be extracted from this ${fileType} file]`;
                combinedText += '\n\n';
              } catch (extractError) {
                console.error(`Error extracting text from ${fileType} file: ${file.path}`, extractError);
                combinedText += `\n\n=== ${file.originalname || 'Document'} [Error] ===\n\n`;
                combinedText += `[Error extracting text from ${fileType} file]\n\n`;
              }
            }
          } catch (fileError) {
            console.error(`Error processing file: ${file.path}`, fileError);
            // Continue with next file
          }
        }
        
        // Create Word document from combined text
        console.log('Creating Word document from extracted text');
        if (combinedText.trim()) {
          return await createWordDocument(combinedText, outputPath);
        } else {
          console.log('No text extracted, creating empty Word document');
          return await createWordDocument('No content could be extracted from the provided files', outputPath);
        }
      } else {
        console.error(`Unsupported output format: ${outputFormat}`);
        throw new Error(`Unsupported output format: ${outputFormat}`);
      }
    } catch (processingError) {
      console.error('Error processing files:', processingError);
      
      // Create fallback output based on format
      if (outputFormat === 'pdf') {
        return await createSimplePdf(outputPath, `Error occurred during file processing: ${processingError.message}`);
      } else {
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Error occurred during file processing',
                    bold: true
                  })
                ]
              }),
              new Paragraph({
                text: processingError.message
              })
            ]
          }]
        });
        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(outputPath, buffer);
        return outputPath;
      }
    }
  } catch (error) {
    console.error('Error in mergeFiles:', error);
    
    // Ensure the output directory exists
    const tmpDir = path.join(__dirname, 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    // Create a fallback output file of the requested type
    const outputFileName = `error_fallback_${Date.now()}.${outputFormat}`;
    const fallbackPath = path.join(tmpDir, outputFileName);
    
    try {
      if (outputFormat === 'pdf') {
        return await createSimplePdf(fallbackPath, `Fatal error in file processing: ${error.message}`);
      } else {
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Fatal error in file processing',
                    bold: true
                  })
                ]
              }),
              new Paragraph({
                text: error.message
              })
            ]
          }]
        });
        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(fallbackPath, buffer);
        return fallbackPath;
      }
    } catch (fallbackError) {
      console.error('Failed to create fallback file:', fallbackError);
      throw new Error('Fatal error in file processing: ' + error.message);
    }
  }
}

module.exports = {
  mergeFiles,
  extractPdfText,
  extractWordText,
  createWordDocument,
  mergePdfFiles,
  wordToPdf,
  createSimplePdf,
  convertToPdf,
  extractTextFromFile,
  identifyFileType
}; 