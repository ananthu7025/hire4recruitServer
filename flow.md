# hire4recruit API Flow Documentation

## Overview
This document outlines the complete user journey and API flow for the hire4recruit recruitment management system, showing how different user personas interact with the system through various endpoints.

## User Personas
- **Company Admin**: Full system access, manages company settings and users
- **HR Manager**: Manages jobs, candidates, interviews, and assessments
- **Recruiter**: Handles candidate sourcing, screening, and initial interviews
- **Hiring Manager**: Reviews candidates, conducts interviews, makes hiring decisions
- **Interviewer**: Conducts interviews and provides feedback

---

## 1. Company Onboarding Flow

### Story: A new company wants to start using hire4recruit

```
1. Company Registration
   POST /api/v1/auth/register-company
   → Company provides basic info, creates admin account
   → System sets up company workspace
   → Admin receives confirmation

2. Admin Account Setup
   → Admin logs in for first time
   POST /api/v1/auth/login
   → System returns JWT token
   → Admin accesses dashboard

3. Company Profile Completion
   GET /api/v1/companies/profile
   → Admin views current company profile
   PUT /api/v1/companies/profile
   → Admin updates company details, settings, branding
```

---

## 2. Team Setup Flow

### Story: Company admin invites team members to join

```
1. View Current Team
   GET /api/v1/companies/users
   → Admin sees existing team members
   → Identifies roles needed

2. Invite Team Members
   POST /api/v1/auth/invite-user
   → Admin sends invitations to HR managers, recruiters
   → System sends invitation emails
   → Tracks invitation status

3. Team Member Onboarding
   → Invited user receives email with invitation link
   POST /api/v1/auth/accept-invitation
   → User sets password, completes profile
   → User gains access based on assigned role

4. Team Management
   GET /api/v1/users
   → Admin views all team members
   PUT /api/v1/users/{id}/role
   → Admin adjusts roles and permissions as needed
```

---

## 3. Job Creation & Management Flow

### Story: HR Manager creates a new job opening

```
1. Job Creation Planning
   GET /api/v1/companies/stats
   → HR Manager checks current job limits
   → Ensures within subscription limits

2. Create New Job
   POST /api/v1/jobs
   → HR Manager provides job details
   → Enables AI generation for job description
   → System generates SEO-optimized, inclusive content
   → Job saved in draft status

3. Job Review & Publishing
   GET /api/v1/jobs/{jobId}
   → HR Manager reviews generated content
   PUT /api/v1/jobs/{jobId}
   → Makes any necessary edits
   POST /api/v1/jobs/{jobId}/publish
   → Job goes live and becomes searchable

4. Job Performance Monitoring
   GET /api/v1/jobs/{jobId}/analytics
   → Track application rates, views, engagement
   → Monitor job performance metrics
```

---

## 4. Candidate Application Flow

### Story: External candidate applies for a job

```
1. Job Discovery
   → Candidate finds job through company career page
   → Views detailed job description

2. Application Submission
   POST /api/v1/candidates
   → Candidate uploads resume (PDF/DOC)
   → Provides personal information
   → Submits application

3. Resume Processing
   → System automatically parses resume using AI
   → Extracts skills, experience, education
   → Generates candidate profile
   → Calculates job match score

4. Application Confirmation
   → Candidate receives confirmation email
   → Application appears in recruiter dashboard
   → Triggers workflow automation
```

---

## 5. Candidate Screening Flow

### Story: Recruiter reviews and screens new applications

```
1. Application Review
   GET /api/v1/jobs/{jobId}/applications
   → Recruiter sees new applications
   → Views AI-generated match scores
   → Reviews parsed resume data

2. Candidate Evaluation
   GET /api/v1/candidates/{candidateId}
   → Recruiter reviews detailed candidate profile
   → Checks AI analysis and recommendations
   → Reviews application materials

3. Initial Screening Decision
   PUT /api/v1/candidates/{candidateId}/applications/{applicationId}
   → Update application status (screening, rejected, etc.)
   → Add screening notes and feedback
   → Trigger next workflow step

4. Communication
   → System sends personalized emails based on status
   → Uses AI to customize messaging tone
   → Maintains candidate experience
```

---

## 6. Interview Management Flow

### Story: Moving qualified candidates through interview process

```
1. Interview Scheduling
   POST /api/v1/interviews
   → HR Manager schedules interviews
   → Assigns interviewers
   → Sets interview type and format

2. Interview Preparation
   GET /api/v1/candidates/{candidateId}
   → Interviewers review candidate profile
   → Access AI-generated interview questions
   → Review job requirements and match analysis

3. Interview Execution
   → Interview takes place (in-person/virtual)
   → Interviewer uses system for notes

4. Interview Feedback
   PUT /api/v1/interviews/{interviewId}
   → Interviewer submits feedback and scores
   → Provides recommendation (hire/no-hire)
   → System aggregates feedback from multiple rounds

5. Interview Analytics
   GET /api/v1/interviews/analytics
   → HR tracks interview completion rates
   → Monitors interviewer performance
   → Identifies bottlenecks in process
```

