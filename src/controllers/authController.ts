import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { PaymentService } from '../services/paymentService';
import { logger } from '../config/logger';
import Employee from '../models/Employee';
import Company from '../models/Company';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    companyId: string;
    email: string;
    roleId: string;
    permissions?: {
      jobs: { create: boolean; read: boolean; update: boolean; delete: boolean; };
      candidates: { create: boolean; read: boolean; update: boolean; delete: boolean; };
      interviews: { create: boolean; read: boolean; update: boolean; delete: boolean; };
      assessments: { create: boolean; read: boolean; update: boolean; delete: boolean; };
      employees: { create: boolean; read: boolean; update: boolean; delete: boolean; };
      settings: { read: boolean; update: boolean; };
    };
    userData?: any;
  };
}

export class AuthController {
  private static handleError(res: Response, error: unknown, operation: string, defaultMessage: string) {
    logger.error(`${operation} error:`, error);

    if (error instanceof Error) {
      const { message } = error;

      // Authentication errors
      if (message.includes('Invalid email or password') || message.includes('attempts remaining')) {
        return res.status(401).json({ error: 'Authentication failed', message });
      }

      // Account status errors
      if (message.includes('locked') || message.includes('inactive')) {
        return res.status(423).json({ error: 'Account locked', message });
      }

      // Verification errors
      if (message.includes('Email verification required')) {
        return res.status(403).json({ error: 'Email verification required', message });
      }

      // Payment errors
      if (message.includes('Payment verification required') || message.includes('Subscription is suspended')) {
        return res.status(402).json({ error: 'Payment required', message });
      }

      // Validation errors
      if (message.includes('Password validation') || message.includes('Current password is incorrect')) {
        return res.status(400).json({ error: 'Validation failed', message });
      }

      // Conflict errors
      if (message.includes('already exists')) {
        return res.status(409).json({ error: 'Conflict', message });
      }

      // Not found errors
      if (message.includes('not found') || message.includes('Invalid or expired')) {
        return res.status(404).json({ error: 'Not found', message });
      }
    }

    return res.status(500).json({ error: operation, message: defaultMessage });
  }
  // Register new company
  static async registerCompany(req: Request, res: Response): Promise<void> {
    try {
      const {
        companyName,
        domain,
        industry,
        size,
        subscription,
        adminFirstName,
        adminLastName,
        adminEmail,
        adminPassword,
        adminPhone,
        address,
        phone,
        website
      } = req.body;

      // Calculate pricing and create payment order
      const subscriptionConfig = PaymentService.generateSubscriptionConfig(
        subscription.plan,
        subscription.interval
      );

      const amount = PaymentService.calculatePricing(subscription.plan, subscription.interval);

      let paymentOrder;

        // Create actual Razorpay order
        paymentOrder = await PaymentService.createOrder({
          amount,
          currency: 'INR',
          companyName,
          plan: subscription.plan,
          interval: subscription.interval
        });

      const result = await AuthService.registerCompany({
        companyName,
        domain,
        industry,
        size,
        subscription: {
          ...subscriptionConfig,
          paymentInfo: {
            razorpayOrderId: paymentOrder.id,
            nextPaymentDate: subscriptionConfig.paymentInfo.nextPaymentDate
          }
        },
        adminFirstName,
        adminLastName,
        adminEmail,
        adminPassword,
        adminPhone,
        address,
        phone,
        website
      });

      res.status(201).json({
        success: true,
        message: 'Company registration initiated. Please complete the payment to activate your account.',
        data: {
          company: {
            id: result.company._id,
            name: result.company.name,
            domain: result.company.domain,
            industry: result.company.industry,
            size: result.company.size,
            subscription: {
              plan: result.company.subscription.plan,
              status: result.company.subscription.status,
              pricing: result.company.subscription.pricing
            }
          },
          adminUser: {
            id: result.user._id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            roleId: result.user.roleId,
            employeeId: result.user.employeeId
          },
          payment: {
            orderId: paymentOrder.id,
            amount: paymentOrder.amount,
            currency: paymentOrder.currency,
            key: process.env.RAZORPAY_KEY_ID
          },
          subscriptionPlan: PaymentService.getSubscriptionPlan(subscription.plan)
        }
      });

    } catch (error) {
      AuthController.handleError(res, error, 'Registration failed', 'An error occurred during company registration');
    }
  }

