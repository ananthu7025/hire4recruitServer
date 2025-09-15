import { Router } from "express";
import { CandidateController } from "../controllers/candidateController";
import { AuthMiddleware } from "../middleware/auth";
import { ValidationMiddleware } from "../middleware/validation";
import { FileUploadMiddleware } from "../middleware/fileUpload";

const router = Router();

// Apply authentication and company access control to all routes
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.ensureCompanyAccess);

router.get(
  "/",
  AuthMiddleware.requirePermission("candidates", "read"),
  ValidationMiddleware.validatePagination,
  CandidateController.getCandidates
);

router.get(
  "/talent-pool",
  AuthMiddleware.requirePermission("candidates", "read"),
  ValidationMiddleware.validatePagination,
  CandidateController.getTalentPool
);

router.post(
  "/search",
  AuthMiddleware.requirePermission("candidates", "read"),
  ValidationMiddleware.sanitizeInput,
  CandidateController.searchCandidates
);

router.post(
  "/",
  AuthMiddleware.requirePermission("candidates", "create"),
  FileUploadMiddleware.resume(),
  ValidationMiddleware.sanitizeInput,
  CandidateController.createCandidate
);

router.get(
  "/:candidateId",
  AuthMiddleware.requirePermission("candidates", "read"),
  ValidationMiddleware.validateObjectId("candidateId"),
  CandidateController.getCandidateById
);

router.put(
  "/:candidateId",
  AuthMiddleware.requirePermission("candidates", "update"),
  ValidationMiddleware.validateObjectId("candidateId"),
  ValidationMiddleware.sanitizeInput,
  CandidateController.updateCandidate
);

router.put(
  "/:candidateId/status",
  AuthMiddleware.requirePermission("candidates", "update"),
  ValidationMiddleware.validateObjectId("candidateId"),
  ValidationMiddleware.sanitizeInput,
  CandidateController.updateCandidateStatus
);

router.post(
  "/:candidateId/resume",
  AuthMiddleware.requirePermission("candidates", "update"),
  ValidationMiddleware.validateObjectId("candidateId"),
  FileUploadMiddleware.resume(),
  CandidateController.uploadResume
);

router.delete(
  "/:candidateId",
  AuthMiddleware.requirePermission("candidates", "delete"),
  ValidationMiddleware.validateObjectId("candidateId"),
  CandidateController.deleteCandidate
);

router.get(
  "/:candidateId/summary",
  AuthMiddleware.requirePermission("candidates", "read"),
  ValidationMiddleware.validateObjectId("candidateId"),
  CandidateController.getCandidateSummary
);

router.get(
  "/:candidateId/applications",
  AuthMiddleware.requirePermission("candidates", "read"),
  ValidationMiddleware.validateObjectId("candidateId"),
  ValidationMiddleware.validatePagination,
  CandidateController.getCandidateApplications
);

router.put(
  "/:candidateId/applications/:applicationId",
  AuthMiddleware.requirePermission("candidates", "update"),
  ValidationMiddleware.validateObjectId("candidateId"),
  ValidationMiddleware.validateObjectId("applicationId"),
  ValidationMiddleware.sanitizeInput,
  CandidateController.updateCandidateApplication
);

export default router;
