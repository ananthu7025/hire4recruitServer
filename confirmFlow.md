# hire4recruit Complete User Journey - Confirmed Flow

This document describes the complete end-to-end user story for the hire4recruit platform, covering authentication, team setup, role management, workflow creation, and job management.

---

## 🏢 **User Story: Complete Recruitment Platform Setup & Job Creation**

### **Main Characters:**
- **Sarah** - Company Admin (TechCorp CEO)
- **Mike** - HR Manager (recruited by Sarah)
- **Lisa** - Recruiter (recruited by Mwrite ike)
- **John** - Hiring Manager (Engineering Lead)

---

## **Phase 1: Company Onboarding & Authentication**

### **Story: Sarah starts her recruitment journey**

```
1. 🏢 Company Registration
   POST /api/v1/auth/register-company

   Sarah's Action:
   → Provides company details: "TechCorp", industry: "Technology", size: "medium"
   → Creates admin account with email: sarah@techcorp.com
   → Selects "Professional" subscription plan (₹2999/month)
   → System generates Razorpay payment order

   System Response:
   → Creates company with status: "pending_payment"
   → Creates admin user with isEmailVerified: false
   → Sends payment details for Razorpay integration
   → Sends verification email to sarah@techcorp.com

2. 💳 Payment Processing
   POST /api/v1/auth/verify-payment

   Sarah's Action:
   → Completes payment via Razorpay frontend integration
   → Submits payment signature and order details

   System Response:
   → Verifies payment signature with Razorpay
   → Updates company status to "active"
   → Activates subscription with limits: 50 users, 100 jobs
   → Returns JWT token for immediate platform access
   → Sarah can now access the dashboard

3. ✉️ Email Verification
   GET /api/v1/auth/verify-email/{userId}

   Sarah's Action:
   → Clicks verification link from email

   System Response:
   → Updates isEmailVerified to true
   → Sarah gains full platform access
   → Email verification badge appears in UI

4. 🔑 Login & Session Management
   POST /api/v1/auth/login

   Sarah's Daily Access:
   → Logs in with email/password
   → System validates: credentials, email verification, subscription status
   → Returns JWT token with permissions
   → Role: "company_admin" with full system access
```

---

## **Phase 2: Team Building & Employee Management**

### **Story: Sarah builds her recruitment team**

### **📋 Prerequisites for Inviting Employees**

**Sarah must have before inviting team members:**
✅ **Company Registration Complete** - Company status: "active"
✅ **Payment Verified** - Subscription activated and confirmed
✅ **Email Verified** - Sarah's admin email verified
✅ **Default Roles Available** - System automatically created 5 roles during registration
✅ **Admin Access** - Sarah has company_admin role with full permissions
✅ **Role IDs Known** - Sarah knows which role ID to assign to each invitee

**Information Required for Each Invitation:**
- 📧 **Email** (required) - Must be unique within company
- 👤 **First & Last Name** (required) - Employee identification
- 🎯 **Role ID** (required) - Must be valid existing role in company
- 🏢 **Department** (optional) - Organizational structure
- 💼 **Job Title** (optional) - Position description
- 📱 **Phone** (optional) - Contact information

**What System Does Automatically:**
🤖 **Creates 5 Default Roles** - During company registration (no action needed)
🤖 **Validates Role IDs** - Ensures roleId exists and belongs to company
🤖 **Generates Employee IDs** - Auto-creates unique employee identifiers
🤖 **Assigns Permissions** - Based on selected role's default permissions
🤖 **Creates Invitation Tokens** - Secure tokens for email invitations
🤖 **Sends Email Invitations** - Automated email with setup links

**What Sarah Must Do Manually:**
✋ **Get Role IDs** - Query available roles to get correct roleId
✋ **Provide Employee Info** - Name, email, department, job title
✋ **Send Invitations** - Make API call for each employee
✋ **Monitor Acceptance** - Check if invited employees accept invitations

