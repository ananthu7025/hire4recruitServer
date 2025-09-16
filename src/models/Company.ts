import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  domain?: string;
  industry?: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';

  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  phone?: string;
  website?: string;

  settings: {
    timezone: string;
    currency: string;
    dateFormat: string;
    language: string;
  };

  subscription: {
    plan: 'basic' | 'professional' | 'enterprise';
    status: 'active' | 'inactive' | 'suspended' | 'cancelled' | 'pending_payment';
    startDate: Date;
    endDate?: Date;
    maxUsers: number;
    maxJobs: number;
    features: string[];
    pricing: {
      amount: number;
      currency: string;
      interval: 'monthly' | 'annual';
    };
    paymentInfo?: {
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
      lastPaymentDate?: Date;
      nextPaymentDate?: Date;
    };
  };

  primaryContact: {
    name: string;
    email: string;
    phone?: string;
  };

  isActive: boolean;
  isVerified: boolean;

  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  isLoginAllowed(): { allowed: boolean; reason?: string };
}

const CompanySchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  domain: {
    type: String,
    trim: true,
    lowercase: true
  },
  industry: {
    type: String,
    trim: true
  },
  size: {
    type: String,
    enum: ['startup', 'small', 'medium', 'large', 'enterprise'],
    required: true
  },

  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    postalCode: { type: String, trim: true }
  },
  phone: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },

  settings: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    dateFormat: {
      type: String,
      default: 'MM/DD/YYYY'
    },
    language: {
      type: String,
      default: 'en'
    }
  },

  subscription: {
    plan: {
      type: String,
      enum: ['basic', 'professional', 'enterprise'],
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'cancelled', 'pending_payment'],
      default: 'pending_payment'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    maxUsers: {
      type: Number,
      required: true
    },
    maxJobs: {
      type: Number,
      required: true
    },
    features: [{
      type: String
    }],
    pricing: {
      amount: {
        type: Number,
        required: true
      },
      currency: {
        type: String,
        default: 'INR'
      },
      interval: {
        type: String,
        enum: ['monthly', 'annual'],
        required: true
      }
    },
    paymentInfo: {
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,
      lastPaymentDate: Date,
      nextPaymentDate: Date
    }
  },

  primaryContact: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    }
  },

  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Instance methods
CompanySchema.methods.isLoginAllowed = function(): { allowed: boolean; reason?: string } {
  if (!this.isActive) {
    return { allowed: false, reason: 'Company account is inactive' };
  }

  if (this.subscription.status === 'pending_payment') {
    return { allowed: false, reason: 'Payment verification required. Please complete your payment to access your account.' };
  }

  if (this.subscription.status === 'suspended') {
    return { allowed: false, reason: 'Subscription is suspended. Please contact support or update your payment method.' };
  }

  if (this.subscription.status === 'cancelled') {
    return { allowed: false, reason: 'Subscription is cancelled. Please contact support to reactivate your account.' };
  }

  if (this.subscription.status === 'inactive') {
    return { allowed: false, reason: 'Subscription is inactive. Please contact support.' };
  }

  // Check if subscription is expired
  if (this.subscription.endDate && this.subscription.endDate < new Date()) {
    return { allowed: false, reason: 'Subscription has expired. Please renew your subscription to continue.' };
  }

  return { allowed: true };
};

CompanySchema.index({ domain: 1 });
CompanySchema.index({ 'primaryContact.email': 1 });
CompanySchema.index({ isActive: 1, isVerified: 1 });

export default mongoose.model<ICompany>('Company', CompanySchema);