import Company, { ICompany } from '../models/Company';
import Employee from '../models/Employee';
import { logger } from '../config/logger';
import mongoose from 'mongoose';

export interface UpdateCompanyData {
  name?: string;
  domain?: string;
  industry?: string;
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  phone?: string;
  website?: string;
  settings?: {
    timezone?: string;
    currency?: string;
    dateFormat?: string;
    language?: string;
  };
}

export interface CompanyStats {
  totalUsers: number;
  activeUsers: number;
  totalJobs: number;
  activeJobs: number;
  totalCandidates: number;
  totalInterviews: number;
  subscriptionInfo: ICompany['subscription'];
}

export class CompanyService {
  // Get company by ID
  static async getCompanyById(companyId: string): Promise<ICompany | null> {
    try {
      const company = await Company.findById(companyId);
      return company;
    } catch (error) {
      logger.error('Get company by ID failed:', { companyId, error });
      throw error;
    }
  }

  // Get company with stats
  static async getCompanyWithStats(companyId: string): Promise<{ company: ICompany; stats: CompanyStats }> {
    try {
      const company = await Company.findById(companyId);

      if (!company) {
        throw new Error('Company not found');
      }

      // Get company statistics
      const [
        totalUsers,
        activeUsers,
        // TODO: Add job, candidate, and interview counts when those models are implemented
      ] = await Promise.all([
        Employee.countDocuments({ companyId, isDeleted: false }),
        Employee.countDocuments({ companyId, isDeleted: false, isActive: true }),
      ]);

      const stats: CompanyStats = {
        totalUsers,
        activeUsers,
        totalJobs: 0, // TODO: Implement when Job model is ready
        activeJobs: 0,
        totalCandidates: 0,
        totalInterviews: 0,
        subscriptionInfo: company.subscription
      };

      return { company, stats };

    } catch (error) {
      logger.error('Get company with stats failed:', { companyId, error });
      throw error;
    }
  }

  // Update company information
  static async updateCompany(companyId: string, updates: UpdateCompanyData, updatedBy: string): Promise<ICompany> {
    try {
      // Check if domain is being updated and if it already exists
      if (updates.domain) {
        const existingCompanyWithDomain = await Company.findOne({
          domain: updates.domain,
          _id: { $ne: companyId }
        });

        if (existingCompanyWithDomain) {
          throw new Error('A company with this domain already exists');
        }
      }

      // Prepare update data
      const updateData: any = { ...updates };

      // Handle nested updates properly
      if (updates.address) {
        Object.keys(updates.address).forEach(key => {
          updateData[`address.${key}`] = updates.address![key as keyof typeof updates.address];
        });
        delete updateData.address;
      }

      if (updates.settings) {
        Object.keys(updates.settings).forEach(key => {
          updateData[`settings.${key}`] = updates.settings![key as keyof typeof updates.settings];
        });
        delete updateData.settings;
      }

      const company = await Company.findByIdAndUpdate(
        companyId,
        {
          ...updateData,
          updatedAt: new Date()
        },
        {
          new: true,
          runValidators: true
        }
      );

      if (!company) {
        throw new Error('Company not found');
      }

      logger.info('Company updated successfully', {
        companyId,
        updatedBy,
        updatedFields: Object.keys(updates)
      });

      return company;

    } catch (error) {
      logger.error('Company update failed:', { companyId, error });
      throw error;
    }
  }

  // Update company subscription
  static async updateSubscription(
    companyId: string,
    subscriptionData: Partial<ICompany['subscription']>,
    updatedBy: string
  ): Promise<ICompany> {
    try {
      const updateFields: any = {};

      Object.keys(subscriptionData).forEach(key => {
        updateFields[`subscription.${key}`] = subscriptionData[key as keyof ICompany['subscription']];
      });

      const company = await Company.findByIdAndUpdate(
        companyId,
        {
          ...updateFields,
          updatedAt: new Date()
        },
        {
          new: true,
          runValidators: true
        }
      );

      if (!company) {
        throw new Error('Company not found');
      }

      logger.info('Company subscription updated', {
        companyId,
        updatedBy,
        newPlan: subscriptionData.plan,
        newStatus: subscriptionData.status
      });

      return company;

    } catch (error) {
      logger.error('Subscription update failed:', { companyId, error });
      throw error;
    }
  }

