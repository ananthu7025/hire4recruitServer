import { Router } from "express";
import { EmployeeController } from "../controllers/employeeController";
import { AuthMiddleware } from "../middleware/auth";
import { ValidationMiddleware } from "../middleware/validation";

const router = Router();

// Apply authentication and company access control to all routes
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.ensureCompanyAccess);

router.get(
  "/",
  AuthMiddleware.requirePermission("employees", "read"),
  ValidationMiddleware.validatePagination,
  EmployeeController.getEmployees
);

router.get(
  "/search",
  AuthMiddleware.requirePermission("employees", "read"),
  EmployeeController.searchEmployees
);

router.get(
  "/role/:role",
  AuthMiddleware.requirePermission("employees", "read"),
  EmployeeController.getEmployeesByRole
);

router.get(
  "/:employeeId",
  AuthMiddleware.requirePermission("employees", "read"),
  ValidationMiddleware.validateObjectId("employeeId"),
  EmployeeController.getEmployeeById
);

router.put(
  "/:employeeId",
  ValidationMiddleware.validateObjectId("employeeId"),
  ValidationMiddleware.sanitizeInput,
  (req, res, next) => {
    // Allow users to update their own profile or require permission
    if (req.params.employeeId === req.user?.userId) {
      return next();
    }
    return AuthMiddleware.requirePermission("employees", "update")(req, res, next);
  },
  EmployeeController.updateEmployee
);

router.put(
  "/:employeeId/role",
  AuthMiddleware.requireRole("company_admin", "hr_manager"),
  ValidationMiddleware.validateObjectId("employeeId"),
  ValidationMiddleware.sanitizeInput,
  EmployeeController.updateEmployeeRole
);

router.post(
  "/:employeeId/activate",
  AuthMiddleware.requirePermission("employees", "update"),
  ValidationMiddleware.validateObjectId("employeeId"),
  EmployeeController.activateEmployee
);

router.post(
  "/:employeeId/deactivate",
  AuthMiddleware.requirePermission("employees", "update"),
  ValidationMiddleware.validateObjectId("employeeId"),
  EmployeeController.deactivateEmployee
);

router.delete(
  "/:employeeId",
  AuthMiddleware.requirePermission("employees", "delete"),
  ValidationMiddleware.validateObjectId("employeeId"),
  EmployeeController.deleteEmployee
);

router.get(
  "/:employeeId/activity",
  AuthMiddleware.requirePermission("employees", "read"),
  ValidationMiddleware.validateObjectId("employeeId"),
  EmployeeController.getEmployeeActivity
);

router.get(
  "/:employeeId/permissions",
  ValidationMiddleware.validateObjectId("employeeId"),
  (req, res, next) => {
    // Allow users to view their own permissions or require permission
    if (req.params.employeeId === req.user?.userId) {
      return next();
    }
    return AuthMiddleware.requirePermission("employees", "read")(req, res, next);
  },
  EmployeeController.getEmployeePermissions
);

router.put(
  "/:employeeId/permissions",
  AuthMiddleware.requireRole("company_admin"),
  ValidationMiddleware.validateObjectId("employeeId"),
  ValidationMiddleware.sanitizeInput,
  EmployeeController.updateEmployeePermissions
);

export default router;
