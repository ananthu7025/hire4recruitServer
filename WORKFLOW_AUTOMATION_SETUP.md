# Workflow Automation Setup Guide

This guide will help you set up and configure the complete workflow automation system for the Hire4Recruit platform.

## 🎯 Overview

The workflow automation system includes:

- **Email Service**: Automated email notifications with AI personalization
- **Queue System**: Background job processing with Redis and Bull
- **Calendar Integration**: Google Calendar and Outlook integration
- **Event System**: Real-time workflow event handling
- **Workflow Execution**: Complete workflow state management

## 📋 Prerequisites

Before setting up the workflow automation, ensure you have:

1. **Node.js** (v16+)
2. **MongoDB** (v4.4+)
3. **Redis** (v6+)
4. **Gmail/SMTP account** for email sending
5. **Google Cloud Console project** (for Calendar API)
6. **Gemini AI API key** (for AI features)

## 🔧 Installation Steps

### 1. Install Dependencies

The required dependencies have been added to `package.json`. Install them:

```bash
npm install
```

### 2. Environment Configuration

Copy the environment template and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your actual configuration:

#### Email Service Configuration
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=Hire4Recruit
SMTP_FROM_EMAIL=noreply@hire4recruit.com
```

#### Redis Configuration
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

#### Google Calendar Configuration
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

#### AI Configuration
```env
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-pro
```

### 3. External Services Setup

#### Gmail/SMTP Setup
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password in `SMTP_PASS`

#### Redis Setup
Install and start Redis:

```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis

# Windows (using Docker)
docker run -d -p 6379:6379 --name redis redis:alpine
```

#### Google Calendar API Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API
4. Create credentials (OAuth 2.0 Client ID)
5. Add your redirect URI
6. Download the credentials JSON

#### Gemini AI Setup
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add the key to your `.env` file

### 4. Database Setup

The workflow system will automatically create the necessary collections. Ensure your MongoDB is running and accessible.

## 🚀 Usage Guide

### Creating Workflows with Automation

Here's how to create workflows that will automatically execute:

#### 1. Define Workflow with Actions

```javascript
const workflowData = {
  name: "Software Engineer Hiring Process",
  description: "Complete hiring workflow for software engineering positions",
  stages: [
    {
      name: "Application Received",
      type: "screening",
      order: 1,
      autoAdvance: false,
      actions: [
        {
          type: "send_email",
          config: {
            templateName: "application_received",
            useAIPersonalization: true,
            expectedResponseTime: "3-5 business days"
          },
          trigger: "on_enter"
        }
      ],
      requirements: []
    },
    {
      name: "Initial Screening",
      type: "screening",
      order: 2,
      autoAdvance: true,
      actions: [
        {
          type: "send_email",
          config: {
            templateName: "screening_invitation",
            useAIPersonalization: true
          },
          trigger: "on_enter"
        }
      ],
      requirements: [
        {
          type: "ai_screening_passed",
          config: { minimumScore: 70 }
        }
      ],
      aiIntelligence: {
        automatedScreening: {
          enabled: true,
          criteria: {
            skillRequirements: ["JavaScript", "Node.js", "React"],
            experienceLevel: "mid",
            minimumScore: 70
          }
        }
      }
    },
    {
      name: "Technical Interview",
      type: "interview",
      order: 3,
      autoAdvance: false,
      actions: [
        {
          type: "schedule_interview",
          config: {
            interviewType: "technical",
            duration: 60,
            participants: ["interviewer-id-1", "interviewer-id-2"]
          },
          trigger: "on_enter"
        },
        {
          type: "add_calendar_event",
          config: {
            title: "Technical Interview - {{candidateName}}",
            description: "Technical interview for {{jobTitle}} position"
          },
          trigger: "on_enter"
        }
      ],
      requirements: [
        {
          type: "interview_complete",
          config: { minimumScore: 75 }
        }
      ]
    },
    {
      name: "Final Decision",
      type: "review",
      order: 4,
      autoAdvance: false,
      actions: [
        {
          type: "generate_offer_letter",
          config: {
            salary: "75000-85000 USD",
            startDate: "2024-02-01",
            benefits: "Health, Dental, Vision, 401k"
          },
          trigger: "manual"
        }
      ],
      requirements: [
        {
          type: "manual_approval",
          config: { requiredApprovers: ["hiring-manager-id"] }
        }
      ]
    }
  ]
};
```

#### 2. Start Workflow for Candidate

```javascript
import { WorkflowExecutionService } from './src/services/workflowExecutionService';

