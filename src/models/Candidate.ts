import mongoose, { Schema, Document } from 'mongoose';

export interface ICandidate extends Document {
  _id: mongoose.Types.ObjectId;

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

  resume: {
    fileId: mongoose.Types.ObjectId;
    fileName: string;
    uploadDate: Date;
    base64?: string;
  };
  additionalDocuments?: {
    fileId: mongoose.Types.ObjectId;
    fileName: string;
    documentType: string;
    uploadDate: Date;
  }[];

  appliedJobs?: {
    jobId: mongoose.Types.ObjectId;
    appliedAt?: Date;
    status?: 'applied' | 'in-review' | 'interview' | 'offered' | 'rejected';
    source?: string;
  }[];

  aiAnalysis: {
    resumeParsed: boolean;
    parsedData: {
      skills: {
        technical: string[];
        soft: string[];
        certifications: string[];
        languages: string[];
      };
      workHistory: {
        company: string;
        position: string;
        duration: string;
        responsibilities: string[];
        achievements: string[];
      }[];
      education: {
        institution: string;
        degree: string;
        field: string;
        graduationYear?: number;
      }[];
      profileSummary?: string;
    };
    skillsConfidence?: {
      skill: string;
      level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
      confidence: number;
    }[];
    careerProgression?: {
      seniorityLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
      careerGrowth: 'declining' | 'stable' | 'growing' | 'accelerating';
      industryExperience: string[];
    };
    lastAnalyzed?: Date;
  };

  applications?: {
    applicationId: mongoose.Types.ObjectId;
    companyId: mongoose.Types.ObjectId;
    jobId: mongoose.Types.ObjectId;
    jobTitle: string;
    companyName: string;
    status: 'applied' | 'screening' | 'phone_interview' | 'technical_interview' | 'onsite_interview' | 'final_interview' | 'offered' | 'hired' | 'rejected' | 'withdrawn';
    currentWorkflowStage?: string;
    appliedDate: Date;
    lastUpdated: Date;
    statusHistory: {
      previousStatus?: string;
      newStatus: string;
      date: Date;
      notes?: string;
      updatedBy: mongoose.Types.ObjectId;
      reason?: string;
    }[];
    applicationSource: 'job_board' | 'referral' | 'company_website' | 'recruiter' | 'linkedin' | 'direct_application' | 'other';
    referralSource?: string;
    coverLetter?: string;
    customResponses?: { question: string; answer: string }[];
    interviews?: mongoose.Types.ObjectId[];
    assessments?: mongoose.Types.ObjectId[];
    aiScoring?: {
      overallScore: number;
      breakdown: {
        skillsMatch: number;
        experienceMatch: number;
        educationMatch: number;
        locationMatch: number;
        salaryMatch: number;
        cultureFitMatch: number;
      };
      matchReasons: string[];
      missingSkills: string[];
      overqualifications: string[];
      riskFactors: string[];
      improvementRecommendations: string[];
      scoreConfidence: number;
      lastScored: Date;
    };
    communications?: {
      communicationId: mongoose.Types.ObjectId;
      type: 'email' | 'phone_call' | 'message' | 'meeting' | 'automated_email';
      date: Date;
      subject?: string;
      content: string;
      direction: 'inbound' | 'outbound';
      fromUser: mongoose.Types.ObjectId;
      isRead: boolean;
      attachments?: string[];
    }[];
    internalNotes?: {
      noteId: mongoose.Types.ObjectId;
      content: string;
      createdBy: mongoose.Types.ObjectId;
      createdAt: Date;
      isPrivate: boolean;
      noteType: 'general' | 'interview_feedback' | 'reference_check' | 'background_check' | 'hiring_decision';
      tags?: string[];
    }[];
    metrics?: {
      timeToFirstResponse: number;
      timeInCurrentStage: number;
      totalApplicationTime: number;
      interviewsCompleted: number;
      assessmentsCompleted: number;
      responseRate: number;
    };
  }[];

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

  talentRediscovery?: {
    suggestedForJobs: {
      jobId: mongoose.Types.ObjectId;
      matchScore: number;
      reasoning: string;
      suggestedAt: Date;
      wasContacted: boolean;
      contactedAt?: Date;
    }[];
    lastRediscoveryRun: Date;
  };

  assessments?: {
    assessmentId: mongoose.Types.ObjectId;
    completedDate?: Date;
    score?: number;
    status: 'pending' | 'in_progress' | 'completed';
    results?: any;
  }[];

