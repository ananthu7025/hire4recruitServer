import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employeeService';
import { logger } from '../config/logger';

export class EmployeeController {
  // Get employees with pagination and filters
  static async getEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const options = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        role: req.query.role as any,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        department: req.query.department as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      const result = await EmployeeService.getEmployees(req.user.companyId, options);

      res.status(200).json({
        success: true,
        data: {
          employees: result.employees,
          pagination: {
            currentPage: options.page,
            totalPages: result.totalPages,
            totalItems: result.total,
            itemsPerPage: options.limit
          }
        }
      });

    } catch (error) {
      logger.error('Get employees error:', error);

      res.status(500).json({
        error: 'Failed to get employees',
        message: 'An error occurred while fetching employees'
      });
    }
  }

  // Get employee by ID
  static async getEmployeeById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { employeeId } = req.params;
      const employee = await EmployeeService.getEmployeeById(employeeId, req.user.companyId);

      if (!employee) {
        res.status(404).json({
          error: 'User not found',
          message: 'The requested employee does not exist'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { employee }
      });

    } catch (error) {
      logger.error('Get employee by ID error:', error);

      res.status(500).json({
        error: 'Failed to get employee',
        message: 'An error occurred while fetching employee information'
      });
    }
  }

  // Update employee profile
  static async updateEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { employeeId } = req.params;
      const updates = req.body;

      const updatedUser = await EmployeeService.updateEmployee(
        employeeId,
        req.user.companyId,
        updates,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: { employee: updatedUser }
      });

    } catch (error) {
      logger.error('Update employee error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'The requested employee does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to update employee',
        message: 'An error occurred while updating employee information'
      });
    }
  }

  // Update employee role
  static async updateEmployeeRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { employeeId } = req.params;
      const { roleId, department, jobTitle } = req.body;

      const updatedUser = await EmployeeService.updateEmployeeRole(
        employeeId,
        req.user.companyId,
        { roleId, department, jobTitle },
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'User role updated successfully',
        data: { employee: updatedUser }
      });

    } catch (error) {
      logger.error('Update employee role error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'The requested employee does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to update employee role',
        message: 'An error occurred while updating employee role'
      });
    }
  }

  // Activate employee
  static async activateEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { employeeId } = req.params;

      const activatedUser = await EmployeeService.activateEmployee(
        employeeId,
        req.user.companyId,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'User activated successfully',
        data: { employee: activatedUser }
      });

    } catch (error) {
      logger.error('Activate employee error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'The requested employee does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to activate employee',
        message: 'An error occurred while activating employee'
      });
    }
  }

  // Deactivate employee
  static async deactivateEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { employeeId } = req.params;

      // Prevent employees from deactivating themselves
      if (employeeId === req.user.userId) {
        res.status(400).json({
          error: 'Cannot deactivate self',
          message: 'You cannot deactivate your own account'
        });
        return;
      }

      const deactivatedUser = await EmployeeService.deactivateEmployee(
        employeeId,
        req.user.companyId,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'User deactivated successfully',
        data: { employee: deactivatedUser }
      });

    } catch (error) {
      logger.error('Deactivate employee error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'The requested employee does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to deactivate employee',
        message: 'An error occurred while deactivating employee'
      });
    }
  }

  // Delete employee
  static async deleteEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { employeeId } = req.params;

      // Prevent employees from deleting themselves
      if (employeeId === req.user.userId) {
        res.status(400).json({
          error: 'Cannot delete self',
          message: 'You cannot delete your own account'
        });
        return;
      }

      await EmployeeService.deleteEmployee(
        employeeId,
        req.user.companyId,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      logger.error('Delete employee error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'The requested employee does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to delete employee',
        message: 'An error occurred while deleting employee'
      });
    }
  }

  // Get employee activity
  static async getEmployeeActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { employeeId } = req.params;
      const activity = await EmployeeService.getEmployeeActivity(employeeId, req.user.companyId);

      res.status(200).json({
        success: true,
        data: { activity }
      });

    } catch (error) {
      logger.error('Get employee activity error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'The requested employee does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to get employee activity',
        message: 'An error occurred while fetching employee activity'
      });
    }
  }

  // Get employees by role
  static async getEmployeesByRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { role } = req.params;
      const employees = await EmployeeService.getEmployeesByRole(req.user.companyId, role as any);

      res.status(200).json({
        success: true,
        data: { employees }
      });

    } catch (error) {
      logger.error('Get employees by role error:', error);

      res.status(500).json({
        error: 'Failed to get employees by role',
        message: 'An error occurred while fetching employees by role'
      });
    }
  }

  // Search employees
  static async searchEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const searchTerm = req.query.q as string;

      if (!searchTerm || searchTerm.trim().length < 2) {
        res.status(400).json({
          error: 'Invalid search term',
          message: 'Search term must be at least 2 characters long'
        });
        return;
      }

      const options = {
        limit: parseInt(req.query.limit as string) || 20,
        excludeRoles: req.query.excludeRoles ? (req.query.excludeRoles as string).split(',') as any[] : [],
        includeInactive: req.query.includeInactive === 'true'
      };

      const employees = await EmployeeService.searchEmployees(req.user.companyId, searchTerm, options);

      res.status(200).json({
        success: true,
        data: { employees }
      });

    } catch (error) {
      logger.error('Search employees error:', error);

      res.status(500).json({
        error: 'Failed to search employees',
        message: 'An error occurred while searching employees'
      });
    }
  }

  // Get employee permissions
  static async getEmployeePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { employeeId } = req.params;
      const permissions = await EmployeeService.getEmployeePermissions(employeeId, req.user.companyId);

      res.status(200).json({
        success: true,
        data: { permissions }
      });

    } catch (error) {
      logger.error('Get employee permissions error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'The requested employee does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to get employee permissions',
        message: 'An error occurred while fetching employee permissions'
      });
    }
  }

  // Update employee permissions
  static async updateEmployeePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { employeeId } = req.params;
      const permissions = req.body.permissions;

      const updatedUser = await EmployeeService.updateEmployeePermissions(
        employeeId,
        req.user.companyId,
        permissions,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'User permissions updated successfully',
        data: {
          employee: updatedUser,
          permissions: updatedUser.permissions
        }
      });

    } catch (error) {
      logger.error('Update employee permissions error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'The requested employee does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to update employee permissions',
        message: 'An error occurred while updating employee permissions'
      });
    }
  }
}