```
5. 📋 Check Available Roles (Automatic Setup)
   GET /api/v1/roles

   What Sarah Discovers:
   → System automatically created 5 default roles during company registration:
     - company_admin (Sarah's current role)
     - hr_manager (for HR team)
     - recruiter (for recruitment specialists)
     - interviewer (for interview conductors)
     - hiring_manager (for hiring decisions)

   → Each role has predefined permissions
   → Roles cannot be modified (isSystem: true)
   → Sarah can create custom roles if needed

6. 🎯 Create Custom Role (Optional)
   POST /api/v1/roles

   Sarah's Optional Action:
   → If default roles don't fit her needs, she can create custom roles
   → Example: "technical_lead" with specific permissions
   → Custom roles can be modified/deleted later
   → For this story, default roles are sufficient

7. 👥 Invite HR Manager
   POST /api/v1/auth/invite-employee

   Sarah's Required Information:
   → Email: mike@techcorp.com
   → First Name: "Mike"
   → Last Name: "Johnson"
   → Role ID: (gets hr_manager role ID from step 5)
   → Department: "Human Resources"
   → Job Title: "HR Manager"
   → Phone: (optional)

   System Validation:
   → Validates roleId exists and belongs to company
   → Checks email not already used in company
   → Generates unique employee ID automatically
   → Creates invitation token

   System Response:
   → Creates employee record with invitation token
   → Sends invitation email to Mike
   → Mike receives setup link with token

8. ✅ Mike Accepts Invitation
   POST /api/v1/auth/accept-invitation

   Mike's Action:
   → Clicks invitation link, sets password
   → Completes profile setup

   System Response:
   → Activates Mike's account
   → Assigns hr_manager permissions automatically
   → Returns JWT token for Mike
   → Mike can now access HR features

9. 👤 View Team Members
   GET /api/v1/employees

   Sarah/Mike's View:
   → Lists all employees with roles and status
   → Filters by department, role, active status
   → Search functionality by name, email, department
   → Pagination for large teams

10. 🔄 Advanced Role Management (Reference)
    GET /api/v1/roles

    System Capabilities (for reference):
    → **5 Default System Roles** (automatically created):
      - company_admin: Full access to all features
      - hr_manager: Manages employees, candidates, HR activities
      - recruiter: Manages jobs, candidates, recruitment process
      - interviewer: Conducts interviews and provides feedback
      - hiring_manager: Reviews candidates and makes hiring decisions

    → **Custom Roles** (companies can create unlimited):
      - POST /api/v1/roles (create custom role)
      - PUT /api/v1/roles/{roleId} (update custom role)
      - DELETE /api/v1/roles/{roleId} (delete custom role)
      - Examples: technical_lead, sales_manager, department_head

    → Each role has granular permissions for:
      - Jobs: create, read, update, delete
      - Candidates: create, read, update, delete
      - Interviews: create, read, update, delete
      - Assessments: create, read, update, delete
      - Employees: create, read, update, delete
      - Workflows: create, read, update, delete
      - Reports: read
      - Settings: read, update

11. 👥 Expand Team
   Mike invites additional team members:

   → Lisa as "recruiter" (lisa@techcorp.com)
   → John as "hiring_manager" (john@techcorp.com)

   Each invitation follows same process:
   POST /api/v1/auth/invite-employee → email sent → acceptance → account activation
```

---

## **Phase 3: Workflow Creation & Management**

### **Story: Mike creates standardized hiring workflows**