  // User login
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      const result = await AuthService.login(email, password);


      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          company: result.company,
          token: result.token,
          expiresIn: '7d'
        }
      });

    } catch (error) {
      AuthController.handleError(res, error, 'Login failed', 'An error occurred during login');
    }
  }


  // Logout user
  static async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user?.userId) {
        await AuthService.logout(req.user.userId);
      }


      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      AuthController.handleError(res, error, 'Logout failed', 'An error occurred during logout');
    }
  }

  // Get current user profile
  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: req.user.userId,
            email: req.user.email,
            firstName: req.user.userData?.firstName,
            lastName: req.user.userData?.lastName,
            roleId: req.user.roleId,
            department: req.user.userData?.department,
            jobTitle: req.user.userData?.jobTitle,
            phone: req.user.userData?.phone,
            isEmailVerified: req.user.userData?.isEmailVerified,
            preferences: req.user.userData?.preferences,
            permissions: req.user.permissions,
            lastLogin: req.user.userData?.lastLogin
          },
          company: {
            id: req.user.companyId?.toString(),
          }
        }
      });

    } catch (error) {
      AuthController.handleError(res, error, 'Failed to get profile', 'An error occurred while fetching user profile');
    }
  }

  // Invite employee to company
  static async inviteEmployee(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { email, firstName, lastName, roleId, department, jobTitle, phone } = req.body;

      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const invitedEmployee = await AuthService.inviteUser({
        email,
        firstName,
        lastName,
        roleId,
        department,
        jobTitle,
        phone,
        invitedBy: req.user.userId,
        companyId: req.user.companyId
      });

      res.status(201).json({
        success: true,
        message: 'Employee invitation sent successfully',
        data: {
          invitedEmployee: {
            id: invitedEmployee._id,
            email: invitedEmployee.email,
            firstName: invitedEmployee.firstName,
            lastName: invitedEmployee.lastName,
            roleId: invitedEmployee.roleId,
            department: invitedEmployee.department,
            jobTitle: invitedEmployee.jobTitle,
            employeeId: invitedEmployee.employeeId, // This is now auto-generated
            invitedAt: invitedEmployee.invitedAt,
            invitedBy: invitedEmployee.invitedBy
          }
        }
      });

    } catch (error) {
      AuthController.handleError(res, error, 'Employee invitation failed', 'An error occurred while sending the employee invitation');
    }
  }

  // Accept invitation
  static async acceptInvitation(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;

      const result = await AuthService.acceptInvitation(token, password);


      res.status(200).json({
        success: true,
        message: 'Invitation accepted successfully',
        data: {
          user: result.user,
          company: result.company,
          token: result.token,
          expiresIn: '7d'
        }
      });

    } catch (error) {
      AuthController.handleError(res, error, 'Invitation acceptance failed', 'An error occurred while accepting the invitation');
    }
  }

  // Change password
  static async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      await AuthService.changePassword(req.user.userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      AuthController.handleError(res, error, 'Password change failed', 'An error occurred while changing the password');
    }
  }

  // Forgot password
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      await AuthService.generatePasswordResetToken(email);

      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });

    } catch (error) {
      AuthController.handleError(res, error, 'Password reset failed', 'An error occurred while processing the password reset request');
    }
  }

  // Reset password
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;

      await AuthService.resetPassword(token, password);

      res.status(200).json({
        success: true,
        message: 'Password reset successful'
      });

    } catch (error) {
      AuthController.handleError(res, error, 'Password reset failed', 'An error occurred while resetting the password');
    }
  }

  // Get subscription plans
  static async getSubscriptionPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = PaymentService.getAllPlans();

      res.status(200).json({
        success: true,
        data: {
          plans
        }
      });

    } catch (error) {
      AuthController.handleError(res, error, 'Failed to retrieve plans', 'An error occurred while fetching subscription plans');
    }
  }

  // Verify payment and activate subscription
