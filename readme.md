# hire4recruit - Backend API Specification (v2.0 with Gemini AI)

## Project Overview
hire4recruit is a comprehensive recruitment management system that helps organizations streamline their hiring process. This document provides detailed specifications for building a robust and intelligent backend API using **Node.js**, **MongoDB**, and **TypeScript**. This enhanced version (v2.0) incorporates a suite of **Gemini-powered AI features** to automate tasks, provide predictive insights, and significantly boost recruiter efficiency.

## Technology Stack

### Backend Requirements
- **Runtime**: Node.js (v18+ recommended)
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB
- **Authentication**: JWT-based authentication
- **AI Integration**: Google AI SDK (for Gemini)
- **File Storage**: Multer for file uploads
- **Validation**: Zod for request validation
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: Helmet, CORS, Rate Limiting
- **Email**: Nodemailer
- **Notifications**: WebHook 

---

## Database Schema Design

### 1. Company Collection (Multi-Tenant)
```typescript
interface ICompany {
  _id: ObjectId;

  // Basic Company Information
  name: string; // required, company name
  domain?: string; // optional, company domain for email validation
  industry?: string; // e.g., "Technology", "Healthcare", "Finance"
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'; // 1-10, 11-50, 51-200, 201-1000, 1000+

  // Contact Information
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  phone?: string;
  website?: string;

  // Company Settings
  settings: {
    timezone: string; // default: 'UTC'
    currency: string; // default: 'USD'
    dateFormat: string; // default: 'MM/DD/YYYY'
    language: string; // default: 'en'
  };

  // Subscription & Billing
  subscription: {
    plan: 'free' | 'basic' | 'professional' | 'enterprise';
    status: 'active' | 'inactive' | 'suspended' | 'cancelled';
    startDate: Date;
    endDate?: Date;
    maxUsers: number;
    maxJobs: number;
    features: string[]; // array of enabled features
  };

  // Company Admin (Owner)
  primaryContact: {
    name: string;
    email: string;
    phone?: string;
  };

  // Company Status
  isActive: boolean;
  isVerified: boolean; // email verification status

  // Audit
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. User Collection (Multi-Tenant)
```typescript
interface IUser {
  _id: ObjectId;

  // Company Association - CRITICAL for tenant isolation
  companyId: ObjectId; // ref to Company - REQUIRED for data isolation

  // Basic User Information
  email: string; // unique within company, required
  password: string; // hashed with bcrypt, min 8 chars with strength validation
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string; // profile picture URL

  // Role & Permissions
  role: 'company_admin' | 'hr_manager' | 'recruiter' | 'interviewer' | 'hiring_manager';
  permissions: {
    jobs: { create: boolean; read: boolean; update: boolean; delete: boolean; };
    candidates: { create: boolean; read: boolean; update: boolean; delete: boolean; };
    interviews: { create: boolean; read: boolean; update: boolean; delete: boolean; };
    assessments: { create: boolean; read: boolean; update: boolean; delete: boolean; };
    users: { create: boolean; read: boolean; update: boolean; delete: boolean; };
    reports: { read: boolean; };
    settings: { read: boolean; update: boolean; };
  };

  // Work Information
  department?: string;
  jobTitle?: string;
  employeeId?: string;

  // User Status & Settings
  isActive: boolean;
  isDeleted: boolean; // Soft delete for audit trail
  isEmailVerified: boolean;
  preferences: {
    timezone?: string;
    language?: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
  };

  // Authentication & Security
  lastLogin?: Date;
  refreshToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  failedLoginAttempts: number;
  lockoutExpires?: Date;

  // Invitation System
  invitedBy?: ObjectId; // ref to User who invited this user
  invitedAt?: Date;
  inviteToken?: string;
  inviteAcceptedAt?: Date;

  // Audit Trail
  createdBy: ObjectId; // ref to User who created this user
  updatedBy: ObjectId; // ref to User who last updated
  createdAt: Date;
  updatedAt: Date;
}
```

### 3. Job Collection (AI-Enhanced)
```typescript
interface IJob {
  _id: ObjectId;

  // Company Association - CRITICAL for tenant isolation
  companyId: ObjectId; // ref to Company - REQUIRED for data isolation
  company: string;

