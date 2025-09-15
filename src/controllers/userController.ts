import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';
import { logger } from '../config/logger';

export class UserController {
  // Get users with pagination and filters
  static async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const result = await UserService.getUsers(req.user.companyId, options);

      res.status(200).json({
        success: true,
        data: {
          users: result.users,
          pagination: {
            currentPage: options.page,
            totalPages: result.totalPages,
            totalItems: result.total,
            itemsPerPage: options.limit
          }
        }
      });

    } catch (error) {
      logger.error('Get users error:', error);

      res.status(500).json({
        error: 'Failed to get users',
        message: 'An error occurred while fetching users'
      });
    }
  }

  // Get user by ID
  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { userId } = req.params;
      const user = await UserService.getUserById(userId, req.user.companyId);

      if (!user) {
        res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { user }
      });

    } catch (error) {
      logger.error('Get user by ID error:', error);

      res.status(500).json({
        error: 'Failed to get user',
        message: 'An error occurred while fetching user information'
      });
    }
  }

  // Update user profile
  static async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { userId } = req.params;
      const updates = req.body;

      const updatedUser = await UserService.updateUser(
        userId,
        req.user.companyId,
        updates,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: { user: updatedUser }
      });

    } catch (error) {
      logger.error('Update user error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to update user',
        message: 'An error occurred while updating user information'
      });
    }
  }

  // Update user role
  static async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { userId } = req.params;
      const { role, department, jobTitle } = req.body;

      const updatedUser = await UserService.updateUserRole(
        userId,
        req.user.companyId,
        { role, department, jobTitle },
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'User role updated successfully',
        data: { user: updatedUser }
      });

    } catch (error) {
      logger.error('Update user role error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to update user role',
        message: 'An error occurred while updating user role'
      });
    }
  }

  // Activate user
  static async activateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { userId } = req.params;

      const activatedUser = await UserService.activateUser(
        userId,
        req.user.companyId,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'User activated successfully',
        data: { user: activatedUser }
      });

    } catch (error) {
      logger.error('Activate user error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to activate user',
        message: 'An error occurred while activating user'
      });
    }
  }

  // Deactivate user
  static async deactivateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { userId } = req.params;

      // Prevent users from deactivating themselves
      if (userId === req.user.userId) {
        res.status(400).json({
          error: 'Cannot deactivate self',
          message: 'You cannot deactivate your own account'
        });
        return;
      }

      const deactivatedUser = await UserService.deactivateUser(
        userId,
        req.user.companyId,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'User deactivated successfully',
        data: { user: deactivatedUser }
      });

    } catch (error) {
      logger.error('Deactivate user error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to deactivate user',
        message: 'An error occurred while deactivating user'
      });
    }
  }

  // Delete user
  static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { userId } = req.params;

      // Prevent users from deleting themselves
      if (userId === req.user.userId) {
        res.status(400).json({
          error: 'Cannot delete self',
          message: 'You cannot delete your own account'
        });
        return;
      }

      await UserService.deleteUser(
        userId,
        req.user.companyId,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      logger.error('Delete user error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to delete user',
        message: 'An error occurred while deleting user'
      });
    }
  }

  // Get user activity
  static async getUserActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { userId } = req.params;
      const activity = await UserService.getUserActivity(userId, req.user.companyId);

      res.status(200).json({
        success: true,
        data: { activity }
      });

    } catch (error) {
      logger.error('Get user activity error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to get user activity',
        message: 'An error occurred while fetching user activity'
      });
    }
  }

  // Get users by role
  static async getUsersByRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { role } = req.params;
      const users = await UserService.getUsersByRole(req.user.companyId, role as any);

      res.status(200).json({
        success: true,
        data: { users }
      });

    } catch (error) {
      logger.error('Get users by role error:', error);

      res.status(500).json({
        error: 'Failed to get users by role',
        message: 'An error occurred while fetching users by role'
      });
    }
  }

  // Search users
  static async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const users = await UserService.searchUsers(req.user.companyId, searchTerm, options);

      res.status(200).json({
        success: true,
        data: { users }
      });

    } catch (error) {
      logger.error('Search users error:', error);

      res.status(500).json({
        error: 'Failed to search users',
        message: 'An error occurred while searching users'
      });
    }
  }

  // Get user permissions
  static async getUserPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { userId } = req.params;
      const permissions = await UserService.getUserPermissions(userId, req.user.companyId);

      res.status(200).json({
        success: true,
        data: { permissions }
      });

    } catch (error) {
      logger.error('Get user permissions error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to get user permissions',
        message: 'An error occurred while fetching user permissions'
      });
    }
  }

  // Update user permissions
  static async updateUserPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { userId } = req.params;
      const permissions = req.body.permissions;

      const updatedUser = await UserService.updateUserPermissions(
        userId,
        req.user.companyId,
        permissions,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'User permissions updated successfully',
        data: {
          user: updatedUser,
          permissions: updatedUser.permissions
        }
      });

    } catch (error) {
      logger.error('Update user permissions error:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to update user permissions',
        message: 'An error occurred while updating user permissions'
      });
    }
  }
}