```
12. 📋 Create Standard Hiring Workflow
    POST /api/v1/workflows

    Mike's Action:
    → Creates "Software Engineer Hiring Process"
    → Defines 5-stage workflow:

    Stage 1: Initial Screening
    - Type: "screening"
    - Duration: 2 days
    - Actions: Send welcome email, automated skill screening
    - Requirements: Manual approval by recruiter
    - AI Intelligence: Automated screening enabled, minimum score: 75

    Stage 2: Technical Interview
    - Type: "interview"
    - Duration: 3 days
    - Actions: Schedule technical interview, send calendar invite
    - Requirements: Interview complete with passing score
    - Auto-advance: false (manual review required)

    Stage 3: Behavioral Interview
    - Type: "interview"
    - Duration: 2 days
    - Actions: Schedule HR interview, personality assessment
    - Requirements: Interview complete, culture fit approval

    Stage 4: Final Review
    - Type: "review"
    - Duration: 1 day
    - Actions: Hiring manager review, reference check
    - Requirements: Hiring manager approval

    Stage 5: Offer Generation
    - Type: "offer"
    - Duration: 1 day
    - Actions: Generate offer letter, send to candidate
    - Requirements: Final approval from department head

    System Response:
    → Creates workflow with unique ID
    → Assigns Mike as creator
    → Status: "active" and ready for use
    → AI optimization suggestions provided

13. 🔧 Workflow Templates
    GET /api/v1/workflows/templates

    System Provides:
    → Pre-built workflow templates:
      - "Standard Software Developer"
      - "Senior Manager Hiring"
      - "Internship Program"
      - "Executive Search"
    → Mike can clone and customize templates

14. 📊 Workflow Analytics
    GET /api/v1/workflows/{workflowId}/analytics

    Mike's Insights:
    → Performance metrics: avg time to hire (30 days)
    → Stage bottlenecks: Technical interview (taking 5 days avg)
    → Candidate drop-off rates by stage
    → Success prediction: 85% chance of hire if passed stage 2
    → Recommendations for optimization

15. 🤖 AI Workflow Optimization
    POST /api/v1/workflows/{workflowId}/optimize

    AI Suggestions:
    → Reduce technical interview wait time by 2 days
    → Add parallel assessment during behavioral interview
    → Automate reference checking process
    → Improve candidate communication templates
    → Predicted improvement: 20% faster hiring, 90% success rate

16. 📋 Clone Workflow for Different Roles
    POST /api/v1/workflows/{workflowId}/clone

    Mike's Action:
    → Clones "Software Engineer" workflow
    → Creates "Data Scientist Hiring Process"
    → Modifies technical assessment for ML/AI skills
    → Adds specialized domain interview stage
```

---

## **Phase 4: Job Creation & Management**

### **Story: Sarah and Mike create job openings using workflows**

```
17. 💼 Create First Job Opening
    POST /api/v1/jobs

    Sarah's Action:
    → Creates "Senior Full-Stack Developer" position
    → Required fields:
      - Title: "Senior Full-Stack Developer"
      - Department: "Engineering"
      - Location: "San Francisco, CA, USA"
      - Country: "USA", State: "CA", City: "San Francisco"
      - Salary: min: $120,000, max: $160,000, currency: "USD", payRate: "annual"
      - Type: "fulltime"
      - Hiring Manager: John's employee ID
      - Work Mode: "hybrid"
      - Work Experience: "5+ years"
      - Skills Required: ["JavaScript", "React", "Node.js", "PostgreSQL", "AWS"]
      - Workflow ID: Links to "Software Engineer Hiring Process"

    Optional AI Enhancement:
    → generateWithAI: true
    → System creates optimized job description
    → SEO-friendly content generation
    → Inclusive language recommendations
    → Skills gap analysis based on market data

    System Response:
    → Generates unique job ID: "JOB-1640995200000-A1B2C3D4"
    → Status: "draft" (not yet published)
    → AI-generated content saved
    → Job linked to workflow for automated processing

16. 📝 AI-Enhanced Job Content
    System AI Generation:
    → Job Summary: "Join our dynamic engineering team building next-gen fintech solutions..."
    → Detailed Job Description: Comprehensive role overview with growth opportunities
    → Requirements: Technical and soft skills breakdown
    → Benefits: Competitive package description
    → AI Confidence: 94% content quality score

17. 🔄 Job Status Management
    PUT /api/v1/jobs/{jobId}

    Sarah's Workflow:
    → Reviews AI-generated content
    → Makes minor adjustments to requirements
    → Updates status from "draft" to "active"
    → Job now visible to candidates and search engines

18. 📋 Job Listing Management
    GET /api/v1/jobs

    Team View:
    → Sarah sees all company jobs with filters:
      - Status: active, draft, closed, onhold
      - Department: Engineering, Sales, Marketing
      - Location: Remote, San Francisco, New York
      - Hiring Manager: John, Mike, etc.
    → Pagination for large job lists
    → Search by title, skills, description

19. 📊 Job Performance Analytics
    GET /api/v1/jobs/{jobId}/analytics

    Real-time Metrics:
    → Views: 1,247 (last 30 days)
    → Applications: 89 candidates
    → Conversion rate: 7.1% (view to application)
    → Source breakdown: 45% job boards, 30% referrals, 25% direct
    → Avg. application quality score: 8.2/10
    → Time to fill prediction: 18 days remaining

22. 🎯 Job Cloning for Similar Roles
    POST /api/v1/jobs/{jobId}/clone

    Mike's Efficiency:
    → Clones "Senior Full-Stack Developer"
    → Creates "Junior Full-Stack Developer"
    → Adjusts: experience (2+ years), salary range, workflow
    → Maintains consistency in job structure
```