  // Basic Job Information
  jobId: string; // unique job identifier within company
  title: string; // required
  department: string;
  location: string; // combined field, can still keep country/state/city separately
  country: string;
  state: string;
  city: string;

  salary: {
    min: number;
    max: number;
    currency: string; // default: 'USD'
    payRate: 'hourly' | 'daily' | 'annual';
  };
  type: 'fulltime' | 'parttime' | 'contract' | 'internship';
  status: 'active' | 'draft' | 'closed' | 'onhold';

  // Additional Details
  hiringManager: ObjectId; // ref to User
  dateOpened: Date;
  targetClosingDate?: Date;
  clientName?: string;
  accountManager?: ObjectId; // ref to User
  contactPerson?: string;
  workMode: 'remote' | 'hybrid' | 'onsite';
  workExperience: string; // e.g., "2-5 years"
  educationRequirement?: string;
  skillsRequired: string[];
  preferredSkills?: string[];
  benefits?: string;
  employmentType?: 'fulltime' | 'parttime' | 'contract' | 'internship' | string;
  workflowId: ObjectId; 
  // Job Summary / Description
  jobSummary?: string;
  jobDescription: string; // HTML content
  requirements: string; // HTML content

  // Revenue / Probability / Openings
  expectedRevenue?: number;
  probabilityOfClosure?: string; // Could be 'High', 'Medium', 'Low' or SelectItem type
  numberOfOpenings?: number;

  // Notes / Tags
  notes?: string;
  tags?: string;

  // AI-Generated Content Features
  aiGenerated: {
    jobDescriptionGenerated: boolean;
    descriptionPrompt?: string;
    seoOptimized: boolean;
    inclusivityScore: number;
    readabilityScore: number;
    keywordsExtracted: string[];
    generatedAt?: Date;
    generatedBy?: ObjectId;
  };

  // Custom Fields
  customFields: {
    fieldName: string;
    fieldType: 'text' | 'number' | 'date' | 'select' | 'multiselect';
    fieldValue: any;
    isRequired: boolean;
  }[];

  // Template Reference
  templateUsed?: ObjectId; // ref to JobTemplate

  // Workflow
  workflow: ObjectId; // ref to Workflow

  // AI Analytics & Predictions
  aiInsights: {
    predictedTimeToHire: number; // AI-predicted days to hire
    difficultyScore: number; // 1-10 how hard to fill this role
    competitivenessScore: number; // Market competitiveness analysis
    suggestedSalaryRange?: {
      min: number;
      max: number;
      confidence: number; // 0-1 confidence score
    };
    skillDemandAnalysis: {
      skill: string;
      demandLevel: 'low' | 'medium' | 'high' | 'critical';
      marketAvailability: 'scarce' | 'limited' | 'moderate' | 'abundant';
    }[];
    lastAnalyzed: Date;
  };

  // Metrics
  applicationCount: number;
  viewCount: number;

  // Audit
  createdBy: ObjectId; // ref to User
  updatedBy: ObjectId; // ref to User who last updated
  createdAt: Date;
  updatedAt: Date;
}
```

### 4. Candidate Collection (AI-Enhanced)
```typescript
interface ICandidate {
  _id: ObjectId;

