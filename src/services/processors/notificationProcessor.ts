import { logger } from '../../config/logger';
import { NotificationJob, QueueService } from '../queueService';
import { EmailService } from '../emailService';
import Candidate from '../../models/Candidate';
import Employee from '../../models/Employee';
import Job from '../../models/Job';

export class NotificationProcessor {
  static async process(data: NotificationJob): Promise<boolean> {
    try {
      logger.info('Processing notification', {
        type: data.type,
        recipientId: data.recipientId,
        recipientType: data.recipientType,
        channels: data.channels
      });

      switch (data.type) {
        case 'candidate_stage_change':
          return await this.processCandidateStageChange(data);
        case 'interview_reminder':
          return await this.processInterviewReminder(data);
        case 'assessment_due':
          return await this.processAssessmentDue(data);
        case 'application_received':
          return await this.processApplicationReceived(data);
        default:
          throw new Error(`Unknown notification type: ${data.type}`);
      }
    } catch (error) {
      logger.error('Notification processing failed', {
        type: data.type,
        recipientId: data.recipientId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static async processCandidateStageChange(data: NotificationJob): Promise<boolean> {
    try {
      const { candidateId, jobId, oldStage, newStage, companyName } = data.data;

      if (data.channels.includes('email')) {
        let recipient: any;
        let recipientEmail: string;
        let recipientName: string;

        if (data.recipientType === 'candidate') {
          recipient = await Candidate.findById(data.recipientId);
          recipientEmail = recipient?.personalInfo.email;
          recipientName = `${recipient?.personalInfo.firstName} ${recipient?.personalInfo.lastName}`;
        } else {
          recipient = await Employee.findById(data.recipientId);
          recipientEmail = recipient?.email;
          recipientName = `${recipient?.firstName} ${recipient?.lastName}`;
        }

        if (!recipient || !recipientEmail) {
          throw new Error('Recipient not found or email not available');
        }

        const job = await Job.findById(jobId);
        if (!job) {
          throw new Error('Job not found');
        }

        const templateName = data.recipientType === 'candidate'
          ? 'stage_update_candidate'
          : 'stage_update_recruiter';

        await QueueService.addEmailJob({
          templateName,
          recipientEmail,
          recipientName,
          variables: {
            recipientName,
            candidateName: data.recipientType === 'candidate'
              ? recipientName
              : data.data.candidateName,
            jobTitle: job.title,
            companyName: companyName || 'Company',
            oldStage: oldStage || 'Previous Stage',
            newStage: newStage || 'Current Stage',
            stageDescription: data.data.stageDescription || 'Stage updated in the hiring process'
          },
          priority: 'normal' as const
        });
      }

      // TODO: Implement SMS and push notifications
      if (data.channels.includes('sms')) {
        logger.info('SMS notification would be sent here', {
          recipientId: data.recipientId,
          type: data.type
        });
      }

      if (data.channels.includes('push')) {
        logger.info('Push notification would be sent here', {
          recipientId: data.recipientId,
          type: data.type
        });
      }

      logger.info('Stage change notification processed successfully', {
        recipientId: data.recipientId,
        candidateId,
        oldStage,
        newStage
      });

      return true;
    } catch (error) {
      logger.error('Stage change notification failed', {
        recipientId: data.recipientId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static async processInterviewReminder(data: NotificationJob): Promise<boolean> {
    try {
      const { interviewId, scheduledDate, reminderType } = data.data;

      if (data.channels.includes('email')) {
        let recipient: any;
        let recipientEmail: string;
        let recipientName: string;

        if (data.recipientType === 'candidate') {
          recipient = await Candidate.findById(data.recipientId);
          recipientEmail = recipient?.personalInfo.email;
          recipientName = `${recipient?.personalInfo.firstName} ${recipient?.personalInfo.lastName}`;
        } else {
          recipient = await Employee.findById(data.recipientId);
          recipientEmail = recipient?.email;
          recipientName = `${recipient?.firstName} ${recipient?.lastName}`;
        }

        if (!recipient || !recipientEmail) {
          throw new Error('Recipient not found or email not available');
        }

        const templateName = reminderType === '24h'
          ? 'interview_reminder_24h'
          : 'interview_reminder_1h';

        const timeUntilInterview = new Date(scheduledDate).getTime() - Date.now();
        const hoursUntil = Math.ceil(timeUntilInterview / (1000 * 60 * 60));

        await QueueService.addEmailJob({
          templateName,
          recipientEmail,
          recipientName,
          variables: {
            recipientName,
            interviewDate: new Date(scheduledDate).toLocaleDateString(),
            interviewTime: new Date(scheduledDate).toLocaleTimeString(),
            hoursUntil: hoursUntil > 0 ? hoursUntil : 0,
            jobTitle: data.data.jobTitle || 'Position',
            companyName: data.data.companyName || 'Company',
            meetingLink: data.data.meetingLink,
            location: data.data.location,
            interviewType: data.data.interviewType || 'interview'
          },
          priority: reminderType === '1h' ? 'high' as const : 'normal' as const
        });
      }

      logger.info('Interview reminder processed successfully', {
        recipientId: data.recipientId,
        interviewId,
        reminderType
      });

      return true;
    } catch (error) {
      logger.error('Interview reminder failed', {
        recipientId: data.recipientId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static async processAssessmentDue(data: NotificationJob): Promise<boolean> {
    try {
      const { assessmentId, dueDate, assessmentType } = data.data;

      if (data.channels.includes('email')) {
        const candidate = await Candidate.findById(data.recipientId);
        if (!candidate) {
          throw new Error('Candidate not found');
        }

        const timeUntilDue = new Date(dueDate).getTime() - Date.now();
        const hoursUntil = Math.ceil(timeUntilDue / (1000 * 60 * 60));

        await QueueService.addEmailJob({
          templateName: 'assessment_due_reminder',
          recipientEmail: candidate.personalInfo.email,
          recipientName: `${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName}`,
          variables: {
            candidateName: `${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName}`,
            assessmentType: assessmentType || 'Assessment',
            dueDate: new Date(dueDate).toLocaleDateString(),
            dueTime: new Date(dueDate).toLocaleTimeString(),
            hoursUntil: hoursUntil > 0 ? hoursUntil : 0,
            assessmentLink: data.data.assessmentLink || '#',
            jobTitle: data.data.jobTitle || 'Position',
            companyName: data.data.companyName || 'Company'
          },
          priority: hoursUntil <= 24 ? 'high' as const : 'normal' as const
        });
      }

      logger.info('Assessment due notification processed successfully', {
        recipientId: data.recipientId,
        assessmentId,
        hoursUntil: Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60))
      });

      return true;
    } catch (error) {
      logger.error('Assessment due notification failed', {
        recipientId: data.recipientId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static async processApplicationReceived(data: NotificationJob): Promise<boolean> {
    try {
      const { candidateId, jobId } = data.data;

      if (data.channels.includes('email')) {
        if (data.recipientType === 'candidate') {
          const [candidate, job] = await Promise.all([
            Candidate.findById(candidateId),
            Job.findById(jobId)
          ]);

          if (!candidate || !job) {
            throw new Error('Candidate or job not found');
          }

          await QueueService.addEmailJob({
            templateName: 'application_received',
            recipientEmail: candidate.personalInfo.email,
            recipientName: `${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName}`,
            variables: {
              candidateName: `${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName}`,
              jobTitle: job.title,
              companyName: data.data.companyName || 'Company',
              expectedResponseTime: data.data.expectedResponseTime || '5-7 business days',
              applicationId: data.data.applicationId || 'N/A'
            },
            candidateProfile: candidate.aiAnalysis?.parsedData,
            jobTitle: job.title,
            companyName: data.data.companyName,
            useAIPersonalization: true,
            priority: 'normal' as const
          });
        } else {
          // Notify hiring manager/recruiter
          const [candidate, job, recruiter] = await Promise.all([
            Candidate.findById(candidateId),
            Job.findById(jobId),
            Employee.findById(data.recipientId)
          ]);

          if (!candidate || !job || !recruiter) {
            throw new Error('Required data not found');
          }

          await QueueService.addEmailJob({
            templateName: 'new_application_notification',
            recipientEmail: recruiter.email,
            recipientName: `${recruiter.firstName} ${recruiter.lastName}`,
            variables: {
              recruiterName: `${recruiter.firstName} ${recruiter.lastName}`,
              candidateName: `${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName}`,
              jobTitle: job.title,
              candidateEmail: candidate.personalInfo.email,
              candidatePhone: candidate.personalInfo.phone,
              candidateLocation: candidate.personalInfo.location,
              candidateExperience: candidate.personalInfo.experience,
              applicationDate: new Date().toLocaleDateString(),
              applicationLink: data.data.applicationLink || '#'
            },
            priority: 'normal' as const
          });
        }
      }

      logger.info('Application received notification processed successfully', {
        recipientId: data.recipientId,
        candidateId,
        jobId,
        recipientType: data.recipientType
      });

      return true;
    } catch (error) {
      logger.error('Application received notification failed', {
        recipientId: data.recipientId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}