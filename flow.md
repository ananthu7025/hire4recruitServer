# hire4recruit API Flow Documentation

## Overview
This document outlines the complete user journey and API flow for the hire4recruit recruitment management system, showing how different user personas interact with the system through various endpoints.

## User Personas
- **Company Admin**: Full system access, manages company settings, employees, and subscriptions
- **HR Manager**: Manages jobs, candidates, interviews, assessments, and team members
- **Recruiter**: Handles candidate sourcing, screening, and initial interviews
- **Hiring Manager**: Reviews candidates, conducts interviews, makes hiring decisions
- **Interviewer**: Conducts interviews and provides feedback

## API Base Structure
All API endpoints are prefixed with `/api/v1/` and organized by resource:
- `/api/v1/auth` - Authentication and user management
- `/api/v1/companies` - Company profile and settings
- `/api/v1/users` - User management within companies (legacy)
- `/api/v1/employees` - Employee management and team administration
- `/api/v1/jobs` - Job posting and management
- `/api/v1/candidates` - Candidate management and applications
- `/api/v1/interviews` - Interview scheduling and feedback
- `/api/v1/assessments` - Skills testing and evaluation

---

## 1. Company Onboarding Flow

### Story: A new company wants to start using hire4recruit

```
1. Company Registration
   POST /api/v1/auth/register-company
   → Company provides basic info, admin details, subscription plan
   → System creates company and admin user
   → Razorpay payment order generated
   → Admin account created with isEmailVerified: false

2. Payment Processing
   POST /api/v1/auth/verify-payment
   → Frontend processes Razorpay payment
   → System verifies payment signature
   → Company subscription activated
   → Returns JWT token for immediate access

2.1. Retry Payment (If Initial Payment Failed)
   POST /api/v1/auth/retry-payment
   → User provides email address
   → System finds company with pending_payment status
   → Creates new Razorpay order for the same subscription
   → Returns new payment details for completion
   → User completes payment via existing verify-payment flow

3. Email Verification
   → Verification email sent automatically after registration
   → Contains link: /email-verification/{userId}
   GET /api/v1/auth/verify-email/{userId}
   → System updates user.isEmailVerified to true
   → User can access full platform features
```

---

## 2. Authentication & Session Management Flow

### Story: Users logging in and managing sessions

```
1. User Login
   POST /api/v1/auth/login
   → User provides email/password
   → System validates credentials first
   → Checks email verification status (403 if not verified)
   → Checks company payment status (402 if payment pending/suspended)
   → Checks subscription expiration (402 if expired)
   → Returns JWT token only if all checks pass
   → Includes user permissions and role information

   Login Restrictions:
   - Email not verified → 403 Forbidden
   - Payment pending → 402 Payment Required
   - Subscription suspended/cancelled → 402 Payment Required
   - Subscription expired → 402 Payment Required
   - Account locked → 423 Locked
   - Invalid credentials → 401 Unauthorized

2. Session Validation
   GET /api/v1/auth/verify-token
   → Validates active JWT token
   → Returns current user session data
   → Used for route protection and user context

3. Profile Management
   GET /api/v1/auth/profile
   → Returns detailed user profile information
   → Includes preferences and last login

4. Password Management
   POST /api/v1/auth/forgot-password
   → Generates password reset token
   → Sends reset email to user

   POST /api/v1/auth/reset-password
   → Validates reset token and updates password

   POST /api/v1/auth/change-password
   → Authenticated users can change their password

5. User Recovery Scenarios

   Scenario A: Email Not Verified
   → User gets 403 error on login
   → Frontend shows "Verify Email" message
   → User checks email for verification link
   → GET /api/v1/auth/verify-email/{userId} (from email link)
   → User can now login successfully

   Scenario B: Payment Required
   → User gets 402 error on login
   → Frontend shows "Complete Payment" option
   → POST /api/v1/auth/retry-payment (with user email)
   → System creates new payment order
   → User completes payment via Razorpay
   → POST /api/v1/auth/verify-payment (payment verification)
   → User can now login successfully

6. Logout
   POST /api/v1/auth/logout
   → Invalidates current session
   → Clears authentication tokens
```

---

## 3. Team Setup & Employee Management Flow

### Story: Company admin invites and manages team members

