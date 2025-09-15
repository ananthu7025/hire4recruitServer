import Candidate, { ICandidate } from '../models/Candidate';
import Job, { IJob } from '../models/Job';
import { AIService, CandidateMatchingRequest, ResumeParsingResponse } from './aiService';
import { FileService, FileMetadata } from '../middleware/fileUpload';
import { logger } from '../config/logger';
import mongoose from 'mongoose';
import fs from 'fs';
import pdfParse from 'pdf-parse';

export interface CreateCandidateData {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    nationality?: string;
  };
  experience: string;
  currentPosition?: string;
  currentCompany?: string;
  expectedSalary?: {
    min: number;
    max: number;
    currency: string;
  };
  preferences?: {
    jobTypes: ('fulltime' | 'parttime' | 'contract' | 'internship')[];
    workModes: ('remote' | 'hybrid' | 'onsite')[];
    preferredLocations: string[];
    industries: string[];
    communicationPreferences: {
      email: boolean;
      phone: boolean;
      sms: boolean;
      preferredTime: string;
    };
  };
}

export interface ApplicationData {
  jobId: string;
  applicationSource: 'job_board' | 'referral' | 'company_website' | 'recruiter' | 'linkedin' | 'direct_application' | 'other';
  referralSource?: string;
  coverLetter?: string;
  customResponses?: { question: string; answer: string }[];
}

export class CandidateService {
  // Create new candidate
  static async createCandidate(
    candidateData: CreateCandidateData,
    resumeFile: Express.Multer.File,
    createdBy: string,
    companyId?: string
  ): Promise<ICandidate> {
    try {
      // Check if candidate with email already exists
      const existingCandidate = await Candidate.findOne({
        'personalInfo.email': candidateData.personalInfo.email
      });

      if (existingCandidate) {
        throw new Error('Candidate with this email already exists');
      }

      // Create file metadata for resume
      const resumeMetadata = FileService.createFileMetadata(resumeFile, createdBy);

      // Parse resume with AI if possible
      let aiAnalysis = {
        resumeParsed: false,
        parsedData: {
          skills: {
            technical: [] as string[],
            soft: [] as string[],
            certifications: [] as string[],
            languages: [] as string[]
          },
          workHistory: [] as any[],
          education: [] as any[],
          profileSummary: undefined as string | undefined
        },
        skillsConfidence: [] as any[],
        careerProgression: undefined as any,
        lastAnalyzed: undefined as Date | undefined
      };

      try {
        // Extract text from resume
        const resumeText = await this.extractTextFromFile(resumeFile);

        if (resumeText) {
          // Use AI to parse resume
          const aiResult = await AIService.parseResume({ resumeText });

          aiAnalysis = {
            resumeParsed: true,
            parsedData: aiResult,
            skillsConfidence: aiResult.skillsConfidence || [],
            careerProgression: aiResult.careerProgression,
            lastAnalyzed: new Date()
          };

          logger.info('Resume parsed successfully with AI', {
            candidateEmail: candidateData.personalInfo.email,
            skillsCount: aiResult.skills?.technical?.length || 0
          });
        }
      } catch (aiError) {
        logger.warn('AI resume parsing failed, proceeding without AI analysis', {
          candidateEmail: candidateData.personalInfo.email,
          error: aiError
        });
      }

      // Create candidate
      const newCandidate = new Candidate({
        personalInfo: candidateData.personalInfo,
        experience: candidateData.experience,
        currentPosition: candidateData.currentPosition,
        currentCompany: candidateData.currentCompany,
        expectedSalary: candidateData.expectedSalary,
        resume: {
          fileId: new mongoose.Types.ObjectId(), // Will be replaced with actual file ID from file management system
          fileName: resumeFile.originalname,
          uploadDate: new Date(),
          base64: undefined // Could store base64 for quick access if needed
        },
        aiAnalysis,
        preferences: candidateData.preferences,
        applications: [],
        isDeleted: false,
        createdBy: new mongoose.Types.ObjectId(createdBy),
        updatedBy: new mongoose.Types.ObjectId(createdBy)
      });

      const savedCandidate = await newCandidate.save();

      logger.info('Candidate created successfully', {
        candidateId: savedCandidate._id.toString(),
        email: candidateData.personalInfo.email,
        createdBy
      });

      return savedCandidate;

    } catch (error) {
      logger.error('Candidate creation failed:', { candidateData, error });
      throw error;
    }
  }

