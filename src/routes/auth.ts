import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { AuthMiddleware } from "../middleware/auth";
import { ValidationMiddleware } from "../middleware/validation";
import {
  registerCompanySchema,
  loginSchema,
  inviteEmployeeSchema,
  acceptInviteSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailByUserIdSchema,
} from "../validators/auth";

const router = Router();

// Common middleware combinations
const validate = (schema: any) => [
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validate(schema)
];

const authenticatedRoute = [
  AuthMiddleware.authenticate
];

const adminRoute = [
  AuthMiddleware.authenticate,
  AuthMiddleware.requirePermission("employees", "create")
];

const rateLimitedRoute = [
  AuthMiddleware.authRateLimit
];

// Public authentication routes
router.post("/register-company", validate(registerCompanySchema), AuthController.registerCompany);
router.post("/login", [...validate(loginSchema), ...rateLimitedRoute], AuthController.login);

// Authenticated routes
router.post("/logout", authenticatedRoute, AuthController.logout);
router.get("/profile", authenticatedRoute, AuthController.getProfile);

// Admin routes
router.post("/invite-employee", [...adminRoute, ...validate(inviteEmployeeSchema)], AuthController.inviteEmployee);

// Invitation routes
router.post("/accept-invitation", validate(acceptInviteSchema), AuthController.acceptInvitation);

// Password management routes
router.post("/change-password", [...authenticatedRoute, ...validate(changePasswordSchema)], AuthController.changePassword);

router.post("/forgot-password", [...validate(forgotPasswordSchema), ...rateLimitedRoute], AuthController.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), AuthController.resetPassword);

// Token verification routes
router.get("/verify-token", authenticatedRoute, (req, res) => {
  res.json({
    success: true,
    message: "Token is valid",
    data: {
      user: {
        id: req.user?.userId,
        email: req.user?.email,
        role: req.user?.role,
        companyId: req.user?.companyId,
      },
    },
  });
});

// Email verification routes
router.get("/verify-email/:userId", ValidationMiddleware.validate(verifyEmailByUserIdSchema), AuthController.verifyEmail);

// User permissions route
router.get("/permissions", authenticatedRoute, (req, res) => {
  res.json({
    success: true,
    data: {
      permissions: req.user?.permissions,
      role: req.user?.role,
    },
  });
});

// Subscription and payment routes
router.get("/subscription-plans", AuthController.getSubscriptionPlans);
router.post("/retry-payment", validate(forgotPasswordSchema), AuthController.retryPayment); // Reuse email validation
router.post("/verify-payment", ValidationMiddleware.sanitizeInput, AuthController.verifyPayment);

export default router;