  // Deactivate company
  static async deactivateCompany(companyId: string, deactivatedBy: string): Promise<void> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // Deactivate company
      const company = await Company.findByIdAndUpdate(
        companyId,
        {
          isActive: false,
          updatedAt: new Date()
        },
        { session }
      );

      if (!company) {
        throw new Error('Company not found');
      }

      // Deactivate all users in the company
      await Employee.updateMany(
        { companyId },
        {
          isActive: false,
          updatedBy: deactivatedBy,
          updatedAt: new Date()
        },
        { session }
      );

      await session.commitTransaction();

      logger.info('Company deactivated successfully', {
        companyId,
        deactivatedBy,
        companyName: company.name
      });

    } catch (error) {
      await session.abortTransaction();
      logger.error('Company deactivation failed:', { companyId, error });
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Reactivate company
  static async reactivateCompany(companyId: string, reactivatedBy: string): Promise<void> {
    try {
      const company = await Company.findByIdAndUpdate(
        companyId,
        {
          isActive: true,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!company) {
        throw new Error('Company not found');
      }

      logger.info('Company reactivated successfully', {
        companyId,
        reactivatedBy,
        companyName: company.name
      });

    } catch (error) {
      logger.error('Company reactivation failed:', { companyId, error });
      throw error;
    }
  }

  // Get company users
  static async getCompanyUsers(
    companyId: string,
    options: {
      page?: number;
      limit?: number;
      role?: string;
      isActive?: boolean;
      search?: string;
    } = {}
  ): Promise<{ users: any[]; total: number; totalPages: number }> {
    try {
      const { page = 1, limit = 10, role, isActive, search } = options;
      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = {
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false
      };

      if (role) {
        filter.role = role;
      }

      if (typeof isActive === 'boolean') {
        filter.isActive = isActive;
      }

      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } },
          { jobTitle: { $regex: search, $options: 'i' } }
        ];
      }

      const [users, total] = await Promise.all([
        Employee.find(filter)
          .select('-password -refreshToken -passwordResetToken')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('createdBy', 'firstName lastName email')
          .populate('invitedBy', 'firstName lastName email')
          .lean(),
        Employee.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      return { users, total, totalPages };

    } catch (error) {
      logger.error('Get company users failed:', { companyId, error });
      throw error;
    }
  }

  // Check subscription limits
  static async checkSubscriptionLimits(companyId: string): Promise<{
    canAddUser: boolean;
    canAddJob: boolean;
    userCount: number;
    userLimit: number;
    jobCount: number;
    jobLimit: number;
  }> {
    try {
      const company = await Company.findById(companyId);

      if (!company) {
        throw new Error('Company not found');
      }

      const userCount = await Employee.countDocuments({
        companyId,
        isDeleted: false,
        isActive: true
      });

      // TODO: Get job count when Job model is implemented
      const jobCount = 0;

      const canAddUser = userCount < company.subscription.maxUsers;
      const canAddJob = jobCount < company.subscription.maxJobs;

      return {
        canAddUser,
        canAddJob,
        userCount,
        userLimit: company.subscription.maxUsers,
        jobCount,
        jobLimit: company.subscription.maxJobs
      };

    } catch (error) {
      logger.error('Check subscription limits failed:', { companyId, error });
      throw error;
    }
  }

  // Get company activity summary
  static async getActivitySummary(companyId: string, days: number = 30): Promise<{
    newUsers: number;
    newJobs: number;
    newCandidates: number;
    completedInterviews: number;
  }> {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);

      const newUsers = await Employee.countDocuments({
        companyId,
        isDeleted: false,
        createdAt: { $gte: dateThreshold }
      });

      // TODO: Implement when other models are ready
      const newJobs = 0;
      const newCandidates = 0;
      const completedInterviews = 0;

      return {
        newUsers,
        newJobs,
        newCandidates,
        completedInterviews
      };

    } catch (error) {
      logger.error('Get activity summary failed:', { companyId, error });
      throw error;
    }
  }
}