import { Request, Response, NextFunction } from 'express';
import { AssessmentService } from '../services/assessmentService';
import { logger } from '../config/logger';
import mongoose from 'mongoose';

export class AssessmentController {
  // Get assessments with filters and pagination
  static async getAssessments(req: Request, res: Response, next: NextFunction): Promise<void> {
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
        type: req.query.type as string,
        category: req.query.category as string,
        difficulty: req.query.difficulty as string,
        search: req.query.search as string,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      const result = await AssessmentService.getAssessments(new mongoose.Types.ObjectId(req.user.companyId), options);

      res.status(200).json({
        success: true,
        data: {
          assessments: result.assessments,
          pagination: {
            page: options.page,
            limit: options.limit,
            total: result.total,
            pages: result.totalPages
          }
        }
      });

    } catch (error) {
      logger.error('Get assessments error:', error);
      res.status(500).json({
        error: 'Failed to get assessments',
        message: 'An error occurred while fetching assessments'
      });
    }
  }

  // Create new assessment
  static async createAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const assessmentData = {
        title: req.body.title,
        description: req.body.description,
        type: req.body.type,
        category: req.body.category,
        difficulty: req.body.difficulty,
        relatedRoles: req.body.relatedRoles,
        requiredSkills: req.body.requiredSkills,
        industry: req.body.industry,
        questions: req.body.questions,
        totalPoints: req.body.totalPoints,
        timeLimit: req.body.timeLimit,
        passingScore: req.body.passingScore,
        allowRetake: req.body.allowRetake,
        showResults: req.body.showResults
      };

      // Basic validation
      if (!assessmentData.title || !assessmentData.type || !assessmentData.category) {
        res.status(400).json({
          error: 'Missing required fields',
          message: 'title, type, and category are required'
        });
        return;
      }

      if (!assessmentData.questions || assessmentData.questions.length === 0) {
        res.status(400).json({
          error: 'Missing questions',
          message: 'Assessment must have at least one question'
        });
        return;
      }

      const assessment = await AssessmentService.createAssessment(
        assessmentData,
        new mongoose.Types.ObjectId(req.user.companyId),
        new mongoose.Types.ObjectId(req.user.userId)
      );

      res.status(201).json({
        success: true,
        message: 'Assessment created successfully',
        data: { assessment }
      });

    } catch (error) {
      logger.error('Create assessment error:', error);
      res.status(500).json({
        error: 'Failed to create assessment',
        message: 'An error occurred while creating the assessment'
      });
    }
  }

  // Get assessment by ID
  static async getAssessmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { assessmentId } = req.params;
      const assessment = await AssessmentService.getAssessmentById(assessmentId, new mongoose.Types.ObjectId(req.user.companyId));

      if (!assessment) {
        res.status(404).json({
          error: 'Assessment not found',
          message: 'The requested assessment does not exist'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { assessment }
      });

    } catch (error) {
      logger.error('Get assessment by ID error:', error);
      res.status(500).json({
        error: 'Failed to get assessment',
        message: 'An error occurred while fetching assessment details'
      });
    }
  }

  // Update assessment
  static async updateAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { assessmentId } = req.params;
      const updates = req.body;

      const assessment = await AssessmentService.updateAssessment(
        assessmentId,
        new mongoose.Types.ObjectId(req.user.companyId),
        updates,
        new mongoose.Types.ObjectId(req.user.userId)
      );

      res.status(200).json({
        success: true,
        message: 'Assessment updated successfully',
        data: { assessment }
      });

    } catch (error) {
      logger.error('Update assessment error:', error);

      if (error instanceof Error && error.message === 'Assessment not found') {
        res.status(404).json({
          error: 'Assessment not found',
          message: error.message
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to update assessment',
        message: 'An error occurred while updating the assessment'
      });
    }
  }

  // Assign assessment to job
  static async assignAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { assessmentId } = req.params;
      const { jobId } = req.body;

      if (!jobId) {
        res.status(400).json({
          error: 'Missing required field',
          message: 'jobId is required'
        });
        return;
      }

      const assessment = await AssessmentService.assignAssessmentToJob(
        assessmentId,
        jobId,
        new mongoose.Types.ObjectId(req.user.companyId)
      );

      res.status(200).json({
        success: true,
        message: 'Assessment assigned to job successfully',
        data: { assessment }
      });

    } catch (error) {
      logger.error('Assign assessment error:', error);

      if (error instanceof Error) {
        if (error.message === 'Assessment not found' || error.message === 'Job not found') {
          res.status(404).json({
            error: 'Not found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Failed to assign assessment',
        message: 'An error occurred while assigning the assessment'
      });
    }
  }

  // Get assessment results
  static async getAssessmentResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { assessmentId } = req.params;
      const options = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        status: req.query.status as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      // For now, return placeholder data - requires service method implementation
      res.status(200).json({
        success: true,
        data: {
          results: [],
          statistics: {
            totalAssignments: 0,
            completed: 0,
            averageScore: 0,
            passRate: 0
          },
          pagination: {
            currentPage: options.page,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: options.limit
          },
          note: 'Assessment results endpoint requires service implementation'
        }
      });

    } catch (error) {
      logger.error('Get assessment results error:', error);
      res.status(500).json({
        error: 'Failed to get assessment results',
        message: 'An error occurred while fetching assessment results'
      });
    }
  }

  // Get assessment analytics
  static async getAssessmentAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { assessmentId } = req.params;

      const analytics = await AssessmentService.getAssessmentAnalytics(
        assessmentId,
        new mongoose.Types.ObjectId(req.user.companyId)
      );

      res.status(200).json({
        success: true,
        data: { analytics }
      });

    } catch (error) {
      logger.error('Get assessment analytics error:', error);

      if (error instanceof Error && error.message === 'Assessment not found') {
        res.status(404).json({
          error: 'Assessment not found',
          message: 'The requested assessment does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to get assessment analytics',
        message: 'An error occurred while fetching assessment analytics'
      });
    }
  }

  // Delete assessment (soft delete)
  static async deleteAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { assessmentId } = req.params;

      const assessment = await AssessmentService.deleteAssessment(
        assessmentId,
        new mongoose.Types.ObjectId(req.user.companyId),
        new mongoose.Types.ObjectId(req.user.userId)
      );

      res.status(200).json({
        success: true,
        message: 'Assessment deleted successfully'
      });

    } catch (error) {
      logger.error('Delete assessment error:', error);

      if (error instanceof Error && error.message === 'Assessment not found') {
        res.status(404).json({
          error: 'Assessment not found',
          message: error.message
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to delete assessment',
        message: 'An error occurred while deleting the assessment'
      });
    }
  }

  // Get assessment templates
  static async getAssessmentTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const options = {
        category: req.query.category as string,
        difficulty: req.query.difficulty as string,
        skillArea: req.query.skillArea as string
      };

      // For now, return placeholder templates - requires service method implementation
      res.status(200).json({
        success: true,
        data: {
          templates: [],
          note: 'Assessment templates endpoint requires service implementation'
        }
      });

    } catch (error) {
      logger.error('Get assessment templates error:', error);
      res.status(500).json({
        error: 'Failed to get assessment templates',
        message: 'An error occurred while fetching assessment templates'
      });
    }
  }

  // Create assessment from template
  static async createFromTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { templateId } = req.params;
      const assessmentData = req.body;

      // For now, return placeholder data - requires service method implementation
      res.status(201).json({
        success: true,
        message: 'Assessment creation from template acknowledged',
        data: {
          assessment: {
            id: `generated-${Date.now()}`,
            title: assessmentData.title || 'Assessment from Template',
            templateId: templateId,
            companyId: req.user.companyId,
            createdBy: req.user.userId,
            status: 'draft'
          },
          note: 'Template-based creation endpoint requires service implementation'
        }
      });

    } catch (error) {
      logger.error('Create from template error:', error);
      res.status(500).json({
        error: 'Failed to create assessment from template',
        message: 'An error occurred while creating assessment from template'
      });
    }
  }

  // Duplicate assessment
  static async duplicateAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { assessmentId } = req.params;
      const { title } = req.body;

      const assessment = await AssessmentService.duplicateAssessment(
        assessmentId,
        new mongoose.Types.ObjectId(req.user.companyId),
        new mongoose.Types.ObjectId(req.user.userId),
        title
      );

      res.status(201).json({
        success: true,
        message: 'Assessment duplicated successfully',
        data: { assessment }
      });

    } catch (error) {
      logger.error('Duplicate assessment error:', error);

      if (error instanceof Error && error.message === 'Assessment not found') {
        res.status(404).json({
          error: 'Assessment not found',
          message: error.message
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to duplicate assessment',
        message: 'An error occurred while duplicating the assessment'
      });
    }
  }

  // Get assessments by job
  static async getAssessmentsByJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { jobId } = req.params;

      const assessments = await AssessmentService.getAssessmentsByJob(
        jobId,
        new mongoose.Types.ObjectId(req.user.companyId)
      );

      res.status(200).json({
        success: true,
        data: { assessments }
      });

    } catch (error) {
      logger.error('Get assessments by job error:', error);
      res.status(500).json({
        error: 'Failed to get assessments',
        message: 'An error occurred while fetching job assessments'
      });
    }
  }
}