```
1. View Company Team
   GET /api/v1/companies/users
   → Admin sees all company team members
   → Includes roles, permissions, and status

2. Invite Team Members (Employees)
   POST /api/v1/auth/invite-employee
   → Admin sends employee invitations with role assignment
   → Supports all roles including company_admin
   → Includes employee ID and additional profile information
   → System generates invitation token
   → Invitation email sent with setup link

3. Accept Invitation
   POST /api/v1/auth/accept-invitation
   → Invited user sets password and activates account
   → Returns JWT token for immediate access
   → User gains permissions based on assigned role

4. Employee Management Operations
   GET /api/v1/employees
   → List all employees with filtering and pagination
   → Supports filtering by role, department, active status
   → Advanced search by name, email, department, job title
   → Sortable by multiple fields (firstName, lastName, createdAt, etc.)

   GET /api/v1/employees/search
   → Advanced employee search with configurable options
   → Minimum 2 character search term requirement
   → Option to exclude specific roles from results
   → Option to include inactive employees

   GET /api/v1/employees/role/{role}
   → Get all active employees with specific role
   → Useful for role-based team views and assignments

   GET /api/v1/employees/{employeeId}
   → Get detailed employee information
   → Includes complete profile, permissions, and metadata
   → Shows invitation history and account status

   PUT /api/v1/employees/{employeeId}
   → Update employee profile information
   → Users can update their own profile
   → Admins can update any employee profile
   → Supports updating preferences and personal details

   PUT /api/v1/employees/{employeeId}/role
   → Update employee role and related information
   → Automatically updates permissions based on new role
   → Restricted to company_admin and hr_manager roles
   → Updates department and job title simultaneously

5. Employee Status Management
   POST /api/v1/employees/{employeeId}/activate
   → Reactivate deactivated employee account
   → Restores access to platform features
   → Maintains historical data and settings

   POST /api/v1/employees/{employeeId}/deactivate
   → Temporarily deactivate employee account
   → Prevents login and platform access
   → Invalidates refresh tokens for security
   → Cannot deactivate own account

   DELETE /api/v1/employees/{employeeId}
   → Permanently delete employee (soft delete)
   → Maintains data integrity for historical records
   → Invalidates all authentication tokens
   → Cannot delete own account

   GET /api/v1/employees/{employeeId}/activity
   → View employee activity summary and statistics
   → Shows last login, account age, login statistics
   → Displays invitation status and acceptance history
   → Useful for account management and security monitoring

6. Employee Permissions Management
   GET /api/v1/employees/{employeeId}/permissions
   → View detailed employee permissions
   → Users can view their own permissions
   → Admins can view any employee permissions
   → Shows granular resource-level access control

   PUT /api/v1/employees/{employeeId}/permissions
   → Update employee permissions (company_admin only)
   → Override default role-based permissions
   → Granular control over resource access (CRUD operations)
   → Supports custom permission configurations

7. Employee Role Hierarchy and Permissions
   → company_admin: Full system access, manages all employees
   → hr_manager: Manages team members, jobs, candidates, interviews
   → recruiter: Handles candidate management and initial screening
   → interviewer: Conducts interviews and provides feedback
   → hiring_manager: Reviews candidates and makes hiring decisions

8. Employee Data Model Features
   → Multi-tenant isolation by company
   → Role-based permission system with overrides
   → Comprehensive audit trail (createdBy, updatedBy)
   → Invitation workflow with token-based activation
   → Security features (failed login tracking, account lockout)
   → Flexible preferences system (timezone, notifications)
   → Department and job title organization
```

### Legacy User Management (Deprecated)

```
The /api/v1/users endpoints are maintained for backward compatibility but are
being phased out in favor of the more comprehensive /api/v1/employees endpoints.

GET /api/v1/users
GET /api/v1/users/search
GET /api/v1/users/role/{role}
GET /api/v1/users/{userId}
PUT /api/v1/users/{userId}
PUT /api/v1/users/{userId}/role
GET /api/v1/users/{userId}/permissions
PUT /api/v1/users/{userId}/permissions
POST /api/v1/users/{userId}/activate
POST /api/v1/users/{userId}/deactivate
DELETE /api/v1/users/{userId}
GET /api/v1/users/{userId}/activity

These endpoints have equivalent functionality in the /employees namespace
with enhanced features and better data models.
```

---

## 4. Company Profile Management Flow

### Story: Managing company settings and configuration

