import { z } from 'zod';

// Common validation schemas
const emailSchema = z.string()
  .email('Please enter a valid email address')
  .toLowerCase()
  .trim();

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
  .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
  .regex(/(?=.*\d)/, 'Password must contain at least one number')
  .regex(/(?=.*[@$!%*?&])/, 'Password must contain at least one special character (@$!%*?&)');

const nameSchema = (fieldName: string, min = 2, max = 50) =>
  z.string()
    .min(min, `${fieldName} must be at least ${min} characters long`)
    .max(max, `${fieldName} must be less than ${max} characters long`)
    .trim()
    .regex(/^[a-zA-Z\s'-]+$/, `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`);

const phoneSchema = z.string()
  .optional()
  .refine((phone) => {
    if (!phone) return true;
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
  }, 'Please enter a valid phone number');

const companyDomainSchema = z.string()
  .optional()
  .refine((domain) => {
    if (!domain) return true;
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    return domainRegex.test(domain);
  }, 'Please enter a valid domain name (e.g., company.com)');

const urlSchema = z.string()
  .url('Please enter a valid URL (e.g., https://example.com)')
  .optional();

// Company registration schema
export const registerCompanySchema = z.object({
  body: z.object({
    // Company information
    companyName: z.string()
      .min(2, 'Company name must be at least 2 characters long')
      .max(100, 'Company name must be less than 100 characters long')
      .trim()
      .regex(/^[a-zA-Z0-9\s&.,'-]+$/, 'Company name contains invalid characters'),

    domain: companyDomainSchema,
    industry: z.string().optional(),

    size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise'], {
      message: 'Please select a valid company size: startup, small, medium, large, or enterprise'
    }),

    // Subscription details
    subscription: z.object({
      plan: z.enum(['basic', 'professional', 'enterprise'], {
        message: 'Please select a valid subscription plan: basic, professional, or enterprise'
      }),
      interval: z.enum(['monthly', 'annual'], {
        message: 'Please select a valid billing interval: monthly or annual'
      })
    }),

    // Primary contact (admin user)
    adminFirstName: nameSchema('First name'),
    adminLastName: nameSchema('Last name'),
    adminEmail: emailSchema,
    adminPassword: passwordSchema,
    adminPhone: phoneSchema,

    // Company address (optional)
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional()
    }).optional(),

    phone: phoneSchema,
    website: urlSchema
  })
});

// User login schema
export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional()
  })
});

// Invite employee schema
export const inviteEmployeeSchema = z.object({
  body: z.object({
    email: emailSchema,
    firstName: nameSchema('First name'),
    lastName: nameSchema('Last name'),
    roleId: z.string()
      .min(24, 'Invalid role ID')
      .max(24, 'Invalid role ID')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid role ID format'),
    department: z.string().max(100, 'Department name is too long').optional(),
    jobTitle: z.string().max(100, 'Job title is too long').optional(),
    phone: phoneSchema,
    employeeId: z.string().max(50, 'Employee ID is too long').optional(),
    expertise: z.array(z.string().trim().max(100, 'Expertise item is too long')).max(20, 'Maximum 20 expertise items allowed').optional(),
    bio: z.string().max(1000, 'Bio must be less than 1000 characters').optional()
  })
});

// Accept invitation schema
export const acceptInviteSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Invitation token is required'),
    password: passwordSchema,
    confirmPassword: z.string()
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Password confirmation does not match',
    path: ['confirmPassword']
  })
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema
  })
});

// Reset password schema
export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z.string()
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Password confirmation does not match',
    path: ['confirmPassword']
  })
});

// Change password schema
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string()
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password confirmation does not match',
    path: ['confirmPassword']
  }).refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from your current password',
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
    firstName: nameSchema('First name').optional(),
    lastName: nameSchema('Last name').optional(),
    phone: phoneSchema,
    department: z.string().max(100, 'Department name is too long').optional(),
    jobTitle: z.string().max(100, 'Job title is too long').optional(),
    expertise: z.array(z.string().trim().max(100, 'Expertise item is too long')).max(20, 'Maximum 20 expertise items allowed').optional(),
    bio: z.string().max(1000, 'Bio must be less than 1000 characters').optional(),
    preferences: z.object({
      timezone: z.string().optional(),
      language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid language format').optional(),
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
    email: emailSchema
  })
});

// Verify email by userId schema
export const verifyEmailByUserIdSchema = z.object({
  params: z.object({
    userId: z.string()
      .min(1, 'User ID is required')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
  })
});