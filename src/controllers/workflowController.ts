import { Request, Response } from 'express';
import { WorkflowService, CreateWorkflowData, UpdateWorkflowData } from '../services/workflowService';
import { logger } from '../config/logger';

export class WorkflowController {
  // Create new workflow
  static async createWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const workflowData: CreateWorkflowData = req.body;
      const companyId = req.user!.companyId;
      const createdBy = req.user!.userId;

      const workflow = await WorkflowService.createWorkflow(workflowData, companyId, createdBy);

      res.status(201).json({
        success: true,
        message: 'Workflow created successfully',
        data: workflow
      });
    } catch (error) {
      logger.error('Error in createWorkflow controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create workflow',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get workflow by ID
  static async getWorkflowById(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const companyId = req.user!.companyId;

      const workflow = await WorkflowService.getWorkflowById(workflowId, companyId);

      if (!workflow) {
        res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
        return;
      }

      res.json({
        success: true,
        data: workflow
      });
    } catch (error) {
      logger.error('Error in getWorkflowById controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get workflow',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get all workflows with filters and pagination
  static async getWorkflows(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      // Extract query parameters
      const {
        page = 1,
        limit = 10,
        isTemplate,
        isActive,
        search
      } = req.query;

      const filters: any = {};
      if (isTemplate !== undefined) {
        filters.isTemplate = isTemplate === 'true';
      }
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }
      if (search) {
        filters.search = search as string;
      }

      const pagination = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10)
      };

      const result = await WorkflowService.getWorkflows(companyId, filters, pagination);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in getWorkflows controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get workflows',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Update workflow
  static async updateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const updateData: UpdateWorkflowData = req.body;
      const companyId = req.user!.companyId;
      const updatedBy = req.user!.userId;

      const workflow = await WorkflowService.updateWorkflow(workflowId, updateData, companyId, updatedBy);

      if (!workflow) {
        res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Workflow updated successfully',
        data: workflow
      });
    } catch (error) {
      logger.error('Error in updateWorkflow controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update workflow',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Delete workflow
  static async deleteWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const companyId = req.user!.companyId;
      const deletedBy = req.user!.userId;

      const deleted = await WorkflowService.deleteWorkflow(workflowId, companyId, deletedBy);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Workflow deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteWorkflow controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete workflow',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Clone workflow
  static async cloneWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const { name: newName } = req.body;
      const companyId = req.user!.companyId;
      const createdBy = req.user!.userId;

      const clonedWorkflow = await WorkflowService.cloneWorkflow(workflowId, companyId, createdBy, newName);

      if (!clonedWorkflow) {
        res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: 'Workflow cloned successfully',
        data: clonedWorkflow
      });
    } catch (error) {
      logger.error('Error in cloneWorkflow controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clone workflow',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Optimize workflow with AI
  static async optimizeWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const companyId = req.user!.companyId;

      const optimizedWorkflow = await WorkflowService.optimizeWorkflow(workflowId, companyId);

      if (!optimizedWorkflow) {
        res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Workflow optimized successfully',
        data: optimizedWorkflow
      });
    } catch (error) {
      logger.error('Error in optimizeWorkflow controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to optimize workflow',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get workflow analytics
  static async getWorkflowAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const companyId = req.user!.companyId;

      const analytics = await WorkflowService.getWorkflowAnalytics(workflowId, companyId);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error in getWorkflowAnalytics controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get workflow analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get workflow templates
  static async getWorkflowTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = await WorkflowService.getWorkflowTemplates();

      res.json({
        success: true,
        data: {
          templates,
          total: templates.length
        }
      });
    } catch (error) {
      logger.error('Error in getWorkflowTemplates controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get workflow templates',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Activate/Deactivate workflow
  static async toggleWorkflowStatus(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const { isActive } = req.body;
      const companyId = req.user!.companyId;
      const updatedBy = req.user!.userId;

      const workflow = await WorkflowService.updateWorkflow(
        workflowId,
        { isActive },
        companyId,
        updatedBy
      );

      if (!workflow) {
        res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
        return;
      }

      res.json({
        success: true,
        message: `Workflow ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: workflow
      });
    } catch (error) {
      logger.error('Error in toggleWorkflowStatus controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update workflow status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get workflow usage statistics
  static async getWorkflowStats(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      // Get basic stats
      const totalWorkflows = await WorkflowService.getWorkflows(companyId, {}, { page: 1, limit: 1 });
      const activeWorkflows = await WorkflowService.getWorkflows(companyId, { isActive: true }, { page: 1, limit: 1 });
      const templates = await WorkflowService.getWorkflowTemplates();

      const stats = {
        total: totalWorkflows.total,
        active: activeWorkflows.total,
        inactive: totalWorkflows.total - activeWorkflows.total,
        templates: templates.length,
        averageStages: 0, // You can calculate this based on actual data
        mostUsedTemplate: templates.length > 0 ? templates[0] : null
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error in getWorkflowStats controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get workflow statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}