---

## **Phase 5: Integrated Workflow Execution**

### **Story: Complete candidate journey through workflow**

```
21. 👤 Candidate Application Triggers Workflow
    When candidate applies to job:
    → System automatically starts "Software Engineer Hiring Process"
    → Candidate enters Stage 1: "Initial Screening"
    → Automated actions triggered:
      - Welcome email sent to candidate
      - AI screening activated (skills match: 87%)
      - Lisa (recruiter) notified of new application
      - Application status: "screening"

22. 🤖 Automated Stage Processing
    Stage 1 Completion:
    → AI screening passes (score: 87% > 75% minimum)
    → Automated advancement to Stage 2: "Technical Interview"
    → Actions triggered:
      - Calendar invitation sent to candidate
      - John (hiring manager) notified
      - Interview scheduled for next Tuesday
      - Preparation materials sent to candidate

23. 📅 Interview Scheduling Integration
    POST /api/v1/interviews

    System Coordination:
    → Workflow automatically creates interview record
    → Links interview to job and candidate
    → Assigns John as interviewer
    → Duration: 60 minutes (technical assessment)
    → Format: "video_call" via integrated platform
    → Calendar invites sent to all participants

24. ✅ Stage Advancement Logic
    After each stage completion:
    → System checks stage requirements
    → Updates candidate status automatically
    → Triggers next stage actions
    → Sends status notifications to relevant team members
    → Tracks time spent in each stage for analytics

25. 📊 Workflow Performance Tracking
    GET /api/v1/workflows/{workflowId}/analytics

    Mike's Dashboard:
    → 15 candidates currently in workflow
    → Stage distribution: 5 screening, 6 technical, 3 behavioral, 1 review
    → Average time per stage vs. planned duration
    → Bottleneck identification: Technical interview stage
    → Success rate: 73% conversion from screening to offer
    → Recommended optimizations highlighted
```

---

## **Phase 6: Workflow Automation & Execution**

### **Story: Complete workflow automation in action**

