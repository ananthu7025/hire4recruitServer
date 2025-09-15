import User, { IUser } from '../models/User';
import { AuthUtils } from '../utils/auth';
import { logger } from '../config/logger';
import mongoose from 'mongoose';

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  employeeId?: string;
  preferences?: {
    timezone?: string;
    language?: string;
    emailNotifications?: boolean;
    pushNotifications?: boolean;
  };
}

export interface UpdateUserRoleData {
  role: IUser['role'];
  department?: string;
  jobTitle?: string;
}

export class UserService {
  // Get user by ID
  static async getUserById(userId: string, companyId: string): Promise<IUser | null> {
    try {
      const user = await User.findOne({
        _id: userId,
        companyId,
        isDeleted: false
      })
        .select('-password -refreshToken -passwordResetToken')
        .populate('createdBy', 'firstName lastName email')
        .populate('invitedBy', 'firstName lastName email');

      return user;
    } catch (error) {
      logger.error('Get user by ID failed:', { userId, companyId, error });
      throw error;
    }
  }

  // Get users with pagination and filters
  static async getUsers(
    companyId: string,
    options: {
      page?: number;
      limit?: number;
      role?: IUser['role'];
      isActive?: boolean;
      department?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ users: IUser[]; total: number; totalPages: number }> {
    try {
      const {
        page = 1,
        limit = 10,
        role,
        isActive,
        department,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

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

      if (department) {
        filter.department = department;
      }

      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } },
          { jobTitle: { $regex: search, $options: 'i' } },
          { employeeId: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-password -refreshToken -passwordResetToken')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('createdBy', 'firstName lastName email')
          .populate('invitedBy', 'firstName lastName email')
          .lean(),
        User.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      return { users: users as IUser[], total, totalPages };

    } catch (error) {
      logger.error('Get users failed:', { companyId, error });
      throw error;
    }
  }

  // Update user profile
  static async updateUser(
    userId: string,
    companyId: string,
    updates: UpdateUserData,
    updatedBy: string
  ): Promise<IUser> {
    try {
      // Prepare update data
      const updateData: any = { ...updates };

      // Handle nested preferences update
      if (updates.preferences) {
        Object.keys(updates.preferences).forEach(key => {
          updateData[`preferences.${key}`] = updates.preferences![key as keyof typeof updates.preferences];
        });
        delete updateData.preferences;
      }

      const user = await User.findOneAndUpdate(
        {
          _id: userId,
          companyId,
          isDeleted: false
        },
        {
          ...updateData,
          updatedBy: new mongoose.Types.ObjectId(updatedBy),
          updatedAt: new Date()
        },
        {
          new: true,
          runValidators: true
        }
      ).select('-password -refreshToken -passwordResetToken');

      if (!user) {
        throw new Error('User not found');
      }

      logger.info('User updated successfully', {
        userId,
        companyId,
        updatedBy,
        updatedFields: Object.keys(updates)
      });

      return user;

    } catch (error) {
      logger.error('User update failed:', { userId, companyId, error });
      throw error;
    }
  }

  // Update user role and permissions
  static async updateUserRole(
    userId: string,
    companyId: string,
    roleData: UpdateUserRoleData,
    updatedBy: string
  ): Promise<IUser> {
    try {
      // Generate new permissions based on role
      const permissions = AuthUtils.generatePermissionsByRole(roleData.role);

      const user = await User.findOneAndUpdate(
        {
          _id: userId,
          companyId,
          isDeleted: false
        },
        {
          role: roleData.role,
          permissions,
          department: roleData.department,
          jobTitle: roleData.jobTitle,
          updatedBy: new mongoose.Types.ObjectId(updatedBy),
          updatedAt: new Date()
        },
        {
          new: true,
          runValidators: true
        }
      ).select('-password -refreshToken -passwordResetToken');

      if (!user) {
        throw new Error('User not found');
      }

      logger.info('User role updated successfully', {
        userId,
        companyId,
        newRole: roleData.role,
        updatedBy
      });

      return user;

    } catch (error) {
      logger.error('User role update failed:', { userId, companyId, error });
      throw error;
    }
  }

  // Activate user
  static async activateUser(
    userId: string,
    companyId: string,
    activatedBy: string
  ): Promise<IUser> {
    try {
      const user = await User.findOneAndUpdate(
        {
          _id: userId,
          companyId,
          isDeleted: false
        },
        {
          isActive: true,
          updatedBy: new mongoose.Types.ObjectId(activatedBy),
          updatedAt: new Date()
        },
        {
          new: true,
          runValidators: true
        }
      ).select('-password -refreshToken -passwordResetToken');

      if (!user) {
        throw new Error('User not found');
      }

      logger.info('User activated successfully', {
        userId,
        companyId,
        activatedBy,
        userEmail: user.email
      });

      return user;

    } catch (error) {
      logger.error('User activation failed:', { userId, companyId, error });
      throw error;
    }
  }

  // Deactivate user
  static async deactivateUser(
    userId: string,
    companyId: string,
    deactivatedBy: string
  ): Promise<IUser> {
    try {
      const user = await User.findOneAndUpdate(
        {
          _id: userId,
          companyId,
          isDeleted: false
        },
        {
          isActive: false,
          refreshToken: null, // Invalidate refresh token
          updatedBy: new mongoose.Types.ObjectId(deactivatedBy),
          updatedAt: new Date()
        },
        {
          new: true,
          runValidators: true
        }
      ).select('-password -refreshToken -passwordResetToken');

      if (!user) {
        throw new Error('User not found');
      }

      logger.info('User deactivated successfully', {
        userId,
        companyId,
        deactivatedBy,
        userEmail: user.email
      });

      return user;

    } catch (error) {
      logger.error('User deactivation failed:', { userId, companyId, error });
      throw error;
    }
  }

  // Soft delete user
  static async deleteUser(
    userId: string,
    companyId: string,
    deletedBy: string
  ): Promise<void> {
    try {
      const user = await User.findOneAndUpdate(
        {
          _id: userId,
          companyId,
          isDeleted: false
        },
        {
          isDeleted: true,
          isActive: false,
          refreshToken: null, // Invalidate refresh token
          deletedAt: new Date(),
          deletedBy: new mongoose.Types.ObjectId(deletedBy),
          updatedBy: new mongoose.Types.ObjectId(deletedBy),
          updatedAt: new Date()
        }
      );

      if (!user) {
        throw new Error('User not found');
      }

      logger.info('User deleted successfully', {
        userId,
        companyId,
        deletedBy,
        userEmail: user.email
      });

    } catch (error) {
      logger.error('User deletion failed:', { userId, companyId, error });
      throw error;
    }
  }

  // Get user activity summary
  static async getUserActivity(userId: string, companyId: string): Promise<{
    lastLogin?: Date;
    loginCount: number;
    isActive: boolean;
    accountAge: number; // in days
    invitationStatus: 'pending' | 'accepted' | 'not_invited';
  }> {
    try {
      const user = await User.findOne({
        _id: userId,
        companyId,
        isDeleted: false
      }).select('lastLogin isActive createdAt inviteToken inviteAcceptedAt');

      if (!user) {
        throw new Error('User not found');
      }

      const accountAge = Math.floor(
        (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      let invitationStatus: 'pending' | 'accepted' | 'not_invited' = 'not_invited';
      if (user.inviteToken) {
        invitationStatus = 'pending';
      } else if (user.inviteAcceptedAt) {
        invitationStatus = 'accepted';
      }

      return {
        lastLogin: user.lastLogin,
        loginCount: 0, // TODO: Implement login tracking
        isActive: user.isActive,
        accountAge,
        invitationStatus
      };

    } catch (error) {
      logger.error('Get user activity failed:', { userId, companyId, error });
      throw error;
    }
  }

  // Get users by role
  static async getUsersByRole(
    companyId: string,
    role: IUser['role']
  ): Promise<IUser[]> {
    try {
      const users = await User.find({
        companyId,
        role,
        isDeleted: false,
        isActive: true
      })
        .select('firstName lastName email department jobTitle')
        .sort({ firstName: 1, lastName: 1 })
        .lean();

      return users as IUser[];

    } catch (error) {
      logger.error('Get users by role failed:', { companyId, role, error });
      throw error;
    }
  }

  // Search users
  static async searchUsers(
    companyId: string,
    searchTerm: string,
    options: {
      limit?: number;
      excludeRoles?: IUser['role'][];
      includeInactive?: boolean;
    } = {}
  ): Promise<IUser[]> {
    try {
      const { limit = 20, excludeRoles = [], includeInactive = false } = options;

      const filter: any = {
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false,
        $or: [
          { firstName: { $regex: searchTerm, $options: 'i' } },
          { lastName: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { department: { $regex: searchTerm, $options: 'i' } },
          { jobTitle: { $regex: searchTerm, $options: 'i' } }
        ]
      };

      if (!includeInactive) {
        filter.isActive = true;
      }

      if (excludeRoles.length > 0) {
        filter.role = { $nin: excludeRoles };
      }

      const users = await User.find(filter)
        .select('firstName lastName email role department jobTitle isActive')
        .sort({ firstName: 1, lastName: 1 })
        .limit(limit)
        .lean();

      return users as IUser[];

    } catch (error) {
      logger.error('Search users failed:', { companyId, searchTerm, error });
      throw error;
    }
  }

  // Get user permissions
  static async getUserPermissions(userId: string, companyId: string): Promise<IUser['permissions']> {
    try {
      const user = await User.findOne({
        _id: userId,
        companyId,
        isDeleted: false,
        isActive: true
      }).select('permissions role');

      if (!user) {
        throw new Error('User not found');
      }

      return user.permissions;

    } catch (error) {
      logger.error('Get user permissions failed:', { userId, companyId, error });
      throw error;
    }
  }

  // Update user permissions (custom permissions override)
  static async updateUserPermissions(
    userId: string,
    companyId: string,
    permissions: Partial<IUser['permissions']>,
    updatedBy: string
  ): Promise<IUser> {
    try {
      const updateData: any = {};

      // Build nested permission updates
      Object.keys(permissions).forEach(resource => {
        const resourcePermissions = permissions[resource as keyof IUser['permissions']];
        if (resourcePermissions) {
          Object.keys(resourcePermissions).forEach(action => {
            updateData[`permissions.${resource}.${action}`] =
              resourcePermissions[action as keyof typeof resourcePermissions];
          });
        }
      });

      const user = await User.findOneAndUpdate(
        {
          _id: userId,
          companyId,
          isDeleted: false
        },
        {
          ...updateData,
          updatedBy: new mongoose.Types.ObjectId(updatedBy),
          updatedAt: new Date()
        },
        {
          new: true,
          runValidators: true
        }
      ).select('-password -refreshToken -passwordResetToken');

      if (!user) {
        throw new Error('User not found');
      }

      logger.info('User permissions updated successfully', {
        userId,
        companyId,
        updatedBy,
        updatedPermissions: Object.keys(permissions)
      });

      return user;

    } catch (error) {
      logger.error('User permissions update failed:', { userId, companyId, error });
      throw error;
    }
  }
}