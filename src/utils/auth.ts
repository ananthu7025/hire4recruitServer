import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { IEmployee } from '../models/Employee';

export interface JwtPayload {
  userId: string;
  companyId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export class AuthUtils {
  private static readonly SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
  private static readonly JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

  // Hash password
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  // Compare password
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Generate JWT token
  static generateToken(payload: JwtPayload): string {
    const secret = this.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');
    return jwt.sign(payload, secret, {
      expiresIn: this.JWT_EXPIRE,
      issuer: 'hire4recruit',
      audience: 'hire4recruit-client'
    } as SignOptions);
  }

  // Verify JWT token
  static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET, {
        issuer: 'hire4recruit',
        audience: 'hire4recruit-client'
      }) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Generate token for user
  static generateUserToken(user: IEmployee): string {
    const payload: JwtPayload = {
      userId: user._id.toString(),
      companyId: user.companyId.toString(),
      email: user.email,
      role: user.role
    };

    return this.generateToken(payload);
  }

  // Generate random token for password reset, email verification, etc.
  static generateRandomToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate password reset token with expiry
  static generatePasswordResetToken(): { token: string; expires: Date } {
    const token = this.generateRandomToken();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1 hour expiry

    return { token, expires };
  }

  // Generate invite token
  static generateInviteToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Validate password strength
  static validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH || '8');

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Check if user is locked out
  static isUserLockedOut(user: IEmployee): boolean {
    return user.lockoutExpires ? user.lockoutExpires > new Date() : false;
  }

  // Handle failed login attempt
  static handleFailedLogin(user: IEmployee): { isLocked: boolean; attemptsRemaining: number } {
    const maxAttempts = 5;
    const lockoutDuration = 15 * 60 * 1000; // 15 minutes

    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    if (user.failedLoginAttempts >= maxAttempts) {
      user.lockoutExpires = new Date(Date.now() + lockoutDuration);
      return { isLocked: true, attemptsRemaining: 0 };
    }

    return {
      isLocked: false,
      attemptsRemaining: maxAttempts - user.failedLoginAttempts
    };
  }

  // Reset failed login attempts on successful login
  static resetFailedLoginAttempts(user: IEmployee): void {
    user.failedLoginAttempts = 0;
    user.lockoutExpires = undefined;
    user.lastLogin = new Date();
  }

  // Extract token from Authorization header
  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  // Generate user permissions based on role
  static generatePermissionsByRole(role: IEmployee['role']) {
    const permissions = {
      jobs: { create: false, read: false, update: false, delete: false },
      candidates: { create: false, read: false, update: false, delete: false },
      interviews: { create: false, read: false, update: false, delete: false },
      assessments: { create: false, read: false, update: false, delete: false },
      users: { create: false, read: false, update: false, delete: false },
      reports: { read: false },
      settings: { read: false, update: false }
    };

    switch (role) {
      case 'company_admin':
        // Full access to everything
        Object.keys(permissions).forEach(key => {
          if (key === 'reports') {
            permissions[key as keyof typeof permissions].read = true;
          } else if (key === 'settings') {
            permissions[key as keyof typeof permissions] = { read: true, update: true, create: false, delete: false };
          } else {
            permissions[key as keyof typeof permissions] = { create: true, read: true, update: true, delete: true };
          }
        });
        break;

      case 'hr_manager':
        permissions.jobs = { create: true, read: true, update: true, delete: false };
        permissions.candidates = { create: true, read: true, update: true, delete: false };
        permissions.interviews = { create: true, read: true, update: true, delete: false };
        permissions.assessments = { create: true, read: true, update: true, delete: false };
        permissions.users = { create: true, read: true, update: true, delete: false };
        permissions.reports.read = true;
        permissions.settings.read = true;
        break;

      case 'recruiter':
        permissions.jobs = { create: false, read: true, update: true, delete: false };
        permissions.candidates = { create: true, read: true, update: true, delete: false };
        permissions.interviews = { create: true, read: true, update: true, delete: false };
        permissions.assessments = { create: false, read: true, update: false, delete: false };
        permissions.users = { create: false, read: true, update: false, delete: false };
        permissions.reports.read = false;
        break;

      case 'interviewer':
        permissions.candidates = { create: false, read: true, update: false, delete: false };
        permissions.interviews = { create: false, read: true, update: true, delete: false };
        permissions.jobs = { create: false, read: true, update: false, delete: false };
        break;

      case 'hiring_manager':
        permissions.jobs = { create: true, read: true, update: true, delete: false };
        permissions.candidates = { create: false, read: true, update: false, delete: false };
        permissions.interviews = { create: true, read: true, update: true, delete: false };
        permissions.assessments = { create: false, read: true, update: false, delete: false };
        permissions.reports.read = true;
        break;
    }

    return permissions;
  }
}