  // Personal Info
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    nationality?: string;
  };

  // Professional Info
  experience: string;
  currentPosition?: string;
  currentCompany?: string;
  expectedSalary?: {
    min: number;
    max: number;
    currency: string;
  };

  // Resume & Documents
  resume: {
    fileId: ObjectId;
    fileName: string;
    uploadDate: Date;
    base64?: string;
  };
  additionalDocuments?: {
    fileId: ObjectId;
    fileName: string;
    documentType: string;
    uploadDate: Date;
  }[];
 appliedJobs?: {
    jobId: ObjectId;
    appliedAt?: Date;
    status?: 'applied' | 'in-review' | 'interview' | 'offered' | 'rejected';
    source?: string; // e.g., referral, website, recruiter
  }[];
  // AI-Powered Resume Analysis
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

  // Job Applications
  applications?: {
    applicationId: ObjectId;
    companyId: ObjectId;
    jobId: ObjectId;
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
      updatedBy: ObjectId;
      reason?: string;
    }[];
    applicationSource: 'job_board' | 'referral' | 'company_website' | 'recruiter' | 'linkedin' | 'direct_application' | 'other';
    referralSource?: string;
    coverLetter?: string;
    customResponses?: { question: string; answer: string }[];
    interviews?: ObjectId[];
    assessments?: ObjectId[];
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
      communicationId: ObjectId;
      type: 'email' | 'phone_call' | 'message' | 'meeting' | 'automated_email';
      date: Date;
      subject?: string;
      content: string;
      direction: 'inbound' | 'outbound';
      fromUser: ObjectId;
      isRead: boolean;
      attachments?: string[];
    }[];
    internalNotes?: {
      noteId: ObjectId;
      content: string;
      createdBy: ObjectId;
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
      jobId: ObjectId;
      matchScore: number;
      reasoning: string;
      suggestedAt: Date;
      wasContacted: boolean;
      contactedAt?: Date;
    }[];
    lastRediscoveryRun: Date;
  };

  assessments?: {
    assessmentId: ObjectId;
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
    userId: ObjectId;
    aiGenerated: boolean;
    personalizedElements?: string[];
    sentimentAnalysis?: {
      tone: 'positive' | 'neutral' | 'negative';
      confidence: number;
      keyEmotions: string[];
    };
  }[];

  // Soft Delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: ObjectId;

  // Audit
  createdBy: ObjectId;
  updatedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

```

### 4. Assessment Collection (AI-Enhanced)
```typescript
interface IAssessment {
  _id: ObjectId;
  companyId: ObjectId; // required for multi-tenant isolation

  // Basic Info
  title: string;
  description?: string;
  type: 'technical' | 'cognitive' | 'communication' | 'personality' | 'custom';
  category: string; // e.g., "JavaScript", "React", "Problem Solving"
  difficulty?: 'beginner' | 'intermediate' | 'advanced';

  // Job Relevance
  relatedRoles?: string[]; // e.g., ["Frontend Developer", "Fullstack Developer"]
  requiredSkills?: string[]; // e.g., ["React", "Node.js", "SQL"]
  industry?: string; // e.g., "IT", "Software", "Cloud Computing"

  // Assessment Configuration
  questions: {
    questionId: string;
    type: 'multiple_choice' | 'coding' | 'essay' | 'rating';
    question: string;
    options?: string[]; // for multiple choice
    correctAnswer?: string | string[];
    points: number;
    timeLimit?: number; // per question in seconds
    skillTested?: string; // e.g., "React", "Algorithms"
    difficulty?: 'easy' | 'medium' | 'hard';
  }[];

  totalPoints: number;
  timeLimit: number; // total time in minutes
  passingScore: number; // percentage

  // Settings
  isActive: boolean;
  allowRetake: boolean;
  showResults: boolean;

  // Job Associations
  jobs?: ObjectId[]; // ref to Job
  jobTemplates?: ObjectId[]; // for pre-defined job assessments

  // Soft Delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: ObjectId;

  // Audit
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

```

### 5. Interview Collection (AI-Enhanced)
```typescript
interface IInterview {
  _id: ObjectId;

  // Company Association
  companyId: ObjectId; // ref to Company

  jobId: ObjectId; // ref to Job
  candidateId: ObjectId; // ref to Candidate

  // Interview Details
  title: string;
  type: 'phone' | 'video' | 'in_person' | 'technical' | 'behavioral';
  scheduledDate: Date;
  duration: number; // in minutes
  location?: string; // physical location or meeting link

  // Participants
  interviewers: {
    userId: ObjectId; // ref to User
    role: 'primary' | 'secondary' | 'observer';
    isConfirmed: boolean;
  }[];

  // Recording & Documentation
  recordingUrl?: string;
  recordingDuration?: number; // in seconds
  transcription?: string;

  // Detailed Scoring per Question
  questionsAsked?: {
    questionId: string;
    question: string;
    answer: string;
    score: number; // 1-10
    notes: string;
  }[];

  // Interview Round
  round: number; // 1, 2, 3, etc.
  stage: string; // corresponding to workflow stage

