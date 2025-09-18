import Role, { IRole } from '../models/Role';
import { logger } from '../config/logger';
import mongoose from 'mongoose';

export interface CreateRoleData {
  name: string;
  displayName: string;
  description?: string;
  color?: string;
  permissions: IRole['permissions'];
  companyId: string;
  createdBy: string;
}

export interface UpdateRoleData {
  displayName?: string;
  description?: string;
  color?: string;
  permissions?: IRole['permissions'];
  isActive?: boolean;
}

export class RoleService {
  // Create default system roles for a company
  static async createDefaultRoles(companyId: string, createdBy: string): Promise<IRole[]> {
    try {
      const defaultRoles = [
        {
          companyId,
          name: 'company_admin',
          displayName: 'Company Admin',
          description: 'Full access to all company features and settings',
          color: '#dc3545',
          permissions: {
            jobs: { create: true, read: true, update: true, delete: true },
            candidates: { create: true, read: true, update: true, delete: true },
            interviews: { create: true, read: true, update: true, delete: true },
            assessments: { create: true, read: true, update: true, delete: true },
            employees: { create: true, read: true, update: true, delete: true },
            workflows: { create: true, read: true, update: true, delete: true },
            reports: { read: true },
            settings: { read: true, update: true }
          },
          isSystem: true,
          createdBy: new mongoose.Types.ObjectId(createdBy),
          updatedBy: new mongoose.Types.ObjectId(createdBy)
        },
        {
          companyId,
          name: 'hr_manager',
          displayName: 'HR Manager',
          description: 'Manage employees, candidates, and HR-related activities',
          color: '#28a745',
          permissions: {
            jobs: { create: true, read: true, update: true, delete: false },
            candidates: { create: true, read: true, update: true, delete: false },
            interviews: { create: true, read: true, update: true, delete: false },
            assessments: { create: true, read: true, update: true, delete: false },
            employees: { create: true, read: true, update: true, delete: false },
            workflows: { create: true, read: true, update: true, delete: false },
            reports: { read: true },
            settings: { read: true, update: false }
          },
          isSystem: true,
          createdBy: new mongoose.Types.ObjectId(createdBy),
          updatedBy: new mongoose.Types.ObjectId(createdBy)
        },
        {
          companyId,
          name: 'recruiter',
          displayName: 'Recruiter',
          description: 'Manage job postings, candidates, and recruitment process',
          color: '#007bff',
          permissions: {
            jobs: { create: true, read: true, update: true, delete: false },
            candidates: { create: true, read: true, update: true, delete: false },
            interviews: { create: true, read: true, update: true, delete: false },
            assessments: { create: false, read: true, update: false, delete: false },
            employees: { create: false, read: true, update: false, delete: false },
            workflows: { create: false, read: true, update: false, delete: false },
            reports: { read: true },
            settings: { read: false, update: false }
          },
          isSystem: true,
          createdBy: new mongoose.Types.ObjectId(createdBy),
          updatedBy: new mongoose.Types.ObjectId(createdBy)
        },
        {
          companyId,
          name: 'interviewer',
          displayName: 'Interviewer',
          description: 'Conduct interviews and provide feedback on candidates',
          color: '#fd7e14',
          permissions: {
            jobs: { create: false, read: true, update: false, delete: false },
            candidates: { create: false, read: true, update: true, delete: false },
            interviews: { create: false, read: true, update: true, delete: false },
            assessments: { create: false, read: true, update: false, delete: false },
            employees: { create: false, read: true, update: false, delete: false },
            workflows: { create: false, read: false, update: false, delete: false },
            reports: { read: false },
            settings: { read: false, update: false }
          },
          isSystem: true,
          createdBy: new mongoose.Types.ObjectId(createdBy),
          updatedBy: new mongoose.Types.ObjectId(createdBy)
        },
        {
          companyId,
          name: 'hiring_manager',
          displayName: 'Hiring Manager',
          description: 'Review candidates and make hiring decisions',
          color: '#6f42c1',
          permissions: {
            jobs: { create: true, read: true, update: true, delete: false },
            candidates: { create: false, read: true, update: true, delete: false },
            interviews: { create: true, read: true, update: true, delete: false },
            assessments: { create: false, read: true, update: false, delete: false },
            employees: { create: false, read: true, update: false, delete: false },
            workflows: { create: true, read: true, update: true, delete: false },
            reports: { read: true },
            settings: { read: false, update: false }
          },
          isSystem: true,
          createdBy: new mongoose.Types.ObjectId(createdBy),
          updatedBy: new mongoose.Types.ObjectId(createdBy)
        }
      ];

      const roles = await Role.insertMany(defaultRoles);

      logger.info('Default roles created successfully', {
        companyId,
        roleCount: roles.length,
        roleNames: roles.map(r => r.name)
      });

      return roles as unknown as IRole[];

    } catch (error) {
      logger.error('Failed to create default roles:', { companyId, error });
      throw error;
    }
  }

  // Get all roles for a company
  static async getRoles(companyId: string): Promise<IRole[]> {
    try {
      const roles = await Role.find({
        companyId,
        isDeleted: false
      }).sort({ isSystem: -1, displayName: 1 });

      return roles;

    } catch (error) {
      logger.error('Failed to get roles:', { companyId, error });
      throw error;
    }
  }

  // Get role by ID
  static async getRoleById(roleId: string, companyId: string): Promise<IRole | null> {
    try {
      const role = await Role.findOne({
        _id: roleId,
        companyId,
        isDeleted: false
      });

      return role;

    } catch (error) {
      logger.error('Failed to get role by ID:', { roleId, companyId, error });
      throw error;
    }
  }

