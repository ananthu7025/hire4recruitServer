import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailTemplate extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  name: string;
  category: 'application_received' | 'interview_invitation' | 'rejection' | 'offer' | 'follow_up' | 'assessment_invitation' | 'custom';

  subject: string;
  htmlContent: string;
  textContent?: string;

  aiGenerated: {
    contentGenerated: boolean;
    generationPrompt?: string;
    generatedVersions?: {
      version: string;
      subject: string;
      htmlContent: string;
      textContent?: string;
      generatedAt: Date;
      performanceScore?: number;
    }[];
    currentVersion: string;
    generatedAt?: Date;
    generatedBy?: mongoose.Types.ObjectId;
  };

  aiPersonalization: {
    enabled: boolean;
    personalizationLevel: 'basic' | 'moderate' | 'advanced';
    adaptationCriteria: {
      candidatePersonality: boolean;
      experienceLevel: boolean;
      industryBackground: boolean;
      communicationStyle: boolean;
      culturalFit: boolean;
    };

    personalizedVersions?: {
      candidateId: mongoose.Types.ObjectId;
      personalizedSubject: string;
      personalizedContent: string;
      personalizationReason: string;
      sentimentTone: 'professional' | 'friendly' | 'enthusiastic' | 'formal';
      createdAt: Date;
    }[];
  };

  variables: {
    name: string;
    description: string;
    defaultValue?: string;
    isRequired: boolean;

    aiSuggested?: {
      suggestedValues: string[];
      contextualRecommendations: string[];
    };
  }[];

  aiAnalytics: {
    performanceMetrics: {
      openRate: number;
      responseRate: number;
      engagementScore: number;
      candidateSatisfaction: number;
      conversionRate: number;
    };

    sentimentAnalysis: {
      overallTone: 'positive' | 'neutral' | 'negative';
      professionalismScore: number;
      warmthScore: number;
      clarityScore: number;
      inclusivityScore: number;
    };

    improvementSuggestions: string[];
    lastAnalyzed: Date;
  };

  abTesting?: {
    enabled: boolean;
    variants: {
      name: string;
      subject: string;
      content: string;
      trafficPercentage: number;
      performanceMetrics: {
        sent: number;
        opened: number;
        responded: number;
        converted: number;
      };
    }[];
    winningVariant?: string;
    testStartDate: Date;
    testEndDate?: Date;
  };

  isActive: boolean;
  isDefault: boolean;

  usageCount: number;
  lastUsed?: Date;

  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;

  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema: Schema = new Schema({
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
  category: {
    type: String,
    enum: ['application_received', 'interview_invitation', 'rejection', 'offer', 'follow_up', 'assessment_invitation', 'custom'],
    required: true
  },

  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  htmlContent: {
    type: String,
    required: true
  },
  textContent: {
    type: String
  },

  aiGenerated: {
    contentGenerated: {
      type: Boolean,
      default: false
    },
    generationPrompt: {
      type: String
    },
    generatedVersions: [{
      version: {
        type: String,
        required: true
      },
      subject: {
        type: String,
        required: true
      },
      htmlContent: {
        type: String,
        required: true
      },
      textContent: {
        type: String
      },
      generatedAt: {
        type: Date,
        required: true
      },
      performanceScore: {
        type: Number,
        min: 0,
        max: 100
      }
    }],
    currentVersion: {
      type: String,
      default: 'v1'
    },
    generatedAt: {
      type: Date
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  aiPersonalization: {
    enabled: {
      type: Boolean,
      default: false
    },
    personalizationLevel: {
      type: String,
      enum: ['basic', 'moderate', 'advanced'],
      default: 'basic'
    },
    adaptationCriteria: {
      candidatePersonality: {
        type: Boolean,
        default: false
      },
      experienceLevel: {
        type: Boolean,
        default: true
      },
      industryBackground: {
        type: Boolean,
        default: true
      },
      communicationStyle: {
        type: Boolean,
        default: false
      },
      culturalFit: {
        type: Boolean,
        default: false
      }
    },

    personalizedVersions: [{
      candidateId: {
        type: Schema.Types.ObjectId,
        ref: 'Candidate',
        required: true
      },
      personalizedSubject: {
        type: String,
        required: true
      },
      personalizedContent: {
        type: String,
        required: true
      },
      personalizationReason: {
        type: String,
        required: true
      },
      sentimentTone: {
        type: String,
        enum: ['professional', 'friendly', 'enthusiastic', 'formal'],
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },

  variables: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    defaultValue: {
      type: String
    },
    isRequired: {
      type: Boolean,
      default: false
    },

    aiSuggested: {
      suggestedValues: [{
        type: String
      }],
      contextualRecommendations: [{
        type: String
      }]
    }
  }],

  aiAnalytics: {
    performanceMetrics: {
      openRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      responseRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      engagementScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
      },
      candidateSatisfaction: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
      },
      conversionRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      }
    },

    sentimentAnalysis: {
      overallTone: {
        type: String,
        enum: ['positive', 'neutral', 'negative'],
        default: 'neutral'
      },
      professionalismScore: {
        type: Number,
        default: 5,
        min: 0,
        max: 10
      },
      warmthScore: {
        type: Number,
        default: 5,
        min: 0,
        max: 10
      },
      clarityScore: {
        type: Number,
        default: 5,
        min: 0,
        max: 10
      },
      inclusivityScore: {
        type: Number,
        default: 5,
        min: 0,
        max: 10
      }
    },

    improvementSuggestions: [{
      type: String
    }],
    lastAnalyzed: {
      type: Date,
      default: Date.now
    }
  },

  abTesting: {
    enabled: {
      type: Boolean,
      default: false
    },
    variants: [{
      name: {
        type: String,
        required: true
      },
      subject: {
        type: String,
        required: true
      },
      content: {
        type: String,
        required: true
      },
      trafficPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      },
      performanceMetrics: {
        sent: {
          type: Number,
          default: 0
        },
        opened: {
          type: Number,
          default: 0
        },
        responded: {
          type: Number,
          default: 0
        },
        converted: {
          type: Number,
          default: 0
        }
      }
    }],
    winningVariant: {
      type: String
    },
    testStartDate: {
      type: Date
    },
    testEndDate: {
      type: Date
    }
  },

  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },

  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date
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

EmailTemplateSchema.index({ companyId: 1, category: 1, isActive: 1, isDeleted: 1 });
EmailTemplateSchema.index({ companyId: 1, name: 1 });
EmailTemplateSchema.index({ isDefault: 1, category: 1 });

export default mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);