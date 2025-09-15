import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create subdirectories based on file type
    let subDir = 'general';

    if (file.mimetype.startsWith('image/')) {
      subDir = 'images';
    } else if (file.mimetype === 'application/pdf' ||
               file.mimetype === 'application/msword' ||
               file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      subDir = 'documents';
    } else if (file.fieldname === 'resume') {
      subDir = 'resumes';
    }

    const fullPath = path.join(uploadDir, subDir);

    // Create subdirectory if it doesn't exist
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and UUID
    const timestamp = Date.now();
    const uuid = uuidv4().substring(0, 8);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_') // Replace special characters
      .substring(0, 50); // Limit length

    const filename = `${timestamp}_${uuid}_${baseName}${ext}`;
    cb(null, filename);
  }
});

// File filter for validation
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png')
    .split(',')
    .map(type => type.trim().toLowerCase());

  const fileExt = path.extname(file.originalname).toLowerCase();
  const mimeTypes: { [key: string]: string[] } = {
    '.pdf': ['application/pdf'],
    '.doc': ['application/msword'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    '.txt': ['text/plain'],
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png']
  };

  // Check file extension
  if (!allowedTypes.includes(fileExt)) {
    logger.warn('File upload rejected: invalid extension', {
      filename: file.originalname,
      extension: fileExt,
      allowedTypes
    });
    cb(new Error(`File type ${fileExt} not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    return;
  }

  // Check MIME type
  const allowedMimes = mimeTypes[fileExt] || [];
  if (!allowedMimes.includes(file.mimetype)) {
    logger.warn('File upload rejected: MIME type mismatch', {
      filename: file.originalname,
      extension: fileExt,
      mimeType: file.mimetype,
      allowedMimes
    });
    cb(new Error(`Invalid file type. Expected MIME types for ${fileExt}: ${allowedMimes.join(', ')}`));
    return;
  }

  cb(null, true);
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 10, // Maximum 10 files per request
    fields: 20, // Maximum 20 non-file fields
    parts: 30 // Maximum 30 parts total
  }
});

// Middleware functions
export class FileUploadMiddleware {
  // Single file upload
  static single(fieldName: string) {
    return upload.single(fieldName);
  }

  // Multiple files upload (same field)
  static array(fieldName: string, maxCount: number = 5) {
    return upload.array(fieldName, maxCount);
  }

  // Multiple files upload (different fields)
  static fields(fields: { name: string; maxCount?: number }[]) {
    return upload.fields(fields);
  }

  // Any files upload
  static any() {
    return upload.any();
  }

  // Resume upload specifically
  static resume() {
    return upload.single('resume');
  }

  // Multiple documents upload
  static documents() {
    return upload.array('documents', 5);
  }

  // Profile image upload
  static profileImage() {
    return upload.single('avatar');
  }

  // Custom validation for specific file types
  static validateFileType(allowedTypes: string[]) {
    return (req: Request, res: any, next: any) => {
      if (!req.file && !req.files) {
        return next();
      }

      const files = req.files ?
        (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) :
        [req.file].filter(Boolean);

      for (const file of files as Express.Multer.File[]) {
        const fileExt = path.extname(file.originalname).toLowerCase();

        if (!allowedTypes.includes(fileExt)) {
          return res.status(400).json({
            error: 'Invalid file type',
            message: `File ${file.originalname} has invalid type. Allowed types: ${allowedTypes.join(', ')}`
          });
        }
      }

      next();
    };
  }

  // Error handler for multer errors
  static errorHandler() {
    return (error: any, req: Request, res: any, next: any) => {
      if (error instanceof multer.MulterError) {
        logger.error('File upload error:', {
          code: error.code,
          message: error.message,
          field: error.field
        });

        switch (error.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json({
              error: 'File too large',
              message: `File size exceeds maximum limit of ${Math.round(parseInt(process.env.MAX_FILE_SIZE || '10485760') / (1024 * 1024))}MB`
            });
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json({
              error: 'Too many files',
              message: 'Maximum file count exceeded'
            });
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json({
              error: 'Unexpected file',
              message: `Unexpected file field: ${error.field}`
            });
          default:
            return res.status(400).json({
              error: 'File upload error',
              message: error.message
            });
        }
      }

      if (error.message && error.message.includes('File type')) {
        return res.status(400).json({
          error: 'Invalid file type',
          message: error.message
        });
      }

      next(error);
    };
  }

  // Clean up uploaded files on error
  static cleanup() {
    return (error: any, req: Request, res: any, next: any) => {
      if (error && req.file) {
        fs.unlink(req.file.path, (unlinkError) => {
          if (unlinkError) {
            logger.error('Failed to clean up uploaded file:', {
              file: req.file?.path,
              error: unlinkError
            });
          }
        });
      }

      if (error && req.files) {
        const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();

        for (const file of files as Express.Multer.File[]) {
          fs.unlink(file.path, (unlinkError) => {
            if (unlinkError) {
              logger.error('Failed to clean up uploaded file:', {
                file: file.path,
                error: unlinkError
              });
            }
          });
        }
      }

      next(error);
    };
  }
}

// File metadata interface
export interface FileMetadata {
  originalName: string;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  uploadedAt: Date;
  uploadedBy?: string;
}

// File service for managing uploaded files
export class FileService {
  // Save file metadata
  static createFileMetadata(file: Express.Multer.File, uploadedBy?: string): FileMetadata {
    return {
      originalName: file.originalname,
      filename: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
      uploadedBy
    };
  }

  // Delete file from filesystem
  static async deleteFile(filePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      fs.unlink(filePath, (error) => {
        if (error) {
          logger.error('Failed to delete file:', {
            filePath,
            error
          });
          resolve(false);
        } else {
          logger.info('File deleted successfully:', { filePath });
          resolve(true);
        }
      });
    });
  }

  // Check if file exists
  static fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  // Get file stats
  static getFileStats(filePath: string): fs.Stats | null {
    try {
      return fs.statSync(filePath);
    } catch (error) {
      logger.error('Failed to get file stats:', {
        filePath,
        error
      });
      return null;
    }
  }

  // Get file extension
  static getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }

  // Validate file size
  static isValidFileSize(size: number, maxSize: number = parseInt(process.env.MAX_FILE_SIZE || '10485760')): boolean {
    return size <= maxSize;
  }

  // Generate download URL
  static generateDownloadUrl(filename: string, subDir: string = 'general'): string {
    return `/api/v1/files/download/${subDir}/${filename}`;
  }

  // Clean up old files (utility function for scheduled cleanup)
  static async cleanupOldFiles(olderThanDays: number = 30): Promise<number> {
    let deletedCount = 0;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const walkDir = (dir: string) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
          walkDir(filePath);
        } else if (stats.mtime < cutoffDate) {
          try {
            fs.unlinkSync(filePath);
            deletedCount++;
            logger.info('Cleaned up old file:', { filePath });
          } catch (error) {
            logger.error('Failed to cleanup old file:', { filePath, error });
          }
        }
      }
    };

    try {
      walkDir(uploadDir);
      logger.info('File cleanup completed:', { deletedCount });
    } catch (error) {
      logger.error('File cleanup failed:', { error });
    }

    return deletedCount;
  }
}