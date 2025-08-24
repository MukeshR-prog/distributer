const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `distribution-${uniqueSuffix}${ext}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.csv', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 1 // Only allow one file at a time
  },
  fileFilter: fileFilter
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: `File size too large. Maximum size allowed is ${process.env.MAX_FILE_SIZE || 5 * 1024 * 1024} bytes.`
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Only one file is allowed.'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected field name. Please use "file" as the field name.'
        });
      default:
        return res.status(400).json({
          success: false,
          message: `Upload error: ${error.message}`
        });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// Single file upload middleware
const uploadSingleFile = upload.single('file');

// Middleware wrapper that handles errors
const uploadMiddleware = (req, res, next) => {
  uploadSingleFile(req, res, (error) => {
    if (error) {
      return handleMulterError(error, req, res, next);
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a file to upload.'
      });
    }
    
    next();
  });
};

// Cleanup function to remove uploaded files
const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Cleaned up file: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error cleaning up file ${filePath}:`, error.message);
  }
};

// Cleanup old files (run periodically)
const cleanupOldFiles = (maxAge = 24 * 60 * 60 * 1000) => { // 24 hours default
  try {
    const files = fs.readdirSync(uploadDir);
    const now = Date.now();
    
    files.forEach(file => {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        cleanupFile(filePath);
      }
    });
  } catch (error) {
    console.error('Error during file cleanup:', error.message);
  }
};

// Validate file before processing
const validateUploadedFile = (file) => {
  const errors = [];
  
  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors };
  }
  
  // Check if file exists
  if (!fs.existsSync(file.path)) {
    errors.push('Uploaded file not found');
  }
  
  // Check file size
  if (file.size === 0) {
    errors.push('File is empty');
  }
  
  // Check file extension
  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(fileExtension)) {
    errors.push(`Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  uploadMiddleware,
  handleMulterError,
  cleanupFile,
  cleanupOldFiles,
  validateUploadedFile,
  uploadDir
};
