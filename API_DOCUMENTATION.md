# hire4recruit API Documentation

## Overview
The hire4recruit API is a comprehensive recruitment management system with AI-powered features built with Node.js, TypeScript, MongoDB, and Gemini AI.

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
All protected endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Authentication Routes (`/auth`)

#### Register Company
```http
POST /auth/register-company
Content-Type: application/json

{
  "companyName": "Acme Corp",
  "domain": "acme.com",
  "industry": "Technology",
  "size": "medium",
  "adminFirstName": "John",
  "adminLastName": "Doe",
  "adminEmail": "john@acme.com",
  "adminPassword": "SecurePass123!",
  "adminPhone": "+1234567890",
  "address": {
    "street": "123 Tech Street",
    "city": "San Francisco",
    "state": "CA",
    "country": "USA",
    "postalCode": "94105"
  },
  "phone": "+1234567890",
  "website": "https://acme.com"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@acme.com",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

#### Get Profile
```http
GET /auth/profile
Authorization: Bearer <token>
```

#### Invite Employee
```http
POST /auth/invite-employee
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "jane@acme.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "recruiter",
  "department": "HR",
  "jobTitle": "Senior Recruiter",
  "phone": "+1234567891",
  "employeeId": "EMP-002"
}
```

#### Accept Invitation
```http
POST /auth/accept-invitation
Content-Type: application/json

{
  "token": "invitation-token-here",
  "password": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
```

#### Change Password
```http
POST /auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!",
  "confirmPassword": "NewPass123!"
}
```

#### Forgot Password
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "john@acme.com"
}
```

#### Reset Password
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-here",
  "password": "NewPass123!",
  "confirmPassword": "NewPass123!"
}
```

#### Refresh Token
```http
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer <token>
```

### Company Routes (`/companies`)

#### Get Company Profile
```http
GET /companies/profile
Authorization: Bearer <token>
```

#### Update Company
```http
PUT /companies/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Acme Corporation",
  "industry": "Software",
  "website": "https://acme.com",
  "settings": {
    "timezone": "America/New_York",
    "currency": "USD"
  }
}
```

#### Get Company Statistics
```http
GET /companies/stats
Authorization: Bearer <token>
```

#### Get Company Users
```http
GET /companies/users?page=1&limit=10&role=recruiter&isActive=true&search=john
Authorization: Bearer <token>
```

#### Update Subscription
```http
PUT /companies/subscription
Authorization: Bearer <token>
Content-Type: application/json

