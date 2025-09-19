import { logger } from '../../config/logger';
import { ScheduleJob, QueueService } from '../queueService';
import { CalendarService } from '../calendarService';
import Interview from '../../models/Interview';
import Candidate from '../../models/Candidate';
import Job from '../../models/Job';
import Employee from '../../models/Employee';
import mongoose from 'mongoose';

export class ScheduleProcessor {
  static async process(data: ScheduleJob): Promise<boolean> {
    try {
      logger.info('Processing schedule job', {
        scheduleType: data.scheduleType,
        candidateId: data.candidateId,
        scheduledDate: data.scheduledDate
      });

      switch (data.scheduleType) {
        case 'interview':
          return await this.processInterviewSchedule(data);
        case 'assessment':
          return await this.processAssessmentSchedule(data);
        case 'reminder':
          return await this.processReminder(data);
        case 'follow_up':
          return await this.processFollowUp(data);
        default:
          throw new Error(`Unknown schedule type: ${data.scheduleType}`);
      }
    } catch (error) {
      logger.error('Schedule processing failed', {
        scheduleType: data.scheduleType,
        candidateId: data.candidateId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static async processInterviewSchedule(data: ScheduleJob): Promise<boolean> {
    try {
      // Get required data
      const [candidate, job] = await Promise.all([
        Candidate.findById(data.candidateId),
        Job.findById(data.jobId).populate('hiringManager')
      ]);

      if (!candidate || !job) {
        throw new Error('Candidate or job not found');
      }

      const details = data.details;

      // Create interview record
      const interviewData = {
        companyId: new mongoose.Types.ObjectId(data.companyId),
        jobId: new mongoose.Types.ObjectId(data.jobId),
        candidateId: new mongoose.Types.ObjectId(data.candidateId),
        title: details.title || `${job.title} Interview`,
        type: details.interviewType || 'video',
        scheduledDate: data.scheduledDate,
        duration: data.duration || 60,
        location: details.location,
        meetingLink: details.meetingLink,
        round: details.round || 1,
        stage: details.stage,
        notes: details.notes,
        status: 'scheduled',
        interviewers: data.participants?.map(id => ({
          userId: new mongoose.Types.ObjectId(id),
          role: 'primary'
        })) || [],
        scheduledBy: new mongoose.Types.ObjectId(data.companyId) // This should be the actual user ID
      };

      const interview = new Interview(interviewData);
      const savedInterview = await interview.save();

      // Create calendar events for all participants
      if (data.participants && data.participants.length > 0) {
        const calendarEventData = {
          title: interviewData.title,
          description: `Interview with ${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName} for ${job.title}`,
          startTime: data.scheduledDate,
          endTime: new Date(data.scheduledDate.getTime() + (data.duration || 60) * 60000),
          attendees: [
            candidate.personalInfo.email,
            ...data.participants.map(async (participantId) => {
              const employee = await Employee.findById(participantId);
              return employee?.email || '';
            })
          ].filter(Boolean),
          location: details.location,
          meetingLink: details.meetingLink
        };

        try {
          await CalendarService.createEvent(calendarEventData);
          logger.info('Calendar event created for interview', {
            interviewId: savedInterview._id,
            candidateId: data.candidateId
          });
        } catch (calendarError) {
          logger.warn('Failed to create calendar event', {
            interviewId: savedInterview._id,
            error: calendarError instanceof Error ? calendarError.message : 'Unknown error'
          });
        }
      }

      // Send interview confirmation emails to all participants
      const candidateEmail = {
        templateName: 'interview_invitation',
        recipientEmail: candidate.personalInfo.email,
        recipientName: `${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName}`,
        variables: {
          candidateName: `${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName}`,
          jobTitle: job.title,
          companyName: details.companyName || 'Company',
          interviewDate: data.scheduledDate.toLocaleDateString(),
          interviewTime: data.scheduledDate.toLocaleTimeString(),
          duration: data.duration || 60,
          interviewType: details.interviewType || 'video',
          location: details.location,
          meetingLink: details.meetingLink,
          recruiterName: job.hiringManager ? `${(job.hiringManager as any).firstName} ${(job.hiringManager as any).lastName}` : 'Hiring Team'
        },
        priority: 'high' as const
      };

      await QueueService.addEmailJob(candidateEmail);

      // Send notifications to interviewers
      if (data.participants && data.participants.length > 0) {
        for (const participantId of data.participants) {
          const interviewer = await Employee.findById(participantId);
          if (interviewer && interviewer.email) {
            await QueueService.addEmailJob({
              templateName: 'interviewer_notification',
              recipientEmail: interviewer.email,
              recipientName: `${interviewer.firstName} ${interviewer.lastName}`,
              variables: {
                interviewerName: `${interviewer.firstName} ${interviewer.lastName}`,
                candidateName: `${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName}`,
                jobTitle: job.title,
                interviewDate: data.scheduledDate.toLocaleDateString(),
                interviewTime: data.scheduledDate.toLocaleTimeString(),
                duration: data.duration || 60,
                interviewType: details.interviewType || 'video',
                location: details.location,
                meetingLink: details.meetingLink,
                candidateProfile: `${candidate.personalInfo.experience} experience in ${job.skillsRequired.join(', ')}`
              },
              priority: 'normal' as const
            });
          }
        }
      }

      logger.info('Interview scheduled successfully', {
        interviewId: savedInterview._id,
        candidateId: data.candidateId,
        scheduledDate: data.scheduledDate
      });

      return true;
    } catch (error) {
      logger.error('Interview scheduling failed', {
        candidateId: data.candidateId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static async processAssessmentSchedule(data: ScheduleJob): Promise<boolean> {
    try {
      const [candidate, job] = await Promise.all([
        Candidate.findById(data.candidateId),
        Job.findById(data.jobId)
      ]);

      if (!candidate || !job) {
        throw new Error('Candidate or job not found');
      }

      const details = data.details;

      // Send assessment reminder or notification
      await QueueService.addEmailJob({
        templateName: 'assessment_reminder',
        recipientEmail: candidate.personalInfo.email,
        recipientName: `${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName}`,
        variables: {
          candidateName: `${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName}`,
          jobTitle: job.title,
          assessmentType: details.assessmentType || 'Skills Assessment',
          deadline: details.deadline || 'within 24 hours',
          assessmentLink: details.assessmentLink || '#'
        },
        priority: 'normal' as const
      });

      logger.info('Assessment schedule processed successfully', {
        candidateId: data.candidateId,
        assessmentType: details.assessmentType
      });

      return true;
    } catch (error) {
      logger.error('Assessment scheduling failed', {
        candidateId: data.candidateId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static async processReminder(data: ScheduleJob): Promise<boolean> {
    try {
      const details = data.details;
      const reminderType = details.reminderType || 'general';

      // Send reminder notification
      await QueueService.addNotificationJob({
        type: 'interview_reminder',
        recipientId: data.candidateId,
        recipientType: 'candidate',
        data: {
          reminderType,
          scheduledDate: data.scheduledDate,
          ...details
        },
        channels: ['email']
      });

      logger.info('Reminder processed successfully', {
        candidateId: data.candidateId,
        reminderType,
        scheduledDate: data.scheduledDate
      });

      return true;
    } catch (error) {
      logger.error('Reminder processing failed', {
        candidateId: data.candidateId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static async processFollowUp(data: ScheduleJob): Promise<boolean> {
    try {
      const [candidate, job] = await Promise.all([
        Candidate.findById(data.candidateId),
        Job.findById(data.jobId)
      ]);

      if (!candidate || !job) {
        throw new Error('Candidate or job not found');
      }

      const details = data.details;

      // Send follow-up email
      await QueueService.addEmailJob({
        templateName: details.templateName || 'follow_up',
        recipientEmail: candidate.personalInfo.email,
        recipientName: `${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName}`,
        variables: {
          candidateName: `${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName}`,
          jobTitle: job.title,
          followUpReason: details.followUpReason || 'checking in',
          nextSteps: details.nextSteps || 'We will be in touch soon',
          ...details.customVariables
        },
        candidateProfile: candidate.aiAnalysis?.parsedData,
        jobTitle: job.title,
        useAIPersonalization: details.useAIPersonalization || false,
        priority: 'normal' as const
      });

      logger.info('Follow-up processed successfully', {
        candidateId: data.candidateId,
        followUpReason: details.followUpReason
      });

      return true;
    } catch (error) {
      logger.error('Follow-up processing failed', {
        candidateId: data.candidateId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}