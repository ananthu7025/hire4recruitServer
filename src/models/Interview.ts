import mongoose, { Schema, Document } from 'mongoose';

export interface IInterview extends Document {
  _id: mongoose.Types.ObjectId;

  companyId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;

  title: string;
  type: 'phone' | 'video' | 'in_person' | 'technical' | 'behavioral';
  scheduledDate: Date;
  duration: number;
  location?: string;

  interviewers: {
    userId: mongoose.Types.ObjectId;
    role: 'primary' | 'secondary' | 'observer';
    isConfirmed: boolean;
  }[];

  recordingUrl?: string;
  recordingDuration?: number;
  transcription?: string;

  questionsAsked?: {
    questionId: string;
    question: string;
    answer: string;
    score: number;
    notes: string;
  }[];

  round: number;
  stage: string;

  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';

  aiAnalysis: {
    recordingAnalyzed: boolean;
    transcription?: string;
    analysisResults?: {
      sentimentAnalysis: {
        overallSentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
        confidence: number;
        keyEmotions: string[];
        communicationStyle: 'confident' | 'hesitant' | 'enthusiastic' | 'reserved';
      };

      skillsDiscussed: {
        skill: string;
        demonstrated: boolean;
        proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
        examples: string[];
      }[];

      keyInsights: string[];
      redFlags: string[];
      strengths: string[];
      improvementAreas: string[];

      suggestedFollowUpQuestions: string[];
      recommendedNextSteps: string[];

      biasIndicators: string[];
      diversityNotes: string[];

      analyzedAt: Date;
      analysisConfidence: number;
    };

    recordingUrl?: string;
    recordingDuration?: number;
    consentProvided: boolean;
  };

  feedback: {
    interviewerId: mongoose.Types.ObjectId;
    rating: number;
    strengths: string;
    weaknesses: string;
    recommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';
    comments: string;

    questionFeedback: {
      questionId: string;
      question: string;
      answer: string;
      score: number;
      notes: string;
    }[];

    submittedAt: Date;
  }[];

  overallRating?: number;
  decision?: 'pass' | 'fail';
  nextSteps?: string;

  calendarEventId?: string;

  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;

  scheduledBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema: Schema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  candidateId: {
    type: Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true
  },

  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    enum: ['phone', 'video', 'in_person', 'technical', 'behavioral'],
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 15,
    max: 480
  },
  location: {
    type: String,
    trim: true
  },

  interviewers: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['primary', 'secondary', 'observer'],
      required: true
    },
    isConfirmed: {
      type: Boolean,
      default: false
    }
  }],

  recordingUrl: {
    type: String
  },
  recordingDuration: {
    type: Number
  },
  transcription: {
    type: String
  },

  questionsAsked: [{
    questionId: {
      type: String,
      required: true
    },
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      min: 1,
      max: 10,
      required: true
    },
    notes: {
      type: String
    }
  }],

  round: {
    type: Number,
    required: true,
    min: 1
  },
  stage: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled'
  },

  aiAnalysis: {
    recordingAnalyzed: {
      type: Boolean,
      default: false
    },
    transcription: {
      type: String
    },
    analysisResults: {
      sentimentAnalysis: {
        overallSentiment: {
          type: String,
          enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative']
        },
        confidence: {
          type: Number,
          min: 0,
          max: 1
        },
        keyEmotions: [{
          type: String
        }],
        communicationStyle: {
          type: String,
          enum: ['confident', 'hesitant', 'enthusiastic', 'reserved']
        }
      },

      skillsDiscussed: [{
        skill: {
          type: String,
          required: true
        },
        demonstrated: {
          type: Boolean,
          required: true
        },
        proficiencyLevel: {
          type: String,
          enum: ['beginner', 'intermediate', 'advanced', 'expert'],
          required: true
        },
        examples: [{
          type: String
        }]
      }],

      keyInsights: [{
        type: String
      }],
      redFlags: [{
        type: String
      }],
      strengths: [{
        type: String
      }],
      improvementAreas: [{
        type: String
      }],

      suggestedFollowUpQuestions: [{
        type: String
      }],
      recommendedNextSteps: [{
        type: String
      }],

      biasIndicators: [{
        type: String
      }],
      diversityNotes: [{
        type: String
      }],

      analyzedAt: {
        type: Date
      },
      analysisConfidence: {
        type: Number,
        min: 0,
        max: 1
      }
    },

    recordingUrl: {
      type: String
    },
    recordingDuration: {
      type: Number
    },
    consentProvided: {
      type: Boolean,
      default: false
    }
  },

  feedback: [{
    interviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    strengths: {
      type: String,
      required: true
    },
    weaknesses: {
      type: String,
      required: true
    },
    recommendation: {
      type: String,
      enum: ['strong_hire', 'hire', 'no_hire', 'strong_no_hire'],
      required: true
    },
    comments: {
      type: String,
      required: true
    },

    questionFeedback: [{
      questionId: {
        type: String,
        required: true
      },
      question: {
        type: String,
        required: true
      },
      answer: {
        type: String,
        required: true
      },
      score: {
        type: Number,
        required: true,
        min: 1,
        max: 10
      },
      notes: {
        type: String
      }
    }],

    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],

  overallRating: {
    type: Number,
    min: 1,
    max: 10
  },
  decision: {
    type: String,
    enum: ['pass', 'fail']
  },
  nextSteps: {
    type: String
  },

  calendarEventId: {
    type: String
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

  scheduledBy: {
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

InterviewSchema.index({ companyId: 1, isDeleted: 1 });
InterviewSchema.index({ jobId: 1, candidateId: 1 });
InterviewSchema.index({ scheduledDate: 1, status: 1 });
InterviewSchema.index({ 'interviewers.userId': 1, scheduledDate: 1 });

export default mongoose.model<IInterview>('Interview', InterviewSchema);