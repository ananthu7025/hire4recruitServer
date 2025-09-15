import { z } from 'zod';

// Company registration schema
export const registerCompanySchema = z.object({
  body: z.object({
    // Company information
    companyName: z.string()
      .min(2, 'Company name must be at least 2 characters')
      .max(100, 'Company name must be less than 100 characters')
      .trim(),

    domain: z.string()
      .optional()
      .refine((domain) => {
        if (!domain) return true;
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
        return domainRegex.test(domain);
      }, 'Invalid domain format'),

    industry: z.string().optional(),

    size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise'], {
      message: 'Company size is required and must be one of: startup, small, medium, large, enterprise'
    }),

    // Primary contact (admin user)
    adminFirstName: z.string()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must be less than 50 characters')
      .trim(),

    adminLastName: z.string()
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must be less than 50 characters')
      .trim(),

    adminEmail: z.string()
      .email('Invalid email format')
      .toLowerCase()
      .trim(),

    adminPassword: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
      .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
      .regex(/(?=.*\d)/, 'Password must contain at least one number')
      .regex(/(?=.*[@$!%*?&])/, 'Password must contain at least one special character'),

    adminPhone: z.string().optional(),

    // Company address (optional)
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional()
    }).optional(),

    phone: z.string().optional(),
    website: z.string().url().optional()
  })
});

// User login schema
export const loginSchema = z.object({
  body: z.object({
    email: z.string()
      .email('Invalid email format')
      .toLowerCase()
      .trim(),

    password: z.string()
      .min(1, 'Password is required'),

    rememberMe: z.boolean().optional()
  })
});

// Invite user schema
export const inviteUserSchema = z.object({
  body: z.object({
    email: z.string()
      .email('Invalid email format')
      .toLowerCase()
      .trim(),

    firstName: z.string()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must be less than 50 characters')
      .trim(),

    lastName: z.string()
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must be less than 50 characters')
      .trim(),

    role: z.enum(['hr_manager', 'recruiter', 'interviewer', 'hiring_manager'], {
      message: 'User role is required and must be one of: hr_manager, recruiter, interviewer, hiring_manager'
    }),

    department: z.string().optional(),
    jobTitle: z.string().optional(),
    phone: z.string().optional()
  })
});

// Accept invitation schema
export const acceptInviteSchema = z.object({
  body: z.object({
    token: z.string()
      .min(1, 'Invitation token is required'),

    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
      .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
      .regex(/(?=.*\d)/, 'Password must contain at least one number')
      .regex(/(?=.*[@$!%*?&])/, 'Password must contain at least one special character'),

    confirmPassword: z.string()
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  })
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string()
      .email('Invalid email format')
      .toLowerCase()
      .trim()
  })
});

// Reset password schema
export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string()
      .min(1, 'Reset token is required'),

    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
      .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
      .regex(/(?=.*\d)/, 'Password must contain at least one number')
      .regex(/(?=.*[@$!%*?&])/, 'Password must contain at least one special character'),

    confirmPassword: z.string()
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  })
});

// Change password schema
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string()
      .min(1, 'Current password is required'),

    newPassword: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
      .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
      .regex(/(?=.*\d)/, 'Password must contain at least one number')
      .regex(/(?=.*[@$!%*?&])/, 'Password must contain at least one special character'),

    confirmPassword: z.string()
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  }).refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword']
  })
});

// Refresh token schema
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string()
      .min(1, 'Refresh token is required')
  })
});

// Update profile schema
export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must be less than 50 characters')
      .trim()
      .optional(),

    lastName: z.string()
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must be less than 50 characters')
      .trim()
      .optional(),

    phone: z.string().optional(),

    department: z.string().optional(),

    jobTitle: z.string().optional(),

    preferences: z.object({
      timezone: z.string().optional(),
      language: z.string().optional(),
      emailNotifications: z.boolean().optional(),
      pushNotifications: z.boolean().optional()
    }).optional()
  })
});

// Verify email schema
export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string()
      .min(1, 'Verification token is required')
  })
});

// Resend verification email schema
export const resendVerificationSchema = z.object({
  body: z.object({
    email: z.string()
      .email('Invalid email format')
      .toLowerCase()
      .trim()
  })
});