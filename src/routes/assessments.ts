import { Router } from 'express';
import { AssessmentController } from '../controllers/assessmentController';
import { AuthMiddleware } from '../middleware/auth';
import { ValidationMiddleware } from '../middleware/validation';

const router = Router();

// Apply authentication and company access control to all routes
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.ensureCompanyAccess);

router.get(
  '/',
  AuthMiddleware.requirePermission('assessments', 'read'),
  ValidationMiddleware.validatePagination,
  AssessmentController.getAssessments
);

router.get(
  '/analytics',
  AuthMiddleware.requirePermission('assessments', 'read'),
  AssessmentController.getAssessmentAnalytics
);

router.get(
  '/templates',
  AuthMiddleware.requirePermission('assessments', 'read'),
  AssessmentController.getAssessmentTemplates
);

router.post(
  '/',
  AuthMiddleware.requirePermission('assessments', 'create'),
  ValidationMiddleware.sanitizeInput,
  AssessmentController.createAssessment
);

router.post(
  '/templates/:templateId',
  AuthMiddleware.requirePermission('assessments', 'create'),
  ValidationMiddleware.validateObjectId('templateId'),
  ValidationMiddleware.sanitizeInput,
  AssessmentController.createFromTemplate
);

router.get(
  '/:assessmentId',
  AuthMiddleware.requirePermission('assessments', 'read'),
  ValidationMiddleware.validateObjectId('assessmentId'),
  AssessmentController.getAssessmentById
);

router.put(
  '/:assessmentId',
  AuthMiddleware.requirePermission('assessments', 'update'),
  ValidationMiddleware.validateObjectId('assessmentId'),
  ValidationMiddleware.sanitizeInput,
  AssessmentController.updateAssessment
);

router.post(
  '/:assessmentId/assign',
  AuthMiddleware.requirePermission('assessments', 'update'),
  ValidationMiddleware.validateObjectId('assessmentId'),
  ValidationMiddleware.sanitizeInput,
  AssessmentController.assignAssessment
);

router.get(
  '/:assessmentId/results',
  AuthMiddleware.requirePermission('assessments', 'read'),
  ValidationMiddleware.validateObjectId('assessmentId'),
  ValidationMiddleware.validatePagination,
  AssessmentController.getAssessmentResults
);

router.get(
  '/:assessmentId/analytics',
  AuthMiddleware.requirePermission('assessments', 'read'),
  ValidationMiddleware.validateObjectId('assessmentId'),
  AssessmentController.getAssessmentAnalytics
);

router.delete(
  '/:assessmentId',
  AuthMiddleware.requirePermission('assessments', 'delete'),
  ValidationMiddleware.validateObjectId('assessmentId'),
  AssessmentController.deleteAssessment
);

export default router;