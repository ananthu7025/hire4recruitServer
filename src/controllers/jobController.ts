import { Request, Response, NextFunction } from 'express';
import { JobService } from '../services/jobService';
import { logger } from '../config/logger';

export class JobController {
  // Create new job
  static async createJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const jobData = req.body;
      const job = await JobService.createJob(jobData, req.user.companyId, req.user.userId);

      res.status(201).json({
        success: true,
        message: 'Job created successfully',
        data: { job }
      });

    } catch (error) {
      logger.error('Create job error:', error);

      res.status(500).json({
        error: 'Failed to create job',
        message: 'An error occurred while creating the job'
      });
    }
  }

  // Get jobs with filters and pagination
  static async getJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
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
        status: req.query.status as string,
        department: req.query.department as string,
        type: req.query.type as string,
        workMode: req.query.workMode as string,
        hiringManager: req.query.hiringManager as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      const result = await JobService.getJobs(req.user.companyId, options);

      res.status(200).json({
        success: true,
        data: {
          jobs: result.jobs,
          pagination: {
            currentPage: options.page,
            totalPages: result.totalPages,
            totalItems: result.total,
            itemsPerPage: options.limit
          }
        }
      });

    } catch (error) {
      logger.error('Get jobs error:', error);

      res.status(500).json({
        error: 'Failed to get jobs',
        message: 'An error occurred while fetching jobs'
      });
    }
  }

  // Get job by ID
  static async getJobById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { jobId } = req.params;
      const job = await JobService.getJobById(jobId, req.user.companyId);

      if (!job) {
        res.status(404).json({
          error: 'Job not found',
          message: 'The requested job does not exist'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { job }
      });

    } catch (error) {
      logger.error('Get job by ID error:', error);

      res.status(500).json({
        error: 'Failed to get job',
        message: 'An error occurred while fetching job details'
      });
    }
  }

  // Update job
  static async updateJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { jobId } = req.params;
      const updates = req.body;

      const job = await JobService.updateJob(jobId, req.user.companyId, updates, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Job updated successfully',
        data: { job }
      });

    } catch (error) {
      logger.error('Update job error:', error);

      if (error instanceof Error && error.message === 'Job not found') {
        res.status(404).json({
          error: 'Job not found',
          message: 'The requested job does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to update job',
        message: 'An error occurred while updating the job'
      });
    }
  }

  // Delete job
  static async deleteJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { jobId } = req.params;

      await JobService.deleteJob(jobId, req.user.companyId, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Job deleted successfully'
      });

    } catch (error) {
      logger.error('Delete job error:', error);

      if (error instanceof Error && error.message === 'Job not found') {
        res.status(404).json({
          error: 'Job not found',
          message: 'The requested job does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to delete job',
        message: 'An error occurred while deleting the job'
      });
    }
  }

  // Publish job
  static async publishJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { jobId } = req.params;

      const job = await JobService.publishJob(jobId, req.user.companyId, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Job published successfully',
        data: { job }
      });

    } catch (error) {
      logger.error('Publish job error:', error);

      if (error instanceof Error && error.message === 'Job not found') {
        res.status(404).json({
          error: 'Job not found',
          message: 'The requested job does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to publish job',
        message: 'An error occurred while publishing the job'
      });
    }
  }

  // Clone job
  static async cloneJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { jobId } = req.params;

      const clonedJob = await JobService.cloneJob(jobId, req.user.companyId, req.user.userId);

      res.status(201).json({
        success: true,
        message: 'Job cloned successfully',
        data: { job: clonedJob }
      });

    } catch (error) {
      logger.error('Clone job error:', error);

      if (error instanceof Error && error.message === 'Original job not found') {
        res.status(404).json({
          error: 'Job not found',
          message: 'The original job does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to clone job',
        message: 'An error occurred while cloning the job'
      });
    }
  }

  // Get job analytics
  static async getJobAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { jobId } = req.params;

      const analytics = await JobService.getJobAnalytics(jobId, req.user.companyId);

      res.status(200).json({
        success: true,
        data: { analytics }
      });

    } catch (error) {
      logger.error('Get job analytics error:', error);

      if (error instanceof Error && error.message === 'Job not found') {
        res.status(404).json({
          error: 'Job not found',
          message: 'The requested job does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to get job analytics',
        message: 'An error occurred while fetching job analytics'
      });
    }
  }

  // Search jobs by skills
  static async searchJobsBySkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const skills = req.query.skills as string;

      if (!skills) {
        res.status(400).json({
          error: 'Missing skills parameter',
          message: 'Skills parameter is required'
        });
        return;
      }

      const skillsArray = skills.split(',').map(s => s.trim());
      const limit = parseInt(req.query.limit as string) || 20;

      const jobs = await JobService.searchJobsBySkills(
        skillsArray,
        req.user?.companyId, // Optional company filter
        { limit }
      );

      res.status(200).json({
        success: true,
        data: { jobs }
      });

    } catch (error) {
      logger.error('Search jobs by skills error:', error);

      res.status(500).json({
        error: 'Failed to search jobs',
        message: 'An error occurred while searching jobs'
      });
    }
  }

  // Get company job statistics
  static async getCompanyJobStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const stats = await JobService.getCompanyJobStats(req.user.companyId);

      res.status(200).json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      logger.error('Get company job stats error:', error);

      res.status(500).json({
        error: 'Failed to get job statistics',
        message: 'An error occurred while fetching job statistics'
      });
    }
  }

  // Get job applications
  static async getJobApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { jobId } = req.params;
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
          applications: [],
          pagination: {
            currentPage: options.page,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: options.limit
          },
          note: 'Job applications endpoint requires service implementation'
        }
      });

    } catch (error) {
      logger.error('Get job applications error:', error);

      if (error instanceof Error && error.message === 'Job not found') {
        res.status(404).json({
          error: 'Job not found',
          message: 'The requested job does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to get job applications',
        message: 'An error occurred while fetching job applications'
      });
    }
  }
}