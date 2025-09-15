import { Router } from "express";
import { UserController } from "../controllers/userController";
import { AuthMiddleware } from "../middleware/auth";
import { ValidationMiddleware } from "../middleware/validation";

const router = Router();

// Apply authentication and company access control to all routes
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.ensureCompanyAccess);

router.get(
  "/",
  AuthMiddleware.requirePermission("users", "read"),
  ValidationMiddleware.validatePagination,
  UserController.getUsers
);

router.get(
  "/search",
  AuthMiddleware.requirePermission("users", "read"),
  UserController.searchUsers
);

router.get(
  "/role/:role",
  AuthMiddleware.requirePermission("users", "read"),
  UserController.getUsersByRole
);

router.get(
  "/:userId",
  AuthMiddleware.requirePermission("users", "read"),
  ValidationMiddleware.validateObjectId("userId"),
  UserController.getUserById
);

router.put(
  "/:userId",
  ValidationMiddleware.validateObjectId("userId"),
  ValidationMiddleware.sanitizeInput,
  (req, res, next) => {
    // Allow users to update their own profile or require permission
    if (req.params.userId === req.user?.userId) {
      return next();
    }
    return AuthMiddleware.requirePermission("users", "update")(req, res, next);
  },
  UserController.updateUser
);

router.put(
  "/:userId/role",
  AuthMiddleware.requireRole("company_admin", "hr_manager"),
  ValidationMiddleware.validateObjectId("userId"),
  ValidationMiddleware.sanitizeInput,
  UserController.updateUserRole
);

router.post(
  "/:userId/activate",
  AuthMiddleware.requirePermission("users", "update"),
  ValidationMiddleware.validateObjectId("userId"),
  UserController.activateUser
);

router.post(
  "/:userId/deactivate",
  AuthMiddleware.requirePermission("users", "update"),
  ValidationMiddleware.validateObjectId("userId"),
  UserController.deactivateUser
);

router.delete(
  "/:userId",
  AuthMiddleware.requirePermission("users", "delete"),
  ValidationMiddleware.validateObjectId("userId"),
  UserController.deleteUser
);

router.get(
  "/:userId/activity",
  AuthMiddleware.requirePermission("users", "read"),
  ValidationMiddleware.validateObjectId("userId"),
  UserController.getUserActivity
);

router.get(
  "/:userId/permissions",
  ValidationMiddleware.validateObjectId("userId"),
  (req, res, next) => {
    // Allow users to view their own permissions or require permission
    if (req.params.userId === req.user?.userId) {
      return next();
    }
    return AuthMiddleware.requirePermission("users", "read")(req, res, next);
  },
  UserController.getUserPermissions
);

router.put(
  "/:userId/permissions",
  AuthMiddleware.requireRole("company_admin"),
  ValidationMiddleware.validateObjectId("userId"),
  ValidationMiddleware.sanitizeInput,
  UserController.updateUserPermissions
);

export default router;
