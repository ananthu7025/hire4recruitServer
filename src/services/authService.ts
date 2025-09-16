import { AuthUtils } from '../utils/auth';
import User, { IUser } from '../models/User';
import Company, { ICompany } from '../models/Company';
import { logger } from '../config/logger';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

interface EmailTransporter {
  sendMail(mailOptions: any): Promise<any>;
}

interface PaymentVerificationData {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  paymentDetails: any;
}

export interface RegisterCompanyData {
  companyName: string;
  domain?: string;
  industry?: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  subscription: any; // Subscription configuration from PaymentService
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
  adminPhone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  phone?: string;
  website?: string;
}

export interface LoginResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    companyId: string;
    isEmailVerified: boolean;
    permissions: IUser['permissions'];
  };
  company: {
    id: string;
    name: string;
    domain?: string;
    subscription: ICompany['subscription'];
  };
  token: string;
}

export interface InviteUserData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'hr_manager' | 'recruiter' | 'interviewer' | 'hiring_manager';
  department?: string;
  jobTitle?: string;
  phone?: string;
  invitedBy: string;
  companyId: string;
}

export class AuthService {
  private static emailTransporter: any = null;

  private static getEmailTransporter() {
    if (!this.emailTransporter) {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
    return this.emailTransporter;
  }

  private static async findUserWithCompany(email: string) {
    return User.findOne({ email, isDeleted: false })
      .populate('companyId', 'name domain subscription isActive')
      .lean();
  }

  private static validateCompanySubscription(company: any): void {
    if (!company.isActive) {
      throw new Error('Company account is inactive');
    }

    const { subscription } = company;
    const statusMessages = {
      pending_payment: 'Payment verification required. Please complete your payment to access your account.',
      suspended: 'Subscription is suspended. Please contact support or update your payment method.',
      cancelled: 'Subscription is cancelled. Please contact support to reactivate your account.',
      inactive: 'Subscription is inactive. Please contact support.',
    };

    if (statusMessages[subscription.status]) {
      throw new Error(statusMessages[subscription.status]);
    }

    if (subscription.endDate && new Date(subscription.endDate) < new Date()) {
      throw new Error('Subscription has expired. Please renew your subscription to continue.');
    }
  }
  // Register new company with admin user
  static async registerCompany(data: RegisterCompanyData): Promise<{ company: ICompany; user: IUser }> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // Validate domain uniqueness
      await this.validateDomainUniqueness(data.domain, session);

      // Validate email uniqueness
      await this.validateEmailUniqueness(data.adminEmail, session);

      // Create company
      const companyData = {
        name: data.companyName,
        domain: data.domain,
        industry: data.industry,
        size: data.size,
        address: data.address,
        phone: data.phone,
        website: data.website,
        primaryContact: {
          name: `${data.adminFirstName} ${data.adminLastName}`,
          email: data.adminEmail,
          phone: data.adminPhone
        },
        subscription: data.subscription
      };

      const [company] = await Company.create([companyData], { session });

      // Hash admin password
      const hashedPassword = await AuthUtils.hashPassword(data.adminPassword);

      // Generate admin permissions
      const adminPermissions = AuthUtils.generatePermissionsByRole('company_admin');

      // Create admin user
      const adminUserData = {
        companyId: company._id,
        email: data.adminEmail,
        password: hashedPassword,
        firstName: data.adminFirstName,
        lastName: data.adminLastName,
        phone: data.adminPhone,
        role: 'company_admin' as const,
        permissions: adminPermissions,
        isActive: true,
        isDeleted: false,
        isEmailVerified: false, // Will need email verification
        preferences: {
          emailNotifications: true,
          pushNotifications: true
        },
        createdBy: new mongoose.Types.ObjectId(), // Placeholder, will be updated to self
        updatedBy: new mongoose.Types.ObjectId()
      };

      const [adminUser] = await User.create([adminUserData], { session });

      // Update createdBy and updatedBy to self-reference
      await User.findByIdAndUpdate(
        adminUser._id,
        {
          createdBy: adminUser._id,
          updatedBy: adminUser._id
        },
        { session }
      );

      await session.commitTransaction();

      logger.info('Company registered successfully', {
        companyId: company._id.toString(),
        adminUserId: adminUser._id.toString(),
        companyName: company.name,
        adminEmail: adminUser.email
      });

      // Send email verification email (don't fail registration if email fails)
      this.sendVerificationEmailAsync(adminUser._id.toString(), adminUser.email, company.name);

      return { company, user: adminUser };

    } catch (error) {
      await session.abortTransaction();
      logger.error('Company registration failed:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async login(email: string, password: string): Promise<LoginResult> {
    try {
      const user = await this.findUserWithCompany(email);

      if (!user) {
        throw new Error('Invalid email or password');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      if (!user.isEmailVerified) {
        throw new Error('Email verification required. Please check your email and verify your account before logging in.');
      }

      const company = user.companyId as any;
      if (!company) {
        throw new Error('Company not found');
      }

      // Validate company subscription status
      this.validateCompanySubscription(company);

      // Check lockout and validate password
      const userDoc = user as IUser;
      if (AuthUtils.isUserLockedOut(userDoc)) {
        throw new Error('Account is temporarily locked due to failed login attempts');
      }

      const isValidPassword = await AuthUtils.comparePassword(password, user.password);
      if (!isValidPassword) {
        return this.handleFailedLoginAttempt(user._id.toString());
      }

      // Successful login - reset attempts and generate token
      await this.handleSuccessfulLogin(user._id.toString());
      const token = AuthUtils.generateUserToken(user as IUser);

      logger.info('User logged in successfully', {
        userId: user._id.toString(),
        email: user.email,
        companyId: user.companyId.toString()
      });

      return {
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          companyId: user.companyId.toString(),
          isEmailVerified: user.isEmailVerified,
          permissions: user.permissions
        },
        company: {
          id: company._id.toString(),
          name: company.name,
          domain: company.domain,
          subscription: company.subscription
        },
        token
      };
    } catch (error) {
      logger.error('Login failed:', { email, error: (error as Error).message });
      throw error;
    }
  }


  // Logout user
  static async logout(userId: string): Promise<void> {
    try {
      logger.info('User logged out', { userId });
    } catch (error) {
      logger.error('Logout failed:', { userId, error });
      throw error;
    }
  }

  // Invite user to company
  static async inviteUser(data: InviteUserData): Promise<IUser> {
    try {
      // Check if user with email already exists in the company
      const existingUser = await User.findOne({
        email: data.email,
        companyId: data.companyId
      });

      if (existingUser) {
        throw new Error('A user with this email already exists in your company');
      }

      // Generate permissions based on role
      const permissions = AuthUtils.generatePermissionsByRole(data.role);

      // Generate invite token
      const inviteToken = AuthUtils.generateInviteToken();

      // Create invited user (inactive until they accept invitation)
      const invitedUserData = {
        companyId: data.companyId,
        email: data.email,
        password: AuthUtils.generateRandomToken(), // Temporary password, will be set when accepting invite
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        permissions,
        department: data.department,
        jobTitle: data.jobTitle,
        isActive: false, // Inactive until invite is accepted
        isDeleted: false,
        isEmailVerified: false,
        preferences: {
          emailNotifications: true,
          pushNotifications: true
        },
        invitedBy: new mongoose.Types.ObjectId(data.invitedBy),
        invitedAt: new Date(),
        inviteToken,
        createdBy: new mongoose.Types.ObjectId(data.invitedBy),
        updatedBy: new mongoose.Types.ObjectId(data.invitedBy)
      };

      const invitedUser = await User.create(invitedUserData);

      logger.info('User invited successfully', {
        invitedUserId: invitedUser._id.toString(),
        invitedByUserId: data.invitedBy,
        email: data.email,
        role: data.role,
        companyId: data.companyId
      });

      // TODO: Send invitation email
      // await this.sendInvitationEmail(invitedUser);

      return invitedUser;

    } catch (error) {
      logger.error('User invitation failed:', { email: data.email, error });
      throw error;
    }
  }

  // Accept invitation
  static async acceptInvitation(token: string, password: string): Promise<LoginResult> {
    try {
      // Find user by invite token
      const user = await User.findOne({
        inviteToken: token,
        isActive: false
      }).populate('companyId', 'name domain subscription isActive');

      if (!user) {
        throw new Error('Invalid or expired invitation token');
      }

      // Check if company is still active
      const company = user.companyId as any;
      if (!company || !company.isActive) {
        throw new Error('Company account is inactive');
      }

      // Validate password strength
      const passwordValidation = AuthUtils.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Hash password and activate user
      const hashedPassword = await AuthUtils.hashPassword(password);

      user.password = hashedPassword;
      user.isActive = true;
      user.inviteToken = undefined;
      user.inviteAcceptedAt = new Date();
      user.updatedBy = user._id;

      await user.save();

      // Generate token
      const authToken = AuthUtils.generateUserToken(user);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      logger.info('Invitation accepted successfully', {
        userId: user._id.toString(),
        email: user.email,
        companyId: user.companyId.toString()
      });

      return {
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          companyId: user.companyId.toString(),
          isEmailVerified: user.isEmailVerified,
          permissions: user.permissions
        },
        company: {
          id: company._id.toString(),
          name: company.name,
          domain: company.domain,
          subscription: company.subscription
        },
        token: authToken
      };

    } catch (error) {
      logger.error('Invitation acceptance failed:', { token, error });
      throw error;
    }
  }

