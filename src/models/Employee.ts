import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployee extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;

  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;

  role: 'company_admin' | 'hr_manager' | 'recruiter' | 'interviewer' | 'hiring_manager';
  permissions: {
    jobs: { create: boolean; read: boolean; update: boolean; delete: boolean; };
    candidates: { create: boolean; read: boolean; update: boolean; delete: boolean; };
    interviews: { create: boolean; read: boolean; update: boolean; delete: boolean; };
    assessments: { create: boolean; read: boolean; update: boolean; delete: boolean; };
    employees: { create: boolean; read: boolean; update: boolean; delete: boolean; };
    reports: { read: boolean; };
    settings: { read: boolean; update: boolean; };
  };

  department?: string;
  jobTitle?: string;
  employeeId?: string;

  isActive: boolean;
  isDeleted: boolean;
  isEmailVerified: boolean;
  preferences: {
    timezone?: string;
    language?: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
  };

  lastLogin?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  failedLoginAttempts: number;
  lockoutExpires?: Date;

  invitedBy?: mongoose.Types.ObjectId;
  invitedAt?: Date;
  inviteToken?: string;
  inviteAcceptedAt?: Date;

  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema: Schema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },

  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
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
  phone: {
    type: String,
    trim: true
  },
  avatar: {
    type: String
  },

  role: {
    type: String,
    enum: ['company_admin', 'hr_manager', 'recruiter', 'interviewer', 'hiring_manager'],
    required: true
  },
  permissions: {
    jobs: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    candidates: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    interviews: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    assessments: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    employees: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    reports: {
      read: { type: Boolean, default: false }
    },
    settings: {
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false }
    }
  },

  department: {
    type: String,
    trim: true
  },
  jobTitle: {
    type: String,
    trim: true
  },
  employeeId: {
    type: String,
    trim: true
  },

  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  preferences: {
    timezone: {
      type: String
    },
    language: {
      type: String
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    }
  },

  lastLogin: {
    type: Date
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockoutExpires: {
    type: Date
  },

  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Employee'
  },
  invitedAt: {
    type: Date
  },
  inviteToken: {
    type: String
  },
  inviteAcceptedAt: {
    type: Date
  },

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Employee'
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Employee'
  }
}, {
  timestamps: true
});

EmployeeSchema.index({ companyId: 1, email: 1 }, { unique: true });
EmployeeSchema.index({ companyId: 1, isActive: 1, isDeleted: 1 });
EmployeeSchema.index({ inviteToken: 1 });
EmployeeSchema.index({ passwordResetToken: 1 });

export default mongoose.model<IEmployee>('Employee', EmployeeSchema);