```
1. Company Profile Operations
   GET /api/v1/companies/profile
   → Get current company profile and settings

   PUT /api/v1/companies/profile
   → Update company details (admin only)
   → Includes branding, contact info, and preferences

2. Company Statistics
   GET /api/v1/companies/stats
   → View company-wide metrics and usage
   → Includes job counts, user activity, subscription usage

3. Subscription Management
   GET /api/v1/companies/subscription/limits
   → Check current subscription limits and usage

   PUT /api/v1/companies/subscription
   → Upgrade/downgrade subscription plans (admin only)
   → Handles billing and feature access changes

4. Activity Monitoring
   GET /api/v1/companies/activity
   → Company-wide activity summary
   → Team performance and system usage metrics

5. Company Status Control
   POST /api/v1/companies/deactivate
   → Temporarily deactivate company account

   POST /api/v1/companies/reactivate
   → Reactivate company account
```

---

## 5. Job Creation & Management Flow

### Story: HR Manager creates and manages job openings

```
1. Job Creation Planning
   GET /api/v1/companies/stats
   → Check current job limits against subscription
   → Verify available job postings

2. Create New Job
   POST /api/v1/jobs
   → Create job with AI-powered content generation
   → System generates SEO-optimized descriptions
   → Job saved as draft initially

3. Job Management Operations
   GET /api/v1/jobs
   → List jobs with filtering and pagination
   → Support for status, department, location filters

   GET /api/v1/jobs/{jobId}
   → Get detailed job information

   PUT /api/v1/jobs/{jobId}
   → Update job details and requirements

   DELETE /api/v1/jobs/{jobId}
   → Archive job posting

4. Job Publishing & Status
   POST /api/v1/jobs/{jobId}/publish
   → Publish job to make it live and searchable
   → Triggers job board syndication

   POST /api/v1/jobs/{jobId}/clone
   → Create new job based on existing template
   → Useful for similar positions

5. Job Performance Analytics
   GET /api/v1/jobs/stats
   → Company-wide job performance metrics

   GET /api/v1/jobs/{jobId}/analytics
   → Individual job performance tracking
   → Views, applications, conversion rates

6. Application Management
   GET /api/v1/jobs/{jobId}/applications
   → View all applications for specific job
   → Includes candidate info and application status

7. Advanced Job Search
   GET /api/v1/jobs/search/skills
   → Search jobs by required skills
   → AI-powered matching and recommendations
```

---

## 6. Candidate & Application Management Flow

### Story: Managing candidates throughout the recruitment process

```
1. Candidate Discovery
   GET /api/v1/candidates
   → List all candidates with advanced filtering
   → Status, skills, experience level filters

   POST /api/v1/candidates/search
   → Advanced candidate search with AI
   → Skills matching and profile analysis

   GET /api/v1/candidates/talent-pool
   → Access previously interviewed candidates
   → "Silver medalist" re-engagement opportunities

2. Candidate Registration & Profile Creation
   POST /api/v1/candidates
   → Create new candidate profile
   → Upload resume with AI parsing
   → Extract skills, experience, education automatically

   POST /api/v1/candidates/{candidateId}/resume
   → Upload/update resume documents
   → Automatic profile enrichment via AI

3. Candidate Profile Management
   GET /api/v1/candidates/{candidateId}
   → View detailed candidate profile
   → AI-generated insights and match scores

   PUT /api/v1/candidates/{candidateId}
   → Update candidate information
   → Add notes, tags, and internal assessments

   GET /api/v1/candidates/{candidateId}/summary
   → Complete candidate journey overview
   → All interactions, interviews, assessments

4. Application Status Management
   GET /api/v1/candidates/{candidateId}/applications
   → View all applications by candidate
   → Cross-job application history

   PUT /api/v1/candidates/{candidateId}/applications/{applicationId}
   → Update application status
   → Triggers automated email workflows
   → Status options: screening, interview, offer, hired, rejected

5. Candidate Status Workflow
   PUT /api/v1/candidates/{candidateId}/status
   → Update overall candidate status
   → Manages candidate lifecycle state

   DELETE /api/v1/candidates/{candidateId}
   → Archive candidate (soft delete)
   → Maintains data for reporting purposes
```

---

## 7. Interview Management Flow

### Story: Scheduling and conducting interviews with candidates

