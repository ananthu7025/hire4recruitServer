import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;

  name: string;
  displayName: string;
  description?: string;
  color?: string; // For UI display purposes

  // Default permissions for this role
  permissions: {
    jobs: { create: boolean; read: boolean; update: boolean; delete: boolean; };
    candidates: { create: boolean; read: boolean; update: boolean; delete: boolean; };
    interviews: { create: boolean; read: boolean; update: boolean; delete: boolean; };
    assessments: { create: boolean; read: boolean; update: boolean; delete: boolean; };
    employees: { create: boolean; read: boolean; update: boolean; delete: boolean; };
    workflows: { create: boolean; read: boolean; update: boolean; delete: boolean; };
    reports: { read: boolean; };
    settings: { read: boolean; update: boolean; };
  };

  // System roles cannot be deleted or modified
  isSystem: boolean;
  isActive: boolean;
  isDeleted: boolean;

  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema: Schema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },

  name: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 50
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  color: {
    type: String,
    trim: true,
    match: /^#[0-9A-F]{6}$/i, // Hex color code
    default: '#6c757d'
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
    workflows: {
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

  isSystem: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
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

// Indexes
RoleSchema.index({ companyId: 1, name: 1 }, { unique: true });
RoleSchema.index({ companyId: 1, isActive: 1, isDeleted: 1 });
RoleSchema.index({ isSystem: 1 });

export default mongoose.model<IRole>('Role', RoleSchema);