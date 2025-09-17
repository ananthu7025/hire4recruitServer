import { Request, Response } from 'express';
import { RoleService } from '../services/roleService';
import { logger } from '../config/logger';

export class RoleController {
  private static handleError(res: Response, error: any, operation: string, userMessage: string): void {
    logger.error(`${operation}:`, error);

    const statusCode = error.message?.includes('not found') ? 404 :
                      error.message?.includes('already exists') ? 409 :
                      error.message?.includes('Invalid') || error.message?.includes('validation') ? 400 :
                      500;

    res.status(statusCode).json({
      error: operation,
      message: userMessage,
      details: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  }

  // Get all roles for a company
  static async getRoles(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.user!;

      const roles = await RoleService.getRoles(companyId);

      res.status(200).json({
        success: true,
        data: roles,
        message: 'Roles retrieved successfully'
      });

    } catch (error) {
      RoleController.handleError(res, error, 'Get roles failed', 'Failed to retrieve roles');
    }
  }

  // Get role by ID
  static async getRoleById(req: Request, res: Response): Promise<void> {
    try {
      const { roleId } = req.params;
      const { companyId } = req.user!;

      const role = await RoleService.getRoleById(roleId, companyId);

      if (!role) {
        res.status(404).json({
          error: 'Role not found',
          message: 'Role not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: role,
        message: 'Role retrieved successfully'
      });

    } catch (error) {
      RoleController.handleError(res, error, 'Get role failed', 'Failed to retrieve role');
    }
  }

  // Create custom role
  static async createRole(req: Request, res: Response): Promise<void> {
    try {
      const { companyId, userId } = req.user!;
      const roleData = {
        ...req.body,
        companyId,
        createdBy: userId
      };

      const role = await RoleService.createRole(roleData);

      res.status(201).json({
        success: true,
        data: role,
        message: 'Role created successfully'
      });

    } catch (error) {
      RoleController.handleError(res, error, 'Create role failed', 'Failed to create role');
    }
  }

  // Update role
  static async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const { roleId } = req.params;
      const { companyId, userId } = req.user!;

      const role = await RoleService.updateRole(roleId, companyId, req.body, userId);

      res.status(200).json({
        success: true,
        data: role,
        message: 'Role updated successfully'
      });

    } catch (error) {
      RoleController.handleError(res, error, 'Update role failed', 'Failed to update role');
    }
  }

  // Delete role
  static async deleteRole(req: Request, res: Response): Promise<void> {
    try {
      const { roleId } = req.params;
      const { companyId, userId } = req.user!;

      await RoleService.deleteRole(roleId, companyId, userId);

      res.status(200).json({
        success: true,
        message: 'Role deleted successfully'
      });

    } catch (error) {
      RoleController.handleError(res, error, 'Delete role failed', 'Failed to delete role');
    }
  }
}