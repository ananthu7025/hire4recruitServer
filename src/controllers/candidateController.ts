import { Request, Response, NextFunction } from 'express';
import { CandidateService } from '../services/candidateService';
import { logger } from '../config/logger';

export class CandidateController {
  // Get candidates with filters and pagination
  static async getCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const options = {
        companyId: req.user.companyId,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: req.query.search as string,
        skills: req.query.skills ? (req.query.skills as string).split(',').map(s => s.trim()) : undefined,
        experience: req.query.experience as string,
        location: req.query.location as string,
        jobId: req.query.jobId as string,
        applicationStatus: req.query.status as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      const result = await CandidateService.getCandidates(options);

      res.status(200).json({
        success: true,
        data: {
          candidates: result.candidates,
          pagination: {
            page: options.page,
            limit: options.limit,
            total: result.total,
            pages: result.totalPages
          }
        }
      });

    } catch (error) {
      logger.error('Get candidates error:', error);
      res.status(500).json({
        error: 'Failed to get candidates',
        message: 'An error occurred while fetching candidates'
      });
    }
  }

  // Create new candidate
  static async createCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          error: 'Resume required',
          message: 'Resume file is required for candidate creation'
        });
        return;
      }

      const candidateData = {
        personalInfo: {
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          email: req.body.email,
          phone: req.body.phone || '',
          location: req.body.location || '',
          nationality: req.body.nationality
        },
        experience: req.body.experience || '',
        currentPosition: req.body.currentPosition,
        currentCompany: req.body.currentCompany,
        expectedSalary: req.body.expectedSalary ? {
          min: parseInt(req.body.expectedSalary.min),
          max: parseInt(req.body.expectedSalary.max),
          currency: req.body.expectedSalary.currency || 'USD'
        } : undefined,
        preferences: req.body.preferences
      };

      const candidate = await CandidateService.createCandidate(
        candidateData,
        req.file,
        req.user.userId,
        req.user.companyId
      );

      res.status(201).json({
        success: true,
        message: 'Candidate created successfully',
        data: { candidate }
      });

    } catch (error) {
      logger.error('Create candidate error:', error);

      if (error instanceof Error && error.message === 'Candidate with this email already exists') {
        res.status(409).json({
          error: 'Candidate already exists',
          message: error.message
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to create candidate',
        message: 'An error occurred while creating the candidate'
      });
    }
  }

  // Get candidate by ID
  static async getCandidateById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { candidateId } = req.params;
      const candidate = await CandidateService.getCandidateById(candidateId, req.user.companyId);

      if (!candidate) {
        res.status(404).json({
          error: 'Candidate not found',
          message: 'The requested candidate does not exist'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { candidate }
      });

    } catch (error) {
      logger.error('Get candidate by ID error:', error);
      res.status(500).json({
        error: 'Failed to get candidate',
        message: 'An error occurred while fetching candidate details'
      });
    }
  }

  // Update candidate
  static async updateCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { candidateId } = req.params;
      const updates = req.body;

      const candidate = await CandidateService.updateCandidate(
        candidateId,
        updates,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'Candidate updated successfully',
        data: { candidate }
      });

    } catch (error) {
      logger.error('Update candidate error:', error);

      if (error instanceof Error && error.message === 'Candidate not found') {
        res.status(404).json({
          error: 'Candidate not found',
          message: 'The requested candidate does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to update candidate',
        message: 'An error occurred while updating the candidate'
      });
    }
  }

  // Update candidate status
  static async updateCandidateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { candidateId } = req.params;
      const { applicationId, status, reason, notes } = req.body;

      if (!applicationId || !status) {
        res.status(400).json({
          error: 'Missing required fields',
          message: 'applicationId and status are required'
        });
        return;
      }

      const candidate = await CandidateService.updateApplicationStatus(
        candidateId,
        applicationId,
        status,
        req.user.companyId,
        req.user.userId,
        notes,
        reason
      );

      res.status(200).json({
        success: true,
        message: 'Candidate status updated successfully',
        data: { candidate }
      });

    } catch (error) {
      logger.error('Update candidate status error:', error);

      if (error instanceof Error && (
        error.message === 'Candidate not found' ||
        error.message === 'Candidate or application not found' ||
        error.message === 'Application not found'
      )) {
        res.status(404).json({
          error: 'Not found',
          message: error.message
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to update candidate status',
        message: 'An error occurred while updating candidate status'
      });
    }
  }

  // Upload resume
  static async uploadResume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          error: 'Resume file required',
          message: 'Please upload a resume file'
        });
        return;
      }

      const { candidateId } = req.params;

      // For now, acknowledge the upload - full implementation requires service method
      res.status(200).json({
        success: true,
        message: 'Resume uploaded successfully',
        data: {
          resumeUrl: `/uploads/resumes/${req.file.filename}`,
          candidateId: candidateId,
          note: 'Resume processing integration pending'
        }
      });

    } catch (error) {
      logger.error('Upload resume error:', error);
      res.status(500).json({
        error: 'Failed to upload resume',
        message: 'An error occurred while uploading the resume'
      });
    }
  }

  // Search candidates with AI
  static async searchCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { jobId } = req.body;

      if (!jobId) {
        res.status(400).json({
          error: 'Job ID required',
          message: 'jobId is required for candidate matching'
        });
        return;
      }

      const limit = parseInt(req.body.limit as string) || 20;

      const result = await CandidateService.searchTalentPool(
        jobId,
        req.user.companyId,
        { limit }
      );

      res.status(200).json({
        success: true,
        data: {
          candidates: result.matchedCandidates,
          totalResults: result.matchedCandidates.length
        }
      });

    } catch (error) {
      logger.error('Search candidates error:', error);

      if (error instanceof Error && error.message === 'Job not found') {
        res.status(404).json({
          error: 'Job not found',
          message: 'The specified job does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to search candidates',
        message: 'An error occurred while searching candidates'
      });
    }
  }

  // Delete candidate (soft delete)
  static async deleteCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { candidateId } = req.params;

      // For now, return success - full implementation requires service method
      res.status(200).json({
        success: true,
        message: 'Candidate deletion request received',
        note: 'Full deletion implementation pending'
      });

    } catch (error) {
      logger.error('Delete candidate error:', error);
      res.status(500).json({
        error: 'Failed to delete candidate',
        message: 'An error occurred while deleting the candidate'
      });
    }
  }

  // Apply candidate to job
  static async applyToJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { candidateId } = req.params;
      const applicationData = req.body;

      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const candidate = await CandidateService.applyToJob(
        candidateId,
        applicationData,
        req.user.companyId
      );

      res.status(200).json({
        success: true,
        message: 'Application submitted successfully',
        data: { candidate }
      });

    } catch (error) {
      logger.error('Apply to job error:', error);

      if (error instanceof Error) {
        if (error.message === 'Candidate not found') {
          res.status(404).json({
            error: 'Candidate not found',
            message: error.message
          });
          return;
        }

        if (error.message === 'Job not found or not active') {
          res.status(404).json({
            error: 'Job not found',
            message: error.message
          });
          return;
        }

        if (error.message === 'Candidate has already applied to this job') {
          res.status(409).json({
            error: 'Duplicate application',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Failed to submit application',
        message: 'An error occurred while submitting the application'
      });
    }
  }

  // Get candidate analytics
  static async getCandidateAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { candidateId } = req.params;

      const analytics = await CandidateService.getCandidateAnalytics(
        candidateId,
        req.user.companyId
      );

      res.status(200).json({
        success: true,
        data: { analytics }
      });

    } catch (error) {
      logger.error('Get candidate analytics error:', error);

      if (error instanceof Error && error.message === 'Candidate not found') {
        res.status(404).json({
          error: 'Candidate not found',
          message: 'The requested candidate does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to get candidate analytics',
        message: 'An error occurred while fetching candidate analytics'
      });
    }
  }

  // Get talent pool
  static async getTalentPool(req: Request, res: Response, next: NextFunction): Promise<void> {
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
        skills: req.query.skills ? (req.query.skills as string).split(',').map(s => s.trim()) : undefined,
        experience: req.query.experience as string,
        location: req.query.location as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      // Use existing getCandidates method for talent pool
      const result = await CandidateService.getCandidates({
        companyId: req.user.companyId,
        page: options.page,
        limit: options.limit,
        sortBy: options.sortBy,
        sortOrder: options.sortOrder
      });

      res.status(200).json({
        success: true,
        data: {
          candidates: result.candidates,
          pagination: {
            currentPage: options.page,
            totalPages: result.totalPages,
            totalItems: result.total,
            itemsPerPage: options.limit
          }
        }
      });

    } catch (error) {
      logger.error('Get talent pool error:', error);

      res.status(500).json({
        error: 'Failed to get talent pool',
        message: 'An error occurred while fetching talent pool'
      });
    }
  }

  // Get candidate summary
  static async getCandidateSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { candidateId } = req.params;

      // Use existing getCandidateById and analytics methods to build summary
      const candidate = await CandidateService.getCandidateById(candidateId, req.user.companyId);

      if (!candidate) {
        res.status(404).json({
          error: 'Candidate not found',
          message: 'The requested candidate does not exist'
        });
        return;
      }

      const analytics = await CandidateService.getCandidateAnalytics(candidateId, req.user.companyId);

      const summary = {
        candidate,
        analytics,
        applicationHistory: candidate.applications || [],
        totalApplications: candidate.applications?.length || 0
      };

      res.status(200).json({
        success: true,
        data: { summary }
      });

    } catch (error) {
      logger.error('Get candidate summary error:', error);

      res.status(500).json({
        error: 'Failed to get candidate summary',
        message: 'An error occurred while fetching candidate summary'
      });
    }
  }

  // Get candidate applications
  static async getCandidateApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { candidateId } = req.params;
      const options = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        status: req.query.status as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      // Get candidate and extract applications
      const candidate = await CandidateService.getCandidateById(candidateId, req.user.companyId);

      if (!candidate) {
        res.status(404).json({
          error: 'Candidate not found',
          message: 'The requested candidate does not exist'
        });
        return;
      }

      const applications = candidate.applications || [];
      const filteredApplications = options.status
        ? applications.filter(app => app.status === options.status)
        : applications;

      const total = filteredApplications.length;
      const totalPages = Math.ceil(total / options.limit);
      const startIndex = (options.page - 1) * options.limit;
      const paginatedApplications = filteredApplications.slice(startIndex, startIndex + options.limit);

      res.status(200).json({
        success: true,
        data: {
          applications: paginatedApplications,
          pagination: {
            currentPage: options.page,
            totalPages,
            totalItems: total,
            itemsPerPage: options.limit
          }
        }
      });

    } catch (error) {
      logger.error('Get candidate applications error:', error);

      if (error instanceof Error && error.message === 'Candidate not found') {
        res.status(404).json({
          error: 'Candidate not found',
          message: 'The requested candidate does not exist'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to get candidate applications',
        message: 'An error occurred while fetching candidate applications'
      });
    }
  }

  // Update candidate application
  static async updateCandidateApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { candidateId, applicationId } = req.params;
      const updates = req.body;

      // Use existing updateApplicationStatus method
      const result = await CandidateService.updateApplicationStatus(
        candidateId,
        applicationId,
        updates.status || 'updated',
        req.user.companyId,
        req.user.userId,
        updates.notes,
        updates.reason
      );

      res.status(200).json({
        success: true,
        message: 'Application updated successfully',
        data: { candidate: result }
      });

    } catch (error) {
      logger.error('Update candidate application error:', error);

      if (error instanceof Error && (
        error.message === 'Candidate not found' ||
        error.message === 'Application not found'
      )) {
        res.status(404).json({
          error: 'Not found',
          message: error.message
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to update application',
        message: 'An error occurred while updating the application'
      });
    }
  }
}