---

## 7. Assessment & Skills Testing Flow

### Story: Candidate completes technical or behavioral assessments

```
1. Assessment Assignment
   POST /api/v1/assessments
   → HR Manager assigns relevant assessments
   → System sends assessment invitation to candidate

2. Assessment Completion
   → Candidate receives assessment link
   → Completes online assessment
   → System automatically scores technical tests

3. Results Review
   GET /api/v1/assessments/{assessmentId}/results
   → Hiring Manager reviews assessment results
   → Compares scores against job requirements
   → Makes progression decision

4. Assessment Analytics
   GET /api/v1/assessments/analytics
   → Track assessment completion rates
   → Analyze score distributions
   → Identify skill gaps in candidate pool
```

---

## 8. Hiring Decision Flow

### Story: Making final hiring decisions and sending offers

```
1. Candidate Review
   GET /api/v1/candidates/{candidateId}/summary
   → Hiring Manager reviews complete candidate journey
   → Checks all interview feedback and assessments
   → Reviews AI match analysis

2. Team Decision
   → Hiring team discusses candidate
   → Makes hire/no-hire decision
   → Identifies compensation range

3. Offer Management
   PUT /api/v1/candidates/{candidateId}/applications/{applicationId}
   → Update status to "offer"
   → System generates offer letter template
   → Tracks offer timeline and expiration

4. Candidate Response
   → Candidate accepts/declines/negotiates offer
   → System tracks offer status
   → Updates candidate through process
```

---

## 9. Talent Pool & Re-engagement Flow

### Story: Finding great candidates from previous applications

```
1. Talent Pool Search
   GET /api/v1/candidates/talent-pool
   → Recruiter searches for candidates with specific skills
   → AI suggests "silver medalist" candidates
   → Finds previously rejected but qualified candidates

2. Re-engagement Campaign
   → System identifies candidates for new roles
   → Sends personalized re-engagement emails
   → Tracks response and interest levels

3. Fast-track Process
   → Pre-qualified candidates enter accelerated process
   → Skip initial screening steps
   → Direct to relevant interview rounds
```

---

## 10. Analytics & Reporting Flow

### Story: Company admin analyzes recruitment performance

```
1. Company Performance
   GET /api/v1/companies/stats
   → View overall recruitment metrics
   → Track team performance
   → Monitor subscription usage

2. Job Performance
   GET /api/v1/jobs/stats
   → Analyze job posting performance
   → Identify high-performing job descriptions
   → Track time-to-fill metrics

3. User Activity
   GET /api/v1/users/{userId}/activity
   → Monitor team member activity
   → Track recruiter performance
   → Identify training needs

4. AI Insights
   → Review AI matching accuracy
   → Analyze candidate quality trends
   → Optimize job descriptions based on AI feedback
```

---

## 11. System Administration Flow

### Story: Managing system settings and user access

```
1. User Management
   GET /api/v1/users
   → Admin views all users
   PUT /api/v1/users/{userId}
   → Updates user profiles and roles
   POST /api/v1/auth/invite-user
   → Invites new team members

2. Subscription Management
   PUT /api/v1/companies/subscription
   → Upgrade/downgrade subscription plans
   → Adjust user and job limits
   → Track usage against limits

3. Security Management
   POST /api/v1/auth/change-password
   → Users change passwords
   GET /api/v1/auth/verify-token
   → Verify token validity for secure sessions
```

---

## 12. Email Communication Flow

### Story: Automated and personalized candidate communication

```
1. Template Management
   → System uses AI to personalize email templates
   → Adapts tone based on candidate profile
   → Maintains consistent brand voice

2. Automated Triggers
   → Status changes trigger appropriate emails
   → Interview invitations sent automatically
   → Follow-up emails scheduled based on workflow

3. Communication Tracking
   → Track email open and response rates
   → Analyze candidate engagement
   → Optimize communication strategies
```

---

## API Authentication Flow

All protected endpoints require:
1. **Initial Login**: `POST /api/v1/auth/login`
2. **Token Usage**: Include `Authorization: Bearer <token>` header
3. **Token Verification**: `GET /api/v1/auth/verify-token` to check token validity
4. **Logout**: `POST /api/v1/auth/logout` to clear session

---

## Error Handling & Edge Cases

- **Rate Limiting**: 100 requests per 15-minute window
- **File Upload**: 10MB limit for resumes and documents
- **Subscription Limits**: Enforced at API level
- **Data Validation**: All inputs validated before processing
- **Multi-tenant Isolation**: Company data strictly separated

---

## Integration Points

- **AI Services**: Gemini AI for resume parsing, job matching, content generation
- **File Storage**: Secure document storage and retrieval
- **Email Service**: Automated communication workflows
- **Analytics**: Real-time performance tracking and insights

This flow represents a complete recruitment lifecycle from company onboarding to successful hiring, showing how the API endpoints work together to create a seamless user experience.