import Interview, { IInterview } from '../models/Interview';
import Candidate from '../models/Candidate';
import Job from '../models/Job';
import User from '../models/User';
import { logger } from '../config/logger';
import mongoose from 'mongoose';

export interface CreateInterviewData {
  candidateId: string;
  jobId: string;
  title: string;
  type: 'phone' | 'video' | 'in_person' | 'technical' | 'behavioral';
  scheduledDate: Date;
  duration: number;
  location?: string;
  interviewers: {
    userId: string;
    role: 'primary' | 'secondary' | 'observer';
  }[];
  round?: number;
  stage?: string;
}

export interface InterviewFeedbackData {
  rating: number;
  strengths: string;
  weaknesses: string;
  recommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';
  comments: string;
  questionFeedback?: {
    questionId: string;
    question: string;
    answer: string;
    score: number;
    notes?: string;
  }[];
}

export class InterviewService {
  // Create new interview
  static async createInterview(
    interviewData: CreateInterviewData,
    companyId: string,
    scheduledBy: string
  ): Promise<IInterview> {
    try {
      // Validate candidate exists and belongs to company
      const candidate = await Candidate.findOne({
        _id: interviewData.candidateId,
        'applications.companyId': new mongoose.Types.ObjectId(companyId),
        isDeleted: false
      });

      if (!candidate) {
        throw new Error('Candidate not found or not associated with this company');
      }

      // Validate job exists and belongs to company
      const job = await Job.findOne({
        _id: interviewData.jobId,
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false
      });

      if (!job) {
        throw new Error('Job not found');
      }

      // Validate all interviewers exist and belong to company
      const interviewerIds = interviewData.interviewers.map(i => i.userId);
      const interviewers = await User.find({
        _id: { $in: interviewerIds },
        companyId: new mongoose.Types.ObjectId(companyId),
        isActive: true
      });

      if (interviewers.length !== interviewerIds.length) {
        throw new Error('One or more interviewers not found or not active');
      }

      // Check for scheduling conflicts
      const conflictingInterviews = await Interview.find({
        companyId: new mongoose.Types.ObjectId(companyId),
        'interviewers.userId': { $in: interviewerIds.map(id => new mongoose.Types.ObjectId(id)) },
        scheduledDate: {
          $gte: new Date(interviewData.scheduledDate.getTime() - (interviewData.duration * 60000)),
          $lte: new Date(interviewData.scheduledDate.getTime() + (interviewData.duration * 60000))
        },
        status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
        isDeleted: false
      });

      if (conflictingInterviews.length > 0) {
        throw new Error('One or more interviewers have conflicting interviews at this time');
      }

      const newInterview = new Interview({
        companyId: new mongoose.Types.ObjectId(companyId),
        jobId: new mongoose.Types.ObjectId(interviewData.jobId),
        candidateId: new mongoose.Types.ObjectId(interviewData.candidateId),
        title: interviewData.title,
        type: interviewData.type,
        scheduledDate: interviewData.scheduledDate,
        duration: interviewData.duration,
        location: interviewData.location,
        interviewers: interviewData.interviewers.map(interviewer => ({
          userId: new mongoose.Types.ObjectId(interviewer.userId),
          role: interviewer.role,
          isConfirmed: false
        })),
        round: interviewData.round || 1,
        stage: interviewData.stage || 'Initial Interview',
        status: 'scheduled',
        aiAnalysis: {
          recordingAnalyzed: false,
          consentProvided: false
        },
        feedback: [],
        isDeleted: false,
        scheduledBy: new mongoose.Types.ObjectId(scheduledBy),
        updatedBy: new mongoose.Types.ObjectId(scheduledBy)
      });

      const savedInterview = await newInterview.save();

      logger.info('Interview scheduled successfully', {
        interviewId: savedInterview._id.toString(),
        candidateId: interviewData.candidateId,
        jobId: interviewData.jobId,
        scheduledBy
      });

      return savedInterview;

    } catch (error) {
      logger.error('Interview scheduling failed:', { interviewData, error });
      throw error;
    }
  }