  // Change password
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await AuthUtils.comparePassword(currentPassword, user.password);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password strength
      const passwordValidation = AuthUtils.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Hash and update password
      const hashedPassword = await AuthUtils.hashPassword(newPassword);
      user.password = hashedPassword;
      user.updatedBy = user._id;

      await user.save();

      logger.info('Password changed successfully', { userId });

    } catch (error) {
      logger.error('Password change failed:', { userId, error });
      throw error;
    }
  }

  // Generate password reset token
  static async generatePasswordResetToken(email: string): Promise<void> {
    try {
      const user = await User.findOne({ email, isDeleted: false });

      if (!user) {
        // Don't reveal whether user exists or not
        logger.warn('Password reset requested for non-existent email', { email });
        return;
      }

      const { token, expires } = AuthUtils.generatePasswordResetToken();

      user.passwordResetToken = token;
      user.passwordResetExpires = expires;
      await user.save();

      logger.info('Password reset token generated', {
        userId: user._id.toString(),
        email
      });

      // TODO: Send password reset email
      // await this.sendPasswordResetEmail(user, token);

    } catch (error) {
      logger.error('Password reset token generation failed:', { email, error });
      throw error;
    }
  }

  // Reset password using token
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      });

      if (!user) {
        throw new Error('Invalid or expired password reset token');
      }

      // Validate new password strength
      const passwordValidation = AuthUtils.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Hash password and clear reset token
      const hashedPassword = await AuthUtils.hashPassword(newPassword);

      user.password = hashedPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      user.failedLoginAttempts = 0; // Reset failed attempts
      user.lockoutExpires = undefined;
      user.updatedBy = user._id;

      await user.save();

      logger.info('Password reset successfully', {
        userId: user._id.toString(),
        email: user.email
      });

    } catch (error) {
      logger.error('Password reset failed:', { token, error });
      throw error;
    }
  }

  // Activate subscription after payment verification
  static async activateSubscription(companyId: string, paymentData: PaymentVerificationData): Promise<{ company: ICompany; token: string }> {
  try {
    logger.info('Starting subscription activation', { companyId });

    const company = await Company.findById(companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    // Update subscription with payment data
    this.updateCompanySubscription(company, paymentData);
    await company.save();

    // Generate token for admin user
    const adminUser = await User.findOne({
      companyId: company._id,
      role: 'company_admin'
    });

    if (!adminUser) {
      throw new Error('Admin user not found');
    }

    const token = AuthUtils.generateToken({
      userId: adminUser._id.toString(),
      companyId: company._id.toString(),
      email: adminUser.email,
      role: adminUser.role
    });

    logger.info('Subscription activated successfully', {
      companyId: company._id.toString(),
      plan: company.subscription.plan,
      amount: company.subscription.pricing.amount,
      paymentId: paymentData.razorpayPaymentId
    });

    return { company, token };
  } catch (error) {
    logger.error('Subscription activation failed:', { companyId, error });
    throw error;
  }
}


  static async sendVerificationEmail(userId: string, email: string, companyName: string): Promise<void> {
    try {
      const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/email-verification/${userId}`;

      const transporter = this.getEmailTransporter();

      const templatePath = path.join(__dirname, '../templates/email-verification.html');
      const htmlTemplate = fs.readFileSync(templatePath, 'utf8');

      const html = htmlTemplate
        .replace(/{{verificationLink}}/g, verificationLink)
        .replace(/{{companyName}}/g, companyName);

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@hire4recruit.com',
        to: email,
        subject: `Email Verification - ${companyName}`,
        html: html,
        text: `
          Email Verification Required

          Thank you for registering with hire4recruit. Please verify your email address by visiting:
          ${verificationLink}

          This link will expire in 24 hours.

          If you didn't request this verification, please ignore this email.
        `
      };

      await transporter.sendMail(mailOptions);
      logger.info('Verification email sent successfully', { userId, email });

    } catch (error) {
      logger.error('Failed to send verification email:', { userId, email, error });
      throw new Error('Failed to send verification email');
    }
  }

  static async verifyEmail(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      if (user.isEmailVerified) {
        throw new Error('Email is already verified');
      }

      user.isEmailVerified = true;
      await user.save();

      logger.info('Email verified successfully', { userId, email: user.email });

    } catch (error) {
      logger.error('Email verification failed:', { userId, error });
      throw error;
    }
  }

  private static async validateDomainUniqueness(domain: string | undefined, session: mongoose.ClientSession): Promise<void> {
    if (domain) {
      const existingCompany = await Company.findOne({ domain }).session(session);
      if (existingCompany) {
        throw new Error('A company with this domain already exists');
      }
    }
  }

  private static async validateEmailUniqueness(email: string, session: mongoose.ClientSession): Promise<void> {
    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      throw new Error('A user with this email already exists');
    }
  }

  private static async sendVerificationEmailAsync(userId: string, email: string, companyName: string): Promise<void> {
    try {
      await this.sendVerificationEmail(userId, email, companyName);
      logger.info('Verification email sent', { userId, email });
    } catch (emailError) {
      logger.warn('Failed to send verification email, but registration completed', {
        userId,
        email,
        error: emailError
      });
    }
  }

  private static async handleFailedLoginAttempt(userId: string): Promise<never> {
    const userForUpdate = await User.findById(userId);
    if (userForUpdate) {
      const lockoutInfo = AuthUtils.handleFailedLogin(userForUpdate);
      await userForUpdate.save();

      if (lockoutInfo.isLocked) {
        throw new Error('Account has been locked due to too many failed login attempts');
      } else {
        throw new Error(`Invalid email or password. ${lockoutInfo.attemptsRemaining} attempts remaining`);
      }
    }
    throw new Error('Invalid email or password');
  }

  private static async handleSuccessfulLogin(userId: string): Promise<void> {
    const userForUpdate = await User.findById(userId);
    if (userForUpdate) {
      AuthUtils.resetFailedLoginAttempts(userForUpdate);
      await userForUpdate.save();
    }

    await User.findByIdAndUpdate(userId, { lastLogin: new Date() });
  }

  private static updateCompanySubscription(company: ICompany, paymentData: PaymentVerificationData): void {
    company.subscription.status = 'active';
    company.subscription.paymentInfo = {
      ...company.subscription.paymentInfo,
      razorpayPaymentId: paymentData.razorpayPaymentId,
      razorpaySignature: paymentData.razorpaySignature,
      lastPaymentDate: new Date()
    };

    const interval = company.subscription.pricing.interval;
    const endDate = new Date();
    if (interval === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    company.subscription.endDate = endDate;
  }
}