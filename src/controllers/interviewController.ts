import { Request, Response, NextFunction } from 'express';
import { InterviewService } from '../services/interviewService';
import { logger } from '../config/logger';

export class InterviewController {
  // Get interviews with filters and pagination
  static async getInterviews(req: Request, res: Response, next: NextFunction): Promise<void> {
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
        candidateId: req.query.candidateId as string,
        jobId: req.query.jobId as string,
        interviewerId: req.query.interviewerId as string,
        status: req.query.status as string,
        type: req.query.type as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      const result = await InterviewService.getInterviews(req.user.companyId, options);

      res.status(200).json({
        success: true,
        data: {
          interviews: result.interviews,
          pagination: {
            page: options.page,
            limit: options.limit,
            total: result.total,
            pages: result.totalPages
          }
        }
      });

    } catch (error) {
      logger.error('Get interviews error:', error);
      res.status(500).json({
        error: 'Failed to get interviews',
        message: 'An error occurred while fetching interviews'
      });
    }
  }

  // Schedule new interview
  static async scheduleInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const interviewData = {
        candidateId: req.body.candidateId,
        jobId: req.body.jobId,
        title: req.body.title,
        type: req.body.type,
        scheduledDate: new Date(req.body.scheduledAt),
        duration: req.body.duration,
        location: req.body.location,
        interviewers: req.body.interviewers,
        round: req.body.round,
        stage: req.body.stage
      };

      const interview = await InterviewService.createInterview(
        interviewData,
        req.user.companyId,
        req.user.userId
      );

      res.status(201).json({
        success: true,
        message: 'Interview scheduled successfully',
        data: { interview }
      });

    } catch (error) {
      logger.error('Schedule interview error:', error);

      if (error instanceof Error) {
        if (error.message === 'Candidate not found or not associated with this company') {
          res.status(404).json({
            error: 'Candidate not found',
            message: error.message
          });
          return;
        }

        if (error.message === 'Job not found') {
          res.status(404).json({
            error: 'Job not found',
            message: error.message
          });
          return;
        }

        if (error.message === 'One or more interviewers not found or not active') {
          res.status(400).json({
            error: 'Invalid interviewers',
            message: error.message
          });
          return;
        }

        if (error.message.includes('conflicting interviews')) {
          res.status(409).json({
            error: 'Scheduling conflict',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Failed to schedule interview',
        message: 'An error occurred while scheduling the interview'
      });
    }
  }

  // Get interview by ID
  static async getInterviewById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { interviewId } = req.params;
      const interview = await InterviewService.getInterviewById(interviewId, req.user.companyId);

      if (!interview) {
        res.status(404).json({
          error: 'Interview not found',
          message: 'The requested interview does not exist'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { interview }
      });

    } catch (error) {
      logger.error('Get interview by ID error:', error);
      res.status(500).json({
        error: 'Failed to get interview',
        message: 'An error occurred while fetching interview details'
      });
    }
  }

  // Update interview
  static async updateInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { interviewId } = req.params;
      const updates = req.body;

      // Convert scheduledAt to scheduledDate if provided
      if (updates.scheduledAt) {
        updates.scheduledDate = new Date(updates.scheduledAt);
        delete updates.scheduledAt;
      }

      const interview = await InterviewService.updateInterview(
        interviewId,
        req.user.companyId,
        updates,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'Interview updated successfully',
        data: { interview }
      });

    } catch (error) {
      logger.error('Update interview error:', error);

      if (error instanceof Error) {
        if (error.message === 'Interview not found') {
          res.status(404).json({
            error: 'Interview not found',
            message: error.message
          });
          return;
        }

        if (error.message === 'Cannot update completed or cancelled interview') {
          res.status(400).json({
            error: 'Cannot update interview',
            message: error.message
          });
          return;
        }

        if (error.message.includes('conflicting interviews')) {
          res.status(409).json({
            error: 'Scheduling conflict',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Failed to update interview',
        message: 'An error occurred while updating the interview'
      });
    }
  }

  // Cancel interview
  static async cancelInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { interviewId } = req.params;
      const { reason, notifyParticipants = true } = req.body;

      if (!reason) {
        res.status(400).json({
          error: 'Missing required field',
          message: 'Reason for cancellation is required'
        });
        return;
      }

      const interview = await InterviewService.cancelInterview(
        interviewId,
        req.user.companyId,
        reason,
        req.user.userId,
        notifyParticipants
      );

      res.status(200).json({
        success: true,
        message: 'Interview cancelled successfully',
        data: { interview }
      });

    } catch (error) {
      logger.error('Cancel interview error:', error);

      if (error instanceof Error) {
        if (error.message === 'Interview not found') {
          res.status(404).json({
            error: 'Interview not found',
            message: error.message
          });
          return;
        }

        if (error.message.includes('Cannot cancel')) {
          res.status(400).json({
            error: 'Cannot cancel interview',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Failed to cancel interview',
        message: 'An error occurred while cancelling the interview'
      });
    }
  }

  // Submit interview feedback
  static async submitFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { interviewId } = req.params;
      const feedbackData = {
        rating: req.body.overallRating,
        strengths: req.body.strengths?.join('; ') || '',
        weaknesses: req.body.weaknesses?.join('; ') || '',
        recommendation: req.body.recommendation,
        comments: req.body.detailedFeedback || '',
        questionFeedback: req.body.questionFeedback
      };

      // Validate required fields
      if (!feedbackData.rating || !feedbackData.recommendation) {
        res.status(400).json({
          error: 'Missing required fields',
          message: 'overallRating and recommendation are required'
        });
        return;
      }

      const interview = await InterviewService.submitFeedback(
        interviewId,
        req.user.companyId,
        req.user.userId,
        feedbackData
      );

      res.status(201).json({
        success: true,
        message: 'Interview feedback submitted successfully',
        data: {
          interview
        }
      });

    } catch (error) {
      logger.error('Submit feedback error:', error);

      if (error instanceof Error) {
        if (error.message === 'Interview not found or user is not an interviewer') {
          res.status(403).json({
            error: 'Access denied',
            message: error.message
          });
          return;
        }

        if (error.message === 'Can only submit feedback for completed interviews') {
          res.status(400).json({
            error: 'Invalid interview status',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Failed to submit feedback',
        message: 'An error occurred while submitting feedback'
      });
    }
  }

  // Get interview feedback
  static async getFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { interviewId } = req.params;
      const interview = await InterviewService.getInterviewById(interviewId, req.user.companyId);

      if (!interview) {
        res.status(404).json({
          error: 'Interview not found',
          message: 'The requested interview does not exist'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          feedback: interview.feedback
        }
      });

    } catch (error) {
      logger.error('Get feedback error:', error);
      res.status(500).json({
        error: 'Failed to get feedback',
        message: 'An error occurred while fetching feedback'
      });
    }
  }

  // Get calendar view
  static async getCalendarView(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { start, end, interviewerId } = req.query;

      if (!start || !end) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'start and end dates are required'
        });
        return;
      }

      const startDate = new Date(start as string);
      const endDate = new Date(end as string);

      const result = await InterviewService.getCalendarView(
        req.user.companyId,
        startDate,
        endDate,
        interviewerId as string
      );

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Get calendar view error:', error);
      res.status(500).json({
        error: 'Failed to get calendar view',
        message: 'An error occurred while fetching calendar data'
      });
    }
  }

  // Check interviewer availability
  static async checkAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { interviewerIds, date, duration } = req.query;

      if (!interviewerIds || !date || !duration) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'interviewerIds, date, and duration are required'
        });
        return;
      }

      const interviewerIdArray = (interviewerIds as string).split(',');
      const targetDate = new Date(date as string);
      const durationMinutes = parseInt(duration as string);

      const result = await InterviewService.checkAvailability(
        req.user.companyId,
        interviewerIdArray,
        targetDate,
        durationMinutes
      );

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Check availability error:', error);
      res.status(500).json({
        error: 'Failed to check availability',
        message: 'An error occurred while checking availability'
      });
    }
  }

  // Get interview analytics
  static async getInterviewAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.companyId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      const { dateFrom, dateTo, interviewerId, jobId } = req.query;

      const filters = {
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        interviewerId: interviewerId as string,
        jobId: jobId as string
      };

      // For now, return placeholder analytics - requires service method implementation
      res.status(200).json({
        success: true,
        data: {
          analytics: {
            totalInterviews: 0,
            completedInterviews: 0,
            averageRating: 0,
            completionRate: 0,
            avgTimeToComplete: 0,
            interviewsByStatus: {
              scheduled: 0,
              completed: 0,
              cancelled: 0
            }
          },
          note: 'Interview analytics endpoint requires service implementation'
        }
      });

    } catch (error) {
      logger.error('Get interview analytics error:', error);

      res.status(500).json({
        error: 'Failed to get interview analytics',
        message: 'An error occurred while fetching interview analytics'
      });
    }
  }
}