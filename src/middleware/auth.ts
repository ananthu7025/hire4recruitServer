import { Request, Response, NextFunction } from 'express';
import { AuthUtils, JwtPayload } from '../utils/auth';
import Employee, { IEmployee } from '../models/Employee';
import { logger } from '../config/logger';

export class AuthMiddleware {
  // Main authentication middleware
  static async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = AuthUtils.extractTokenFromHeader(req.headers.authorization);

      if (!token) {
        res.status(401).json({
          error: 'Access denied',
          message: 'No token provided'
        });
        return;
      }

      // Verify token
      const decoded = AuthUtils.verifyToken(token);

      // Get user from database to ensure they still exist and are active
      const user = await Employee.findById(decoded.userId)
        .select('-password')
        .populate('companyId', 'name isActive')
        .lean();

      if (!user) {
        res.status(401).json({
          error: 'Access denied',
          message: 'User not found'
        });
        return;
      }

      // Check if user is active
      if (!user.isActive || user.isDeleted) {
        res.status(401).json({
          error: 'Access denied',
          message: 'User account is inactive'
        });
        return;
      }

      // Check if company is active
      if (!user.companyId || !(user.companyId as any).isActive) {
        res.status(401).json({
          error: 'Access denied',
          message: 'Company account is inactive'
        });
        return;
      }

      // Check if user is locked out
      if (AuthUtils.isUserLockedOut(user as IEmployee)) {
        res.status(423).json({
          error: 'Account locked',
          message: 'Account is temporarily locked due to failed login attempts'
        });
        return;
      }

      // Attach user information to request
      req.user = {
        userId: user._id.toString(),
        companyId: typeof user.companyId === 'object' ? (user.companyId as any)._id.toString() : (user.companyId as any).toString(),
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        userData: user as IEmployee
      };

      next();
    } catch (error) {
      logger.error('Authentication error:', error);

      if (error instanceof Error && error.message.includes('expired')) {
        res.status(401).json({
          error: 'Token expired',
          message: 'Access token has expired'
        });
        return;
      }

      res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token'
      });
    }
  }

  // Optional authentication (for public endpoints that can benefit from user context)
  static async optionalAuthenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = AuthUtils.extractTokenFromHeader(req.headers.authorization);

      if (token) {
        // If token exists, validate it
        await AuthMiddleware.authenticate(req, res, next);
      } else {
        // No token, continue without authentication
        next();
      }
    } catch (error) {
      // If token is invalid, continue without authentication
      next();
    }
  }

  // Role-based authorization
  static requireRole(...roles: IEmployee['role'][]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        res.status(401).json({
          error: 'Access denied',
          message: 'Authentication required'
        });
        return;
      }

      if (!roles.includes(req.user.role as IEmployee['role'])) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions'
        });
        return;
      }

      next();
    };
  }

  // Permission-based authorization
  static requirePermission(resource: keyof IEmployee['permissions'], action: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user || !req.user.permissions) {
        res.status(401).json({
          error: 'Access denied',
          message: 'Authentication required'
        });
        return;
      }

      const resourcePermissions = req.user.permissions[resource];

      if (!resourcePermissions || !resourcePermissions[action as keyof typeof resourcePermissions]) {
        res.status(403).json({
          error: 'Forbidden',
          message: `Insufficient permissions for ${resource}:${action}`
        });
        return;
      }

      next();
    };
  }

  // Multi-tenant isolation (ensure user can only access their company's data)
  static ensureCompanyAccess(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
      return;
    }

    // Add company filter to query if not already present
    if (req.method === 'GET' || req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      // For body-based requests, ensure companyId matches
      if (req.body && typeof req.body === 'object') {
        if (req.body.companyId && req.body.companyId !== req.user.companyId) {
          res.status(403).json({
            error: 'Forbidden',
            message: 'Cannot access data from other companies'
          });
          return;
        }
        // Auto-inject companyId if not present
        if (!req.body.companyId) {
          req.body.companyId = req.user.companyId;
        }
      }

      // For query-based requests, ensure companyId filter
      if (req.query && typeof req.query === 'object') {
        if (req.query.companyId && req.query.companyId !== req.user.companyId) {
          res.status(403).json({
            error: 'Forbidden',
            message: 'Cannot access data from other companies'
          });
          return;
        }
        // Auto-inject companyId filter
        req.query.companyId = req.user.companyId;
      }
    }

    next();
  }

  // Admin only endpoints
  static requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
      return;
    }

    if (req.user.role !== 'company_admin') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
      return;
    }

    next();
  }

  // Email verification requirement
  static requireEmailVerified(req: Request, res: Response, next: NextFunction): void {
    if (!req.user || !req.user.userData) {
      res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
      return;
    }

    if (!req.user.userData.isEmailVerified) {
      res.status(403).json({
        error: 'Email verification required',
        message: 'Please verify your email address to access this resource'
      });
      return;
    }

    next();
  }

  // Rate limiting for authentication endpoints
  static authRateLimit = (req: Request, res: Response, next: NextFunction) => {
    // This can be enhanced with more sophisticated rate limiting
    // For now, we rely on the global rate limiter
    next();
  };
}