  // Status & Results
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';

  // AI-Enhanced Interview Analysis
  aiAnalysis: {
    recordingAnalyzed: boolean;
    transcription?: string;
    analysisResults?: {
      // Sentiment & Communication Analysis
      sentimentAnalysis: {
        overallSentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
        confidence: number; // 0-1
        keyEmotions: string[];
        communicationStyle: 'confident' | 'hesitant' | 'enthusiastic' | 'reserved';
      };

      // Skills Assessment
      skillsDiscussed: {
        skill: string;
        demonstrated: boolean;
        proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
        examples: string[];
      }[];

      // Key Insights
      keyInsights: string[];
      redFlags: string[];
      strengths: string[];
      improvementAreas: string[];

      // Follow-up Recommendations
      suggestedFollowUpQuestions: string[];
      recommendedNextSteps: string[];

      // Bias Detection
      biasIndicators: string[];
      diversityNotes: string[];

      analyzedAt: Date;
      analysisConfidence: number; // 0-1
    };

    // Recording Details
    recordingUrl?: string;
    recordingDuration?: number; // in seconds
    consentProvided: boolean;
  };

  // Human Feedback
  feedback: {
    interviewerId: ObjectId;
    rating: number; // 1-10
    strengths: string;
    weaknesses: string;
    recommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';
    comments: string;

    // Question-by-Question Feedback
    questionFeedback: {
      questionId: string;
      question: string;
      answer: string;
      score: number; // 1-10
      notes: string;
    }[];

    submittedAt: Date;
  }[];

  // Final Decision
  overallRating?: number;
  decision?: 'pass' | 'fail';
  nextSteps?: string;

  // Calendar Integration
  calendarEventId?: string;

  // Soft Delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: ObjectId;

  // Audit
  scheduledBy: ObjectId; // ref to User
  updatedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

### 6. Workflow Collection
```typescript
interface IWorkflow {
  _id: ObjectId;
  companyId: ObjectId; // required for multi-tenant isolation
  name: string;
  description?: string;
  isTemplate: boolean; // true for reusable templates
  isActive: boolean;

  // AI Enhancement for Workflow Optimization
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
      predictedSuccessRate: number; // 0-1
      complianceRecommendations: string[];
      diversityOptimizations: string[];
      optimizedAt: Date;
      aiConfidence: number; // 0-1
    };
    lastOptimized?: Date;
  };

  stages: {
    stageId: string;
    name: string;
    type: 'screening' | 'interview' | 'assessment' | 'review' | 'offer' | 'custom';
    order: number;
    isRequired: boolean;

    // AI-Enhanced Stage Intelligence
    aiIntelligence: {
      // Success Prediction
      successPrediction: {
        candidatePassRate: number; // 0-1
        avgTimeInStage: number; // days
        commonReasons: string[];
        improvementSuggestions: string[];
      };

      // Automated Screening
      automatedScreening?: {
        enabled: boolean;
        criteria: {
          skillRequirements: string[];
          experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
          cultureFitIndicators: string[];
          minimumScore: number; // 0-100
        };
        aiModel: 'gemini-pro' | 'custom';
      };

      // Stage Analytics
      analytics: {
        totalCandidatesProcessed: number;
        avgProcessingTime: number; // hours
        candidateDropoffRate: number; // percentage
        satisfactionScore?: number; // 1-10 from candidate feedback
      };
    };

    // Stage Configuration
    estimatedDuration?: number; // in days
    autoAdvance: boolean; // automatically advance to next stage

    // AI-Enhanced Actions & Automations
    actions: {
      type: 'send_email' | 'schedule_interview' | 'assign_assessment' | 'notify_user';
      config: any; // configuration for the action
      trigger: 'on_enter' | 'on_exit' | 'manual';

      // AI Enhancement
      aiEnhanced?: {
        personalizeContent: boolean;
        optimizeTiming: boolean;
        adaptToCandidate: boolean;
      };
    }[];

    // Requirements to advance
    requirements: {
      type: 'interview_complete' | 'assessment_passed' | 'manual_approval' | 'ai_screening_passed';
      config?: any;
    }[];
  }[];

  // AI-Powered Workflow Analytics
  workflowAnalytics: {
    performance: {
      avgTimeToHire: number; // days
      candidateExperience: number; // 1-10 rating
      hiringManagerSatisfaction: number; // 1-10 rating
      costPerHire: number;
      qualityOfHire: number; // 1-10 rating after 6 months
    };

    predictions: {
      expectedTimeToFill: number; // days for new jobs
      candidateDropoffRisk: number; // 0-1
      diversityProjection: {
        expectedDiversityScore: number; // 0-1
        improvementRecommendations: string[];
      };
    };

    lastAnalyzed: Date;
  };

  // Usage Stats
  jobs: ObjectId[]; // jobs using this workflow
  usageCount: number;

  // Soft Delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: ObjectId;

  // Audit
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Assessment Submission Collection
```typescript
interface IAssessmentSubmission {
  _id: ObjectId;
  companyId: ObjectId;
  candidateId: ObjectId;
  assessmentId: ObjectId;
  jobAssessmentAssignmentId: ObjectId; // link to specific assignment

