import { z } from 'zod';

// Stage action schema
const stageActionSchema = z.object({
  type: z.enum(['send_email', 'schedule_interview', 'assign_assessment', 'verify_assessment', 'add_calendar_event', 'generate_offer_letter']),
  config: z.any(),
  trigger: z.enum(['on_enter', 'on_exit', 'manual']),
  aiEnhanced: z.object({
    personalizeContent: z.boolean().default(false),
    optimizeTiming: z.boolean().default(false),
    adaptToCandidate: z.boolean().default(false)
  }).optional()
});

// Stage requirement schema
const stageRequirementSchema = z.object({
  type: z.enum(['interview_complete', 'assessment_passed', 'manual_approval', 'ai_screening_passed']),
  config: z.any().optional()
});

// Stage AI intelligence schema
const stageAIIntelligenceSchema = z.object({
  automatedScreening: z.object({
    enabled: z.boolean().default(false),
    criteria: z.object({
      skillRequirements: z.array(z.string()).optional(),
      experienceLevel: z.enum(['entry', 'mid', 'senior', 'executive']).optional(),
      cultureFitIndicators: z.array(z.string()).optional(),
      minimumScore: z.number().min(0).max(100).default(70)
    }).optional(),
    aiModel: z.enum(['gemini-pro', 'custom']).default('gemini-pro')
  }).optional()
}).optional();

// Stage schema
const stageSchema = z.object({
  name: z.string()
    .min(1, 'Stage name is required')
    .max(100, 'Stage name cannot exceed 100 characters')
    .trim(),
  type: z.enum(['screening', 'interview', 'assessment', 'review', 'offer', 'custom']),
  order: z.number()
    .int('Stage order must be an integer')
    .min(1, 'Stage order must be at least 1'),
  isRequired: z.boolean().default(true),
  estimatedDuration: z.number()
    .int('Estimated duration must be an integer')
    .min(1, 'Estimated duration must be at least 1 day')
    .max(365, 'Estimated duration cannot exceed 365 days')
    .optional(),
  autoAdvance: z.boolean().default(false),
  actions: z.array(stageActionSchema).optional(),
  requirements: z.array(stageRequirementSchema).optional(),
  aiIntelligence: stageAIIntelligenceSchema
});

// Create workflow validation schema
export const createWorkflowSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Workflow name is required')
      .max(100, 'Workflow name cannot exceed 100 characters')
      .trim(),
    description: z.string()
      .max(500, 'Description cannot exceed 500 characters')
      .trim()
      .optional(),
    isTemplate: z.boolean().default(false),
    stages: z.array(stageSchema)
      .min(1, 'At least one stage is required')
  })
});

// Update workflow validation schema
export const updateWorkflowSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Workflow name cannot be empty')
      .max(100, 'Workflow name cannot exceed 100 characters')
      .trim()
      .optional(),
    description: z.string()
      .max(500, 'Description cannot exceed 500 characters')
      .trim()
      .optional(),
    isTemplate: z.boolean().optional(),
    isActive: z.boolean().optional(),
    stages: z.array(stageSchema)
      .min(1, 'At least one stage is required')
      .optional()
  })
});

// Clone workflow validation schema
export const cloneWorkflowSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Workflow name cannot be empty')
      .max(100, 'Workflow name cannot exceed 100 characters')
      .trim()
      .optional()
  })
});

// Toggle workflow status validation schema
export const toggleWorkflowStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean()
  })
});

// Workflow query validation schema
export const workflowQuerySchema = z.object({
  query: z.object({
    page: z.string()
      .optional()
      .default('1')
      .transform(val => parseInt(val, 10))
      .refine(val => val >= 1, 'Page must be at least 1'),
    limit: z.string()
      .optional()
      .default('10')
      .transform(val => parseInt(val, 10))
      .refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
    isTemplate: z.string()
      .transform(val => val === 'true')
      .optional(),
    isActive: z.string()
      .transform(val => val === 'true')
      .optional(),
    search: z.string()
      .min(1, 'Search term must be at least 1 character long')
      .max(100, 'Search term cannot exceed 100 characters')
      .trim()
      .optional()
  })
});

// Workflow ID parameter validation
export const workflowIdSchema = z.object({
  params: z.object({
    workflowId: z.string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid workflow ID format')
  })
});