import Assessment, { IAssessment } from '../models/Assessment';
import Job from '../models/Job';
import Candidate from '../models/Candidate';
import { logger } from '../config/logger';
import mongoose from 'mongoose';

export interface AssessmentOptions {
  page?: number;
  limit?: number;
  type?: string;
  category?: string;
  difficulty?: string;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AssessmentResult {
  assessments: IAssessment[];
  total: number;
  totalPages: number;
}

export interface AssessmentData {
  title: string;
  description?: string;
  type: 'technical' | 'cognitive' | 'communication' | 'personality' | 'custom';
  category: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  relatedRoles?: string[];
  requiredSkills?: string[];
  industry?: string;
  questions: {
    questionId: string;
    type: 'multiple_choice' | 'coding' | 'essay' | 'rating';
    question: string;
    options?: string[];
    correctAnswer?: string | string[];
    points: number;
    timeLimit?: number;
    skillTested?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
  }[];
  totalPoints: number;
  timeLimit: number;
  passingScore: number;
  allowRetake?: boolean;
  showResults?: boolean;
}

export class AssessmentService {
  static async createAssessment(
    assessmentData: AssessmentData,
    companyId: mongoose.Types.ObjectId,
    createdBy: mongoose.Types.ObjectId
  ): Promise<IAssessment> {
    try {
      const assessment = new Assessment({
        ...assessmentData,
        companyId,
        createdBy,
        isActive: true,
        isDeleted: false
      });

      await assessment.save();
      logger.info('Assessment created successfully', {
        assessmentId: assessment._id,
        companyId,
        createdBy
      });

      return assessment;
    } catch (error) {
      logger.error('Error creating assessment:', error);
      throw error;
    }
  }

