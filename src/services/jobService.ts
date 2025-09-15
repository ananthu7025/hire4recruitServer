import Job, { IJob } from '../models/Job';
import { AIService } from './aiService';
import { logger } from '../config/logger';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface CreateJobData {
  title: string;
  department: string;
  location: string;
  country: string;
  state: string;
  city: string;
  salary: {
    min: number;
    max: number;
    currency: string;
    payRate: 'hourly' | 'daily' | 'annual';
  };
  type: 'fulltime' | 'parttime' | 'contract' | 'internship';
  hiringManager: string;
  targetClosingDate?: Date;
  clientName?: string;
  accountManager?: string;
  contactPerson?: string;
  workMode: 'remote' | 'hybrid' | 'onsite';
  workExperience: string;
  educationRequirement?: string;
  skillsRequired: string[];
  preferredSkills?: string[];
  benefits?: string;
  employmentType?: string;
  workflowId: string;
  jobSummary?: string;
  jobDescription?: string;
  requirements?: string;
  expectedRevenue?: number;
  probabilityOfClosure?: string;
  numberOfOpenings?: number;
  notes?: string;
  tags?: string;
  customFields?: Array<{
    fieldName: string;
    fieldType: 'text' | 'number' | 'date' | 'select' | 'multiselect';
    fieldValue: any;
    isRequired: boolean;
  }>;
  templateUsed?: string;
  generateWithAI?: boolean;
}

export interface UpdateJobData extends Partial<CreateJobData> {
  status?: 'active' | 'draft' | 'closed' | 'onhold';
}

