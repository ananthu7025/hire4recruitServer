import mongoose, { Schema, Document } from 'mongoose';

export interface IAssessment extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;

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

  isActive: boolean;
  allowRetake: boolean;
  showResults: boolean;

  jobs?: mongoose.Types.ObjectId[];
  jobTemplates?: mongoose.Types.ObjectId[];

  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;

  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentSchema: Schema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },

  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['technical', 'cognitive', 'communication', 'personality', 'custom'],
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced']
  },

  relatedRoles: [{
    type: String,
    trim: true
  }],
  requiredSkills: [{
    type: String,
    trim: true
  }],
  industry: {
    type: String,
    trim: true
  },

  questions: [{
    questionId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['multiple_choice', 'coding', 'essay', 'rating'],
      required: true
    },
    question: {
      type: String,
      required: true
    },
    options: [{
      type: String
    }],
    correctAnswer: {
      type: Schema.Types.Mixed
    },
    points: {
      type: Number,
      required: true,
      min: 0
    },
    timeLimit: {
      type: Number,
      min: 0
    },
    skillTested: {
      type: String
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard']
    }
  }],

  totalPoints: {
    type: Number,
    required: true,
    min: 0
  },
  timeLimit: {
    type: Number,
    required: true,
    min: 1
  },
  passingScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },

  isActive: {
    type: Boolean,
    default: true
  },
  allowRetake: {
    type: Boolean,
    default: false
  },
  showResults: {
    type: Boolean,
    default: true
  },

  jobs: [{
    type: Schema.Types.ObjectId,
    ref: 'Job'
  }],
  jobTemplates: [{
    type: Schema.Types.ObjectId,
    ref: 'JobTemplate'
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
  }
}, {
  timestamps: true
});

AssessmentSchema.index({ companyId: 1, isActive: 1, isDeleted: 1 });
AssessmentSchema.index({ companyId: 1, type: 1, category: 1 });
AssessmentSchema.index({ requiredSkills: 1 });

export default mongoose.model<IAssessment>('Assessment', AssessmentSchema);