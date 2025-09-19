import { logger } from '../../config/logger';
import { WorkflowActionJob, QueueService } from '../queueService';
import { EmailService } from '../emailService';
import { CalendarService } from '../calendarService';
import Candidate from '../../models/Candidate';
import Job from '../../models/Job';
import Employee from '../../models/Employee';
import Company from '../../models/Company';
import Workflow from '../../models/Workflow';
import mongoose from 'mongoose';

export class WorkflowActionProcessor {
  static async process(data: WorkflowActionJob): Promise<boolean> {
    try {
      logger.info('Processing workflow action', {
        actionType: data.actionType,
        candidateId: data.candidateId,
        jobId: data.jobId,
        stageId: data.stageId
      });

      switch (data.actionType) {
        case 'send_email':
          return await this.processSendEmail(data);
        case 'schedule_interview':
          return await this.processScheduleInterview(data);
        case 'assign_assessment':
          return await this.processAssignAssessment(data);
        case 'verify_assessment':
          return await this.processVerifyAssessment(data);
        case 'add_calendar_event':
          return await this.processAddCalendarEvent(data);
        case 'generate_offer_letter':
          return await this.processGenerateOfferLetter(data);
        default:
          throw new Error(`Unknown action type: ${data.actionType}`);
      }
    } catch (error) {
      logger.error('Workflow action processing failed', {
        actionType: data.actionType,
        candidateId: data.candidateId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static async processSendEmail(data: WorkflowActionJob): Promise<boolean> {
    try {
      // Get required data
      const [candidate, job, company] = await Promise.all([
        Candidate.findById(data.candidateId),
        Job.findById(data.jobId).populate('hiringManager'),
        Company.findById(data.companyId)
      ]);

      if (!candidate || !job || !company) {
        throw new Error('Required data not found for email action');
      }

      const config = data.actionConfig;
      const templateName = config.templateName || 'application_received';

      // Build email variables
      const variables = {
        candidateName: `${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName}`,
        jobTitle: job.title,
        companyName: company.name,
        recruiterName: job.hiringManager ? `${(job.hiringManager as any).firstName} ${(job.hiringManager as any).lastName}` : 'Hiring Team',
        expectedResponseTime: config.expectedResponseTime || '5-7 business days',
        ...config.customVariables
      };

      // Add to email queue
      await QueueService.addEmailJob({
        templateName,
        recipientEmail: candidate.personalInfo.email,
        recipientName: variables.candidateName,
        variables,
        candidateProfile: candidate.aiAnalysis?.parsedData,
        jobTitle: job.title,
        companyName: company.name,
        useAIPersonalization: config.useAIPersonalization || false,
        priority: config.priority || 'normal'
      });

      logger.info('Email action queued successfully', {
        candidateId: data.candidateId,
        templateName,
        recipientEmail: candidate.personalInfo.email
      });

      return true;
    } catch (error) {
      logger.error('Send email action failed', {
        candidateId: data.candidateId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static async processScheduleInterview(data: WorkflowActionJob): Promise<boolean> {
    try {
      const config = data.actionConfig;

      // Add to schedule queue
      await QueueService.addScheduleJob({
        scheduleType: 'interview',
        candidateId: data.candidateId,
        jobId: data.jobId,
        companyId: data.companyId,
        scheduledDate: new Date(config.scheduledDate),
        duration: config.duration || 60,
        participants: config.participants || [],
        details: {
          interviewType: config.interviewType || 'video',
          location: config.location,
          meetingLink: config.meetingLink,
          round: config.round || 1,
          stage: data.stageId,
          notes: config.notes
        }
      });

      logger.info('Interview scheduling action queued successfully', {
        candidateId: data.candidateId,
        scheduledDate: config.scheduledDate,
        interviewType: config.interviewType
      });

      return true;
    } catch (error) {
      logger.error('Schedule interview action failed', {
        candidateId: data.candidateId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static async processAssignAssessment(data: WorkflowActionJob): Promise<boolean> {
    try {
      const config = data.actionConfig;
      const [candidate, job] = await Promise.all([
        Candidate.findById(data.candidateId),
        Job.findById(data.jobId)
      ]);

      if (!candidate || !job) {
        throw new Error('Candidate or job not found');
      }

      // Create assessment assignment
      const assessmentData = {
        candidateId: data.candidateId,
        jobId: data.jobId,
        companyId: data.companyId,
        assessmentType: config.assessmentType || 'technical',
        title: config.title || `${job.title} Assessment`,
        description: config.description,
        duration: config.duration || 60,
        questions: config.questions || [],
        deadline: new Date(Date.now() + (config.deadlineDays || 7) * 24 * 60 * 60 * 1000),
        instructions: config.instructions,
        passingScore: config.passingScore || 70
      };

      // Send assessment invitation email
      await QueueService.addEmailJob({
        templateName: 'assessment_invitation',
        recipientEmail: candidate.personalInfo.email,
        recipientName: `${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName}`,
        variables: {
          candidateName: `${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName}`,
          jobTitle: job.title,
          companyName: data.metadata?.companyName || 'Company',
          assessmentType: assessmentData.assessmentType,
          duration: assessmentData.duration,
          deadline: assessmentData.deadline.toLocaleDateString(),
          assessmentLink: config.assessmentLink || '#',
          recruiterName: data.metadata?.recruiterName || 'Hiring Team'
        },
        priority: 'normal'
      });

      logger.info('Assessment assignment completed', {
        candidateId: data.candidateId,
        assessmentType: assessmentData.assessmentType,
        deadline: assessmentData.deadline
      });

      return true;
    } catch (error) {
      logger.error('Assign assessment action failed', {
        candidateId: data.candidateId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static async processVerifyAssessment(data: WorkflowActionJob): Promise<boolean> {
    try {
      const config = data.actionConfig;

      // This would typically check assessment completion status
      // For now, we'll simulate verification
      const assessmentCompleted = config.assessmentCompleted || false;
      const score = config.score || 0;
      const passingScore = config.passingScore || 70;

      if (assessmentCompleted && score >= passingScore) {
        // Assessment passed - could trigger next workflow stage
        logger.info('Assessment verification passed', {
          candidateId: data.candidateId,
          score,
          passingScore
        });

        // Optionally notify candidate of results
        if (config.notifyCandidate) {
          const candidate = await Candidate.findById(data.candidateId);
          const job = await Job.findById(data.jobId);

          if (candidate && job) {
            await QueueService.addEmailJob({
              templateName: 'assessment_passed',
              recipientEmail: candidate.personalInfo.email,
              recipientName: `${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName}`,
              variables: {
                candidateName: `${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName}`,
                jobTitle: job.title,
                score,
                nextSteps: config.nextSteps || 'We will be in touch with next steps soon.'
              },
              priority: 'normal'
            });
          }
        }

        return true;
      } else {
        logger.info('Assessment verification failed', {
          candidateId: data.candidateId,
          score,
          passingScore,
          completed: assessmentCompleted
        });

        return false;
      }
    } catch (error) {
      logger.error('Verify assessment action failed', {
        candidateId: data.candidateId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static async processAddCalendarEvent(data: WorkflowActionJob): Promise<boolean> {
    try {
      const config = data.actionConfig;

      // Use calendar service to create event
      const eventData = {
        title: config.title || 'Interview',
        description: config.description,
        startTime: new Date(config.startTime),
        endTime: new Date(config.endTime),
        attendees: config.attendees || [],
        location: config.location,
        meetingLink: config.meetingLink
      };

      // For now, we'll add to schedule queue
      await QueueService.addScheduleJob({
        scheduleType: 'interview',
        candidateId: data.candidateId,
        jobId: data.jobId,
        companyId: data.companyId,
        scheduledDate: eventData.startTime,
        duration: Math.floor((eventData.endTime.getTime() - eventData.startTime.getTime()) / 60000),
        participants: eventData.attendees,
        details: eventData
      });

      logger.info('Calendar event action queued successfully', {
        candidateId: data.candidateId,
        title: eventData.title,
        startTime: eventData.startTime
      });

      return true;
    } catch (error) {
      logger.error('Add calendar event action failed', {
        candidateId: data.candidateId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static async processGenerateOfferLetter(data: WorkflowActionJob): Promise<boolean> {
    try {
      const config = data.actionConfig;
      const [candidate, job, company] = await Promise.all([
        Candidate.findById(data.candidateId),
        Job.findById(data.jobId),
        Company.findById(data.companyId)
      ]);

      if (!candidate || !job || !company) {
        throw new Error('Required data not found for offer letter generation');
      }

      // Generate offer letter variables
      const offerVariables = {
        candidateName: `${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName}`,
        jobTitle: job.title,
        companyName: company.name,
        department: job.department,
        startDate: config.startDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        salary: config.salary || `${job.salary.currency} ${job.salary.min} - ${job.salary.max}`,
        benefits: config.benefits || job.benefits || 'Standard benefits package',
        workMode: config.workMode || job.workMode,
        responseDeadline: config.responseDeadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        recruiterName: data.metadata?.recruiterName || 'Hiring Team'
      };

      // Send offer letter email
      await QueueService.addEmailJob({
        templateName: 'offer_letter',
        recipientEmail: candidate.personalInfo.email,
        recipientName: offerVariables.candidateName,
        variables: offerVariables,
        candidateProfile: candidate.aiAnalysis?.parsedData,
        jobTitle: job.title,
        companyName: company.name,
        useAIPersonalization: true,
        priority: 'high'
      });

      logger.info('Offer letter generation completed', {
        candidateId: data.candidateId,
        jobTitle: job.title,
        startDate: offerVariables.startDate
      });

      return true;
    } catch (error) {
      logger.error('Generate offer letter action failed', {
        candidateId: data.candidateId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}