  // Extract text from uploaded file
  private static async extractTextFromFile(file: Express.Multer.File): Promise<string | null> {
    try {
      const buffer = fs.readFileSync(file.path);

      // Handle PDF files
      if (file.mimetype === 'application/pdf') {
        const data = await pdfParse(buffer);
        return data.text;
      }

      // Handle text files
      if (file.mimetype === 'text/plain') {
        return buffer.toString('utf-8');
      }

      // For DOC/DOCX files, we would need additional libraries like mammoth.js
      // For now, return null for unsupported formats
      logger.warn('Unsupported file format for text extraction', {
        filename: file.originalname,
        mimetype: file.mimetype
      });

      return null;

    } catch (error) {
      logger.error('Text extraction failed:', {
        filename: file.originalname,
        error
      });
      return null;
    }
  }

  // Apply candidate to job
  static async applyToJob(
    candidateId: string,
    applicationData: ApplicationData,
    companyId: string
  ): Promise<ICandidate> {
    try {
      const candidate = await Candidate.findById(candidateId);
      const job = await Job.findOne({
        _id: applicationData.jobId,
        companyId,
        status: 'active'
      });

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      if (!job) {
        throw new Error('Job not found or not active');
      }

      // Check if already applied
      const existingApplication = candidate.applications?.find(
        app => app.jobId.toString() === applicationData.jobId && app.companyId.toString() === companyId
      );

      if (existingApplication) {
        throw new Error('Candidate has already applied to this job');
      }

      // Create application
      const applicationId = new mongoose.Types.ObjectId();
      const application = {
        applicationId,
        companyId: new mongoose.Types.ObjectId(companyId),
        jobId: new mongoose.Types.ObjectId(applicationData.jobId),
        jobTitle: job.title,
        companyName: job.company,
        status: 'applied' as const,
        appliedDate: new Date(),
        lastUpdated: new Date(),
        statusHistory: [{
          newStatus: 'applied' as const,
          date: new Date(),
          notes: 'Initial application submitted',
          updatedBy: new mongoose.Types.ObjectId(), // System update
          reason: 'Application submitted'
        }],
        applicationSource: applicationData.applicationSource,
        referralSource: applicationData.referralSource,
        coverLetter: applicationData.coverLetter,
        customResponses: applicationData.customResponses,
        interviews: [],
        assessments: [],
        communications: [],
        internalNotes: [],
        metrics: {
          timeToFirstResponse: 0,
          timeInCurrentStage: 0,
          totalApplicationTime: 0,
          interviewsCompleted: 0,
          assessmentsCompleted: 0,
          responseRate: 0
        },
        aiScoring: undefined as any
      };

      // Perform AI matching analysis
      if (candidate.aiAnalysis.resumeParsed) {
        try {
          const candidateProfile: ResumeParsingResponse = {
            personalInfo: {
              name: candidate.personalInfo.firstName + ' ' + candidate.personalInfo.lastName,
              email: candidate.personalInfo.email,
              phone: candidate.personalInfo.phone,
              location: candidate.personalInfo.location
            },
            skills: candidate.aiAnalysis.parsedData.skills,
            workHistory: candidate.aiAnalysis.parsedData.workHistory,
            education: candidate.aiAnalysis.parsedData.education,
            profileSummary: candidate.aiAnalysis.parsedData.profileSummary || '',
            skillsConfidence: candidate.aiAnalysis.skillsConfidence || [],
            careerProgression: candidate.aiAnalysis.careerProgression || {
              seniorityLevel: 'entry',
              careerGrowth: 'stable',
              industryExperience: []
            }
          };

          const matchingRequest: CandidateMatchingRequest = {
            jobDescription: job.jobDescription,
            jobSkills: job.skillsRequired,
            candidateProfile: candidateProfile,
            jobTitle: job.title,
            experienceRequired: job.workExperience,
            location: job.location
          };

          const matchingResult = await AIService.matchCandidateToJob(matchingRequest);

          application.aiScoring = {
            overallScore: matchingResult.overallScore,
            breakdown: matchingResult.breakdown,
            matchReasons: matchingResult.matchReasons,
            missingSkills: matchingResult.missingSkills,
            overqualifications: matchingResult.overqualifications,
            riskFactors: matchingResult.riskFactors,
            improvementRecommendations: matchingResult.improvementRecommendations,
            scoreConfidence: matchingResult.scoreConfidence,
            lastScored: new Date()
          };

          logger.info('AI candidate matching completed', {
            candidateId,
            jobId: applicationData.jobId,
            overallScore: matchingResult.overallScore
          });
        } catch (aiError) {
          logger.warn('AI candidate matching failed', {
            candidateId,
            jobId: applicationData.jobId,
            error: aiError
          });
        }
      }

      // Add application to candidate
      if (!candidate.applications) {
        candidate.applications = [];
      }
      candidate.applications.push(application as any);

      // Update job application count
      await Job.findByIdAndUpdate(applicationData.jobId, {
        $inc: { applicationCount: 1 }
      });

      const updatedCandidate = await candidate.save();

      logger.info('Candidate applied to job successfully', {
        candidateId,
        jobId: applicationData.jobId,
        companyId,
        applicationSource: applicationData.applicationSource
      });

      return updatedCandidate;

    } catch (error) {
      logger.error('Job application failed:', { candidateId, applicationData, error });
      throw error;
    }
  }