```
1. Interview Scheduling
   POST /api/v1/interviews
   → Schedule interview with candidate
   → Assign interviewers and set format
   → Send calendar invitations

   GET /api/v1/interviews/availability
   → Check interviewer availability
   → Conflict detection and resolution

2. Interview Management
   GET /api/v1/interviews
   → List scheduled interviews with filters
   → Support for date range, status, interviewer

   GET /api/v1/interviews/{interviewId}
   → Get detailed interview information
   → Candidate profile, job details, schedule

   PUT /api/v1/interviews/{interviewId}
   → Update interview details
   → Reschedule, change interviewers, update format

3. Interview Execution Support
   GET /api/v1/interviews/calendar
   → Calendar view of all interviews
   → Team scheduling overview

   POST /api/v1/interviews/{interviewId}/cancel
   → Cancel interview with notification
   → Automatic candidate communication

4. Interview Feedback & Evaluation
   POST /api/v1/interviews/{interviewId}/feedback
   → Submit interview feedback and scores
   → Structured evaluation forms
   → Hiring recommendation capture

   GET /api/v1/interviews/{interviewId}/feedback
   → View submitted interview feedback
   → Aggregated scores and recommendations

5. Interview Analytics
   GET /api/v1/interviews/analytics
   → Interview performance metrics
   → Completion rates, feedback quality
   → Interviewer performance tracking
```

---

## 8. Assessment & Skills Testing Flow

### Story: Evaluating candidates through structured assessments

```
1. Assessment Planning
   GET /api/v1/assessments/templates
   → Browse available assessment templates
   → Pre-built technical and behavioral tests

   GET /api/v1/assessments
   → List company assessments
   → Active, draft, and completed assessments

2. Assessment Creation
   POST /api/v1/assessments
   → Create custom assessment
   → Define questions, scoring, time limits

   POST /api/v1/assessments/templates/{templateId}
   → Create assessment from template
   → Customize existing framework

3. Assessment Management
   GET /api/v1/assessments/{assessmentId}
   → View assessment details
   → Questions, settings, completion stats

   PUT /api/v1/assessments/{assessmentId}
   → Update assessment configuration
   → Modify questions, scoring, settings

4. Assessment Assignment
   POST /api/v1/assessments/{assessmentId}/assign
   → Assign assessment to candidates
   → Send invitation emails with access links
   → Set completion deadlines

5. Results & Analytics
   GET /api/v1/assessments/{assessmentId}/results
   → View assessment results
   → Individual and aggregate scoring

   GET /api/v1/assessments/{assessmentId}/analytics
   → Assessment performance analytics
   → Question effectiveness, completion rates

   GET /api/v1/assessments/analytics
   → Company-wide assessment metrics
   → Skills gap analysis, candidate quality trends

6. Assessment Lifecycle
   DELETE /api/v1/assessments/{assessmentId}
   → Archive assessment
   → Maintains historical data for reporting
```

---

## 9. Email Communication & Template Management Flow

### Story: Automated and personalized candidate communication

```
1. Email Template Management
   → System includes pre-built email templates:
     - application_received
     - interview_invitation
     - rejection
     - offer
     - follow_up
     - assessment_invitation
     - custom

2. AI-Powered Personalization
   → Templates adapt based on:
     - Candidate personality analysis
     - Experience level assessment
     - Industry background matching
     - Communication style preferences
     - Cultural fit indicators

3. Automated Email Triggers
   → Status changes trigger appropriate emails
   → Interview scheduling sends invitations
   → Assessment assignments notify candidates
   → Application updates maintain candidate engagement

4. Email Analytics & Optimization
   → Track email performance metrics:
     - Open rates and response rates
     - Engagement scoring
     - Candidate satisfaction feedback
     - Conversion rate tracking

5. A/B Testing Support
   → Test email variations for optimization
   → Performance comparison and winner selection
   → Continuous improvement of communication
```

---

## 10. Subscription & Payment Management Flow

### Story: Managing subscription plans and billing

```
1. Plan Selection
   GET /api/v1/auth/subscription-plans
   → View available subscription tiers
   → Feature comparison and pricing

2. Payment Processing
   → Razorpay integration for secure payments
   → Support for INR currency
   → Monthly and annual billing cycles

3. Payment Verification
   POST /api/v1/auth/verify-payment
   → Verify Razorpay payment completion
   → Activate company subscription
   → Update feature access

4. Subscription Monitoring
   GET /api/v1/companies/subscription/limits
   → Track usage against plan limits
   → Job postings, user accounts, features

5. Plan Management
   PUT /api/v1/companies/subscription
   → Upgrade or downgrade plans
   → Prorated billing adjustments
   → Feature access updates
```

---

## 11. AI-Powered Features Integration

### Story: Leveraging AI throughout the recruitment process