  communications?: {
    type: 'email' | 'phone' | 'meeting' | 'note';
    subject?: string;
    content: string;
    date: Date;
    userId: mongoose.Types.ObjectId;
    aiGenerated: boolean;
    personalizedElements?: string[];
    sentimentAnalysis?: {
      tone: 'positive' | 'neutral' | 'negative';
      confidence: number;
      keyEmotions: string[];
    };
  }[];

  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;

  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CandidateSchema: Schema = new Schema({
  personalInfo: {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    nationality: {
      type: String,
      trim: true
    }
  },

  experience: {
    type: String,
    required: true
  },
  currentPosition: {
    type: String,
    trim: true
  },
  currentCompany: {
    type: String,
    trim: true
  },
  expectedSalary: {
    min: {
      type: Number
    },
    max: {
      type: Number
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },

  resume: {
    fileId: {
      type: Schema.Types.ObjectId,
      required: true
    },
    fileName: {
      type: String,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    base64: {
      type: String
    }
  },
  additionalDocuments: [{
    fileId: {
      type: Schema.Types.ObjectId,
      required: true
    },
    fileName: {
      type: String,
      required: true
    },
    documentType: {
      type: String,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],

  appliedJobs: [{
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['applied', 'in-review', 'interview', 'offered', 'rejected'],
      default: 'applied'
    },
    source: {
      type: String
    }
  }],

  aiAnalysis: {
    resumeParsed: {
      type: Boolean,
      default: false
    },
    parsedData: {
      skills: {
        technical: [{ type: String }],
        soft: [{ type: String }],
        certifications: [{ type: String }],
        languages: [{ type: String }]
      },
      workHistory: [{
        company: { type: String, required: true },
        position: { type: String, required: true },
        duration: { type: String, required: true },
        responsibilities: [{ type: String }],
        achievements: [{ type: String }]
      }],
      education: [{
        institution: { type: String, required: true },
        degree: { type: String, required: true },
        field: { type: String, required: true },
        graduationYear: { type: Number }
      }],
      profileSummary: { type: String }
    },
    skillsConfidence: [{
      skill: { type: String, required: true },
      level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        required: true
      },
      confidence: { type: Number, required: true }
    }],
    careerProgression: {
      seniorityLevel: {
        type: String,
        enum: ['entry', 'mid', 'senior', 'lead', 'executive']
      },
      careerGrowth: {
        type: String,
        enum: ['declining', 'stable', 'growing', 'accelerating']
      },
      industryExperience: [{ type: String }]
    },
    lastAnalyzed: { type: Date }
  },

  applications: [{
    applicationId: { type: Schema.Types.ObjectId, required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    jobTitle: { type: String, required: true },
    companyName: { type: String, required: true },
    status: {
      type: String,
      enum: ['applied', 'screening', 'phone_interview', 'technical_interview', 'onsite_interview', 'final_interview', 'offered', 'hired', 'rejected', 'withdrawn'],
      required: true
    },
    currentWorkflowStage: { type: String },
    appliedDate: { type: Date, required: true },
    lastUpdated: { type: Date, required: true },
    statusHistory: [{
      previousStatus: { type: String },
      newStatus: { type: String, required: true },
      date: { type: Date, required: true },
      notes: { type: String },
      updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      reason: { type: String }
    }],
    applicationSource: {
      type: String,
      enum: ['job_board', 'referral', 'company_website', 'recruiter', 'linkedin', 'direct_application', 'other'],
      required: true
    },
    referralSource: { type: String },
    coverLetter: { type: String },
    customResponses: [{
      question: { type: String, required: true },
      answer: { type: String, required: true }
    }],
    interviews: [{ type: Schema.Types.ObjectId, ref: 'Interview' }],
    assessments: [{ type: Schema.Types.ObjectId, ref: 'Assessment' }],
    aiScoring: {
      overallScore: { type: Number, required: true },
      breakdown: {
        skillsMatch: { type: Number, required: true },
        experienceMatch: { type: Number, required: true },
        educationMatch: { type: Number, required: true },
        locationMatch: { type: Number, required: true },
        salaryMatch: { type: Number, required: true },
        cultureFitMatch: { type: Number, required: true }
      },
      matchReasons: [{ type: String }],
      missingSkills: [{ type: String }],
      overqualifications: [{ type: String }],
      riskFactors: [{ type: String }],
      improvementRecommendations: [{ type: String }],
      scoreConfidence: { type: Number, required: true },
      lastScored: { type: Date, required: true }
    }
  }],

  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

CandidateSchema.index({ 'personalInfo.email': 1 });
CandidateSchema.index({ 'applications.companyId': 1, 'applications.status': 1 });
CandidateSchema.index({ 'aiAnalysis.parsedData.skills.technical': 1 });
CandidateSchema.index({ isDeleted: 1 });

export default mongoose.model<ICandidate>('Candidate', CandidateSchema);