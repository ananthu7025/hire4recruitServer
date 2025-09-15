import { z } from 'zod';

// Create job schema
export const createJobSchema = z.object({
  body: z.object({
    title: z.string()
      .min(3, 'Job title must be at least 3 characters')
      .max(200, 'Job title must be less than 200 characters')
      .trim(),

    department: z.string()
      .min(2, 'Department must be at least 2 characters')
      .trim(),

    location: z.string()
      .min(2, 'Location must be at least 2 characters')
      .trim(),

    country: z.string()
      .min(2, 'Country must be at least 2 characters')
      .trim(),

    state: z.string()
      .min(2, 'State must be at least 2 characters')
      .trim(),

    city: z.string()
      .min(2, 'City must be at least 2 characters')
      .trim(),

    salary: z.object({
      min: z.number().min(0, 'Minimum salary must be non-negative'),
      max: z.number().min(0, 'Maximum salary must be non-negative'),
      currency: z.string().length(3, 'Currency must be 3 characters (e.g., USD)'),
      payRate: z.enum(['hourly', 'daily', 'annual'])
    }).refine((data) => data.max >= data.min, {
      message: 'Maximum salary must be greater than or equal to minimum salary',
      path: ['max']
    }),

    type: z.enum(['fulltime', 'parttime', 'contract', 'internship']),

    hiringManager: z.string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid hiring manager ID'),

    targetClosingDate: z.string()
      .transform((str) => new Date(str))
      .optional(),

    clientName: z.string().optional(),

    accountManager: z.string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid account manager ID')
      .optional(),

    contactPerson: z.string().optional(),

    workMode: z.enum(['remote', 'hybrid', 'onsite']),

    workExperience: z.string()
      .min(1, 'Work experience requirement is required'),

    educationRequirement: z.string().optional(),

    skillsRequired: z.array(z.string().min(1, 'Skill cannot be empty'))
      .min(1, 'At least one skill is required'),

    preferredSkills: z.array(z.string().min(1, 'Skill cannot be empty')).optional(),

    benefits: z.string().optional(),

    employmentType: z.string().optional(),

    workflowId: z.string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid workflow ID'),

    jobSummary: z.string().optional(),

    jobDescription: z.string().optional(),

    requirements: z.string().optional(),

    expectedRevenue: z.number().min(0, 'Expected revenue must be non-negative').optional(),

    probabilityOfClosure: z.string().optional(),

    numberOfOpenings: z.number()
      .int('Number of openings must be an integer')
      .min(1, 'At least one opening is required')
      .optional(),

    notes: z.string().optional(),

    tags: z.string().optional(),

    customFields: z.array(z.object({
      fieldName: z.string().min(1, 'Field name is required'),
      fieldType: z.enum(['text', 'number', 'date', 'select', 'multiselect']),
      fieldValue: z.any(),
      isRequired: z.boolean()
    })).optional(),

    templateUsed: z.string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid template ID')
      .optional(),

    generateWithAI: z.boolean().optional()
  })
});

// Update job schema (all fields optional except what's required for update)
export const updateJobSchema = z.object({
  body: z.object({
    title: z.string()
      .min(3, 'Job title must be at least 3 characters')
      .max(200, 'Job title must be less than 200 characters')
      .trim()
      .optional(),

    department: z.string()
      .min(2, 'Department must be at least 2 characters')
      .trim()
      .optional(),

    location: z.string()
      .min(2, 'Location must be at least 2 characters')
      .trim()
      .optional(),

    country: z.string()
      .min(2, 'Country must be at least 2 characters')
      .trim()
      .optional(),

    state: z.string()
      .min(2, 'State must be at least 2 characters')
      .trim()
      .optional(),

    city: z.string()
      .min(2, 'City must be at least 2 characters')
      .trim()
      .optional(),

    salary: z.object({
      min: z.number().min(0, 'Minimum salary must be non-negative'),
      max: z.number().min(0, 'Maximum salary must be non-negative'),
      currency: z.string().length(3, 'Currency must be 3 characters (e.g., USD)'),
      payRate: z.enum(['hourly', 'daily', 'annual'])
    }).refine((data) => data.max >= data.min, {
      message: 'Maximum salary must be greater than or equal to minimum salary',
      path: ['max']
    }).optional(),

    type: z.enum(['fulltime', 'parttime', 'contract', 'internship']).optional(),

    status: z.enum(['active', 'draft', 'closed', 'onhold']).optional(),

    hiringManager: z.string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid hiring manager ID')
      .optional(),

    targetClosingDate: z.string()
      .transform((str) => new Date(str))
      .optional(),

    clientName: z.string().optional(),

    accountManager: z.string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid account manager ID')
      .optional(),

    contactPerson: z.string().optional(),

    workMode: z.enum(['remote', 'hybrid', 'onsite']).optional(),

    workExperience: z.string()
      .min(1, 'Work experience requirement is required')
      .optional(),

    educationRequirement: z.string().optional(),

    skillsRequired: z.array(z.string().min(1, 'Skill cannot be empty'))
      .min(1, 'At least one skill is required')
      .optional(),

    preferredSkills: z.array(z.string().min(1, 'Skill cannot be empty')).optional(),

    benefits: z.string().optional(),

    employmentType: z.string().optional(),

    workflowId: z.string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid workflow ID')
      .optional(),

    jobSummary: z.string().optional(),

    jobDescription: z.string().optional(),

    requirements: z.string().optional(),

    expectedRevenue: z.number().min(0, 'Expected revenue must be non-negative').optional(),

    probabilityOfClosure: z.string().optional(),

    numberOfOpenings: z.number()
      .int('Number of openings must be an integer')
      .min(1, 'At least one opening is required')
      .optional(),

    notes: z.string().optional(),

    tags: z.string().optional(),

    customFields: z.array(z.object({
      fieldName: z.string().min(1, 'Field name is required'),
      fieldType: z.enum(['text', 'number', 'date', 'select', 'multiselect']),
      fieldValue: z.any(),
      isRequired: z.boolean()
    })).optional()
  })
});

// Job query filters schema
export const jobQuerySchema = z.object({
  query: z.object({
    page: z.string()
      .transform(val => parseInt(val))
      .refine(val => !isNaN(val) && val > 0, 'Page must be a positive number')
      .optional(),

    limit: z.string()
      .transform(val => parseInt(val))
      .refine(val => !isNaN(val) && val > 0 && val <= 100, 'Limit must be between 1 and 100')
      .optional(),

    status: z.enum(['active', 'draft', 'closed', 'onhold']).optional(),

    department: z.string().optional(),

    type: z.enum(['fulltime', 'parttime', 'contract', 'internship']).optional(),

    workMode: z.enum(['remote', 'hybrid', 'onsite']).optional(),

    hiringManager: z.string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid hiring manager ID')
      .optional(),

    search: z.string().optional(),

    sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'department', 'status', 'dateOpened', 'applicationCount'])
      .optional(),

    sortOrder: z.enum(['asc', 'desc']).optional()
  })
});

// Search jobs by skills schema
export const searchJobsBySkillsSchema = z.object({
  query: z.object({
    skills: z.string()
      .min(1, 'Skills parameter is required')
      .refine(val => val.split(',').every(skill => skill.trim().length > 0), 'All skills must be non-empty'),

    limit: z.string()
      .transform(val => parseInt(val))
      .refine(val => !isNaN(val) && val > 0 && val <= 100, 'Limit must be between 1 and 100')
      .optional()
  })
});