  submissionType: 'link' | 'file' | 'code-editor';
  submissionLink?: string; // for GitHub/Live project links
  fileUrl?: string; // for uploaded files
  submittedAt: Date;
  status: 'pending' | 'reviewed' | 'completed';
  reviewerComments?: string;

  // Soft Delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: ObjectId;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}
```

#### Job Assessment Assignment Collection
```typescript
interface IJobAssessmentAssignment {
  _id: ObjectId;
  companyId: ObjectId;

  jobId: ObjectId;           // ref to Job
  assessmentId: ObjectId;    // ref to Assessment
  assignedBy: ObjectId;      // ref to User who assigned
  assignedAt: Date;

  // Optional: per-assignment configuration
  dueDate?: Date;
  timeLimit?: number;        // override assessment default
  passingScore?: number;     // override assessment default
  instructions?: string;

  isActive: boolean;         // allow deactivation without deleting

  // Soft Delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: ObjectId;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}
```

#### Interview Feedback Collection
```typescript
interface IInterviewFeedback {
  _id: ObjectId;
  companyId: ObjectId;
  interviewId: ObjectId;
  interviewerId: ObjectId;
  candidateId: ObjectId;  // Candidate receiving the feedback
  jobId: ObjectId; 
  // Structured Feedback
  technicalSkills: {
    rating: number; // 1-10
    comments: string;
  };
  communicationSkills: {
    rating: number;
    comments: string;
  };
  problemSolving: {
    rating: number;
    comments: string;
  };
  culturalFit: {
    rating: number;
    comments: string;
  };

  // Overall Assessment
  overallRating: number;
  recommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';
  detailedComments: string;

  // Follow-up Actions
  followUpRequired: boolean;
  followUpNotes?: string;

  // Soft Delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: ObjectId;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}
```



### 7. EmailTemplate Collection (AI-Enhanced)
```typescript
interface IEmailTemplate {
  _id: ObjectId;
  companyId: ObjectId; // required for multi-tenant isolation
  name: string;
  category: 'application_received' | 'interview_invitation' | 'rejection' | 'offer' | 'follow_up' | 'assessment_invitation' | 'custom';

  // Template Content
  subject: string; // supports variables like {{candidateName}}
  htmlContent: string; // rich HTML content
  textContent?: string; // plain text fallback

  // AI-Enhanced Content Generation
  aiGenerated: {
    contentGenerated: boolean;
    generationPrompt?: string;
    generatedVersions?: {
      version: string;
      subject: string;
      htmlContent: string;
      textContent?: string;
      generatedAt: Date;
      performanceScore?: number; // based on open rates, responses
    }[];
    currentVersion: string; // which AI version is active
    generatedAt?: Date;
    generatedBy?: ObjectId;
  };

  // AI Personalization
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

    // Personalization Results
    personalizedVersions?: {
      candidateId: ObjectId;
      personalizedSubject: string;
      personalizedContent: string;
      personalizationReason: string;
      sentimentTone: 'professional' | 'friendly' | 'enthusiastic' | 'formal';
      createdAt: Date;
    }[];
  };