export class JobService {
  // Create new job
  static async createJob(jobData: CreateJobData, companyId: string, createdBy: string): Promise<IJob> {
    try {
      // Generate unique job ID
      const jobId = `JOB-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

      // Generate job description with AI if requested
      let jobDescription = jobData.jobDescription || '';
      let requirements = jobData.requirements || '';
      let aiGenerated = {
        jobDescriptionGenerated: false,
        seoOptimized: false,
        inclusivityScore: 0,
        readabilityScore: 0,
        keywordsExtracted: [] as string[],
        generatedAt: undefined as Date | undefined,
        generatedBy: undefined as mongoose.Types.ObjectId | undefined
      };

      if (jobData.generateWithAI && (!jobDescription || !requirements)) {
        try {
          const aiRequest = {
            jobTitle: jobData.title,
            department: jobData.department,
            skillsRequired: jobData.skillsRequired,
            experienceLevel: jobData.workExperience,
            workMode: jobData.workMode,
            location: jobData.location,
            companyName: '', // Will be populated from company data
            industry: '',
            salaryRange: jobData.salary,
            benefits: jobData.benefits ? [jobData.benefits] : undefined,
            additionalRequirements: jobData.educationRequirement
          };

          const aiResult = await AIService.generateJobDescription(aiRequest);

          jobDescription = jobDescription || aiResult.jobDescription;
          requirements = requirements || aiResult.requirements;

          aiGenerated = {
            jobDescriptionGenerated: true,
            seoOptimized: aiResult.seoOptimized,
            inclusivityScore: aiResult.inclusivityScore,
            readabilityScore: aiResult.readabilityScore,
            keywordsExtracted: aiResult.keySkills,
            generatedAt: new Date(),
            generatedBy: new mongoose.Types.ObjectId(createdBy)
          };

          logger.info('AI job description generated', {
            jobTitle: jobData.title,
            inclusivityScore: aiResult.inclusivityScore,
            readabilityScore: aiResult.readabilityScore
          });
        } catch (aiError) {
          logger.warn('AI job description generation failed, proceeding without AI', { error: aiError });
        }
      }

      // Create job
      const newJob = new Job({
        companyId: new mongoose.Types.ObjectId(companyId),
        company: '', // Will be populated from company data
        jobId,
        title: jobData.title,
        department: jobData.department,
        location: jobData.location,
        country: jobData.country,
        state: jobData.state,
        city: jobData.city,
        salary: jobData.salary,
        type: jobData.type,
        status: 'draft',
        hiringManager: new mongoose.Types.ObjectId(jobData.hiringManager),
        dateOpened: new Date(),
        targetClosingDate: jobData.targetClosingDate,
        clientName: jobData.clientName,
        accountManager: jobData.accountManager ? new mongoose.Types.ObjectId(jobData.accountManager) : undefined,
        contactPerson: jobData.contactPerson,
        workMode: jobData.workMode,
        workExperience: jobData.workExperience,
        educationRequirement: jobData.educationRequirement,
        skillsRequired: jobData.skillsRequired,
        preferredSkills: jobData.preferredSkills || [],
        benefits: jobData.benefits,
        employmentType: jobData.employmentType,
        workflowId: new mongoose.Types.ObjectId(jobData.workflowId),
        jobSummary: jobData.jobSummary,
        jobDescription,
        requirements,
        expectedRevenue: jobData.expectedRevenue,
        probabilityOfClosure: jobData.probabilityOfClosure,
        numberOfOpenings: jobData.numberOfOpenings || 1,
        notes: jobData.notes,
        tags: jobData.tags,
        aiGenerated,
        customFields: jobData.customFields || [],
        templateUsed: jobData.templateUsed ? new mongoose.Types.ObjectId(jobData.templateUsed) : undefined,
        workflow: new mongoose.Types.ObjectId(jobData.workflowId),
        aiInsights: {
          predictedTimeToHire: 30,
          difficultyScore: 5,
          competitivenessScore: 5,
          skillDemandAnalysis: jobData.skillsRequired.map(skill => ({
            skill,
            demandLevel: 'medium' as const,
            marketAvailability: 'moderate' as const
          })),
          lastAnalyzed: new Date()
        },
        applicationCount: 0,
        viewCount: 0,
        createdBy: new mongoose.Types.ObjectId(createdBy),
        updatedBy: new mongoose.Types.ObjectId(createdBy)
      });

      const savedJob = await newJob.save();

      logger.info('Job created successfully', {
        jobId: savedJob.jobId,
        title: savedJob.title,
        companyId,
        createdBy
      });

      return savedJob;

    } catch (error) {
      logger.error('Job creation failed:', { companyId, createdBy, error });
      throw error;
    }
  }

  // Get jobs with pagination and filters
  static async getJobs(
    companyId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      department?: string;
      type?: string;
      workMode?: string;
      hiringManager?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ jobs: IJob[]; total: number; totalPages: number }> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        department,
        type,
        workMode,
        hiringManager,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = {
        companyId: new mongoose.Types.ObjectId(companyId)
      };

      if (status) filter.status = status;
      if (department) filter.department = department;
      if (type) filter.type = type;
      if (workMode) filter.workMode = workMode;
      if (hiringManager) filter.hiringManager = new mongoose.Types.ObjectId(hiringManager);

      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
          { skillsRequired: { $in: [new RegExp(search, 'i')] } },
          { jobId: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const [jobs, total] = await Promise.all([
        Job.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('hiringManager', 'firstName lastName email')
          .populate('accountManager', 'firstName lastName email')
          .populate('createdBy', 'firstName lastName email')
          .lean(),
        Job.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      return { jobs: jobs as IJob[], total, totalPages };

    } catch (error) {
      logger.error('Get jobs failed:', { companyId, error });
      throw error;
    }
  }

  // Get job by ID
  static async getJobById(jobId: string, companyId: string): Promise<IJob | null> {
    try {
      const job = await Job.findOne({
        _id: jobId,
        companyId
      })
        .populate('hiringManager', 'firstName lastName email phone department')
        .populate('accountManager', 'firstName lastName email phone department')
        .populate('workflow', 'name stages')
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email');

      if (job) {
        // Increment view count
        await Job.findByIdAndUpdate(jobId, { $inc: { viewCount: 1 } });
      }

      return job;

    } catch (error) {
      logger.error('Get job by ID failed:', { jobId, companyId, error });
      throw error;
    }
  }

  // Update job
  static async updateJob(jobId: string, companyId: string, updates: UpdateJobData, updatedBy: string): Promise<IJob> {
    try {
      const job = await Job.findOneAndUpdate(
        { _id: jobId, companyId },
        {
          ...updates,
          updatedBy: new mongoose.Types.ObjectId(updatedBy),
          updatedAt: new Date()
        },
        {
          new: true,
          runValidators: true
        }
      );

      if (!job) {
        throw new Error('Job not found');
      }

      logger.info('Job updated successfully', {
        jobId: job.jobId,
        title: job.title,
        updatedBy,
        updatedFields: Object.keys(updates)
      });

      return job;

    } catch (error) {
      logger.error('Job update failed:', { jobId, companyId, error });
      throw error;
    }
  }

  // Delete job (soft delete)
  static async deleteJob(jobId: string, companyId: string, deletedBy: string): Promise<void> {
    try {
      const result = await Job.findOneAndUpdate(
        { _id: jobId, companyId },
        {
          status: 'closed',
          updatedBy: new mongoose.Types.ObjectId(deletedBy),
          updatedAt: new Date()
        }
      );

      if (!result) {
        throw new Error('Job not found');
      }

      logger.info('Job deleted successfully', {
        jobId: result.jobId,
        title: result.title,
        deletedBy
      });

    } catch (error) {
      logger.error('Job deletion failed:', { jobId, companyId, error });
      throw error;
    }
  }

  // Publish job (activate)
  static async publishJob(jobId: string, companyId: string, publishedBy: string): Promise<IJob> {
    try {
      const job = await Job.findOneAndUpdate(
        { _id: jobId, companyId },
        {
          status: 'active',
          updatedBy: new mongoose.Types.ObjectId(publishedBy),
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!job) {
        throw new Error('Job not found');
      }

      logger.info('Job published successfully', {
        jobId: job.jobId,
        title: job.title,
        publishedBy
      });

      return job;

    } catch (error) {
      logger.error('Job publishing failed:', { jobId, companyId, error });
      throw error;
    }
  }

  // Clone job
  static async cloneJob(originalJobId: string, companyId: string, clonedBy: string): Promise<IJob> {
    try {
      const originalJob = await Job.findOne({ _id: originalJobId, companyId });

      if (!originalJob) {
        throw new Error('Original job not found');
      }

      const jobData: CreateJobData = {
        title: `${originalJob.title} (Copy)`,
        department: originalJob.department,
        location: originalJob.location,
        country: originalJob.country,
        state: originalJob.state,
        city: originalJob.city,
        salary: originalJob.salary,
        type: originalJob.type,
        hiringManager: originalJob.hiringManager.toString(),
        targetClosingDate: originalJob.targetClosingDate,
        clientName: originalJob.clientName,
        accountManager: originalJob.accountManager?.toString(),
        contactPerson: originalJob.contactPerson,
        workMode: originalJob.workMode,
        workExperience: originalJob.workExperience,
        educationRequirement: originalJob.educationRequirement,
        skillsRequired: originalJob.skillsRequired,
        preferredSkills: originalJob.preferredSkills,
        benefits: originalJob.benefits,
        employmentType: originalJob.employmentType,
        workflowId: originalJob.workflowId.toString(),
        jobSummary: originalJob.jobSummary,
        jobDescription: originalJob.jobDescription,
        requirements: originalJob.requirements,
        expectedRevenue: originalJob.expectedRevenue,
        probabilityOfClosure: originalJob.probabilityOfClosure,
        numberOfOpenings: originalJob.numberOfOpenings,
        notes: originalJob.notes,
        tags: originalJob.tags,
        customFields: originalJob.customFields,
        templateUsed: originalJob.templateUsed?.toString()
      };

      const clonedJob = await this.createJob(jobData, companyId, clonedBy);

      logger.info('Job cloned successfully', {
        originalJobId: originalJob.jobId,
        clonedJobId: clonedJob.jobId,
        clonedBy
      });

      return clonedJob;

    } catch (error) {
      logger.error('Job cloning failed:', { originalJobId, companyId, error });
      throw error;
    }
  }

  // Get job analytics
  static async getJobAnalytics(jobId: string, companyId: string): Promise<{
    applications: number;
    views: number;
    averageTimeToHire?: number;
    conversionRate: number;
    topSources: { source: string; count: number }[];
    skillsAnalysis: { skill: string; applicantCount: number }[];
  }> {
    try {
      const job = await Job.findOne({ _id: jobId, companyId });

      if (!job) {
        throw new Error('Job not found');
      }

      // TODO: Implement when candidate applications are ready
      const analytics = {
        applications: job.applicationCount,
        views: job.viewCount,
        conversionRate: job.applicationCount > 0 ? (job.applicationCount / job.viewCount) * 100 : 0,
        topSources: [] as { source: string; count: number }[],
        skillsAnalysis: job.skillsRequired.map(skill => ({
          skill,
          applicantCount: 0 // TODO: Calculate from actual applications
        }))
      };

      return analytics;

    } catch (error) {
      logger.error('Get job analytics failed:', { jobId, companyId, error });
      throw error;
    }
  }

  // Search jobs by skills
  static async searchJobsBySkills(
    skills: string[],
    companyId?: string,
    options: { limit?: number } = {}
  ): Promise<IJob[]> {
    try {
      const { limit = 20 } = options;

      const filter: any = {
        status: 'active',
        skillsRequired: { $in: skills.map(skill => new RegExp(skill, 'i')) }
      };

      if (companyId) {
        filter.companyId = new mongoose.Types.ObjectId(companyId);
      }

      const jobs = await Job.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('hiringManager', 'firstName lastName email')
        .select('title department location skillsRequired salary workMode createdAt')
        .lean();

      return jobs as IJob[];

    } catch (error) {
      logger.error('Search jobs by skills failed:', { skills, companyId, error });
      throw error;
    }
  }

  // Get job statistics for company
  static async getCompanyJobStats(companyId: string): Promise<{
    total: number;
    active: number;
    draft: number;
    closed: number;
    onhold: number;
    totalApplications: number;
    averageTimeToHire: number;
    topDepartments: { department: string; count: number }[];
    topSkills: { skill: string; count: number }[];
  }> {
    try {
      const [
        totalJobs,
        activeJobs,
        draftJobs,
        closedJobs,
        onholdJobs,
        departmentStats,
        skillsStats
      ] = await Promise.all([
        Job.countDocuments({ companyId }),
        Job.countDocuments({ companyId, status: 'active' }),
        Job.countDocuments({ companyId, status: 'draft' }),
        Job.countDocuments({ companyId, status: 'closed' }),
        Job.countDocuments({ companyId, status: 'onhold' }),
        Job.aggregate([
          { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
          { $group: { _id: '$department', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]),
        Job.aggregate([
          { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
          { $unwind: '$skillsRequired' },
          { $group: { _id: '$skillsRequired', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ])
      ]);

      const totalApplicationsAgg = await Job.aggregate([
        { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
        { $group: { _id: null, total: { $sum: '$applicationCount' } } }
      ]);

      return {
        total: totalJobs,
        active: activeJobs,
        draft: draftJobs,
        closed: closedJobs,
        onhold: onholdJobs,
        totalApplications: totalApplicationsAgg[0]?.total || 0,
        averageTimeToHire: 30, // TODO: Calculate from actual hire data
        topDepartments: departmentStats.map((stat: any) => ({
          department: stat._id,
          count: stat.count
        })),
        topSkills: skillsStats.map((stat: any) => ({
          skill: stat._id,
          count: stat.count
        }))
      };

    } catch (error) {
      logger.error('Get company job stats failed:', { companyId, error });
      throw error;
    }
  }
}