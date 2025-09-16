import Employee, { IEmployee } from '../models/Employee';
import { AuthUtils } from '../utils/auth';
import { logger } from '../config/logger';
import mongoose from 'mongoose';

export interface UpdateEmployeeData {
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

export interface UpdateEmployeeRoleData {
  role: IEmployee['role'];
  department?: string;
  jobTitle?: string;
}

export class EmployeeService {
  // Get employee by ID
  static async getEmployeeById(employeeId: string, companyId: string): Promise<IEmployee | null> {
    try {
      const employee = await Employee.findOne({
        _id: employeeId,
        companyId,
        isDeleted: false
      })
        .select('-password -refreshToken -passwordResetToken')
        .populate('createdBy', 'firstName lastName email')
        .populate('invitedBy', 'firstName lastName email');

      return employee;
    } catch (error) {
      logger.error('Get employee by ID failed:', { employeeId, companyId, error });
      throw error;
    }
  }

  // Get employees with pagination and filters
  static async getEmployees(
    companyId: string,
    options: {
      page?: number;
      limit?: number;
      role?: IEmployee['role'];
      isActive?: boolean;
      department?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ employees: IEmployee[]; total: number; totalPages: number }> {
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

      const [employees, total] = await Promise.all([
        Employee.find(filter)
          .select('-password -refreshToken -passwordResetToken')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('createdBy', 'firstName lastName email')
          .populate('invitedBy', 'firstName lastName email')
          .lean(),
        Employee.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      return { employees: employees as IEmployee[], total, totalPages };

    } catch (error) {
      logger.error('Get employees failed:', { companyId, error });
      throw error;
    }
  }

  // Update employee profile
  static async updateEmployee(
    employeeId: string,
    companyId: string,
    updates: UpdateEmployeeData,
    updatedBy: string
  ): Promise<IEmployee> {
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

      const employee = await Employee.findOneAndUpdate(
        {
          _id: employeeId,
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

      if (!employee) {
        throw new Error('User not found');
      }

      logger.info('User updated successfully', {
        employeeId,
        companyId,
        updatedBy,
        updatedFields: Object.keys(updates)
      });

      return employee;

    } catch (error) {
      logger.error('User update failed:', { employeeId, companyId, error });
      throw error;
    }
  }

  // Update employee role and permissions
  static async updateEmployeeRole(
    employeeId: string,
    companyId: string,
    roleData: UpdateEmployeeRoleData,
    updatedBy: string
  ): Promise<IEmployee> {
    try {
      // Generate new permissions based on role
      const permissions = AuthUtils.generatePermissionsByRole(roleData.role);

      const employee = await Employee.findOneAndUpdate(
        {
          _id: employeeId,
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

      if (!employee) {
        throw new Error('User not found');
      }

      logger.info('User role updated successfully', {
        employeeId,
        companyId,
        newRole: roleData.role,
        updatedBy
      });

      return employee;

    } catch (error) {
      logger.error('User role update failed:', { employeeId, companyId, error });
      throw error;
    }
  }

  // Activate employee
  static async activateEmployee(
    employeeId: string,
    companyId: string,
    activatedBy: string
  ): Promise<IEmployee> {
    try {
      const employee = await Employee.findOneAndUpdate(
        {
          _id: employeeId,
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

      if (!employee) {
        throw new Error('User not found');
      }

      logger.info('User activated successfully', {
        employeeId,
        companyId,
        activatedBy,
        employeeEmail: employee.email
      });

      return employee;

    } catch (error) {
      logger.error('User activation failed:', { employeeId, companyId, error });
      throw error;
    }
  }

  // Deactivate employee
  static async deactivateEmployee(
    employeeId: string,
    companyId: string,
    deactivatedBy: string
  ): Promise<IEmployee> {
    try {
      const employee = await Employee.findOneAndUpdate(
        {
          _id: employeeId,
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

      if (!employee) {
        throw new Error('User not found');
      }

      logger.info('User deactivated successfully', {
        employeeId,
        companyId,
        deactivatedBy,
        employeeEmail: employee.email
      });

      return employee;

    } catch (error) {
      logger.error('User deactivation failed:', { employeeId, companyId, error });
      throw error;
    }
  }

  // Soft delete employee
  static async deleteEmployee(
    employeeId: string,
    companyId: string,
    deletedBy: string
  ): Promise<void> {
    try {
      const employee = await Employee.findOneAndUpdate(
        {
          _id: employeeId,
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

      if (!employee) {
        throw new Error('User not found');
      }

      logger.info('User deleted successfully', {
        employeeId,
        companyId,
        deletedBy,
        employeeEmail: employee.email
      });

    } catch (error) {
      logger.error('User deletion failed:', { employeeId, companyId, error });
      throw error;
    }
  }

  // Get employee activity summary
  static async getEmployeeActivity(employeeId: string, companyId: string): Promise<{
    lastLogin?: Date;
    loginCount: number;
    isActive: boolean;
    accountAge: number; // in days
    invitationStatus: 'pending' | 'accepted' | 'not_invited';
  }> {
    try {
      const employee = await Employee.findOne({
        _id: employeeId,
        companyId,
        isDeleted: false
      }).select('lastLogin isActive createdAt inviteToken inviteAcceptedAt');

      if (!employee) {
        throw new Error('User not found');
      }

      const accountAge = Math.floor(
        (Date.now() - employee.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      let invitationStatus: 'pending' | 'accepted' | 'not_invited' = 'not_invited';
      if (employee.inviteToken) {
        invitationStatus = 'pending';
      } else if (employee.inviteAcceptedAt) {
        invitationStatus = 'accepted';
      }

      return {
        lastLogin: employee.lastLogin,
        loginCount: 0, // TODO: Implement login tracking
        isActive: employee.isActive,
        accountAge,
        invitationStatus
      };

    } catch (error) {
      logger.error('Get employee activity failed:', { employeeId, companyId, error });
      throw error;
    }
  }

  // Get employees by role
  static async getEmployeesByRole(
    companyId: string,
    role: IEmployee['role']
  ): Promise<IEmployee[]> {
    try {
      const employees = await Employee.find({
        companyId,
        role,
        isDeleted: false,
        isActive: true
      })
        .select('firstName lastName email department jobTitle')
        .sort({ firstName: 1, lastName: 1 })
        .lean();

      return employees as IEmployee[];

    } catch (error) {
      logger.error('Get employees by role failed:', { companyId, role, error });
      throw error;
    }
  }

  // Search employees
  static async searchEmployees(
    companyId: string,
    searchTerm: string,
    options: {
      limit?: number;
      excludeRoles?: IEmployee['role'][];
      includeInactive?: boolean;
    } = {}
  ): Promise<IEmployee[]> {
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

      const employees = await Employee.find(filter)
        .select('firstName lastName email role department jobTitle isActive')
        .sort({ firstName: 1, lastName: 1 })
        .limit(limit)
        .lean();

      return employees as IEmployee[];

    } catch (error) {
      logger.error('Search employees failed:', { companyId, searchTerm, error });
      throw error;
    }
  }

  // Get employee permissions
  static async getEmployeePermissions(employeeId: string, companyId: string): Promise<IEmployee['permissions']> {
    try {
      const employee = await Employee.findOne({
        _id: employeeId,
        companyId,
        isDeleted: false,
        isActive: true
      }).select('permissions role');

      if (!employee) {
        throw new Error('User not found');
      }

      return employee.permissions;

    } catch (error) {
      logger.error('Get employee permissions failed:', { employeeId, companyId, error });
      throw error;
    }
  }

  // Update employee permissions (custom permissions override)
  static async updateEmployeePermissions(
    employeeId: string,
    companyId: string,
    permissions: Partial<IEmployee['permissions']>,
    updatedBy: string
  ): Promise<IEmployee> {
    try {
      const updateData: any = {};

      // Build nested permission updates
      Object.keys(permissions).forEach(resource => {
        const resourcePermissions = permissions[resource as keyof IEmployee['permissions']];
        if (resourcePermissions) {
          Object.keys(resourcePermissions).forEach(action => {
            updateData[`permissions.${resource}.${action}`] =
              resourcePermissions[action as keyof typeof resourcePermissions];
          });
        }
      });

      const employee = await Employee.findOneAndUpdate(
        {
          _id: employeeId,
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

      if (!employee) {
        throw new Error('User not found');
      }

      logger.info('User permissions updated successfully', {
        employeeId,
        companyId,
        updatedBy,
        updatedPermissions: Object.keys(permissions)
      });

      return employee;

    } catch (error) {
      logger.error('User permissions update failed:', { employeeId, companyId, error });
      throw error;
    }
  }
}