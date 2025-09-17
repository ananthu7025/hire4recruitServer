import { z } from 'zod';

// Permissions schema
const permissionsSchema = z.object({
  jobs: z.object({
    create: z.boolean(),
    read: z.boolean(),
    update: z.boolean(),
    delete: z.boolean()
  }),
  candidates: z.object({
    create: z.boolean(),
    read: z.boolean(),
    update: z.boolean(),
    delete: z.boolean()
  }),
  interviews: z.object({
    create: z.boolean(),
    read: z.boolean(),
    update: z.boolean(),
    delete: z.boolean()
  }),
  assessments: z.object({
    create: z.boolean(),
    read: z.boolean(),
    update: z.boolean(),
    delete: z.boolean()
  }),
  employees: z.object({
    create: z.boolean(),
    read: z.boolean(),
    update: z.boolean(),
    delete: z.boolean()
  }),
  reports: z.object({
    read: z.boolean()
  }),
  settings: z.object({
    read: z.boolean(),
    update: z.boolean()
  })
});

// Create role schema
export const createRoleSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, 'Role name must be at least 2 characters')
      .max(50, 'Role name must be less than 50 characters')
      .regex(/^[a-zA-Z0-9_\s-]+$/, 'Role name can only contain letters, numbers, spaces, hyphens, and underscores')
      .transform(val => val.toLowerCase().replace(/\s+/g, '_')), // Convert to snake_case
    displayName: z.string()
      .min(2, 'Display name must be at least 2 characters')
      .max(100, 'Display name must be less than 100 characters'),
    description: z.string()
      .max(500, 'Description must be less than 500 characters')
      .optional(),
    color: z.string()
      .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color code (e.g., #FF5722)')
      .optional(),
    permissions: permissionsSchema
  })
});

// Update role schema
export const updateRoleSchema = z.object({
  body: z.object({
    displayName: z.string()
      .min(2, 'Display name must be at least 2 characters')
      .max(100, 'Display name must be less than 100 characters')
      .optional(),
    description: z.string()
      .max(500, 'Description must be less than 500 characters')
      .optional(),
    color: z.string()
      .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color code (e.g., #FF5722)')
      .optional(),
    permissions: permissionsSchema.optional(),
    isActive: z.boolean().optional()
  })
});

// Role ID parameter schema
export const roleIdParamSchema = z.object({
  params: z.object({
    roleId: z.string()
      .min(24, 'Invalid role ID')
      .max(24, 'Invalid role ID')
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid role ID format')
  })
});