  // Get role by name
  static async getRoleByName(name: string, companyId: string): Promise<IRole | null> {
    try {
      const role = await Role.findOne({
        name: name.toLowerCase(),
        companyId,
        isDeleted: false
      });

      return role;

    } catch (error) {
      logger.error('Failed to get role by name:', { name, companyId, error });
      throw error;
    }
  }

  // Create custom role
  static async createRole(data: CreateRoleData): Promise<IRole> {
    try {
      // Check if role name already exists
      const existingRole = await this.getRoleByName(data.name, data.companyId);
      if (existingRole) {
        throw new Error('A role with this name already exists');
      }

      const roleData = {
        ...data,
        name: data.name.toLowerCase(),
        companyId: new mongoose.Types.ObjectId(data.companyId),
        createdBy: new mongoose.Types.ObjectId(data.createdBy),
        updatedBy: new mongoose.Types.ObjectId(data.createdBy),
        isSystem: false
      };

      const role = await Role.create(roleData);

      logger.info('Custom role created successfully', {
        roleId: role._id.toString(),
        roleName: role.name,
        companyId: data.companyId,
        createdBy: data.createdBy
      });

      return role;

    } catch (error) {
      logger.error('Failed to create role:', { data, error });
      throw error;
    }
  }

  // Update role
  static async updateRole(
    roleId: string,
    companyId: string,
    updates: UpdateRoleData,
    updatedBy: string
  ): Promise<IRole> {
    try {
      const role = await Role.findOneAndUpdate(
        {
          _id: roleId,
          companyId,
          isDeleted: false,
          isSystem: false // Only custom roles can be updated
        },
        {
          ...updates,
          updatedBy: new mongoose.Types.ObjectId(updatedBy),
          updatedAt: new Date()
        },
        {
          new: true,
          runValidators: true
        }
      );

      if (!role) {
        throw new Error('Role not found or cannot be updated');
      }

      logger.info('Role updated successfully', {
        roleId,
        companyId,
        updatedBy,
        updatedFields: Object.keys(updates)
      });

      return role;

    } catch (error) {
      logger.error('Failed to update role:', { roleId, companyId, error });
      throw error;
    }
  }

  // Delete role (soft delete)
  static async deleteRole(roleId: string, companyId: string, deletedBy: string): Promise<void> {
    try {
      const role = await Role.findOneAndUpdate(
        {
          _id: roleId,
          companyId,
          isDeleted: false,
          isSystem: false // Only custom roles can be deleted
        },
        {
          isDeleted: true,
          isActive: false,
          updatedBy: new mongoose.Types.ObjectId(deletedBy),
          updatedAt: new Date()
        }
      );

      if (!role) {
        throw new Error('Role not found or cannot be deleted');
      }

      logger.info('Role deleted successfully', {
        roleId,
        companyId,
        deletedBy,
        roleName: role.name
      });

    } catch (error) {
      logger.error('Failed to delete role:', { roleId, companyId, error });
      throw error;
    }
  }

  // Get default permissions for a role name (fallback for system roles)
  static getDefaultPermissions(roleName: string): IRole['permissions'] {
    const defaultPermissions = {
      company_admin: {
        jobs: { create: true, read: true, update: true, delete: true },
        candidates: { create: true, read: true, update: true, delete: true },
        interviews: { create: true, read: true, update: true, delete: true },
        assessments: { create: true, read: true, update: true, delete: true },
        employees: { create: true, read: true, update: true, delete: true },
        workflows: { create: true, read: true, update: true, delete: true },
        reports: { read: true },
        settings: { read: true, update: true }
      },
      hr_manager: {
        jobs: { create: true, read: true, update: true, delete: false },
        candidates: { create: true, read: true, update: true, delete: false },
        interviews: { create: true, read: true, update: true, delete: false },
        assessments: { create: true, read: true, update: true, delete: false },
        employees: { create: true, read: true, update: true, delete: false },
        workflows: { create: true, read: true, update: true, delete: false },
        reports: { read: true },
        settings: { read: true, update: false }
      },
      recruiter: {
        jobs: { create: true, read: true, update: true, delete: false },
        candidates: { create: true, read: true, update: true, delete: false },
        interviews: { create: true, read: true, update: true, delete: false },
        assessments: { create: false, read: true, update: false, delete: false },
        employees: { create: false, read: true, update: false, delete: false },
        workflows: { create: false, read: true, update: false, delete: false },
        reports: { read: true },
        settings: { read: false, update: false }
      },
      interviewer: {
        jobs: { create: false, read: true, update: false, delete: false },
        candidates: { create: false, read: true, update: true, delete: false },
        interviews: { create: false, read: true, update: true, delete: false },
        assessments: { create: false, read: true, update: false, delete: false },
        employees: { create: false, read: true, update: false, delete: false },
        workflows: { create: false, read: false, update: false, delete: false },
        reports: { read: false },
        settings: { read: false, update: false }
      },
      hiring_manager: {
        jobs: { create: true, read: true, update: true, delete: false },
        candidates: { create: false, read: true, update: true, delete: false },
        interviews: { create: true, read: true, update: true, delete: false },
        assessments: { create: false, read: true, update: false, delete: false },
        employees: { create: false, read: true, update: false, delete: false },
        workflows: { create: true, read: true, update: true, delete: false },
        reports: { read: true },
        settings: { read: false, update: false }
      }
    };

    return defaultPermissions[roleName as keyof typeof defaultPermissions] || {
      jobs: { create: false, read: false, update: false, delete: false },
      candidates: { create: false, read: false, update: false, delete: false },
      interviews: { create: false, read: false, update: false, delete: false },
      assessments: { create: false, read: false, update: false, delete: false },
      employees: { create: false, read: false, update: false, delete: false },
      workflows: { create: false, read: false, update: false, delete: false },
      reports: { read: false },
      settings: { read: false, update: false }
    };
  }
}