```
26. 🤖 Automated Workflow System Overview
    The platform includes a comprehensive automation engine:

    Key Components:
    → **WorkflowExecutionService**: Manages complete candidate journey through stages
    → **EventService**: Real-time event handling and action triggering
    → **QueueService**: Background job processing with Redis and Bull
    → **EmailService**: AI-powered personalized email automation
    → **CalendarService**: Google Calendar and Outlook integration
    → **AI Integration**: Gemini AI for content personalization and screening

27. 🔄 Complete Candidate Workflow Automation
    POST /api/v1/workflows/{workflowId}/execute

    When a candidate applies to a job:
    → System automatically starts the assigned workflow
    → Candidate enters first stage (e.g., "Application Received")
    → Automated actions trigger immediately:
      - Welcome email sent with AI personalization
      - Application acknowledgment with expected timeline
      - HR team notified via queue system
      - Calendar events created if needed

    Stage Progression Example:

    Stage 1: Application Received
    → Email: "Thank you for applying to {{jobTitle}} at {{companyName}}"
    → AI personalizes content based on candidate profile
    → Hiring manager notification queued
    → Auto-advance to screening if basic requirements met

    Stage 2: Initial Screening
    → AI screening activated (skill matching, experience validation)
    → Email: Screening invitation with personalized assessment
    → Calendar: Screening call scheduled automatically
    → Requirement: AI score > 70% to advance

    Stage 3: Technical Interview
    → Email: Technical interview invitation with details
    → Calendar: Google Calendar event created with participants
    → Meeting link generated (Google Meet/Zoom integration)
    → Assessment: Coding challenge assigned via queue

    Stage 4: Final Review
    → Email: Status update to candidate
    → Notification: Hiring manager review required
    → Document: Automated reference check initiated
    → Calendar: Final decision meeting scheduled

28. ⚡ Real-Time Event Processing
    EventService handles all workflow events:

    Event Types:
    → 'stage_entered': Triggers on_enter actions
    → 'stage_exited': Triggers on_exit actions
    → 'candidate_advanced': Updates all stakeholders
    → 'candidate_rejected': Sends rejection emails
    → 'workflow_completed': Final notifications
    → 'action_triggered': Manual or automated actions

    Event Flow:
    → Event emitted → EventService processes → Queue jobs created
    → Background workers execute → Results logged → Notifications sent

29. 📧 AI-Powered Email Automation
    EmailService with AI personalization:

    Template Examples:
    → interview_invitation: "Interview Invitation - {{jobTitle}} at {{companyName}}"
    → application_received: "Thank you for your application"
    → rejection: "Update on your application status"
    → offer_letter: "Job Offer - {{jobTitle}} Position"

    AI Features:
    → Personalizes content based on candidate profile
    → Optimizes send times for higher open rates
    → A/B tests subject lines automatically
    → Adapts tone based on company culture
    → Multi-language support with context awareness

30. 🗓️ Automated Calendar Management
    CalendarService integration:

    Features:
    → Google Calendar and Outlook integration
    → Automatic interview scheduling
    → Conflict detection and resolution
    → Multi-timezone support
    → Recurring interview slots
    → Automated reminders (24h, 1h before)

    Workflow Actions:
    → 'add_calendar_event': Creates calendar entries
    → 'schedule_interview': Books interview slots
    → 'send_reminder': Automated reminder emails
    → 'reschedule_interview': Handles cancellations

31. 🔄 Queue-Based Background Processing
    QueueService manages all background tasks:

    Queue Types:
    → workflow-actions: Stage transitions, validations
    → email-sending: High/normal/low priority emails
    → scheduling: Calendar events, interview bookings
    → notifications: Multi-channel notifications

    Job Priorities:
    → High: Urgent candidate communications
    → Normal: Standard workflow emails
    → Low: Analytics updates, cleanup tasks

    Concurrency Settings:
    → Workflow Queue: 5 concurrent jobs
    → Email High Priority: 3 concurrent jobs
    → Email Normal: 10 concurrent jobs
    → Email Low: 2 concurrent jobs

32. 🎯 Advanced Workflow Actions
    Comprehensive action types available:

    send_email:
    → Template-based with AI personalization
    → Custom variables and dynamic content
    → Priority levels and delivery tracking

    schedule_interview:
    → Automatic participant coordination
    → Meeting link generation
    → Calendar integration
    → Conflict resolution

    assign_assessment:
    → Technical/behavioral assessments
    → Deadline management
    → Auto-scoring with AI
    → Progress tracking

    add_calendar_event:
    → Multi-provider support (Google, Outlook)
    → Attendee management
    → Location and virtual meeting setup

    generate_offer_letter:
    → Template-based offer generation
    → Salary and benefit calculations
    → Legal compliance checks
    → Digital signature integration

33. 📊 Workflow Analytics & Monitoring
    GET /api/v1/workflows/{workflowId}/analytics

    Real-time Metrics:
    → Active executions by stage
    → Average time per stage
    → Conversion rates between stages
    → Bottleneck identification
    → Success/failure rates
    → Email open/click rates
    → Calendar acceptance rates

    Performance Insights:
    → Stage duration vs. planned time
    → Drop-off points analysis
    → Recruiter workload distribution
    → Candidate satisfaction scores
    → ROI measurements

34. 🔧 Workflow Configuration Examples

    Standard Software Engineer Workflow:
    {
      "stages": [
        {
          "name": "Application Received",
          "autoAdvance": false,
          "actions": [
            {
              "type": "send_email",
              "trigger": "on_enter",
              "config": {
                "templateName": "application_received",
                "useAIPersonalization": true,
                "priority": "normal"
              }
            }
          ]
        },
        {
          "name": "AI Screening",
          "autoAdvance": true,
          "actions": [
            {
              "type": "assign_assessment",
              "trigger": "on_enter",
              "config": {
                "assessmentType": "technical_screening",
                "deadlineDays": 3,
                "passingScore": 75
              }
            }
          ],
          "requirements": [
            {
              "type": "ai_screening_passed",
              "config": { "minimumScore": 70 }
            }
          ]
        },
        {
          "name": "Technical Interview",
          "autoAdvance": false,
          "actions": [
            {
              "type": "schedule_interview",
              "trigger": "on_enter",
              "config": {
                "duration": 60,
                "interviewType": "technical"
              }
            },
            {
              "type": "add_calendar_event",
              "trigger": "on_enter",
              "config": {
                "title": "Technical Interview - {{candidateName}}",
                "description": "Technical assessment for {{jobTitle}}"
              }
            }
          ]
        }
      ]
    }

35. 🚀 Deployment & Configuration
    Environment Setup:

    Required Services:
    → Redis: Background job processing
    → MongoDB: Data persistence
    → SMTP: Email delivery
    → Google Calendar API: Calendar integration
    → Gemini AI API: Content personalization

    Configuration (.env):
    → REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
    → SMTP_HOST, SMTP_USER, SMTP_PASS
    → GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
    → GEMINI_API_KEY

    Queue Configuration:
    → QUEUE_CONCURRENCY_WORKFLOW=5
    → QUEUE_CONCURRENCY_EMAIL_HIGH=3
    → QUEUE_CONCURRENCY_EMAIL_NORMAL=10
    → ENABLE_BACKGROUND_JOBS=true
    → CLEANUP_INTERVAL_MINUTES=60
```

