import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../config/logger';

export interface ValidatedRequest extends Request {
  validatedData?: {
    body?: any;
    query?: any;
    params?: any;
  };
}

export class ValidationMiddleware {
  // Generic validation middleware
  static validate(schema: ZodSchema) {
    return (req: ValidatedRequest, res: Response, next: NextFunction) => {
      try {
        // Validate the request against the schema
        const validatedData = schema.parse({
          body: req.body,
          query: req.query,
          params: req.params
        });

        // Attach validated data to request
        req.validatedData = validatedData as any;

        // Update request with validated data
        const data = validatedData as any;
        req.body = data.body || req.body;

        // Handle query assignment safely
        if (data.query) {
          Object.keys(req.query).forEach(key => {
            delete req.query[key];
          });
          Object.assign(req.query, data.query);
        }

        req.params = data.params || req.params;

        next();
      } catch (error) {
        if (error instanceof ZodError) {
          const formattedErrors = ValidationMiddleware.formatZodErrors(error);

          logger.warn('Validation error:', {
            url: req.originalUrl,
            method: req.method,
            errors: formattedErrors,
            body: req.body,
            query: req.query,
            params: req.params
          });

          res.status(400).json({
            error: 'Validation failed',
            message: 'The request contains invalid data',
            details: formattedErrors,
            timestamp: new Date().toISOString()
          });
          return;
        }

        logger.error('Unexpected validation error:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: 'An unexpected error occurred during validation'
        });
      }
    };
  }

  // Format Zod errors for better client consumption
  private static formatZodErrors(error: ZodError): { field: string; message: string }[] {
    const errors = (error as any).errors || error.issues || [];
    return errors.map((err: any) => ({
      field: err.path ? err.path.join('.') : 'unknown',
      message: err.message || 'Validation error'
    }));
  }

  // Validate query parameters
  static validateQuery(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const validatedQuery = schema.parse(req.query);
        req.query = validatedQuery as any;
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          const formattedErrors = ValidationMiddleware.formatZodErrors(error);
          res.status(400).json({
            error: 'Invalid query parameters',
            details: formattedErrors
          });
          return;
        }
        next(error);
      }
    };
  }

  // Validate request body
  static validateBody(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const validatedBody = schema.parse(req.body);
        req.body = validatedBody;
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          const formattedErrors = ValidationMiddleware.formatZodErrors(error);
          res.status(400).json({
            error: 'Invalid request body',
            details: formattedErrors
          });
          return;
        }
        next(error);
      }
    };
  }

  // Validate path parameters
  static validateParams(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const validatedParams = schema.parse(req.params);
        req.params = validatedParams as any;
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          const formattedErrors = ValidationMiddleware.formatZodErrors(error);
          res.status(400).json({
            error: 'Invalid path parameters',
            details: formattedErrors
          });
          return;
        }
        next(error);
      }
    };
  }

  // Sanitize input data
  static sanitizeInput(req: Request, res: Response, next: NextFunction) {
    // Basic XSS prevention - strip potentially dangerous characters
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj
          .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
          .replace(/<[^>]*>/g, '') // Remove all HTML tags
          .trim();
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }

      return obj;
    };

    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    if (req.query) {
      const sanitizedQuery = sanitizeObject(req.query);
      Object.keys(req.query).forEach(key => {
        delete req.query[key];
      });
      Object.assign(req.query, sanitizedQuery);
    }

    next();
  }

  // Validate MongoDB ObjectId
  static validateObjectId(fieldName: string = 'id') {
    return (req: Request, res: Response, next: NextFunction) => {
      const id = req.params[fieldName];

      if (!id) {
        res.status(400).json({
          error: 'Missing parameter',
          message: `${fieldName} parameter is required`
        });
        return;
      }

      // Basic ObjectId validation (24 characters, hexadecimal)
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;

      if (!objectIdRegex.test(id)) {
        res.status(400).json({
          error: 'Invalid parameter',
          message: `Invalid ${fieldName} format`
        });
        return;
      }

      next();
    };
  }

  // File upload validation
  static validateFileUpload(options: {
    required?: boolean;
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    maxFiles?: number;
  } = {}) {
    const {
      required = false,
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'],
      maxFiles = 1
    } = options;

    return (req: Request, res: Response, next: NextFunction) => {
      const files = req.files as Express.Multer.File[] | undefined;
      const file = req.file as Express.Multer.File | undefined;

      if (required && !files && !file) {
        res.status(400).json({
          error: 'File required',
          message: 'At least one file must be uploaded'
        });
        return;
      }

      const filesToCheck = files || (file ? [file] : []);

      if (filesToCheck.length > maxFiles) {
        res.status(400).json({
          error: 'Too many files',
          message: `Maximum ${maxFiles} files allowed`
        });
        return;
      }

      for (const uploadedFile of filesToCheck) {
        // Check file size
        if (uploadedFile.size > maxSize) {
          res.status(400).json({
            error: 'File too large',
            message: `File ${uploadedFile.originalname} exceeds maximum size of ${Math.round(maxSize / (1024 * 1024))}MB`
          });
          return;
        }

        // Check file type
        const fileExtension = uploadedFile.originalname.toLowerCase().substring(uploadedFile.originalname.lastIndexOf('.'));
        if (!allowedTypes.includes(fileExtension)) {
          res.status(400).json({
            error: 'Invalid file type',
            message: `File ${uploadedFile.originalname} has invalid type. Allowed types: ${allowedTypes.join(', ')}`
          });
          return;
        }
      }

      next();
    };
  }

  // Pagination validation
  static validatePagination(req: Request, res: Response, next: NextFunction) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sort = req.query.sort as string || 'createdAt';
    const order = req.query.order as string || 'desc';

    // Validate pagination parameters
    if (page < 1) {
      res.status(400).json({
        error: 'Invalid pagination',
        message: 'Page number must be greater than 0'
      });
      return;
    }

    if (limit < 1 || limit > 100) {
      res.status(400).json({
        error: 'Invalid pagination',
        message: 'Limit must be between 1 and 100'
      });
      return;
    }

    if (!['asc', 'desc'].includes(order)) {
      res.status(400).json({
        error: 'Invalid sort order',
        message: 'Order must be either "asc" or "desc"'
      });
      return;
    }

    // Attach validated pagination to request
    req.query.page = page.toString();
    req.query.limit = limit.toString();
    req.query.sort = sort;
    req.query.order = order;

    next();
  }
}