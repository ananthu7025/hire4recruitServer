import { Router } from "express";
import { JobController } from "../controllers/jobController";
import { AuthMiddleware } from "../middleware/auth";
import { ValidationMiddleware } from "../middleware/validation";
import { SwaggerHelpers } from "../utils/swagger-helpers";
import {
  createJobSchema,
  updateJobSchema,
  jobQuerySchema,
  searchJobsBySkillsSchema,
} from "../validators/job";

const router = Router();

// Apply authentication and company access control to all routes
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.ensureCompanyAccess);

router.get(
  "/search/skills",
  AuthMiddleware.requirePermission("jobs", "read"),
  ValidationMiddleware.validate(searchJobsBySkillsSchema),
  JobController.searchJobsBySkills
);

router.get(
  "/stats",
  AuthMiddleware.requirePermission("jobs", "read"),
  JobController.getCompanyJobStats
);
router.get(
  "/",
  SwaggerHelpers.getAll("Jobs"),
  AuthMiddleware.requirePermission("jobs", "read"),
  ValidationMiddleware.validate(jobQuerySchema),
  JobController.getJobs
);

router.post(
  "/",
  SwaggerHelpers.create("Job"),
  AuthMiddleware.requirePermission("jobs", "create"),
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validate(createJobSchema),
  JobController.createJob
);

router.get(
  "/:jobId",
  AuthMiddleware.requirePermission("jobs", "read"),
  ValidationMiddleware.validateObjectId("jobId"),
  JobController.getJobById
);

router.put(
  "/:jobId",
  AuthMiddleware.requirePermission("jobs", "update"),
  ValidationMiddleware.validateObjectId("jobId"),
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validate(updateJobSchema),
  JobController.updateJob
);

router.delete(
  "/:jobId",
  AuthMiddleware.requirePermission("jobs", "delete"),
  ValidationMiddleware.validateObjectId("jobId"),
  JobController.deleteJob
);

router.post(
  "/:jobId/publish",
  AuthMiddleware.requirePermission("jobs", "update"),
  ValidationMiddleware.validateObjectId("jobId"),
  JobController.publishJob
);

router.post(
  "/:jobId/clone",
  AuthMiddleware.requirePermission("jobs", "create"),
  ValidationMiddleware.validateObjectId("jobId"),
  JobController.cloneJob
);

router.get(
  "/:jobId/analytics",
  AuthMiddleware.requirePermission("jobs", "read"),
  ValidationMiddleware.validateObjectId("jobId"),
  JobController.getJobAnalytics
);

router.get(
  "/:jobId/applications",
  AuthMiddleware.requirePermission("jobs", "read"),
  ValidationMiddleware.validateObjectId("jobId"),
  ValidationMiddleware.validatePagination,
  JobController.getJobApplications
);

export default router;
