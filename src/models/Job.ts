import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  company: string;

  jobId: string;
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
  status: 'active' | 'draft' | 'closed' | 'onhold';

  hiringManager: mongoose.Types.ObjectId;
  dateOpened: Date;
  targetClosingDate?: Date;
  clientName?: string;
  accountManager?: mongoose.Types.ObjectId;
  contactPerson?: string;
  workMode: 'remote' | 'hybrid' | 'onsite';
  workExperience: string;
  educationRequirement?: string;
  skillsRequired: string[];
  preferredSkills?: string[];
  benefits?: string;
  employmentType?: string;
  workflowId: mongoose.Types.ObjectId;

  jobSummary?: string;
  jobDescription: string;
  requirements: string;

  expectedRevenue?: number;
  probabilityOfClosure?: string;
  numberOfOpenings?: number;

  notes?: string;
  tags?: string;

  aiGenerated: {
    jobDescriptionGenerated: boolean;
    descriptionPrompt?: string;
    seoOptimized: boolean;
    inclusivityScore: number;
    readabilityScore: number;
    keywordsExtracted: string[];
    generatedAt?: Date;
    generatedBy?: mongoose.Types.ObjectId;
  };

  customFields: {
    fieldName: string;
    fieldType: 'text' | 'number' | 'date' | 'select' | 'multiselect';
    fieldValue: any;
    isRequired: boolean;
  }[];

  templateUsed?: mongoose.Types.ObjectId;
  workflow: mongoose.Types.ObjectId;

  aiInsights: {
    predictedTimeToHire: number;
    difficultyScore: number;
    competitivenessScore: number;
    suggestedSalaryRange?: {
      min: number;
      max: number;
      confidence: number;
    };
    skillDemandAnalysis: {
      skill: string;
      demandLevel: 'low' | 'medium' | 'high' | 'critical';
      marketAvailability: 'scarce' | 'limited' | 'moderate' | 'abundant';
    }[];
    lastAnalyzed: Date;
  };

  applicationCount: number;
  viewCount: number;

  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema: Schema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  company: {
    type: String,
    required: true
  },

  jobId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },

  salary: {
    min: {
      type: Number,
      required: true
    },
    max: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    payRate: {
      type: String,
      enum: ['hourly', 'daily', 'annual'],
      default: 'annual'
    }
  },
  type: {
    type: String,
    enum: ['fulltime', 'parttime', 'contract', 'internship'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'draft', 'closed', 'onhold'],
    default: 'draft'
  },

  hiringManager: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dateOpened: {
    type: Date,
    default: Date.now
  },
  targetClosingDate: {
    type: Date
  },
  clientName: {
    type: String,
    trim: true
  },
  accountManager: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  contactPerson: {
    type: String,
    trim: true
  },
  workMode: {
    type: String,
    enum: ['remote', 'hybrid', 'onsite'],
    required: true
  },
  workExperience: {
    type: String,
    required: true
  },
  educationRequirement: {
    type: String
  },
  skillsRequired: [{
    type: String,
    trim: true
  }],
  preferredSkills: [{
    type: String,
    trim: true
  }],
  benefits: {
    type: String
  },
  employmentType: {
    type: String
  },
  workflowId: {
    type: Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true
  },

  jobSummary: {
    type: String
  },
  jobDescription: {
    type: String,
    required: true
  },
  requirements: {
    type: String,
    required: true
  },

  expectedRevenue: {
    type: Number
  },
  probabilityOfClosure: {
    type: String
  },
  numberOfOpenings: {
    type: Number,
    default: 1
  },

  notes: {
    type: String
  },
  tags: {
    type: String
  },

  aiGenerated: {
    jobDescriptionGenerated: {
      type: Boolean,
      default: false
    },
    descriptionPrompt: {
      type: String
    },
    seoOptimized: {
      type: Boolean,
      default: false
    },
    inclusivityScore: {
      type: Number,
      default: 0
    },
    readabilityScore: {
      type: Number,
      default: 0
    },
    keywordsExtracted: [{
      type: String
    }],
    generatedAt: {
      type: Date
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  customFields: [{
    fieldName: {
      type: String,
      required: true
    },
    fieldType: {
      type: String,
      enum: ['text', 'number', 'date', 'select', 'multiselect'],
      required: true
    },
    fieldValue: {
      type: Schema.Types.Mixed
    },
    isRequired: {
      type: Boolean,
      default: false
    }
  }],

  templateUsed: {
    type: Schema.Types.ObjectId,
    ref: 'JobTemplate'
  },
  workflow: {
    type: Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true
  },

  aiInsights: {
    predictedTimeToHire: {
      type: Number,
      default: 30
    },
    difficultyScore: {
      type: Number,
      default: 5
    },
    competitivenessScore: {
      type: Number,
      default: 5
    },
    suggestedSalaryRange: {
      min: {
        type: Number
      },
      max: {
        type: Number
      },
      confidence: {
        type: Number
      }
    },
    skillDemandAnalysis: [{
      skill: {
        type: String,
        required: true
      },
      demandLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
      },
      marketAvailability: {
        type: String,
        enum: ['scarce', 'limited', 'moderate', 'abundant'],
        default: 'moderate'
      }
    }],
    lastAnalyzed: {
      type: Date,
      default: Date.now
    }
  },

  applicationCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
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

JobSchema.index({ companyId: 1, jobId: 1 }, { unique: true });
JobSchema.index({ companyId: 1, status: 1 });
JobSchema.index({ companyId: 1, hiringManager: 1 });
JobSchema.index({ skillsRequired: 1 });
JobSchema.index({ location: 1, workMode: 1 });

export default mongoose.model<IJob>('Job', JobSchema);