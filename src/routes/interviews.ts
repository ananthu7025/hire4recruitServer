import { Router } from "express";
import { InterviewController } from "../controllers/interviewController";
import { AuthMiddleware } from "../middleware/auth";
import { ValidationMiddleware } from "../middleware/validation";

const router = Router();

// Apply authentication and company access control to all routes
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.ensureCompanyAccess);

router.get(
  "/",
  AuthMiddleware.requirePermission("interviews", "read"),
  ValidationMiddleware.validatePagination,
  InterviewController.getInterviews
);

router.post(
  "/",
  AuthMiddleware.requirePermission("interviews", "create"),
  ValidationMiddleware.sanitizeInput,
  InterviewController.scheduleInterview
);

router.get(
  "/:interviewId",
  AuthMiddleware.requirePermission("interviews", "read"),
  ValidationMiddleware.validateObjectId("interviewId"),
  InterviewController.getInterviewById
);

router.put(
  "/:interviewId",
  AuthMiddleware.requirePermission("interviews", "update"),
  ValidationMiddleware.validateObjectId("interviewId"),
  ValidationMiddleware.sanitizeInput,
  InterviewController.updateInterview
);

router.post(
  "/:interviewId/cancel",
  AuthMiddleware.requirePermission("interviews", "update"),
  ValidationMiddleware.validateObjectId("interviewId"),
  ValidationMiddleware.sanitizeInput,
  InterviewController.cancelInterview
);

router.post(
  "/:interviewId/feedback",
  AuthMiddleware.requirePermission("interviews", "update"),
  ValidationMiddleware.validateObjectId("interviewId"),
  ValidationMiddleware.sanitizeInput,
  InterviewController.submitFeedback
);
router.get(
  "/:interviewId/feedback",
  AuthMiddleware.requirePermission("interviews", "read"),
  ValidationMiddleware.validateObjectId("interviewId"),
  InterviewController.getFeedback
);

router.get(
  "/calendar",
  AuthMiddleware.requirePermission("interviews", "read"),
  InterviewController.getCalendarView
);

router.get(
  "/availability",
  AuthMiddleware.requirePermission("interviews", "read"),
  InterviewController.checkAvailability
);

router.get(
  "/analytics",
  AuthMiddleware.requirePermission("interviews", "read"),
  InterviewController.getInterviewAnalytics
);

export default router;