  // Get candidates with filters and pagination
  static async getCandidates(
    options: {
      companyId?: string;
      page?: number;
      limit?: number;
      search?: string;
      skills?: string[];
      experience?: string;
      location?: string;
      jobId?: string;
      applicationStatus?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ candidates: ICandidate[]; total: number; totalPages: number }> {
    try {
      const {
        companyId,
        page = 1,
        limit = 10,
        search,
        skills,
        experience,
        location,
        jobId,
        applicationStatus,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = { isDeleted: false };

      if (companyId && jobId) {
        filter['applications'] = {
          $elemMatch: {
            companyId: new mongoose.Types.ObjectId(companyId),
            jobId: new mongoose.Types.ObjectId(jobId)
          }
        };
      } else if (companyId) {
        filter['applications.companyId'] = new mongoose.Types.ObjectId(companyId);
      }

      if (applicationStatus && companyId) {
        filter['applications'] = {
          $elemMatch: {
            companyId: new mongoose.Types.ObjectId(companyId),
            status: applicationStatus
          }
        };
      }

      if (search) {
        filter.$or = [
          { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
          { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
          { 'personalInfo.email': { $regex: search, $options: 'i' } },
          { 'personalInfo.location': { $regex: search, $options: 'i' } },
          { currentPosition: { $regex: search, $options: 'i' } },
          { currentCompany: { $regex: search, $options: 'i' } },
          { 'aiAnalysis.parsedData.skills.technical': { $in: [new RegExp(search, 'i')] } }
        ];
      }

      if (skills && skills.length > 0) {
        filter['aiAnalysis.parsedData.skills.technical'] = {
          $in: skills.map(skill => new RegExp(skill, 'i'))
        };
      }

      if (experience) {
        filter['aiAnalysis.parsedData.workHistory'] = {
          $elemMatch: {
            position: { $regex: experience, $options: 'i' }
          }
        };
      }

      if (location) {
        filter['personalInfo.location'] = { $regex: location, $options: 'i' };
      }

      // Build sort
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const [candidates, total] = await Promise.all([
        Candidate.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('createdBy', 'firstName lastName email')
          .lean(),
        Candidate.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      return { candidates: candidates as ICandidate[], total, totalPages };

    } catch (error) {
      logger.error('Get candidates failed:', { options, error });
      throw error;
    }
  }

  // Get candidate by ID
  static async getCandidateById(candidateId: string, companyId?: string): Promise<ICandidate | null> {
    try {
      const filter: any = {
        _id: candidateId,
        isDeleted: false
      };

      // If companyId provided, ensure candidate has applications with this company
      if (companyId) {
        filter['applications.companyId'] = new mongoose.Types.ObjectId(companyId);
      }

      const candidate = await Candidate.findOne(filter)
        .populate('createdBy', 'firstName lastName email')
        .populate('applications.interviews', 'scheduledDate type status')
        .populate('applications.assessments', 'title status score');

      return candidate;

    } catch (error) {
      logger.error('Get candidate by ID failed:', { candidateId, companyId, error });
      throw error;
    }
  }

  // Update candidate profile
  static async updateCandidate(
    candidateId: string,
    updates: Partial<CreateCandidateData>,
    updatedBy: string
  ): Promise<ICandidate> {
    try {
      const candidate = await Candidate.findOneAndUpdate(
        { _id: candidateId, isDeleted: false },
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

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      logger.info('Candidate updated successfully', {
        candidateId,
        updatedBy,
        updatedFields: Object.keys(updates)
      });

      return candidate;

    } catch (error) {
      logger.error('Candidate update failed:', { candidateId, error });
      throw error;
    }
  }

  // Update application status
  static async updateApplicationStatus(
    candidateId: string,
    applicationId: string,
    newStatus: string,
    companyId: string,
    updatedBy: string,
    notes?: string,
    reason?: string
  ): Promise<ICandidate> {
    try {
      const candidate = await Candidate.findOne({
        _id: candidateId,
        isDeleted: false,
        'applications.applicationId': new mongoose.Types.ObjectId(applicationId),
        'applications.companyId': new mongoose.Types.ObjectId(companyId)
      });

      if (!candidate) {
        throw new Error('Candidate or application not found');
      }

      // Find the application
      const application = candidate.applications?.find(
        app => app.applicationId.toString() === applicationId
      );

      if (!application) {
        throw new Error('Application not found');
      }

      const previousStatus = application.status;

      // Update application status
      application.status = newStatus as any;
      application.lastUpdated = new Date();

      // Add to status history
      application.statusHistory.push({
        previousStatus,
        newStatus,
        date: new Date(),
        notes,
        updatedBy: new mongoose.Types.ObjectId(updatedBy),
        reason
      });

      const updatedCandidate = await candidate.save();

      logger.info('Application status updated successfully', {
        candidateId,
        applicationId,
        previousStatus,
        newStatus,
        updatedBy
      });

      return updatedCandidate;

    } catch (error) {
      logger.error('Application status update failed:', {
        candidateId,
        applicationId,
        newStatus,
        error
      });
      throw error;
    }
  }

  // Search candidates by skills for talent rediscovery
  static async searchTalentPool(
    jobId: string,
    companyId: string,
    options: { limit?: number } = {}
  ): Promise<{
    matchedCandidates: {
      candidate: ICandidate;
      matchScore: number;
      reasoning: string;
    }[];
  }> {
    try {
      const { limit = 20 } = options;

      const job = await Job.findOne({ _id: jobId, companyId });

      if (!job) {
        throw new Error('Job not found');
      }

      // Find candidates who previously applied to company but not this specific job
      const candidates = await Candidate.find({
        isDeleted: false,
        'applications': {
          $elemMatch: {
            companyId: new mongoose.Types.ObjectId(companyId),
            jobId: { $ne: new mongoose.Types.ObjectId(jobId) },
            status: { $in: ['rejected', 'withdrawn'] } // "Silver medalist" candidates
          }
        },
        'aiAnalysis.resumeParsed': true,
        'aiAnalysis.parsedData.skills.technical': {
          $in: job.skillsRequired.map(skill => new RegExp(skill, 'i'))
        }
      }).limit(limit * 2); // Get more to filter and score

      const matchedCandidates: Array<{
        candidate: ICandidate;
        matchScore: number;
        reasoning: string;
      }> = [];

      for (const candidate of candidates) {
        try {
          // Use AI to score the match
          const candidateProfile: ResumeParsingResponse = {
            personalInfo: {
              name: candidate.personalInfo.firstName + ' ' + candidate.personalInfo.lastName,
              email: candidate.personalInfo.email,
              phone: candidate.personalInfo.phone,
              location: candidate.personalInfo.location
            },
            skills: candidate.aiAnalysis.parsedData.skills,
            workHistory: candidate.aiAnalysis.parsedData.workHistory,
            education: candidate.aiAnalysis.parsedData.education,
            profileSummary: candidate.aiAnalysis.parsedData.profileSummary || '',
            skillsConfidence: candidate.aiAnalysis.skillsConfidence || [],
            careerProgression: candidate.aiAnalysis.careerProgression || {
              seniorityLevel: 'entry',
              careerGrowth: 'stable',
              industryExperience: []
            }
          };

          const matchingRequest: CandidateMatchingRequest = {
            jobDescription: job.jobDescription,
            jobSkills: job.skillsRequired,
            candidateProfile: candidateProfile,
            jobTitle: job.title,
            experienceRequired: job.workExperience,
            location: job.location
          };

          const matchingResult = await AIService.matchCandidateToJob(matchingRequest);

          if (matchingResult.overallScore >= 60) { // Only include good matches
            matchedCandidates.push({
              candidate,
              matchScore: matchingResult.overallScore,
              reasoning: matchingResult.matchReasons.join('; ')
            });
          }
        } catch (aiError) {
          logger.warn('AI matching failed for talent rediscovery', {
            candidateId: candidate._id,
            jobId,
            error: aiError
          });
        }
      }

      // Sort by match score and limit results
      matchedCandidates.sort((a, b) => b.matchScore - a.matchScore);
      const topMatches = matchedCandidates.slice(0, limit);

      logger.info('Talent pool search completed', {
        jobId,
        companyId,
        totalCandidatesEvaluated: candidates.length,
        matchedCandidatesFound: topMatches.length
      });

      return { matchedCandidates: topMatches };

    } catch (error) {
      logger.error('Talent pool search failed:', { jobId, companyId, error });
      throw error;
    }
  }

  // Get candidate analytics
  static async getCandidateAnalytics(candidateId: string, companyId?: string): Promise<{
    totalApplications: number;
    activeApplications: number;
    interviewsScheduled: number;
    interviewsCompleted: number;
    averageResponseTime: number;
    skillsAnalysis: { skill: string; frequency: number }[];
    applicationTimeline: { date: Date; event: string; description: string }[];
  }> {
    try {
      const candidate = await this.getCandidateById(candidateId, companyId);

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      const applications = candidate.applications || [];
      const companyApplications = companyId ?
        applications.filter(app => app.companyId.toString() === companyId) :
        applications;

      const totalApplications = companyApplications.length;
      const activeApplications = companyApplications.filter(
        app => !['rejected', 'withdrawn', 'hired'].includes(app.status)
      ).length;

      const interviewsScheduled = companyApplications.reduce(
        (sum, app) => sum + (app.interviews?.length || 0), 0
      );

      // Build application timeline
      const timeline = companyApplications.flatMap(app =>
        app.statusHistory.map(history => ({
          date: history.date,
          event: history.newStatus,
          description: `Application status changed to ${history.newStatus}${history.notes ? `: ${history.notes}` : ''}`
        }))
      ).sort((a, b) => a.date.getTime() - b.date.getTime());

      // Skills analysis from AI parsing
      const skillsMap = new Map<string, number>();
      if (candidate.aiAnalysis?.parsedData?.skills?.technical) {
        candidate.aiAnalysis.parsedData.skills.technical.forEach(skill => {
          skillsMap.set(skill, (skillsMap.get(skill) || 0) + 1);
        });
      }

      const skillsAnalysis = Array.from(skillsMap.entries()).map(([skill, frequency]) => ({
        skill,
        frequency
      }));

      return {
        totalApplications,
        activeApplications,
        interviewsScheduled,
        interviewsCompleted: 0, // TODO: Calculate from interview data
        averageResponseTime: 0, // TODO: Calculate from communication data
        skillsAnalysis,
        applicationTimeline: timeline
      };

    } catch (error) {
      logger.error('Get candidate analytics failed:', { candidateId, companyId, error });
      throw error;
    }
  }
}