static async verifyPayment(req: Request, res: Response): Promise<void> {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    logger.info('Starting payment verification process', { razorpayOrderId });

    // Find company by Razorpay order ID instead of relying on frontend-provided companyId
    const company = await Company.findOne({
      'subscription.paymentInfo.razorpayOrderId': razorpayOrderId
    });

    if (!company) {
      logger.error('Company not found for order ID', { razorpayOrderId });
      res.status(404).json({
        error: 'Company not found',
        message: 'No company found for this payment order'
      });
      return;
    }

    const companyId = company._id.toString();
    logger.info('Found company for payment verification', { companyId, companyName: company.name });

    // Verify payment signature
    const isSignatureValid = PaymentService.verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    });

    if (!isSignatureValid) {
      logger.error('Invalid payment signature', { razorpayOrderId, companyId });
      res.status(400).json({
        error: 'Payment verification failed',
        message: 'Invalid payment signature'
      });
      return;
    }

    const paymentDetails = await PaymentService.getPaymentDetails(razorpayPaymentId);

    if (paymentDetails.status !== 'captured') {
      logger.error('Payment not captured', { status: paymentDetails.status, razorpayOrderId, companyId });
      res.status(400).json({
        error: 'Payment not completed',
        message: 'Payment was not successfully captured'
      });
      return;
    }

    logger.info('Payment verified successfully, activating subscription', { companyId });

    const result = await AuthService.activateSubscription(companyId, {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentDetails
    });

    logger.info('Subscription activated successfully', { companyId: result.company._id });

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully. Your subscription is now active!',
      data: {
        company: {
          id: result.company._id,
          name: result.company.name,
          subscription: {
            plan: result.company.subscription.plan,
            status: result.company.subscription.status,
            pricing: result.company.subscription.pricing,
            features: result.company.subscription.features
          }
        },
        token: result.token,
        expiresIn: '7d'
      }
    });

  } catch (error) {
    AuthController.handleError(res, error, 'Payment verification failed', 'An error occurred while verifying the payment');
  }
}


  // Retry payment for pending subscriptions
  static async retryPayment(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      // Find user with pending payment
      const user = await Employee.findOne({ email, isDeleted: false })
        .populate('companyId');

      if (!user) {
        res.status(404).json({
          error: 'User not found',
          message: 'No account found with this email address'
        });
        return;
      }

      const company = user.companyId as any;
      if (!company) {
        res.status(404).json({
          error: 'Company not found',
          message: 'No company associated with this account'
        });
        return;
      }

      // Check if payment is actually pending
      if (company.subscription.status !== 'pending_payment') {
        res.status(400).json({
          error: 'Payment not required',
          message: 'Payment has already been completed or subscription is not pending'
        });
        return;
      }

      // Create new payment order
      const amount = PaymentService.calculatePricing(
        company.subscription.plan,
        company.subscription.pricing.interval
      );

      const paymentOrder = await PaymentService.createOrder({
        amount,
        currency: 'INR',
        companyName: company.name,
        plan: company.subscription.plan,
        interval: company.subscription.pricing.interval
      });

      // Update company with new order ID
      await Company.findByIdAndUpdate(company._id, {
        'subscription.paymentInfo.razorpayOrderId': paymentOrder.id
      });

      res.status(200).json({
        success: true,
        message: 'New payment order created successfully',
        data: {
          company: {
            id: company._id,
            name: company.name,
            subscription: {
              plan: company.subscription.plan,
              pricing: company.subscription.pricing
            }
          },
          payment: {
            orderId: paymentOrder.id,
            amount: paymentOrder.amount,
            currency: paymentOrder.currency,
            key: process.env.RAZORPAY_KEY_ID
          },
          subscriptionPlan: PaymentService.getSubscriptionPlan(company.subscription.plan)
        }
      });

    } catch (error) {
      AuthController.handleError(res, error, 'Retry payment failed', 'An error occurred while creating the payment order');
    }
  }

  // Verify email address
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'User ID is required'
        });
        return;
      }

      await AuthService.verifyEmail(userId);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully'
      });

    } catch (error) {
      AuthController.handleError(res, error, 'Email verification failed', 'An error occurred while verifying the email');
    }
  }
}