// Start workflow when candidate applies
const workflowInstance = await WorkflowExecutionService.startWorkflow(
  candidateId,
  jobId,
  companyId,
  workflowId,
  triggeredBy, // User ID who triggered
  {
    applicationSource: "job_board",
    priority: "normal"
  }
);
```

#### 3. Advance Candidate Through Stages

```javascript
// Advance candidate to next stage
await WorkflowExecutionService.advanceCandidate(
  candidateId,
  jobId,
  targetStageId,
  {
    triggeredBy: userId,
    reason: "Passed technical screening",
    feedback: "Strong technical skills demonstrated",
    score: 85,
    manualAdvance: true
  }
);
```

#### 4. Execute Manual Actions

```javascript
// Execute manual actions (like sending custom emails)
await WorkflowExecutionService.executeManualAction(
  candidateId,
  jobId,
  "send_email",
  {
    templateName: "interview_follow_up",
    customVariables: {
      nextSteps: "We will review your submission and get back to you within 48 hours."
    }
  },
  triggeredBy
);
```

### Available Action Types

#### 1. Send Email (`send_email`)
```javascript
{
  type: "send_email",
  config: {
    templateName: "application_received", // or custom template
    useAIPersonalization: true,
    priority: "normal", // low, normal, high
    customVariables: {
      expectedResponseTime: "3-5 business days"
    }
  },
  trigger: "on_enter" // on_enter, on_exit, manual
}
```

#### 2. Schedule Interview (`schedule_interview`)
```javascript
{
  type: "schedule_interview",
  config: {
    interviewType: "technical", // phone, video, in_person, technical, behavioral
    duration: 60, // minutes
    participants: ["user-id-1", "user-id-2"],
    location: "Conference Room A",
    meetingLink: "https://meet.google.com/xyz-abc-def"
  },
  trigger: "on_enter"
}
```

#### 3. Assign Assessment (`assign_assessment`)
```javascript
{
  type: "assign_assessment",
  config: {
    assessmentType: "technical",
    title: "JavaScript Technical Assessment",
    duration: 90,
    deadlineDays: 3,
    passingScore: 70,
    instructions: "Complete all coding challenges within the time limit."
  },
  trigger: "on_enter"
}
```

#### 4. Add Calendar Event (`add_calendar_event`)
```javascript
{
  type: "add_calendar_event",
  config: {
    title: "Interview with {{candidateName}}",
    description: "Technical interview for {{jobTitle}} position",
    startTime: "2024-01-15T10:00:00Z",
    endTime: "2024-01-15T11:00:00Z",
    attendees: ["candidate@email.com", "interviewer@company.com"],
    location: "Conference Room A"
  },
  trigger: "on_enter"
}
```

#### 5. Generate Offer Letter (`generate_offer_letter`)
```javascript
{
  type: "generate_offer_letter",
  config: {
    salary: "75000-85000 USD",
    startDate: "2024-02-01",
    benefits: "Health, Dental, Vision, 401k, Remote work options",
    workMode: "hybrid",
    responseDeadline: "2024-01-20"
  },
  trigger: "manual"
}
```

## 🔍 Monitoring and Debugging

### Health Check
```bash
curl http://localhost:3000/health
```

### Queue Monitoring
The system provides queue statistics and monitoring:

```javascript
import { QueueService } from './src/services/queueService';

// Get queue statistics
const stats = await QueueService.getQueueStats();
console.log('Queue Statistics:', stats);

// Clean up old jobs
await QueueService.cleanupQueues();
```

### Logs
All workflow execution is logged. Check your log files for detailed information:

```bash
tail -f logs/app.log
```

## 🔧 Troubleshooting

### Common Issues

1. **Email not sending**
   - Check SMTP credentials
   - Ensure Gmail App Password is correct
   - Verify SMTP settings in `.env`

2. **Queue jobs not processing**
   - Ensure Redis is running
   - Check Redis connection settings
   - Verify queue service initialization

3. **Calendar events not creating**
   - Check Google Calendar API credentials
   - Ensure OAuth tokens are valid
   - Verify calendar permissions

4. **AI features not working**
   - Check Gemini API key
   - Verify API quota limits
   - Check network connectivity

### Debug Mode
Enable debug mode for verbose logging:

```env
DEBUG_MODE=true
VERBOSE_LOGGING=true
```

## 📊 Performance Optimization

### Queue Concurrency
Adjust queue concurrency based on your server capacity:

```env
QUEUE_CONCURRENCY_WORKFLOW=5
QUEUE_CONCURRENCY_EMAIL_HIGH=3
QUEUE_CONCURRENCY_EMAIL_NORMAL=10
QUEUE_CONCURRENCY_EMAIL_LOW=2
```

### Background Jobs
Enable automatic cleanup:

```env
ENABLE_BACKGROUND_JOBS=true
CLEANUP_INTERVAL_MINUTES=60
QUEUE_CLEANUP_ENABLED=true
```

## 🔐 Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **API Keys**: Store securely and rotate regularly
3. **Email Templates**: Sanitize user input in templates
4. **Queue Jobs**: Validate job data before processing
5. **Calendar Access**: Use minimal required permissions

## 🚀 Production Deployment

For production deployment:

1. **Use environment-specific configurations**
2. **Set up proper logging and monitoring**
3. **Configure Redis persistence**
4. **Set up email service monitoring**
5. **Implement proper error handling and alerting**

## 📞 Support

If you encounter issues:

1. Check the logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure all external services (Redis, SMTP, etc.) are running
4. Test individual services using the health check endpoint

The workflow automation system is now fully functional and ready to automate your hiring processes!