const csv = require('csv-parser');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Advanced CSV/Excel processor with comprehensive validation
 */
class FileProcessor {
  constructor() {
    this.supportedFormats = ['.csv', '.xlsx', '.xls'];
    this.requiredColumns = ['firstName', 'phone', 'notes'];
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB
  }

  /**
   * Validate file before processing
   */
  validateFile(file) {
    const errors = [];

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size exceeds ${this.maxFileSize / (1024 * 1024)}MB limit`);
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!this.supportedFormats.includes(ext)) {
      errors.push(`Unsupported file format. Supported formats: ${this.supportedFormats.join(', ')}`);
    }

    // Check if file exists and is readable
    if (!fs.existsSync(file.path)) {
      errors.push('File not found or unreadable');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Process CSV file
   */
  async processCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];
      let rowCount = 0;

      fs.createReadStream(filePath)
        .pipe(csv({
          mapHeaders: ({ header }) => this.normalizeHeader(header)
        }))
        .on('data', (data) => {
          rowCount++;
          const validation = this.validateRow(data, rowCount);
          
          if (validation.isValid) {
            results.push(this.sanitizeRow(data));
          } else {
            errors.push(...validation.errors);
          }
        })
        .on('end', () => {
          resolve({
            data: results,
            totalRows: rowCount,
            validRows: results.length,
            errors,
            skippedRows: rowCount - results.length
          });
        })
        .on('error', (error) => {
          reject(new Error(`CSV processing error: ${error.message}`));
        });
    });
  }

  /**
   * Process Excel file
   */
  async processExcel(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with header mapping
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        dateNF: 'yyyy-mm-dd'
      });

      const results = [];
      const errors = [];

      rawData.forEach((row, index) => {
        const normalizedRow = this.normalizeRowKeys(row);
        const validation = this.validateRow(normalizedRow, index + 1);
        
        if (validation.isValid) {
          results.push(this.sanitizeRow(normalizedRow));
        } else {
          errors.push(...validation.errors);
        }
      });

      return {
        data: results,
        totalRows: rawData.length,
        validRows: results.length,
        errors,
        skippedRows: rawData.length - results.length
      };
    } catch (error) {
      throw new Error(`Excel processing error: ${error.message}`);
    }
  }

  /**
   * Main processing method
   */
  async processFile(file) {
    const validation = this.validateFile(file);
    
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const ext = path.extname(file.originalname).toLowerCase();
    
    try {
      let result;
      
      if (ext === '.csv') {
        result = await this.processCSV(file.path);
      } else if (['.xlsx', '.xls'].includes(ext)) {
        result = await this.processExcel(file.path);
      } else {
        throw new Error('Unsupported file format');
      }

      // Additional validation
      if (result.data.length === 0) {
        throw new Error('No valid records found in the file');
      }

      // Clean up uploaded file
      this.cleanupFile(file.path);

      return {
        ...result,
        fileName: file.originalname,
        fileSize: file.size,
        processedAt: new Date()
      };
    } catch (error) {
      // Clean up uploaded file on error
      this.cleanupFile(file.path);
      throw error;
    }
  }

  /**
   * Normalize header names
   */
  normalizeHeader(header) {
    const normalized = header.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();

    // Map common variations
    const headerMap = {
      'firstname': 'firstName',
      'first_name': 'firstName',
      'fname': 'firstName',
      'phonenumber': 'phone',
      'phone_number': 'phone',
      'mobile': 'phone',
      'contact': 'phone',
      'note': 'notes',
      'comment': 'notes',
      'comments': 'notes',
      'description': 'notes'
    };

    return headerMap[normalized] || normalized;
  }

  /**
   * Normalize row keys for Excel processing
   */
  normalizeRowKeys(row) {
    const normalized = {};
    
    Object.keys(row).forEach(key => {
      const normalizedKey = this.normalizeHeader(key);
      normalized[normalizedKey] = row[key];
    });

    return normalized;
  }

  /**
   * Validate individual row
   */
  validateRow(row, rowNumber) {
    const errors = [];

    // Check required columns
    this.requiredColumns.forEach(col => {
      if (!row[col] || String(row[col]).trim() === '') {
        errors.push({
          row: rowNumber,
          column: col,
          error: `${col} is required`,
          value: row[col] || ''
        });
      }
    });

    // Validate phone number
    if (row.phone) {
      const phoneRegex = /^\+?\d{10,15}$/;
      const cleanPhone = String(row.phone).replace(/[^\d+]/g, '');
      
      if (!phoneRegex.test(cleanPhone)) {
        errors.push({
          row: rowNumber,
          column: 'phone',
          error: 'Invalid phone number format',
          value: row.phone
        });
      }
    }

    // Validate firstName length
    if (row.firstName && String(row.firstName).length > 50) {
      errors.push({
        row: rowNumber,
        column: 'firstName',
        error: 'First name too long (max 50 characters)',
        value: row.firstName
      });
    }

    // Validate notes length
    if (row.notes && String(row.notes).length > 500) {
      errors.push({
        row: rowNumber,
        column: 'notes',
        error: 'Notes too long (max 500 characters)',
        value: row.notes
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize row data
   */
  sanitizeRow(row) {
    return {
      firstName: String(row.firstName || '').trim(),
      phone: String(row.phone || '').replace(/[^\d+]/g, ''),
      notes: String(row.notes || '').trim()
    };
  }

  /**
   * Clean up uploaded file
   */
  cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('File cleanup error:', error.message);
    }
  }

  /**
   * Get file statistics
   */
  getFileStats(processedData) {
    const stats = {
      totalRecords: processedData.totalRows,
      validRecords: processedData.validRows,
      invalidRecords: processedData.skippedRows,
      errorRate: processedData.totalRows > 0 ? 
        Math.round((processedData.skippedRows / processedData.totalRows) * 100) : 0,
      validationErrors: processedData.errors.length
    };

    return stats;
  }
}

module.exports = FileProcessor;