```
1. Job Description Generation
   → AI creates optimized job descriptions
   → SEO-friendly content generation
   → Inclusive language recommendations

2. Resume Parsing & Analysis
   → Automatic extraction of candidate data
   → Skills identification and scoring
   → Experience level assessment

3. Candidate Matching
   → AI-powered job-candidate matching
   → Skill compatibility scoring
   → Culture fit assessment

4. Interview Question Generation
   → Role-specific interview questions
   → Skill-based questioning strategies
   → Bias reduction recommendations

5. Communication Personalization
   → Adaptive email content generation
   → Tone and style customization
   → Candidate engagement optimization
```

---

## 12. Email Verification Flow

### Story: Company admin verifies their email address after registration

```
1. Email Verification Trigger
   → After company registration, verification email sent automatically
   → Email contains link: /email-verification/{userId}
   → User receives email with verification link

2. Email Verification Process
   → User clicks verification link in email
   GET /api/v1/auth/verify-email/{userId}
   → System validates user ID format
   → Updates user.isEmailVerified to true
   → Returns success confirmation

3. Verification Status Check
   → Login response includes isEmailVerified status
   → Frontend can show verification status
   → Restrict certain features until verified

4. Resend Verification (Future Enhancement)
   → User can request new verification email
   → System sends fresh verification link
   → Previous links remain valid
```

---

## 13. Data Models & Relationships

### Key Data Structures

```
Company
├── Employees (team members)
├── Jobs
├── Subscription details
└── Company settings

Employee (Enhanced User Model)
├── Personal Information (name, email, phone, avatar)
├── Role (company_admin, hr_manager, recruiter, interviewer, hiring_manager)
├── Permissions (granular access control with overrides)
├── Department and job title
├── Employee ID and organizational data
├── Account status (active, deleted, email verified)
├── Security features (failed logins, lockout)
├── Invitation workflow (token, invited by, acceptance)
├── Preferences (timezone, language, notifications)
├── Audit trail (created by, updated by, timestamps)
└── Activity tracking (last login, account age)

Legacy User (Deprecated)
├── Basic role and permissions
├── Limited profile information
└── Maintained for backward compatibility

Job
├── Job details and requirements
├── Applications (embedded in candidates)
└── Analytics data

Candidate
├── Personal information
├── Resume and documents
├── Applications[] (array of job applications)
├── AI analysis results
└── Interview history

Interview
├── Candidate and job references
├── Interviewer assignments
├── Feedback and scores
└── Scheduling information

Assessment
├── Questions and scoring
├── Assigned candidates
├── Results and analytics
└── Template relationships
```

---

## API Authentication & Security

### Authentication Flow
1. **Login**: `POST /api/v1/auth/login` returns JWT token
2. **Token Usage**: Include `Authorization: Bearer <token>` header
3. **Verification**: `GET /api/v1/auth/verify-token` validates token
4. **Permissions**: Role-based and resource-level access control

### Security Features
- **Rate Limiting**: 100 requests per 15-minute window
- **File Upload**: 10MB limit for resumes and documents
- **Input Validation**: Zod schema validation on all endpoints
- **SQL Injection Protection**: MongoDB with proper sanitization
- **XSS Prevention**: Input sanitization middleware
- **CORS Configuration**: Restricted origin access

---

## Error Handling & Status Codes

### Common Response Patterns
- **200**: Success with data
- **201**: Resource created successfully
- **400**: Bad request/validation error
- **401**: Authentication required
- **403**: Insufficient permissions
- **404**: Resource not found
- **409**: Conflict (duplicate data)
- **423**: Account locked/inactive
- **429**: Rate limit exceeded
- **500**: Internal server error

### Validation & Business Rules
- **Multi-tenant Isolation**: Strict company data separation
- **Subscription Limits**: API-level enforcement
- **Role Hierarchy**: Proper permission inheritance
- **Data Consistency**: Transaction-based operations

---

## Integration Points

### External Services
- **Razorpay**: Payment processing and subscription billing
- **AI Services**: Resume parsing, content generation, candidate matching
- **Email Service**: SMTP-based email delivery (configurable)
- **File Storage**: Document and resume storage system

### Webhook Support (Future)
- **Payment Events**: Subscription changes, payment failures
- **Application Events**: Status changes, new applications
- **Interview Events**: Scheduling confirmations, feedback submission

This comprehensive flow documentation represents the complete hire4recruit system architecture and user journeys, based on the actual implementation in the codebase.