  // Template Variables
  variables: {
    name: string; // e.g., candidateName
    description: string;
    defaultValue?: string;
    isRequired: boolean;

    // AI Enhancement
    aiSuggested?: {
      suggestedValues: string[];
      contextualRecommendations: string[];
    };
  }[];

  // AI Performance Analytics
  aiAnalytics: {
    performanceMetrics: {
      openRate: number; // percentage
      responseRate: number; // percentage
      engagementScore: number; // 1-10
      candidateSatisfaction: number; // 1-10
      conversionRate: number; // to next stage
    };

    sentimentAnalysis: {
      overallTone: 'positive' | 'neutral' | 'negative';
      professionalismScore: number; // 1-10
      warmthScore: number; // 1-10
      clarityScore: number; // 1-10
      inclusivityScore: number; // 1-10
    };

    improvementSuggestions: string[];
    lastAnalyzed: Date;
  };

  // A/B Testing for AI-Generated Content
  abTesting?: {
    enabled: boolean;
    variants: {
      name: string;
      subject: string;
      content: string;
      trafficPercentage: number; // 0-100
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

  // Settings
  isActive: boolean;
  isDefault: boolean; // default template for the category

  // Usage Stats
  usageCount: number;
  lastUsed?: Date;

  // Soft Delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: ObjectId;

  // Audit
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

### 8. CalendarEvent Collection
```typescript
interface ICalendarEvent {
  _id: ObjectId;
  companyId: ObjectId; // required for multi-tenant isolation
  title: string;
  description?: string;

  // Timing
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  timezone: string;

  // Event Details
  type: 'interview' | 'meeting' | 'deadline' | 'follow_up' | 'assessment' | 'other';
  location?: string; // physical location or meeting link

  // References
  jobId?: ObjectId; // if related to a job
  candidateId?: ObjectId; // if related to a candidate
  interviewId?: ObjectId; // if it's an interview

  // AI-Enhanced Scheduling Intelligence
  aiScheduling: {
    optimizedScheduling: boolean;
    schedulingFactors?: {
      // Optimal Time Prediction
      optimalTimeSlots: {
        dayOfWeek: string;
        timeRange: string;
        successProbability: number; // 0-1
        reasoning: string;
      }[];

      // Participant Analysis
      participantAvailability: {
        participantId: ObjectId | string;
        preferredTimeSlots: string[];
        timeZoneOptimization: boolean;
        meetingFrequency: number; // meetings per day
      }[];

      // Meeting Preparation Suggestions
      preparationSuggestions: string[];
      suggestedDuration: number; // minutes based on meeting type
      recommendedPrep: {
        forOrganizer: string[];
        forAttendees: string[];
        forCandidate?: string[];
      };
    };

    // Meeting Content AI
    contentGeneration?: {
      agendaGenerated: boolean;
      agenda?: string;
      suggestedQuestions?: string[];
      briefingNotes?: string;
      followUpItems?: string[];
      generatedAt?: Date;
    };

    schedulingOptimizedAt?: Date;
  };

  // Participants
  organizer: ObjectId; // ref to User
  attendees: {
    userId?: ObjectId; // internal user
    email?: string; // external attendee
    name?: string;
    isRequired: boolean;
    status: 'pending' | 'accepted' | 'declined' | 'tentative';

    // AI Enhancement
    aiInsights?: {
      engagementPrediction: number; // 0-1
      preparednessLevel: 'low' | 'medium' | 'high';
      recommendedPrep: string[];
    };
  }[];

  // AI-Powered Meeting Analytics
  meetingAnalytics?: {
    postMeetingAnalysis: {
      analyzed: boolean;
      meetingEffectiveness: number; // 1-10
      participantEngagement: {
        participantId: string;
        engagementScore: number; // 1-10
        speakingTime: number; // percentage
        keyContributions: string[];
      }[];

      // Meeting Outcomes
      outcomes: {
        decisionsReached: string[];
        actionItems: {
          item: string;
          assignedTo: string;
          dueDate?: Date;
        }[];
        nextSteps: string[];
        followUpRequired: boolean;
      };

      // Sentiment Analysis
      sentimentAnalysis: {
        overallSentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
        keyMoments: {
          timestamp: number; // seconds into meeting
          sentiment: string;
          context: string;
        }[];
      };

      analyzedAt: Date;
      confidenceScore: number; // 0-1
    };

    // Performance Tracking
    meetingPerformance: {
      startedOnTime: boolean;
      actualDuration: number; // minutes
      attendanceRate: number; // percentage who attended
      technicalIssues: string[];
      overallRating?: number; // 1-10 from participants
    };
  };

  // Recurrence (optional)
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number; // every N days/weeks/months
    endDate?: Date;
    occurrences?: number;

    // AI Enhancement
    aiOptimizedRecurrence?: {
      suggestedFrequency: string;
      reasoningForChange: string;
      basedOnHistoricalData: boolean;
    };
  };

  // Status
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';

  // AI-Enhanced Reminders
  reminders: {
    type: 'email' | 'popup' | 'sms';
    minutesBefore: number;

    // AI Enhancement
    aiPersonalized?: {
      personalizedMessage: string;
      optimalTiming: boolean;
      contentAdapted: boolean;
    };
  }[];

  // External Calendar Integration
  externalCalendarId?: string;
  externalEventId?: string;

  // Soft Delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: ObjectId;

  // Audit
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

### 9. JobTemplate Collection
```typescript
interface IJobTemplate {
  _id: ObjectId;
  companyId: ObjectId; // required for multi-tenant isolation
  name: string;
  category: string; // e.g., "Software Development", "Marketing"
  description?: string;

  // AI-Enhanced Template Generation
  aiGenerated: {
    templateGenerated: boolean;
    generationPrompt?: string;
    generatedAt?: Date;
    generatedBy?: ObjectId;
    generationContext: {
      industryTrends: string[];
      marketSalaryData: boolean;
      competitorAnalysis: boolean;
      skillDemandAnalysis: boolean;
    };
  };

  // Template Data
  templateData: {
    title: string;
    department: string;
    type: 'fulltime' | 'parttime' | 'contract' | 'internship';
    workMode: 'remote' | 'hybrid' | 'onsite';
    skillsRequired: string[];
    jobDescription: string;
    requirements: string;
    salaryRange?: {
      min: number;
      max: number;
      currency: string;
    };

    // AI Enhancement
    aiEnhancements: {
      optimizedForSEO: boolean;
      inclusiveLanguageChecked: boolean;
      biasDetectionPassed: boolean;
      marketCompetitiveness: 'low' | 'medium' | 'high';
      attractivenessScore: number; // 1-10
    };
  };

  // AI Template Intelligence
  templateAnalytics: {
    // Performance Metrics
    performanceMetrics: {
      usageFrequency: number;
      averageApplications: number;
      qualityCandidateRatio: number; // percentage of qualified candidates
      timeToFill: number; // average days
      hiringSuccess: number; // percentage of successful hires
    };

    // Market Analysis
    marketIntelligence: {
      salaryBenchmarking: {
        marketMin: number;
        marketMax: number;
        percentileRank: number; // where template salary sits
        recommendations: string[];
      };

      skillTrendsAnalysis: {
        trendingSkills: string[];
        decliningSkills: string[];
        emergingRequirements: string[];
        suggestedUpdates: string[];
      };

      competitorComparison: {
        similarRoles: number;
        competitiveAdvantages: string[];
        improvementAreas: string[];
      };
    };

    // Optimization Suggestions
    optimizationSuggestions: {
      contentImprovements: string[];
      skillSetAdjustments: string[];
      salaryRecommendations: string[];
      requirementChanges: string[];
      lastAnalyzed: Date;
    };
  };

  // AI-Powered Template Variants
  templateVariants: {
    variants: {
      variantName: string;
      targetMarket: string; // e.g., "junior", "senior", "remote-first"
      modifiedContent: {
        title?: string;
        description?: string;
        requirements?: string;
        skills?: string[];
        salaryRange?: { min: number; max: number; currency: string; };
      };
      performanceMetrics: {
        applications: number;
        qualityScore: number; // 1-10
        conversionRate: number; // percentage
      };
      createdAt: Date;
    }[];

    bestPerformingVariant?: string;
    lastOptimized?: Date;
  };

  // Workflow Template
  defaultWorkflow?: ObjectId; // ref to Workflow

  // AI Content Suggestions
  aiSuggestions: {
    suggestedImprovements: string[];
    trendingKeywords: string[];
    industryBestPractices: string[];
    diversityRecommendations: string[];
    lastUpdated: Date;
  };

  // Usage
  isActive: boolean;
  usageCount: number;

  // Soft Delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: ObjectId;

  // Audit
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

### 10. Notification Collection
```typescript
interface INotification {
  _id: ObjectId;
  companyId: ObjectId; // required for multi-tenant isolation
  userId: ObjectId; // recipient

  // Notification Content
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'application' | 'interview' | 'assessment' | 'system' | 'reminder';

  // AI-Enhanced Notification Intelligence
  aiPersonalization: {
    personalized: boolean;
    personalizedContent?: {
      originalMessage: string;
      personalizedMessage: string;
      personalizationReason: string;
      sentimentTone: 'professional' | 'friendly' | 'urgent' | 'celebratory';
      recipientProfile: {
        preferredCommunicationStyle: string;
        timeZoneOptimized: boolean;
        engagementHistory: number; // 0-1
      };
    };

    // Smart Timing
    optimalDelivery: {
      deliveryOptimized: boolean;
      optimalTime?: Date;
      reasoningForTiming: string;
      userEngagementPattern: {
        mostActiveHours: string[];
        preferredDays: string[];
        responseRate: number; // 0-1
      };
    };

    personalizedAt?: Date;
  };

  // References
  relatedJob?: ObjectId;
  relatedCandidate?: ObjectId;
  relatedInterview?: ObjectId;

  // AI-Enhanced Contextual Information
  aiContext?: {
    contextualInsights: string[];
    suggestedActions: string[];
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
    predictiveRelevance: number; // 0-1 how relevant this will be to the user

    // Smart Grouping
    relatedNotifications?: ObjectId[]; // other notifications that should be grouped
    conversationThread?: {
      threadId: string;
      messageOrder: number;
      isFollowUp: boolean;
    };
  };

  // AI Performance Tracking
  aiEngagement: {
    engagementMetrics: {
      openRate: number; // 0-1
      actionTakenRate: number; // 0-1
      responseTime: number; // seconds to read/act
      userSatisfaction?: number; // 1-10 if feedback provided
    };

    // A/B Testing
    notificationVariant?: {
      variantName: string;
      testGroup: 'A' | 'B' | 'control';
      performanceMetrics: {
        deliveryTime: Date;
        readTime?: Date;
        actionTime?: Date;
        effectiveness: number; // 0-1
      };
    };

    lastEngagementAnalysis?: Date;
  };

  // Smart Delivery
  deliveryPreferences: {
    channels: ('in_app' | 'email' | 'sms' | 'push')[];
    priority: 'low' | 'normal' | 'high';

    // AI-optimized delivery
    aiOptimizedChannel?: {
      recommendedChannel: string;
      confidence: number; // 0-1
      reasoning: string;
    };
  };

  // Status
  isRead: boolean;
  readAt?: Date;

  // Actions
  actionUrl?: string; // URL to navigate when clicked
  actionText?: string; // text for action button

  // Soft Delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: ObjectId;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}
```

## Implementation Guidelines

### 1. Project Structure
```
backend/
├── src/
│   ├── config/           # Database, JWT, email configuration
│   ├── controllers/      # Route handlers
│   ├── middleware/       # Auth, validation, error handling
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions
│   ├── validators/      # Request validation schemas
│   └── app.ts           # Express app setup
├── uploads/            # Temporary file storage
├── docs/               # API documentation
├── .env.example
├── package.json
└── tsconfig.json
```
### 🔧 10. Comprehensive Logging & Monitoring

#### Structured Logging with Winston
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'hire4recruit-api' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    }),
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.Console({
        format: winston.format.simple()
      })
    ] : [])
  ],
});

// Audit logging middleware
export const auditLogger = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('API Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.userId,
      companyId: req.user?.companyId,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });

  next();
};
```
