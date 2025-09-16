import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { PaymentService } from '../services/paymentService';
import { logger } from '../config/logger';

export class AuthController {
  // Register new company
  static async registerCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      // Check if Razorpay is configured
     
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
            role: result.user.role
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
      logger.error('Company registration error:', error);

      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          res.status(409).json({
            error: 'Registration failed',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Registration failed',
        message: 'An error occurred during company registration'
      });
    }
  }

  // User login
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, rememberMe } = req.body;

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
      logger.error('Login error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Invalid email or password') ||
            error.message.includes('attempts remaining')) {
          res.status(401).json({
            error: 'Authentication failed',
            message: error.message
          });
          return;
        }

        if (error.message.includes('locked') || error.message.includes('inactive')) {
          res.status(423).json({
            error: 'Account locked',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Login failed',
        message: 'An error occurred during login'
      });
    }
  }


  // Logout user
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.userId) {
        await AuthService.logout(req.user.userId);
      }


      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      logger.error('Logout error:', error);

      res.status(500).json({
        error: 'Logout failed',
        message: 'An error occurred during logout'
      });
    }
  }

  // Get current user profile
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
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
            role: req.user.role,
            department: req.user.userData?.department,
            jobTitle: req.user.userData?.jobTitle,
            phone: req.user.userData?.phone,
            isEmailVerified: req.user.userData?.isEmailVerified,
            preferences: req.user.userData?.preferences,
            permissions: req.user.permissions,
            lastLogin: req.user.userData?.lastLogin
          },
          company: {
            id: req.user.companyId,
            // Additional company data would come from populated field
          }
        }
      });

    } catch (error) {
      logger.error('Get profile error:', error);

      res.status(500).json({
        error: 'Failed to get profile',
        message: 'An error occurred while fetching user profile'
      });
    }
  }

  // Invite user to company
  static async inviteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, firstName, lastName, role, department, jobTitle, phone } = req.body;

      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const invitedUser = await AuthService.inviteUser({
        email,
        firstName,
        lastName,
        role,
        department,
        jobTitle,
        phone,
        invitedBy: req.user.userId,
        companyId: req.user.companyId
      });

      res.status(201).json({
        success: true,
        message: 'User invitation sent successfully',
        data: {
          invitedUser: {
            id: invitedUser._id,
            email: invitedUser.email,
            firstName: invitedUser.firstName,
            lastName: invitedUser.lastName,
            role: invitedUser.role,
            department: invitedUser.department,
            jobTitle: invitedUser.jobTitle,
            invitedAt: invitedUser.invitedAt
          }
        }
      });

    } catch (error) {
      logger.error('User invitation error:', error);

      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          error: 'Invitation failed',
          message: error.message
        });
        return;
      }

      res.status(500).json({
        error: 'Invitation failed',
        message: 'An error occurred while sending the invitation'
      });
    }
  }

  // Accept invitation
  static async acceptInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      logger.error('Accept invitation error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Invalid or expired')) {
          res.status(400).json({
            error: 'Invalid invitation',
            message: error.message
          });
          return;
        }

        if (error.message.includes('Password validation')) {
          res.status(400).json({
            error: 'Password validation failed',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Invitation acceptance failed',
        message: 'An error occurred while accepting the invitation'
      });
    }
  }

  // Change password
  static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      logger.error('Change password error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Current password is incorrect')) {
          res.status(400).json({
            error: 'Invalid password',
            message: error.message
          });
          return;
        }

        if (error.message.includes('Password validation')) {
          res.status(400).json({
            error: 'Password validation failed',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Password change failed',
        message: 'An error occurred while changing the password'
      });
    }
  }

  // Forgot password
  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      await AuthService.generatePasswordResetToken(email);

      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });

    } catch (error) {
      logger.error('Forgot password error:', error);

      res.status(500).json({
        error: 'Password reset failed',
        message: 'An error occurred while processing the password reset request'
      });
    }
  }

  // Reset password
  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body;

      await AuthService.resetPassword(token, password);

      res.status(200).json({
        success: true,
        message: 'Password reset successful'
      });

    } catch (error) {
      logger.error('Reset password error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Invalid or expired')) {
          res.status(400).json({
            error: 'Invalid token',
            message: error.message
          });
          return;
        }

        if (error.message.includes('Password validation')) {
          res.status(400).json({
            error: 'Password validation failed',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Password reset failed',
        message: 'An error occurred while resetting the password'
      });
    }
  }

  // Get subscription plans
  static async getSubscriptionPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plans = PaymentService.getAllPlans();

      res.status(200).json({
        success: true,
        data: {
          plans
        }
      });

    } catch (error) {
      logger.error('Get subscription plans error:', error);

      res.status(500).json({
        error: 'Failed to retrieve plans',
        message: 'An error occurred while fetching subscription plans'
      });
    }
  }

  // Verify payment and activate subscription
  static async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature, companyId } = req.body;

      let paymentDetails;

      // Check if this is a development environment without Razorpay
      if (!PaymentService.isConfigured() && razorpayOrderId.startsWith('order_mock_')) {
        console.warn('⚠️  Development mode: Skipping Razorpay verification for mock order');

        // Mock payment details for development
        paymentDetails = {
          id: razorpayPaymentId,
          order_id: razorpayOrderId,
          status: 'captured',
          amount: 1000, // Mock amount
          currency: 'INR',
          method: 'card'
        };
      } else {
        // Production flow with actual Razorpay verification
        const isSignatureValid = PaymentService.verifyPaymentSignature({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature
        });

        if (!isSignatureValid) {
          res.status(400).json({
            error: 'Payment verification failed',
            message: 'Invalid payment signature'
          });
          return;
        }

        // Get payment details from Razorpay
        paymentDetails = await PaymentService.getPaymentDetails(razorpayPaymentId);

        if (paymentDetails.status !== 'captured') {
          res.status(400).json({
            error: 'Payment not completed',
            message: 'Payment was not successfully captured'
          });
          return;
        }
      }

      // Update company subscription status
      const result = await AuthService.activateSubscription(companyId, {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        paymentDetails
      });

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
      logger.error('Payment verification error:', error);

      if (error instanceof Error && error.message.includes('Company not found')) {
        res.status(404).json({
          error: 'Company not found',
          message: error.message
        });
        return;
      }

      res.status(500).json({
        error: 'Payment verification failed',
        message: 'An error occurred while verifying the payment'
      });
    }
  }
}