  static async getAssessments(
    companyId: mongoose.Types.ObjectId,
    options: AssessmentOptions = {}
  ): Promise<AssessmentResult> {
    try {
      const {
        page = 1,
        limit = 10,
        type,
        category,
        difficulty,
        search,
        isActive,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const filter: any = {
        companyId,
        isDeleted: false
      };

      if (type) filter.type = type;
      if (category) filter.category = { $regex: category, $options: 'i' };
      if (difficulty) filter.difficulty = difficulty;
      if (typeof isActive === 'boolean') filter.isActive = isActive;

      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { requiredSkills: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      const sortOptions: any = {};
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const [assessments, total] = await Promise.all([
        Assessment.find(filter)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .populate('createdBy', 'firstName lastName email')
          .populate('jobs', 'title')
          .lean(),
        Assessment.countDocuments(filter)
      ]);

      return {
        assessments: assessments as IAssessment[],
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error getting assessments:', error);
      throw error;
    }
  }

  static async getAssessmentById(
    assessmentId: string,
    companyId: mongoose.Types.ObjectId
  ): Promise<IAssessment | null> {
    try {
      const assessment = await Assessment.findOne({
        _id: assessmentId,
        companyId,
        isDeleted: false
      })
        .populate('createdBy', 'firstName lastName email')
        .populate('jobs', 'title department location')
        .populate('jobTemplates', 'title');

      return assessment;
    } catch (error) {
      logger.error('Error getting assessment by ID:', error);
      throw error;
    }
  }

  static async updateAssessment(
    assessmentId: string,
    companyId: mongoose.Types.ObjectId,
    updates: Partial<AssessmentData>,
    updatedBy: mongoose.Types.ObjectId
  ): Promise<IAssessment> {
    try {
      const assessment = await Assessment.findOne({
        _id: assessmentId,
        companyId,
        isDeleted: false
      });

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      Object.assign(assessment, updates);
      assessment.updatedAt = new Date();

      await assessment.save();

      logger.info('Assessment updated successfully', {
        assessmentId,
        companyId,
        updatedBy
      });

      return assessment;
    } catch (error) {
      logger.error('Error updating assessment:', error);
      throw error;
    }
  }

  static async deleteAssessment(
    assessmentId: string,
    companyId: mongoose.Types.ObjectId,
    deletedBy: mongoose.Types.ObjectId
  ): Promise<IAssessment> {
    try {
      const assessment = await Assessment.findOne({
        _id: assessmentId,
        companyId,
        isDeleted: false
      });

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      assessment.isDeleted = true;
      assessment.deletedAt = new Date();
      assessment.deletedBy = deletedBy;
      assessment.isActive = false;

      await assessment.save();

      logger.info('Assessment deleted successfully', {
        assessmentId,
        companyId,
        deletedBy
      });

      return assessment;
    } catch (error) {
      logger.error('Error deleting assessment:', error);
      throw error;
    }
  }

  static async duplicateAssessment(
    assessmentId: string,
    companyId: mongoose.Types.ObjectId,
    createdBy: mongoose.Types.ObjectId,
    newTitle?: string
  ): Promise<IAssessment> {
    try {
      const originalAssessment = await Assessment.findOne({
        _id: assessmentId,
        companyId,
        isDeleted: false
      });

      if (!originalAssessment) {
        throw new Error('Assessment not found');
      }

      const { _id, createdAt, updatedAt, ...originalData } = originalAssessment.toObject();

      const duplicateData = {
        ...originalData,
        title: newTitle || `${originalAssessment.title} (Copy)`,
        createdBy,
        jobs: [],
        jobTemplates: [],
        isActive: false
      };

      const duplicatedAssessment = new Assessment(duplicateData);
      await duplicatedAssessment.save();

      logger.info('Assessment duplicated successfully', {
        originalId: assessmentId,
        duplicatedId: duplicatedAssessment._id,
        companyId,
        createdBy
      });

      return duplicatedAssessment;
    } catch (error) {
      logger.error('Error duplicating assessment:', error);
      throw error;
    }
  }

  static async assignAssessmentToJob(
    assessmentId: string,
    jobId: string,
    companyId: mongoose.Types.ObjectId
  ): Promise<IAssessment> {
    try {
      const [assessment, job] = await Promise.all([
        Assessment.findOne({ _id: assessmentId, companyId, isDeleted: false }),
        Job.findOne({ _id: jobId, companyId, isDeleted: false })
      ]);

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      if (!job) {
        throw new Error('Job not found');
      }

      if (!assessment.jobs) {
        assessment.jobs = [];
      }

      const jobObjectId = new mongoose.Types.ObjectId(jobId);
      if (!assessment.jobs.some(id => id.equals(jobObjectId))) {
        assessment.jobs.push(jobObjectId);
        await assessment.save();
      }

      logger.info('Assessment assigned to job successfully', {
        assessmentId,
        jobId,
        companyId
      });

      return assessment;
    } catch (error) {
      logger.error('Error assigning assessment to job:', error);
      throw error;
    }
  }

  static async getAssessmentAnalytics(
    assessmentId: string,
    companyId: mongoose.Types.ObjectId
  ): Promise<any> {
    try {
      const assessment = await Assessment.findOne({
        _id: assessmentId,
        companyId,
        isDeleted: false
      });

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      const analytics = {
        assessmentInfo: {
          title: assessment.title,
          type: assessment.type,
          totalPoints: assessment.totalPoints,
          passingScore: assessment.passingScore,
          questionsCount: assessment.questions.length
        },
        usage: {
          timesUsed: 0,
          candidatesAssessed: 0,
          averageScore: 0,
          passRate: 0
        },
        performance: {
          questionAnalysis: assessment.questions.map(q => ({
            questionId: q.questionId,
            question: q.question,
            type: q.type,
            difficulty: q.difficulty,
            averageScore: 0,
            correctAnswerRate: 0
          }))
        }
      };

      return analytics;
    } catch (error) {
      logger.error('Error getting assessment analytics:', error);
      throw error;
    }
  }

  static async getAssessmentsByJob(
    jobId: string,
    companyId: mongoose.Types.ObjectId
  ): Promise<IAssessment[]> {
    try {
      const assessments = await Assessment.find({
        companyId,
        jobs: jobId,
        isActive: true,
        isDeleted: false
      }).select('title description type category difficulty totalPoints timeLimit passingScore');

      return assessments;
    } catch (error) {
      logger.error('Error getting assessments by job:', error);
      throw error;
    }
  }
}