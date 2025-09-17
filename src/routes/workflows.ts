import { Router } from "express";
import { WorkflowController } from "../controllers/workflowController";
import { AuthMiddleware } from "../middleware/auth";
import { ValidationMiddleware } from "../middleware/validation";
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  cloneWorkflowSchema,
  toggleWorkflowStatusSchema,
  workflowQuerySchema,
  workflowIdSchema
} from "../validators/workflow";

const router = Router();

// Apply authentication and company access control to all routes
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.ensureCompanyAccess);

// Get workflow statistics
router.get(
  "/stats",
  AuthMiddleware.requirePermission("workflows", "read"),
  WorkflowController.getWorkflowStats
);

// Get workflow templates
router.get(
  "/templates",
  AuthMiddleware.requirePermission("workflows", "read"),
  WorkflowController.getWorkflowTemplates
);

// Get all workflows with filtering and pagination
router.get(
  "/",
  AuthMiddleware.requirePermission("workflows", "read"),
  ValidationMiddleware.validate(workflowQuerySchema),
  WorkflowController.getWorkflows
);

// Create new workflow
router.post(
  "/",
  AuthMiddleware.requirePermission("workflows", "create"),
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validate(createWorkflowSchema),
  WorkflowController.createWorkflow
);

// Get workflow by ID
router.get(
  "/:workflowId",
  AuthMiddleware.requirePermission("workflows", "read"),
  ValidationMiddleware.validateObjectId("workflowId"),
  WorkflowController.getWorkflowById
);

// Update workflow
router.put(
  "/:workflowId",
  AuthMiddleware.requirePermission("workflows", "update"),
  ValidationMiddleware.validateObjectId("workflowId"),
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validate(updateWorkflowSchema),
  WorkflowController.updateWorkflow
);

// Delete workflow
router.delete(
  "/:workflowId",
  AuthMiddleware.requirePermission("workflows", "delete"),
  ValidationMiddleware.validateObjectId("workflowId"),
  WorkflowController.deleteWorkflow
);

// Clone workflow
router.post(
  "/:workflowId/clone",
  AuthMiddleware.requirePermission("workflows", "create"),
  ValidationMiddleware.validateObjectId("workflowId"),
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validate(cloneWorkflowSchema),
  WorkflowController.cloneWorkflow
);

// Optimize workflow with AI
router.post(
  "/:workflowId/optimize",
  AuthMiddleware.requirePermission("workflows", "update"),
  ValidationMiddleware.validateObjectId("workflowId"),
  WorkflowController.optimizeWorkflow
);

// Get workflow analytics
router.get(
  "/:workflowId/analytics",
  AuthMiddleware.requirePermission("workflows", "read"),
  ValidationMiddleware.validateObjectId("workflowId"),
  WorkflowController.getWorkflowAnalytics
);

// Toggle workflow status (activate/deactivate)
router.patch(
  "/:workflowId/status",
  AuthMiddleware.requirePermission("workflows", "update"),
  ValidationMiddleware.validateObjectId("workflowId"),
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validate(toggleWorkflowStatusSchema),
  WorkflowController.toggleWorkflowStatus
);

export default router;