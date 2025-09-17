import { AuthUtils } from '../utils/auth';
import Employee, { IEmployee } from '../models/Employee';
import Company, { ICompany } from '../models/Company';
import { RoleService } from './roleService';
import { logger } from '../config/logger';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

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
    roleId: string;
    companyId: string;
    isEmailVerified: boolean;
    permissions: IEmployee['permissions'];
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
  roleId: string;
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
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    }
    return this.emailTransporter;
  }

  private static async generateEmployeeId(companyId: string): Promise<string> {
    try {
      // Get company details
      const company = await Company.findById(companyId).select('name');
      if (!company) {
        throw new Error('Company not found');
      }

      // Generate company prefix (first 2 letters of company name)
      const companyPrefix = company.name
        .replace(/[^A-Za-z]/g, '') // Remove non-alphabetic characters
        .substring(0, 2)
        .toUpperCase();

      // Get current count of employees in the company
      const employeeCount = await Employee.countDocuments({
        companyId,
        isDeleted: false
      });

      // Generate sequential number (padded to 4 digits)
      const sequentialNumber = (employeeCount + 1).toString().padStart(4, '0');

      // Format: XX-YYYY (e.g., "HI-0001" for hire4recruit)
      const employeeId = `${companyPrefix}-${sequentialNumber}`;

      // Check if this ID already exists (edge case handling)
      const existingEmployee = await Employee.findOne({
        employeeId,
        companyId,
        isDeleted: false
      });

      if (existingEmployee) {
        // If collision, add timestamp suffix
        const timestamp = Date.now().toString().substring(-3);
        return `${companyPrefix}-${sequentialNumber}${timestamp}`;
      }

      return employeeId;

    } catch (error) {
      logger.error('Failed to generate employee ID:', error);
      // Fallback: use timestamp-based ID
      const timestamp = Date.now().toString();
      return `EMP-${timestamp.substring(-6)}`;
    }
  }

  private static async findUserWithCompany(email: string) {
    return Employee.findOne({ email, isDeleted: false })
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
  static async registerCompany(data: RegisterCompanyData): Promise<{ company: ICompany; user: IEmployee }> {
    try {
      // Validate domain uniqueness
      await this.validateDomainUniqueness(data.domain);

      // Validate email uniqueness
      await this.validateEmailUniqueness(data.adminEmail);

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

      const company = await Company.create(companyData);

      // Create default roles for the company
      const roles = await RoleService.createDefaultRoles(company._id.toString(), company._id.toString());

      // Get the company_admin role
      const adminRole = roles.find(role => role.name === 'company_admin');
      if (!adminRole) {
        throw new Error('Failed to create admin role');
      }

      // Hash admin password
      const hashedPassword = await AuthUtils.hashPassword(data.adminPassword);

      // Use admin role permissions
      const adminPermissions = adminRole.permissions;

      // Generate admin employee ID
      const adminEmployeeId = await this.generateEmployeeId(company._id.toString());

      // Create admin user
      const adminUserData = {
        companyId: company._id,
        email: data.adminEmail,
        password: hashedPassword,
        firstName: data.adminFirstName,
        lastName: data.adminLastName,
        phone: data.adminPhone,
        roleId: adminRole._id,
        permissions: adminPermissions,
        employeeId: adminEmployeeId,
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

      const adminUser = await Employee.create(adminUserData);

      // Update createdBy and updatedBy to self-reference
      await Employee.findByIdAndUpdate(
        adminUser._id,
        {
          createdBy: adminUser._id,
          updatedBy: adminUser._id
        }
      );

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
      logger.error('Company registration failed:', error);
      throw error;
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
      const userDoc = user as IEmployee;
      if (AuthUtils.isUserLockedOut(userDoc)) {
        throw new Error('Account is temporarily locked due to failed login attempts');
      }

      const isValidPassword = await AuthUtils.comparePassword(password, user.password);
      if (!isValidPassword) {
        return this.handleFailedLoginAttempt(user._id.toString());
      }

      // Successful login - reset attempts and generate token
      await this.handleSuccessfulLogin(user._id.toString());
      const token = AuthUtils.generateUserToken(user as IEmployee);

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
          roleId: user.roleId.toString(),
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
  static async inviteUser(data: InviteUserData): Promise<IEmployee> {
    try {
      // Check if user with email already exists in the company
      const existingUser = await Employee.findOne({
        email: data.email,
        companyId: data.companyId
      });

      if (existingUser) {
        throw new Error('A user with this email already exists in your company');
      }

      // Get role by ID and validate it exists
      const role = await RoleService.getRoleById(data.roleId, data.companyId);
      if (!role) {
        throw new Error('Invalid role specified');
      }

      // Use role permissions
      const permissions = role.permissions;

      // Generate invite token
      const inviteToken = AuthUtils.generateInviteToken();

      // Generate employee ID automatically
      const generatedEmployeeId = await this.generateEmployeeId(data.companyId);

      // Create invited user (inactive until they accept invitation)
      const invitedUserData = {
        companyId: data.companyId,
        email: data.email,
        password: AuthUtils.generateRandomToken(), // Temporary password, will be set when accepting invite
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        roleId: new mongoose.Types.ObjectId(data.roleId),
        permissions,
        department: data.department,
        jobTitle: data.jobTitle,
        employeeId: generatedEmployeeId,
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

      const invitedUser = await Employee.create(invitedUserData);

      logger.info('User invited successfully', {
        invitedUserId: invitedUser._id.toString(),
        invitedByUserId: data.invitedBy,
        email: data.email,
        roleId: data.roleId,
        companyId: data.companyId
      });

      // Send invitation email (don't fail invitation if email fails)
      this.sendInvitationEmailAsync(invitedUser, data);

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
      const user = await Employee.findOne({
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
          roleId: user.roleId.toString(),
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
      const user = await Employee.findById(userId);

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
      const user = await Employee.findOne({ email, isDeleted: false });

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

      // Send password reset email (don't fail if email fails)
      this.sendPasswordResetEmailAsync(user, token);

    } catch (error) {
      logger.error('Password reset token generation failed:', { email, error });
      throw error;
    }
  }

  // Reset password using token
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const user = await Employee.findOne({
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

    // Find admin role and then admin user
    const adminRole = await RoleService.getRoleByName('company_admin', company._id.toString());
    if (!adminRole) {
      throw new Error('Admin role not found');
    }

    const adminUser = await Employee.findOne({
      companyId: company._id,
      roleId: adminRole._id
    });

    if (!adminUser) {
      throw new Error('Admin user not found');
    }

    const token = AuthUtils.generateUserToken(adminUser);

    logger.info('Subscription activated successfully', {
      companyId: company._id.toString(),
      plan: company.subscription.plan,
      amount: company.subscription.pricing.amount,
      paymentId: paymentData.razorpayPaymentId
    });

    // Send payment confirmation email with invoice (don't fail activation if email fails)
    this.sendPaymentConfirmationEmailAsync(company, adminUser, paymentData);

    return { company, token };
  } catch (error) {
    logger.error('Subscription activation failed:', { companyId, error });
    throw error;
  }
}


  static async sendPasswordResetEmail(user: IEmployee, token: string): Promise<void> {
    try {
      // Get company details
      const company = await Company.findById(user.companyId).select('name');
      if (!company) {
        throw new Error('Company not found');
      }

      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;

      const transporter = this.getEmailTransporter();

      const templatePath = path.join(__dirname, '../templates/password-reset.html');
      const htmlTemplate = fs.readFileSync(templatePath, 'utf8');

      const html = htmlTemplate
        .replace(/{{firstName}}/g, user.firstName)
        .replace(/{{lastName}}/g, user.lastName)
        .replace(/{{companyName}}/g, company.name)
        .replace(/{{resetLink}}/g, resetLink);

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@hire4recruit.com',
        to: user.email,
        subject: `Password Reset Request - ${company.name}`,
        html: html,
        text: `
          Password Reset Request

          Hello ${user.firstName} ${user.lastName},

          We received a request to reset your password for your hire4recruit account at ${company.name}.

          If you made this request, visit the following link to reset your password:
          ${resetLink}

          This link will expire in 1 hour for security reasons.

          If you did not request a password reset, please ignore this email and your password will remain unchanged.

          For security reasons, we recommend that you:
          • Choose a strong password that is unique to your hire4recruit account
          • Use a combination of uppercase and lowercase letters, numbers, and special characters
          • Avoid using personal information that could be easily guessed

          If you continue to have trouble accessing your account, please contact your system administrator.
        `
      };

      await transporter.sendMail(mailOptions);
      logger.info('Password reset email sent successfully', {
        userId: user._id.toString(),
        email: user.email,
        companyId: company._id.toString()
      });

    } catch (error) {
      logger.error('Failed to send password reset email:', {
        userId: user._id.toString(),
        email: user.email,
        error
      });
      throw new Error('Failed to send password reset email');
    }
  }

  private static async sendPasswordResetEmailAsync(user: IEmployee, token: string): Promise<void> {
    try {
      await this.sendPasswordResetEmail(user, token);
      logger.info('Password reset email sent', {
        userId: user._id.toString(),
        email: user.email
      });
    } catch (emailError) {
      logger.warn('Failed to send password reset email, but token generated', {
        userId: user._id.toString(),
        email: user.email,
        error: emailError
      });
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
        from: process.env.EMAIL_FROM || 'noreply@hire4recruit.com',
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
      const user = await Employee.findById(userId);

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

  private static async validateDomainUniqueness(domain: string | undefined): Promise<void> {
    if (domain) {
      const existingCompany = await Company.findOne({ domain });
      if (existingCompany) {
        throw new Error('A company with this domain already exists');
      }
    }
  }

  private static async validateEmailUniqueness(email: string): Promise<void> {
    const existingUser = await Employee.findOne({ email });
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

  static async sendInvitationEmail(invitedUser: IEmployee, invitationData: InviteUserData): Promise<void> {
    try {
      // Get company and inviter details
      const company = await Company.findById(invitationData.companyId).select('name');
      const inviter = await Employee.findById(invitationData.invitedBy).select('firstName lastName');

      if (!company) {
        throw new Error('Company not found');
      }

      const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invitation/${invitedUser.inviteToken}`;

      const transporter = this.getEmailTransporter();

      const templatePath = path.join(__dirname, '../templates/employee-invitation.html');
      const htmlTemplate = fs.readFileSync(templatePath, 'utf8');

      const html = htmlTemplate
        .replace(/{{firstName}}/g, invitedUser.firstName)
        .replace(/{{lastName}}/g, invitedUser.lastName)
        .replace(/{{companyName}}/g, company.name)
        .replace(/{{role}}/g, 'Employee')
        .replace(/{{department}}/g, invitedUser.department || 'Not specified')
        .replace(/{{jobTitle}}/g, invitedUser.jobTitle || 'Not specified')
        .replace(/{{employeeId}}/g, invitedUser.employeeId || 'Not assigned')
        .replace(/{{inviterName}}/g, inviter ? `${inviter.firstName} ${inviter.lastName}` : 'HR Team')
        .replace(/{{invitationLink}}/g, invitationLink);

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@hire4recruit.com',
        to: invitedUser.email,
        subject: `Invitation to join ${company.name} - hire4recruit`,
        html: html,
        text: `
          You're Invited to Join ${company.name}

          Hello ${invitedUser.firstName} ${invitedUser.lastName},

          You have been invited to join ${company.name} as an employee.

          Invitation Details:
          - Role: Employee
          - Department: ${invitedUser.department || 'Not specified'}
          - Job Title: ${invitedUser.jobTitle || 'Not specified'}
          - Employee ID: ${invitedUser.employeeId || 'Not assigned'}
          - Invited by: ${inviter ? `${inviter.firstName} ${inviter.lastName}` : 'HR Team'}

          To accept this invitation and set up your account, please visit:
          ${invitationLink}

          This invitation will expire in 7 days.

          If you have any questions, please contact your administrator or HR department.
        `
      };

      await transporter.sendMail(mailOptions);
      logger.info('Invitation email sent successfully', {
        userId: invitedUser._id.toString(),
        email: invitedUser.email,
        companyId: company._id.toString()
      });

    } catch (error) {
      logger.error('Failed to send invitation email:', {
        userId: invitedUser._id.toString(),
        email: invitedUser.email,
        error
      });
      throw new Error('Failed to send invitation email');
    }
  }

  private static async sendInvitationEmailAsync(invitedUser: IEmployee, invitationData: InviteUserData): Promise<void> {
    try {
      await this.sendInvitationEmail(invitedUser, invitationData);
      logger.info('Invitation email sent', {
        userId: invitedUser._id.toString(),
        email: invitedUser.email
      });
    } catch (emailError) {
      logger.warn('Failed to send invitation email, but invitation created', {
        userId: invitedUser._id.toString(),
        email: invitedUser.email,
        error: emailError
      });
    }
  }

  private static async generateInvoicePDF(invoiceData: any): Promise<Buffer> {
    try {
      const templatePath = path.join(__dirname, '../templates/invoice.html');
      let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

      // Replace template variables
      Object.keys(invoiceData).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        htmlTemplate = htmlTemplate.replace(regex, invoiceData[key] || '');
      });

      // Generate PDF using puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });

      await browser.close();
      return Buffer.from(pdfBuffer);

    } catch (error) {
      logger.error('Failed to generate invoice PDF:', error);
      throw new Error('Failed to generate invoice PDF');
    }
  }

  static async sendPaymentConfirmationEmail(
    company: ICompany,
    adminUser: IEmployee,
    paymentData: PaymentVerificationData
  ): Promise<void> {
    try {
      const transporter = this.getEmailTransporter();

      // Prepare invoice data
      const invoiceNumber = `INV-${Date.now()}`;
      const currentDate = new Date();
      const nextBillingDate = new Date();

      if (company.subscription.pricing.interval === 'monthly') {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      } else {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      }

      const invoiceData = {
        invoiceNumber,
        companyName: company.name,
        billingEmail: adminUser.email,
        billingAddress: company.address ?
          `${company.address.street || ''}\n${company.address.city || ''}, ${company.address.state || ''} ${company.address.postalCode || ''}\n${company.address.country || ''}`.trim() :
          'Address not provided',
        invoiceDate: currentDate.toLocaleDateString('en-IN'),
        paymentId: paymentData.razorpayPaymentId,
        paymentMethod: 'Online Payment (Razorpay)',
        subscriptionPlan: company.subscription.plan.charAt(0).toUpperCase() + company.subscription.plan.slice(1),
        billingPeriod: company.subscription.pricing.interval === 'monthly' ?
          `${currentDate.toLocaleDateString('en-IN')} - ${nextBillingDate.toLocaleDateString('en-IN')}` :
          `${currentDate.toLocaleDateString('en-IN')} - ${nextBillingDate.toLocaleDateString('en-IN')}`,
        amount: (company.subscription.pricing.amount).toLocaleString('en-IN')
      };

      // Generate PDF invoice
      const invoicePDF = await this.generateInvoicePDF(invoiceData);

      // Prepare email template data
      const templatePath = path.join(__dirname, '../templates/payment-confirmation.html');
      let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

      // Check if email verification is needed
      const emailVerificationSection = !adminUser.isEmailVerified ?
        `<div style="background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 5px; padding: 15px; margin: 20px 0;">
          <h3 style="color: #856404; margin: 0 0 10px 0;">📧 Email Verification Required</h3>
          <p style="color: #856404; margin: 0; line-height: 1.6;">
            Please verify your email address to ensure you receive important updates and notifications about your account.
          </p>
        </div>` : '';

      const verifyEmailButton = !adminUser.isEmailVerified ?
        `<a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/email-verification/${adminUser._id}"
           style="background-color: #ffc107; color: #212529; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
          Verify Email
        </a>` : '';

      // Generate subscription features list
      const featuresHtml = company.subscription.features
        .map(feature => `<li>${feature}</li>`)
        .join('');

      const emailData = {
        companyName: company.name,
        subscriptionPlan: company.subscription.plan.charAt(0).toUpperCase() + company.subscription.plan.slice(1),
        billingInterval: company.subscription.pricing.interval,
        amount: (company.subscription.pricing.amount).toLocaleString('en-IN'),
        paymentId: paymentData.razorpayPaymentId,
        transactionDate: currentDate.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        nextBillingDate: nextBillingDate.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        subscriptionFeatures: featuresHtml,
        emailVerificationSection,
        verifyEmailButton,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`
      };

      // Replace template variables
      Object.keys(emailData).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        htmlTemplate = htmlTemplate.replace(regex, emailData[key] || '');
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@hire4recruit.com',
        to: adminUser.email,
        subject: `Payment Confirmation & Welcome to hire4recruit - ${company.name}`,
        html: htmlTemplate,
        text: `
          Payment Confirmation - ${company.name}

          Dear ${company.name} Team,

          Your payment has been successfully processed and your subscription is now active!

          Payment Details:
          - Plan: ${emailData.subscriptionPlan} (${emailData.billingInterval})
          - Amount: ₹${emailData.amount}
          - Payment ID: ${emailData.paymentId}
          - Transaction Date: ${emailData.transactionDate}
          - Next Billing: ${emailData.nextBillingDate}

          ${!adminUser.isEmailVerified ?
            '\n⚠️ IMPORTANT: Please verify your email address to ensure you receive important updates.\nVerification Link: ' +
            `${process.env.FRONTEND_URL || 'http://localhost:3000'}/email-verification/${adminUser._id}` :
            ''
          }

          Access your dashboard: ${emailData.loginUrl}

          Your invoice is attached to this email for your records.

          Welcome to hire4recruit!
        `,
        attachments: [
          {
            filename: `invoice-${invoiceNumber}.pdf`,
            content: invoicePDF,
            contentType: 'application/pdf'
          }
        ]
      };

      await transporter.sendMail(mailOptions);

      logger.info('Payment confirmation email sent successfully', {
        companyId: company._id.toString(),
        email: adminUser.email,
        paymentId: paymentData.razorpayPaymentId,
        invoiceNumber
      });

    } catch (error) {
      logger.error('Failed to send payment confirmation email:', {
        companyId: company._id.toString(),
        email: adminUser.email,
        error
      });
      throw new Error('Failed to send payment confirmation email');
    }
  }

  private static async sendPaymentConfirmationEmailAsync(
    company: ICompany,
    adminUser: IEmployee,
    paymentData: PaymentVerificationData
  ): Promise<void> {
    try {
      await this.sendPaymentConfirmationEmail(company, adminUser, paymentData);
      logger.info('Payment confirmation email sent', {
        companyId: company._id.toString(),
        email: adminUser.email
      });
    } catch (emailError) {
      logger.warn('Failed to send payment confirmation email, but payment processed', {
        companyId: company._id.toString(),
        email: adminUser.email,
        error: emailError
      });
    }
  }

  private static async handleFailedLoginAttempt(userId: string): Promise<never> {
    const userForUpdate = await Employee.findById(userId);
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
    const userForUpdate = await Employee.findById(userId);
    if (userForUpdate) {
      AuthUtils.resetFailedLoginAttempts(userForUpdate);
      await userForUpdate.save();
    }

    await Employee.findByIdAndUpdate(userId, { lastLogin: new Date() });
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