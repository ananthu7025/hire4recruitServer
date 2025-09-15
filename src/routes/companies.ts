import { Router } from "express";
import { CompanyController } from "../controllers/companyController";
import { AuthMiddleware } from "../middleware/auth";
import { ValidationMiddleware } from "../middleware/validation";

const router = Router();

// Apply authentication to all routes
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.ensureCompanyAccess);

router.get("/profile", CompanyController.getCompany);

router.put(
  "/profile",
  AuthMiddleware.requireRole("company_admin"),
  ValidationMiddleware.sanitizeInput,
  CompanyController.updateCompany
);

router.get("/stats", CompanyController.getCompanyStats);

router.get(
  "/users",
  AuthMiddleware.requirePermission("users", "read"),
  ValidationMiddleware.validatePagination,
  CompanyController.getCompanyUsers
);

router.put(
  "/subscription",
  AuthMiddleware.requireRole("company_admin"),
  ValidationMiddleware.sanitizeInput,
  CompanyController.updateSubscription
);

router.get("/subscription/limits", CompanyController.checkSubscriptionLimits);

router.get(
  "/activity",
  AuthMiddleware.requirePermission("reports", "read"),
  CompanyController.getActivitySummary
);

router.post(
  "/deactivate",
  AuthMiddleware.requireRole("company_admin"),
  CompanyController.deactivateCompany
);

router.post(
  "/reactivate",
  AuthMiddleware.requireRole("company_admin"),
  CompanyController.reactivateCompany
);

export default router;