---

## **Phase 7: Advanced Features & Management**

### **Story: Platform optimization and growth**

```
26. 📈 Company Growth Tracking
    GET /api/v1/companies/stats

    Sarah's Executive View:
    → Total employees: 4/50 (subscription limit)
    → Active jobs: 3/100 (subscription utilization)
    → Workflows created: 4 (Standard, Data Science, Manager, Intern)
    → Candidates processed: 157 this month
    → Time to hire improved: 35 days → 22 days
    → Cost per hire: $3,200 (tracking trend)

27. 🔒 Permission Management
    GET /api/v1/employees/{employeeId}/permissions
    PUT /api/v1/employees/{employeeId}/permissions

    Sarah's Control:
    → Views Lisa's permissions (recruiter role)
    → Grants additional workflow creation rights
    → Restricts salary visibility for certain roles
    → Customizes access based on seniority
    → Maintains security while enabling productivity

28. 🔄 Workflow Iteration
    PUT /api/v1/workflows/{workflowId}

    Mike's Optimization:
    → Updates workflow based on analytics
    → Reduces technical interview duration from 3 to 2 days
    → Adds parallel skills assessment during behavioral interview
    → Implements AI suggestions from optimization report
    → Measures improvement over next hiring cycle

29. 📊 Advanced Analytics
    GET /api/v1/workflows/stats

    Strategic Insights:
    → Most effective workflow: "Software Engineer" (85% success)
    → Fastest workflow: "Internship Program" (12 days avg)
    → Workflow utilization rates across departments
    → ROI analysis: $15K saved monthly vs. manual process
    → Candidate satisfaction scores by workflow stage

30. 🚀 Scale Operations
    As TechCorp grows:
    → Additional employees invited using same invitation flow
    → New workflows created for specialized roles
    → Job templates developed for rapid posting
    → Advanced reporting enables data-driven decisions
    → Platform scales seamlessly with company growth
```

---

## **API Endpoint Summary Used in User Story**

### **Authentication & Setup**
- `POST /api/v1/auth/register-company` - Company registration
- `POST /api/v1/auth/verify-payment` - Payment confirmation
- `GET /api/v1/auth/verify-email/{userId}` - Email verification
- `POST /api/v1/auth/login` - User authentication
- `POST /api/v1/auth/invite-employee` - Team member invitation
- `POST /api/v1/auth/accept-invitation` - Invitation acceptance

### **Employee & Role Management**
- `GET /api/v1/employees` - Team listing
- `GET /api/v1/employees/{employeeId}` - Employee details
- `PUT /api/v1/employees/{employeeId}` - Profile updates
- `GET /api/v1/roles` - Available roles
- `GET /api/v1/employees/{employeeId}/permissions` - Permission viewing

### **Workflow Management**
- `POST /api/v1/workflows` - Workflow creation
- `GET /api/v1/workflows` - Workflow listing
- `GET /api/v1/workflows/templates` - Template browsing
- `GET /api/v1/workflows/{workflowId}/analytics` - Performance metrics
- `POST /api/v1/workflows/{workflowId}/optimize` - AI optimization
- `POST /api/v1/workflows/{workflowId}/clone` - Workflow duplication
- `PUT /api/v1/workflows/{workflowId}` - Workflow updates