{
  "plan": "professional",
  "maxUsers": 50,
  "maxJobs": 100
}
```

### User Routes (`/users`)

#### Get Users
```http
GET /users?page=1&limit=10&role=recruiter&department=HR&search=john
Authorization: Bearer <token>
```

#### Get User by ID
```http
GET /users/60f7b3b3b3b3b3b3b3b3b3b3
Authorization: Bearer <token>
```

#### Update User
```http
PUT /users/60f7b3b3b3b3b3b3b3b3b3b3
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "department": "HR",
  "jobTitle": "Senior Recruiter"
}
```

#### Update User Role
```http
PUT /users/60f7b3b3b3b3b3b3b3b3b3b3/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "hr_manager",
  "department": "HR",
  "jobTitle": "HR Manager"
}
```

#### Search Users
```http
GET /users/search?q=john&limit=20&excludeRoles=company_admin
Authorization: Bearer <token>
```

### Employee Routes (`/employees`)

#### Get Employees
```http
GET /employees?page=1&limit=10&role=recruiter&department=HR&search=john&isActive=true&sortBy=firstName&sortOrder=asc
Authorization: Bearer <token>
```

#### Search Employees
```http
GET /employees/search?q=john&limit=20&excludeRoles=company_admin&includeInactive=false
Authorization: Bearer <token>
```

#### Get Employees by Role
```http
GET /employees/role/recruiter
Authorization: Bearer <token>
```

#### Get Employee by ID
```http
GET /employees/60f7b3b3b3b3b3b3b3b3b3b3
Authorization: Bearer <token>
```

#### Update Employee
```http
PUT /employees/60f7b3b3b3b3b3b3b3b3b3b3
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "department": "HR",
  "jobTitle": "Senior Recruiter",
  "employeeId": "EMP-001",
  "preferences": {
    "timezone": "America/New_York",
    "language": "en",
    "emailNotifications": true,
    "pushNotifications": false
  }
}
```

#### Update Employee Role
```http
PUT /employees/60f7b3b3b3b3b3b3b3b3b3b3/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "hr_manager",
  "department": "HR",
  "jobTitle": "HR Manager"
}
```

#### Activate Employee
```http
POST /employees/60f7b3b3b3b3b3b3b3b3b3b3/activate
Authorization: Bearer <token>
```

#### Deactivate Employee
```http
POST /employees/60f7b3b3b3b3b3b3b3b3b3b3/deactivate
Authorization: Bearer <token>
```

#### Delete Employee
```http
DELETE /employees/60f7b3b3b3b3b3b3b3b3b3b3
Authorization: Bearer <token>
```

#### Get Employee Activity
```http
GET /employees/60f7b3b3b3b3b3b3b3b3b3b3/activity
Authorization: Bearer <token>
```

#### Get Employee Permissions
```http
GET /employees/60f7b3b3b3b3b3b3b3b3b3b3/permissions
Authorization: Bearer <token>
```

#### Update Employee Permissions
```http
PUT /employees/60f7b3b3b3b3b3b3b3b3b3b3/permissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "permissions": {
    "jobs": {
      "create": true,
      "read": true,
      "update": true,
      "delete": false
    },
    "candidates": {
      "create": true,
      "read": true,
      "update": true,
      "delete": false
    },
    "interviews": {
      "create": true,
      "read": true,
      "update": true,
      "delete": false
    },
    "assessments": {
      "create": false,
      "read": true,
      "update": false,
      "delete": false
    },
    "employees": {
      "create": false,
      "read": true,
      "update": false,
      "delete": false
    },
    "reports": {
      "read": true
    },
    "settings": {
      "read": false,
      "update": false
    }
  }
}
```

### Job Routes (`/jobs`)

#### Create Job
```http
POST /jobs
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Senior Software Engineer",
  "department": "Engineering",
  "location": "San Francisco, CA",
  "country": "USA",
  "state": "CA",
  "city": "San Francisco",
  "salary": {
    "min": 120000,
    "max": 180000,
    "currency": "USD",
    "payRate": "annual"
  },
  "type": "fulltime",
  "hiringManager": "60f7b3b3b3b3b3b3b3b3b3b3",
  "workMode": "hybrid",
  "workExperience": "5+ years",
  "skillsRequired": ["JavaScript", "React", "Node.js", "TypeScript"],
  "preferredSkills": ["Python", "AWS", "Docker"],
  "workflowId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "jobDescription": "We are looking for a senior software engineer...",
  "requirements": "5+ years of experience in full-stack development...",
  "numberOfOpenings": 2,
  "generateWithAI": true
}
```

#### Get Jobs
```http
GET /jobs?page=1&limit=10&status=active&department=Engineering&type=fulltime&search=engineer
Authorization: Bearer <token>
```

#### Get Job by ID
```http
GET /jobs/60f7b3b3b3b3b3b3b3b3b3b3
Authorization: Bearer <token>
```

#### Update Job
```http
PUT /jobs/60f7b3b3b3b3b3b3b3b3b3b3
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Lead Software Engineer",
  "status": "active",
  "salary": {
    "min": 140000,
    "max": 200000,
    "currency": "USD",
    "payRate": "annual"
  }
}
```

#### Publish Job
```http
POST /jobs/60f7b3b3b3b3b3b3b3b3b3b3/publish
Authorization: Bearer <token>
```

#### Clone Job
```http
POST /jobs/60f7b3b3b3b3b3b3b3b3b3b3/clone
Authorization: Bearer <token>
```

#### Delete Job
```http
DELETE /jobs/60f7b3b3b3b3b3b3b3b3b3b3
Authorization: Bearer <token>
```

#### Get Job Analytics
```http
GET /jobs/60f7b3b3b3b3b3b3b3b3b3b3/analytics
Authorization: Bearer <token>
```

#### Search Jobs by Skills
```http
GET /jobs/search/skills?skills=JavaScript,React,Node.js&limit=20
Authorization: Bearer <token>
```

#### Get Job Statistics
```http
GET /jobs/stats
Authorization: Bearer <token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "details": [
    {
      "field": "fieldName",
      "message": "Field-specific error message"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Pagination Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 100,
      "itemsPerPage": 10
    }
  }
}
```

## Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `423` - Locked (Account locked)
- `429` - Too Many Requests
- `500` - Internal Server Error

## Rate Limiting
- **Window**: 15 minutes
- **Limit**: 100 requests per window per IP
- **Headers**:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time

## AI Features

### Job Description Generation
The system automatically generates SEO-optimized, inclusive job descriptions when `generateWithAI: true` is specified in job creation.

### Resume Parsing
Uploaded resumes are automatically parsed using AI to extract:
- Skills (technical, soft, certifications, languages)
- Work history with achievements
- Education background
- Career progression analysis
- Skills confidence scoring

### Candidate Matching
AI-powered candidate-to-job matching provides:
- Overall match score (0-100)
- Detailed breakdown by category
- Missing skills identification
- Risk factor analysis
- Improvement recommendations

### Email Personalization
Email templates can be personalized using AI based on:
- Candidate profile and background
- Job requirements
- Communication preferences
- Sentiment analysis

## File Upload

### Supported Formats
- **Documents**: PDF, DOC, DOCX, TXT
- **Images**: JPG, JPEG, PNG
- **Max Size**: 10MB per file

### Resume Upload
```http
POST /candidates
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "resume": <file>,
  "personalInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@email.com",
    "phone": "+1234567890",
    "location": "San Francisco, CA"
  },
  "experience": "5 years"
}
```

## Webhook Events
Configure webhooks to receive real-time notifications:

- `candidate.applied`
- `interview.scheduled`
- `interview.completed`
- `application.status_changed`
- `job.published`
- `assessment.completed`

## Security Features
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Multi-tenant data isolation
- Rate limiting and DDoS protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Helmet security headers

## Environment Variables
```env
# Database
MONGODB_URI=mongodb://localhost:27017/hire4recruit

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRE=7d
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRE=30d

# AI
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-pro

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email
EMAIL_PASS=your-password

# Server
PORT=3000
NODE_ENV=development
```

## Getting Started
1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure
4. Start development server: `npm run dev`
5. API will be available at `http://localhost:3000/api/v1`

## Support
For API support and questions, please refer to the documentation or create an issue in the repository.