  // Get interviews with filters and pagination
  static async getInterviews(
    companyId: string,
    options: {
      page?: number;
      limit?: number;
      candidateId?: string;
      jobId?: string;
      interviewerId?: string;
      status?: string;
      type?: string;
      dateFrom?: string;
      dateTo?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ interviews: IInterview[]; total: number; totalPages: number }> {
    try {
      const {
        page = 1,
        limit = 10,
        candidateId,
        jobId,
        interviewerId,
        status,
        type,
        dateFrom,
        dateTo,
        sortBy = 'scheduledDate',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = {
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false
      };

      if (candidateId) {
        filter.candidateId = new mongoose.Types.ObjectId(candidateId);
      }

      if (jobId) {
        filter.jobId = new mongoose.Types.ObjectId(jobId);
      }

      if (interviewerId) {
        filter['interviewers.userId'] = new mongoose.Types.ObjectId(interviewerId);
      }

      if (status) {
        filter.status = status;
      }

      if (type) {
        filter.type = type;
      }

      if (dateFrom || dateTo) {
        filter.scheduledDate = {};
        if (dateFrom) {
          filter.scheduledDate.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          filter.scheduledDate.$lte = new Date(dateTo);
        }
      }

      // Build sort
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const [interviews, total] = await Promise.all([
        Interview.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('candidateId', 'personalInfo')
          .populate('jobId', 'title')
          .populate('interviewers.userId', 'firstName lastName')
          .populate('scheduledBy', 'firstName lastName')
          .lean(),
        Interview.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      return { interviews: interviews as IInterview[], total, totalPages };

    } catch (error) {
      logger.error('Get interviews failed:', { companyId, options, error });
      throw error;
    }
  }

  // Get interview by ID
  static async getInterviewById(interviewId: string, companyId: string): Promise<IInterview | null> {
    try {
      const interview = await Interview.findOne({
        _id: interviewId,
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false
      })
        .populate('candidateId', 'personalInfo applications')
        .populate('jobId', 'title jobDescription')
        .populate('interviewers.userId', 'firstName lastName email')
        .populate('scheduledBy', 'firstName lastName')
        .populate('feedback.interviewerId', 'firstName lastName');

      return interview;

    } catch (error) {
      logger.error('Get interview by ID failed:', { interviewId, companyId, error });
      throw error;
    }
  }

  // Update interview
  static async updateInterview(
    interviewId: string,
    companyId: string,
    updates: Partial<CreateInterviewData>,
    updatedBy: string
  ): Promise<IInterview> {
    try {
      const interview = await Interview.findOne({
        _id: interviewId,
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false
      });

      if (!interview) {
        throw new Error('Interview not found');
      }

      // Check if interview can be updated (not completed or cancelled)
      if (['completed', 'cancelled'].includes(interview.status)) {
        throw new Error('Cannot update completed or cancelled interview');
      }

      // If updating interviewers, validate them
      if (updates.interviewers) {
        const interviewerIds = updates.interviewers.map(i => i.userId);
        const interviewers = await User.find({
          _id: { $in: interviewerIds },
          companyId: new mongoose.Types.ObjectId(companyId),
          isActive: true
        });

        if (interviewers.length !== interviewerIds.length) {
          throw new Error('One or more interviewers not found or not active');
        }

        // Check for conflicts if date/time is being updated
        if (updates.scheduledDate || updates.duration) {
          const scheduledDate = updates.scheduledDate || interview.scheduledDate;
          const duration = updates.duration || interview.duration;

          const conflictingInterviews = await Interview.find({
            _id: { $ne: interviewId },
            companyId: new mongoose.Types.ObjectId(companyId),
            'interviewers.userId': { $in: interviewerIds.map(id => new mongoose.Types.ObjectId(id)) },
            scheduledDate: {
              $gte: new Date(scheduledDate.getTime() - (duration * 60000)),
              $lte: new Date(scheduledDate.getTime() + (duration * 60000))
            },
            status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
            isDeleted: false
          });

          if (conflictingInterviews.length > 0) {
            throw new Error('One or more interviewers have conflicting interviews at this time');
          }
        }

        // Map interviewers properly
        updates.interviewers = updates.interviewers.map(interviewer => ({
          userId: interviewer.userId,
          role: interviewer.role,
          isConfirmed: false // Reset confirmation when updating
        })) as any;
      }

      // Update status to rescheduled if date/time changed
      if (updates.scheduledDate || updates.duration) {
        (updates as any).status = 'rescheduled';
      }

      const updatedInterview = await Interview.findByIdAndUpdate(
        interviewId,
        {
          ...updates,
          updatedBy: new mongoose.Types.ObjectId(updatedBy),
          updatedAt: new Date()
        },
        {
          new: true,
          runValidators: true
        }
      ).populate('candidateId', 'personalInfo')
        .populate('jobId', 'title')
        .populate('interviewers.userId', 'firstName lastName');

      if (!updatedInterview) {
        throw new Error('Interview not found');
      }

      logger.info('Interview updated successfully', {
        interviewId,
        updatedBy,
        updatedFields: Object.keys(updates)
      });

      return updatedInterview;

    } catch (error) {
      logger.error('Interview update failed:', { interviewId, companyId, error });
      throw error;
    }
  }

  // Cancel interview
  static async cancelInterview(
    interviewId: string,
    companyId: string,
    reason: string,
    cancelledBy: string,
    notifyParticipants: boolean = true
  ): Promise<IInterview> {
    try {
      const interview = await Interview.findOne({
        _id: interviewId,
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false
      });

      if (!interview) {
        throw new Error('Interview not found');
      }

      if (['completed', 'cancelled'].includes(interview.status)) {
        throw new Error('Cannot cancel completed or already cancelled interview');
      }

      const updatedInterview = await Interview.findByIdAndUpdate(
        interviewId,
        {
          status: 'cancelled',
          nextSteps: `Interview cancelled: ${reason}`,
          updatedBy: new mongoose.Types.ObjectId(cancelledBy),
          updatedAt: new Date()
        },
        { new: true }
      ).populate('candidateId', 'personalInfo')
        .populate('jobId', 'title')
        .populate('interviewers.userId', 'firstName lastName email');

      if (!updatedInterview) {
        throw new Error('Interview not found');
      }

      // TODO: Send notifications if notifyParticipants is true

      logger.info('Interview cancelled successfully', {
        interviewId,
        reason,
        cancelledBy,
        notifyParticipants
      });

      return updatedInterview;

    } catch (error) {
      logger.error('Interview cancellation failed:', { interviewId, companyId, error });
      throw error;
    }
  }

  // Submit interview feedback
  static async submitFeedback(
    interviewId: string,
    companyId: string,
    interviewerId: string,
    feedbackData: InterviewFeedbackData
  ): Promise<IInterview> {
    try {
      const interview = await Interview.findOne({
        _id: interviewId,
        companyId: new mongoose.Types.ObjectId(companyId),
        'interviewers.userId': new mongoose.Types.ObjectId(interviewerId),
        isDeleted: false
      });

      if (!interview) {
        throw new Error('Interview not found or user is not an interviewer');
      }

      if (interview.status !== 'completed') {
        throw new Error('Can only submit feedback for completed interviews');
      }

      // Check if feedback already exists from this interviewer
      const existingFeedbackIndex = interview.feedback.findIndex(
        f => f.interviewerId.toString() === interviewerId
      );

      const feedback = {
        interviewerId: new mongoose.Types.ObjectId(interviewerId),
        rating: feedbackData.rating,
        strengths: feedbackData.strengths,
        weaknesses: feedbackData.weaknesses,
        recommendation: feedbackData.recommendation,
        comments: feedbackData.comments,
        questionFeedback: feedbackData.questionFeedback || [],
        submittedAt: new Date()
      };

      if (existingFeedbackIndex >= 0) {
        // Update existing feedback
        interview.feedback[existingFeedbackIndex] = feedback as any;
      } else {
        // Add new feedback
        interview.feedback.push(feedback as any);
      }

      // Calculate overall rating if all interviewers have submitted feedback
      const totalInterviewers = interview.interviewers.length;
      const feedbackCount = interview.feedback.length;

      if (feedbackCount === totalInterviewers) {
        const averageRating = interview.feedback.reduce((sum, f) => sum + f.rating, 0) / feedbackCount;
        interview.overallRating = Math.round(averageRating * 10) / 10;

        // Determine decision based on recommendations
        const recommendations = interview.feedback.map(f => f.recommendation);
        const strongHire = recommendations.filter(r => r === 'strong_hire').length;
        const hire = recommendations.filter(r => r === 'hire').length;
        const noHire = recommendations.filter(r => r === 'no_hire').length;
        const strongNoHire = recommendations.filter(r => r === 'strong_no_hire').length;

        if (strongNoHire > 0 || noHire > hire + strongHire) {
          interview.decision = 'fail';
        } else if (strongHire > 0 || hire >= strongHire) {
          interview.decision = 'pass';
        }
      }

      const updatedInterview = await interview.save();

      logger.info('Interview feedback submitted successfully', {
        interviewId,
        interviewerId,
        rating: feedbackData.rating,
        recommendation: feedbackData.recommendation
      });

      return updatedInterview;

    } catch (error) {
      logger.error('Submit interview feedback failed:', { interviewId, interviewerId, error });
      throw error;
    }
  }

  // Get calendar view for interviews
  static async getCalendarView(
    companyId: string,
    startDate: Date,
    endDate: Date,
    interviewerId?: string
  ): Promise<{
    interviews: Array<{
      id: string;
      title: string;
      start: Date;
      end: Date;
      candidate: any;
      job: any;
      type: string;
      status: string;
      location?: string;
    }>;
  }> {
    try {
      const filter: any = {
        companyId: new mongoose.Types.ObjectId(companyId),
        scheduledDate: {
          $gte: startDate,
          $lte: endDate
        },
        status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
        isDeleted: false
      };

      if (interviewerId) {
        filter['interviewers.userId'] = new mongoose.Types.ObjectId(interviewerId);
      }

      const interviews = await Interview.find(filter)
        .populate('candidateId', 'personalInfo')
        .populate('jobId', 'title')
        .select('title scheduledDate duration candidateId jobId type status location')
        .lean();

      const calendarData = interviews.map(interview => ({
        id: interview._id.toString(),
        title: interview.title,
        start: interview.scheduledDate,
        end: new Date(interview.scheduledDate.getTime() + (interview.duration * 60000)),
        candidate: interview.candidateId,
        job: interview.jobId,
        type: interview.type,
        status: interview.status,
        location: interview.location
      }));

      return { interviews: calendarData };

    } catch (error) {
      logger.error('Get calendar view failed:', { companyId, startDate, endDate, error });
      throw error;
    }
  }

  // Check interviewer availability
  static async checkAvailability(
    companyId: string,
    interviewerIds: string[],
    date: Date,
    duration: number
  ): Promise<{
    availableSlots: Array<{ start: Date; end: Date; availableInterviewers: string[] }>;
    interviewerSchedules: { [interviewerId: string]: { busySlots: Array<{ start: Date; end: Date; title: string }> } };
  }> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get existing interviews for the interviewers on this date
      const existingInterviews = await Interview.find({
        companyId: new mongoose.Types.ObjectId(companyId),
        'interviewers.userId': { $in: interviewerIds.map(id => new mongoose.Types.ObjectId(id)) },
        scheduledDate: {
          $gte: startOfDay,
          $lte: endOfDay
        },
        status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
        isDeleted: false
      }).populate('interviewers.userId', 'firstName lastName');

      // Build interviewer schedules
      const interviewerSchedules: { [key: string]: { busySlots: Array<{ start: Date; end: Date; title: string }> } } = {};

      interviewerIds.forEach(id => {
        interviewerSchedules[id] = { busySlots: [] };
      });

      existingInterviews.forEach(interview => {
        const startTime = interview.scheduledDate;
        const endTime = new Date(startTime.getTime() + (interview.duration * 60000));

        interview.interviewers.forEach(interviewer => {
          const interviewerId = interviewer.userId.toString();
          if (interviewerSchedules[interviewerId]) {
            interviewerSchedules[interviewerId].busySlots.push({
              start: startTime,
              end: endTime,
              title: interview.title
            });
          }
        });
      });

      // Generate available time slots (9 AM to 6 PM in 30-minute intervals)
      const availableSlots: Array<{ start: Date; end: Date; availableInterviewers: string[] }> = [];
      const workStart = new Date(date);
      workStart.setHours(9, 0, 0, 0);
      const workEnd = new Date(date);
      workEnd.setHours(18, 0, 0, 0);

      for (let time = new Date(workStart); time < workEnd; time.setMinutes(time.getMinutes() + 30)) {
        const slotStart = new Date(time);
        const slotEnd = new Date(time.getTime() + (duration * 60000));

        if (slotEnd > workEnd) break;

        const availableInterviewers: string[] = [];

        interviewerIds.forEach(interviewerId => {
          const busySlots = interviewerSchedules[interviewerId].busySlots;
          const hasConflict = busySlots.some(busy =>
            (slotStart < busy.end && slotEnd > busy.start)
          );

          if (!hasConflict) {
            availableInterviewers.push(interviewerId);
          }
        });

        if (availableInterviewers.length > 0) {
          availableSlots.push({
            start: slotStart,
            end: slotEnd,
            availableInterviewers
          });
        }
      }

      return { availableSlots, interviewerSchedules };

    } catch (error) {
      logger.error('Check availability failed:', { companyId, interviewerIds, date, error });
      throw error;
    }
  }
}