### **Job Management**
- `POST /api/v1/jobs` - Job creation
- `GET /api/v1/jobs` - Job listing
- `PUT /api/v1/jobs/{jobId}` - Job updates
- `GET /api/v1/jobs/{jobId}/analytics` - Job performance
- `POST /api/v1/jobs/{jobId}/clone` - Job duplication

### **Workflow Automation**
- `POST /api/v1/workflows/{workflowId}/execute` - Start workflow for candidate
- `PUT /api/v1/workflows/{workflowId}/advance` - Advance candidate to next stage
- `POST /api/v1/workflows/{workflowId}/reject` - Reject candidate
- `POST /api/v1/workflows/{workflowId}/pause` - Pause workflow execution
- `POST /api/v1/workflows/{workflowId}/resume` - Resume paused workflow
- `POST /api/v1/workflows/{workflowId}/execute-action` - Execute manual action

### **Email Automation**
- `POST /api/v1/emails/send-template` - Send templated email
- `POST /api/v1/emails/send-personalized` - Send AI-personalized email
- `GET /api/v1/emails/templates` - List email templates
- `POST /api/v1/emails/templates` - Create email template

### **Calendar Integration**
- `POST /api/v1/calendar/events` - Create calendar event
- `GET /api/v1/calendar/availability` - Check availability
- `PUT /api/v1/calendar/events/{eventId}` - Update calendar event
- `DELETE /api/v1/calendar/events/{eventId}` - Cancel calendar event

### **Queue Management**
- `GET /api/v1/queue/stats` - Queue statistics
- `POST /api/v1/queue/jobs` - Add background job
- `GET /api/v1/queue/jobs/{jobId}` - Get job status
- `DELETE /api/v1/queue/jobs/{jobId}` - Cancel job

### **Analytics & Monitoring**
- `GET /api/v1/companies/stats` - Company metrics
- `GET /api/v1/workflows/stats` - Workflow statistics
- `GET /api/v1/workflows/{workflowId}/analytics` - Workflow performance
- `POST /api/v1/interviews` - Interview scheduling

---

## **Key Success Metrics Achieved**

✅ **Onboarding**: 0 to productive in 15 minutes
✅ **Team Setup**: 4 employees invited and active in 1 day
✅ **Workflow Creation**: 4 standardized processes in 2 hours
✅ **Job Posting**: First job live in 30 minutes with AI assistance
✅ **Process Automation**: 95% reduction in manual recruitment tasks
✅ **Email Automation**: AI-personalized emails with 40% higher open rates
✅ **Calendar Integration**: Automated scheduling reducing coordination time by 85%
✅ **Queue Processing**: Background jobs handling 1000+ daily automation tasks
✅ **Real-time Events**: Instant workflow execution and candidate notifications
✅ **Analytics**: Real-time insights driving continuous improvement
✅ **Scalability**: Platform ready for 10x growth without architectural changes

---

## **Technical Implementation Highlights**

🔧 **Authentication**: JWT-based with refresh tokens and email verification
🔧 **Multi-tenancy**: Company-isolated data with subscription enforcement
🔧 **Role-based Access**: Granular permissions with override capabilities
🔧 **Workflow Engine**: Complete state machine with automated execution
🔧 **Event-Driven Architecture**: Real-time event processing with EventService
🔧 **Queue System**: Redis-based background job processing with Bull
🔧 **Email Automation**: AI-powered personalized email templates with SMTP integration
🔧 **Calendar Integration**: Google Calendar and Outlook API integration
🔧 **AI Integration**: Gemini AI for content generation, candidate screening, and personalization
🔧 **Background Processing**: Multi-priority queue system with 20+ concurrent workers
🔧 **Real-time Analytics**: Performance tracking at every workflow stage
🔧 **Payment Integration**: Razorpay with automatic subscription management
🔧 **Audit Trail**: Complete user action tracking for compliance

This comprehensive user story demonstrates the complete hire4recruit platform capabilities, from initial company registration through fully automated workflow execution, showcasing the seamless integration of all system components including advanced automation, AI-powered features, and real-time processing capabilities.