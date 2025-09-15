import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { AuthMiddleware } from "../middleware/auth";
import { ValidationMiddleware } from "../middleware/validation";
import {
  registerCompanySchema,
  loginSchema,
  inviteUserSchema,
  acceptInviteSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../validators/auth";

const router = Router();

router.post(
  "/register-company",
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validate(registerCompanySchema),
  AuthController.registerCompany
);

router.post(
  "/login",
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validate(loginSchema),
  AuthMiddleware.authRateLimit,
  AuthController.login
);

router.post("/logout", AuthMiddleware.authenticate, AuthController.logout);

router.get("/profile", AuthMiddleware.authenticate, AuthController.getProfile);

router.post(
  "/invite-user",
  AuthMiddleware.authenticate,
  AuthMiddleware.requirePermission("users", "create"),
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validate(inviteUserSchema),
  AuthController.inviteUser
);

router.post(
  "/accept-invitation",
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validate(acceptInviteSchema),
  AuthController.acceptInvitation
);

router.post(
  "/change-password",
  AuthMiddleware.authenticate,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validate(changePasswordSchema),
  AuthController.changePassword
);

router.post(
  "/forgot-password",
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validate(forgotPasswordSchema),
  AuthMiddleware.authRateLimit,
  AuthController.forgotPassword
);

router.post(
  "/reset-password",
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validate(resetPasswordSchema),
  AuthController.resetPassword
);

router.get("/verify-token", AuthMiddleware.authenticate, (req, res) => {
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

router.get("/permissions", AuthMiddleware.authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      permissions: req.user?.permissions,
      role: req.user?.role,
    },
  });
});

export default router;
