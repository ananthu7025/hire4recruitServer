import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkflow extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  isTemplate: boolean;
  isActive: boolean;

  aiOptimizations: {
    optimized: boolean;
    optimizationResults?: {
      suggestedImprovements: string[];
      bottleneckStages: string[];
      recommendedTimelines: {
        stageId: string;
        currentAvgDays: number;
        recommendedDays: number;
        reasoning: string;
      }[];
      predictedSuccessRate: number;
      complianceRecommendations: string[];
      diversityOptimizations: string[];
      optimizedAt: Date;
      aiConfidence: number;
    };
    lastOptimized?: Date;
  };

  stages: {
    stageId: string;
    name: string;
    type: 'screening' | 'interview' | 'assessment' | 'review' | 'offer' | 'custom';
    order: number;
    isRequired: boolean;

    aiIntelligence: {
      successPrediction: {
        candidatePassRate: number;
        avgTimeInStage: number;
        commonReasons: string[];
        improvementSuggestions: string[];
      };

      automatedScreening?: {
        enabled: boolean;
        criteria: {
          skillRequirements: string[];
          experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
          cultureFitIndicators: string[];
          minimumScore: number;
        };
        aiModel: 'gemini-pro' | 'custom';
      };

      analytics: {
        totalCandidatesProcessed: number;
        avgProcessingTime: number;
        candidateDropoffRate: number;
        satisfactionScore?: number;
      };
    };

    estimatedDuration?: number;
    autoAdvance: boolean;

    actions: {
      type: 'send_email' | 'schedule_interview' | 'assign_assessment' | 'notify_user';
      config: any;
      trigger: 'on_enter' | 'on_exit' | 'manual';

      aiEnhanced?: {
        personalizeContent: boolean;
        optimizeTiming: boolean;
        adaptToCandidate: boolean;
      };
    }[];

    requirements: {
      type: 'interview_complete' | 'assessment_passed' | 'manual_approval' | 'ai_screening_passed';
      config?: any;
    }[];
  }[];

  workflowAnalytics: {
    performance: {
      avgTimeToHire: number;
      candidateExperience: number;
      hiringManagerSatisfaction: number;
      costPerHire: number;
      qualityOfHire: number;
    };

    predictions: {
      expectedTimeToFill: number;
      candidateDropoffRisk: number;
      diversityProjection: {
        expectedDiversityScore: number;
        improvementRecommendations: string[];
      };
    };

    lastAnalyzed: Date;
  };

  jobs: mongoose.Types.ObjectId[];
  usageCount: number;

  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;

  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WorkflowSchema: Schema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },

  aiOptimizations: {
    optimized: {
      type: Boolean,
      default: false
    },
    optimizationResults: {
      suggestedImprovements: [{ type: String }],
      bottleneckStages: [{ type: String }],
      recommendedTimelines: [{
        stageId: { type: String, required: true },
        currentAvgDays: { type: Number, required: true },
        recommendedDays: { type: Number, required: true },
        reasoning: { type: String, required: true }
      }],
      predictedSuccessRate: { type: Number },
      complianceRecommendations: [{ type: String }],
      diversityOptimizations: [{ type: String }],
      optimizedAt: { type: Date },
      aiConfidence: { type: Number }
    },
    lastOptimized: { type: Date }
  },

  stages: [{
    stageId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['screening', 'interview', 'assessment', 'review', 'offer', 'custom'],
      required: true
    },
    order: {
      type: Number,
      required: true
    },
    isRequired: {
      type: Boolean,
      default: true
    },

    aiIntelligence: {
      successPrediction: {
        candidatePassRate: { type: Number, default: 0.5 },
        avgTimeInStage: { type: Number, default: 3 },
        commonReasons: [{ type: String }],
        improvementSuggestions: [{ type: String }]
      },

      automatedScreening: {
        enabled: { type: Boolean, default: false },
        criteria: {
          skillRequirements: [{ type: String }],
          experienceLevel: {
            type: String,
            enum: ['entry', 'mid', 'senior', 'executive']
          },
          cultureFitIndicators: [{ type: String }],
          minimumScore: { type: Number, default: 70 }
        },
        aiModel: {
          type: String,
          enum: ['gemini-pro', 'custom'],
          default: 'gemini-pro'
        }
      },

      analytics: {
        totalCandidatesProcessed: { type: Number, default: 0 },
        avgProcessingTime: { type: Number, default: 24 },
        candidateDropoffRate: { type: Number, default: 0 },
        satisfactionScore: { type: Number }
      }
    },

    estimatedDuration: {
      type: Number
    },
    autoAdvance: {
      type: Boolean,
      default: false
    },

    actions: [{
      type: {
        type: String,
        enum: ['send_email', 'schedule_interview', 'assign_assessment', 'notify_user'],
        required: true
      },
      config: {
        type: Schema.Types.Mixed
      },
      trigger: {
        type: String,
        enum: ['on_enter', 'on_exit', 'manual'],
        required: true
      },

      aiEnhanced: {
        personalizeContent: { type: Boolean, default: false },
        optimizeTiming: { type: Boolean, default: false },
        adaptToCandidate: { type: Boolean, default: false }
      }
    }],

    requirements: [{
      type: {
        type: String,
        enum: ['interview_complete', 'assessment_passed', 'manual_approval', 'ai_screening_passed'],
        required: true
      },
      config: {
        type: Schema.Types.Mixed
      }
    }]
  }],

  workflowAnalytics: {
    performance: {
      avgTimeToHire: { type: Number, default: 30 },
      candidateExperience: { type: Number, default: 5 },
      hiringManagerSatisfaction: { type: Number, default: 5 },
      costPerHire: { type: Number, default: 5000 },
      qualityOfHire: { type: Number, default: 5 }
    },

    predictions: {
      expectedTimeToFill: { type: Number, default: 45 },
      candidateDropoffRisk: { type: Number, default: 0.3 },
      diversityProjection: {
        expectedDiversityScore: { type: Number, default: 0.5 },
        improvementRecommendations: [{ type: String }]
      }
    },

    lastAnalyzed: {
      type: Date,
      default: Date.now
    }
  },

  jobs: [{
    type: Schema.Types.ObjectId,
    ref: 'Job'
  }],
  usageCount: {
    type: Number,
    default: 0
  },

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
  }
}, {
  timestamps: true
});

WorkflowSchema.index({ companyId: 1, isActive: 1 });
WorkflowSchema.index({ companyId: 1, name: 1 });
WorkflowSchema.index({ isTemplate: 1, isActive: 1 });

export default mongoose.model<IWorkflow>('Workflow', WorkflowSchema);