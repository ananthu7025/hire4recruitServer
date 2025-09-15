import { AuthUtils } from '../utils/auth';
import User, { IUser } from '../models/User';
import Company, { ICompany } from '../models/Company';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

export interface RegisterCompanyData {
  companyName: string;
  domain?: string;
  industry?: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
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
  // Register new company with admin user
  static async registerCompany(data: RegisterCompanyData): Promise<{ company: ICompany; user: IUser }> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // Check if company domain already exists (if provided)
      if (data.domain) {
        const existingCompanyByDomain = await Company.findOne({ domain: data.domain }).session(session);
        if (existingCompanyByDomain) {
          throw new Error('A company with this domain already exists');
        }
      }

      // Check if admin email already exists
      const existingUserByEmail = await User.findOne({ email: data.adminEmail }).session(session);
      if (existingUserByEmail) {
        throw new Error('A user with this email already exists');
      }

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
        subscription: {
          plan: 'free' as const,
          status: 'active' as const,
          startDate: new Date(),
          maxUsers: 5,
          maxJobs: 10,
          features: ['basic_posting', 'candidate_management', 'basic_analytics']
        }
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

      // TODO: Send email verification email
      // await this.sendEmailVerification(adminUser);

      return { company, user: adminUser };

    } catch (error) {
      await session.abortTransaction();
      logger.error('Company registration failed:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  // User login
  static async login(email: string, password: string): Promise<LoginResult> {
    try {
      // Find user with company data
      const user = await User.findOne({ email, isDeleted: false })
        .populate('companyId', 'name domain subscription isActive')
        .lean();

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Check if company is active
      const company = user.companyId as any;
      if (!company || !company.isActive) {
        throw new Error('Company account is inactive');
      }

      // Check if user is locked out
      const userDoc = user as IUser;
      if (AuthUtils.isUserLockedOut(userDoc)) {
        throw new Error('Account is temporarily locked due to failed login attempts');
      }

      // Compare password
      const isValidPassword = await AuthUtils.comparePassword(password, user.password);

      if (!isValidPassword) {
        // Handle failed login attempt
        const userForUpdate = await User.findById(user._id);
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

      // Reset failed login attempts on successful login
      const userForUpdate = await User.findById(user._id);
      if (userForUpdate) {
        AuthUtils.resetFailedLoginAttempts(userForUpdate);
        await userForUpdate.save();
      }

      // Generate token
      const token = AuthUtils.generateUserToken(user as IUser);

      // Update last login in database
      await User.findByIdAndUpdate(user._id, {
        lastLogin: new Date()
      });

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
}