/**
 * @swagger
 * components:
 *   schemas:
 *     # Core Entity Schemas
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - firstName
 *         - lastName
 *         - role
 *       properties:
 *         id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *           description: "Unique user identifier"
 *         email:
 *           type: string
 *           format: email
 *           example: "john.doe@company.com"
 *           description: "User's email address"
 *         firstName:
 *           type: string
 *           example: "John"
 *           minLength: 1
 *           maxLength: 50
 *         lastName:
 *           type: string
 *           example: "Doe"
 *           minLength: 1
 *           maxLength: 50
 *         role:
 *           type: string
 *           enum:
 *             - company_admin
 *             - hr_manager
 *             - recruiter
 *             - hiring_manager
 *             - interviewer
 *           example: "hr_manager"
 *           description: "User's role in the system"
 *         status:
 *           type: string
 *           enum: [active, inactive, pending]
 *           default: pending
 *           example: "active"
 *         companyId:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *           description: "Associated company ID"
 *         permissions:
 *           type: array
 *           items:
 *             type: string
 *           example: ["users.read", "jobs.create", "candidates.update"]
 *         profile:
 *           type: object
 *           properties:
 *             avatar:
 *               type: string
 *               format: uri
 *               example: "https://example.com/avatar.jpg"
 *             phoneNumber:
 *               type: string
 *               example: "+1234567890"
 *             timezone:
 *               type: string
 *               example: "America/New_York"
 *             language:
 *               type: string
 *               example: "en"
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           example: "2023-12-01T10:00:00Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2023-11-01T10:00:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2023-12-01T10:00:00Z"
 *
 *     Company:
 *       type: object
 *       required:
 *         - name
 *         - domain
 *       properties:
 *         id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         name:
 *           type: string
 *           example: "TechCorp Inc."
 *           minLength: 1
 *           maxLength: 100
 *         domain:
 *           type: string
 *           example: "techcorp.com"
 *           pattern: "^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\\.[a-zA-Z]{2,}$"
 *         industry:
 *           type: string
 *           example: "Technology"
 *           maxLength: 50
 *         size:
 *           type: string
 *           enum: [startup, small, medium, large, enterprise]
 *           example: "medium"
 *         description:
 *           type: string
 *           example: "Leading technology company focused on AI solutions"
 *           maxLength: 1000
 *         website:
 *           type: string
 *           format: uri
 *           example: "https://techcorp.com"
 *         logo:
 *           type: string
 *           format: uri
 *           example: "https://techcorp.com/logo.png"
 *         location:
 *           type: object
 *           properties:
 *             address:
 *               type: string
 *               example: "123 Tech Street"
 *             city:
 *               type: string
 *               example: "San Francisco"
 *             state:
 *               type: string
 *               example: "CA"
 *             country:
 *               type: string
 *               example: "USA"
 *             zipCode:
 *               type: string
 *               example: "94105"
 *         contact:
 *           type: object
 *           properties:
 *             phone:
 *               type: string
 *               example: "+1-555-123-4567"
 *             email:
 *               type: string
 *               format: email
 *               example: "contact@techcorp.com"
 *         settings:
 *           type: object
 *           properties:
 *             timeZone:
 *               type: string
 *               example: "America/Los_Angeles"
 *             workingHours:
 *               type: object
 *               properties:
 *                 start:
 *                   type: string
 *                   example: "09:00"
 *                 end:
 *                   type: string
 *                   example: "18:00"
 *             currency:
 *               type: string
 *               example: "USD"
 *         subscription:
 *           type: object
 *           properties:
 *             plan:
 *               type: string
 *               enum: [trial, starter, professional, enterprise]
 *               example: "professional"
 *             limits:
 *               type: object
 *               properties:
 *                 users:
 *                   type: integer
 *                   example: 50
 *                 jobs:
 *                   type: integer
 *                   example: 100
 *                 candidates:
 *                   type: integer
 *                   example: 1000
 *         status:
 *           type: string
 *           enum: [active, inactive, trial, suspended]
 *           default: trial
 *           example: "active"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Job:
 *       type: object
 *       required:
 *         - title
 *         - department
 *         - location
 *         - country
 *         - state
 *         - city
 *         - salary
 *         - type
 *         - hiringManager
 *         - workMode
 *         - workExperience
 *         - skillsRequired
 *         - workflowId
 *       properties:
 *         id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         jobId:
 *           type: string
 *           example: "JOB-1640995200000-A1B2C3D4"
 *           description: "Unique job identifier"
 *         title:
 *           type: string
 *           example: "Senior Software Engineer"
 *           minLength: 1
 *           maxLength: 100
 *         department:
 *           type: string
 *           example: "Engineering"
 *           maxLength: 50
 *         location:
 *           type: string
 *           example: "San Francisco, CA, USA"
 *         country:
 *           type: string
 *           example: "USA"
 *         state:
 *           type: string
 *           example: "CA"
 *         city:
 *           type: string
 *           example: "San Francisco"
 *         salary:
 *           type: object
 *           required:
 *             - min
 *             - max
 *             - currency
 *             - payRate
 *           properties:
 *             min:
 *               type: number
 *               example: 100000
 *             max:
 *               type: number
 *               example: 150000
 *             currency:
 *               type: string
 *               example: "USD"
 *             payRate:
 *               type: string
 *               enum: [hourly, daily, annual]
 *               example: "annual"
 *         type:
 *           type: string
 *           enum: [fulltime, parttime, contract, internship]
 *           example: "fulltime"
 *         hiringManager:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *           description: "User ID of the hiring manager"
 *         targetClosingDate:
 *           type: string
 *           format: date-time
 *           example: "2024-03-01T23:59:59Z"
 *         clientName:
 *           type: string
 *           example: "TechCorp Inc."
 *         accountManager:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         contactPerson:
 *           type: string
 *           example: "Jane Smith"
 *         workMode:
 *           type: string
 *           enum: [remote, hybrid, onsite]
 *           example: "hybrid"
 *         workExperience:
 *           type: string
 *           example: "5+ years"
 *         educationRequirement:
 *           type: string
 *           example: "Bachelor's degree in Computer Science or related field"
 *         skillsRequired:
 *           type: array
 *           items:
 *             type: string
 *           example: ["JavaScript", "Node.js", "React", "MongoDB"]
 *         preferredSkills:
 *           type: array
 *           items:
 *             type: string
 *           example: ["TypeScript", "AWS", "Docker"]
 *         benefits:
 *           type: string
 *           example: "Health insurance, 401k, flexible PTO, remote work"
 *         employmentType:
 *           type: string
 *           example: "Full-time"
 *         workflowId:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *           description: "Associated workflow ID"
 *         jobSummary:
 *           type: string
 *           example: "We are seeking a Senior Software Engineer to join our team"
 *           maxLength: 1000
 *         jobDescription:
 *           type: string
 *           example: "Join our engineering team to build next-generation AI products"
 *           maxLength: 5000
 *         requirements:
 *           type: string
 *           example: "5+ years of software development experience. Proficiency in JavaScript, Node.js, React"
 *           maxLength: 3000
 *         expectedRevenue:
 *           type: number
 *           example: 25000
 *         probabilityOfClosure:
 *           type: string
 *           example: "high"
 *         numberOfOpenings:
 *           type: number
 *           example: 2
 *           minimum: 1
 *         notes:
 *           type: string
 *           example: "Urgent requirement for Q1 project"
 *         tags:
 *           type: string
 *           example: "urgent,remote,senior"
 *         customFields:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               fieldName:
 *                 type: string
 *                 example: "Project Code"
 *               fieldType:
 *                 type: string
 *                 enum: [text, number, date, select, multiselect]
 *                 example: "text"
 *               fieldValue:
 *                 type: string
 *                 example: "PROJ-2024-001"
 *               isRequired:
 *                 type: boolean
 *                 example: false
 *         templateUsed:
 *           type: string
 *           example: "software-engineer-template"
 *         generateWithAI:
 *           type: boolean
 *           example: true
 *         status:
 *           type: string
 *           enum: [active, draft, closed, onhold]
 *           default: draft
 *           example: "active"
 *         aiGenerated:
 *           type: object
 *           properties:
 *             jobDescriptionGenerated:
 *               type: boolean
 *               example: true
 *             requirementsGenerated:
 *               type: boolean
 *               example: true
 *             summaryGenerated:
 *               type: boolean
 *               example: false
 *         companyId:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         createdBy:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     CreateJobRequest:
 *       type: object
 *       required:
 *         - title
 *         - department
 *         - location
 *         - country
 *         - state
 *         - city
 *         - salary
 *         - type
 *         - hiringManager
 *         - workMode
 *         - workExperience
 *         - skillsRequired
 *         - workflowId
 *       properties:
 *         title:
 *           type: string
 *           example: "Senior Software Engineer"
 *           minLength: 1
 *           maxLength: 100
 *         department:
 *           type: string
 *           example: "Engineering"
 *           maxLength: 50
 *         location:
 *           type: string
 *           example: "San Francisco, CA, USA"
 *         country:
 *           type: string
 *           example: "USA"
 *         state:
 *           type: string
 *           example: "CA"
 *         city:
 *           type: string
 *           example: "San Francisco"
 *         salary:
 *           type: object
 *           required:
 *             - min
 *             - max
 *             - currency
 *             - payRate
 *           properties:
 *             min:
 *               type: number
 *               example: 100000
 *             max:
 *               type: number
 *               example: 150000
 *             currency:
 *               type: string
 *               example: "USD"
 *             payRate:
 *               type: string
 *               enum: [hourly, daily, annual]
 *               example: "annual"
 *         type:
 *           type: string
 *           enum: [fulltime, parttime, contract, internship]
 *           example: "fulltime"
 *         hiringManager:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *           description: "User ID of the hiring manager"
 *         targetClosingDate:
 *           type: string
 *           format: date-time
 *           example: "2024-03-01T23:59:59Z"
 *         clientName:
 *           type: string
 *           example: "TechCorp Inc."
 *         accountManager:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         contactPerson:
 *           type: string
 *           example: "Jane Smith"
 *         workMode:
 *           type: string
 *           enum: [remote, hybrid, onsite]
 *           example: "hybrid"
 *         workExperience:
 *           type: string
 *           example: "5+ years"
 *         educationRequirement:
 *           type: string
 *           example: "Bachelor's degree in Computer Science or related field"
 *         skillsRequired:
 *           type: array
 *           items:
 *             type: string
 *           example: ["JavaScript", "Node.js", "React", "MongoDB"]
 *         preferredSkills:
 *           type: array
 *           items:
 *             type: string
 *           example: ["TypeScript", "AWS", "Docker"]
 *         benefits:
 *           type: string
 *           example: "Health insurance, 401k, flexible PTO, remote work"
 *         employmentType:
 *           type: string
 *           example: "Full-time"
 *         workflowId:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *           description: "Associated workflow ID"
 *         jobSummary:
 *           type: string
 *           example: "We are seeking a Senior Software Engineer to join our team"
 *           maxLength: 1000
 *         jobDescription:
 *           type: string
 *           example: "Join our engineering team to build next-generation AI products"
 *           maxLength: 5000
 *         requirements:
 *           type: string
 *           example: "5+ years of software development experience. Proficiency in JavaScript, Node.js, React"
 *           maxLength: 3000
 *         expectedRevenue:
 *           type: number
 *           example: 25000
 *         probabilityOfClosure:
 *           type: string
 *           example: "high"
 *         numberOfOpenings:
 *           type: number
 *           example: 2
 *           minimum: 1
 *         notes:
 *           type: string
 *           example: "Urgent requirement for Q1 project"
 *         tags:
 *           type: string
 *           example: "urgent,remote,senior"
 *         customFields:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               fieldName:
 *                 type: string
 *                 example: "Project Code"
 *               fieldType:
 *                 type: string
 *                 enum: [text, number, date, select, multiselect]
 *                 example: "text"
 *               fieldValue:
 *                 type: string
 *                 example: "PROJ-2024-001"
 *               isRequired:
 *                 type: boolean
 *                 example: false
 *         templateUsed:
 *           type: string
 *           example: "software-engineer-template"
 *         generateWithAI:
 *           type: boolean
 *           example: true
 *
 *     UpdateJobRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           example: "Senior Software Engineer"
 *           minLength: 1
 *           maxLength: 100
 *         department:
 *           type: string
 *           example: "Engineering"
 *           maxLength: 50
 *         location:
 *           type: string
 *           example: "San Francisco, CA, USA"
 *         country:
 *           type: string
 *           example: "USA"
 *         state:
 *           type: string
 *           example: "CA"
 *         city:
 *           type: string
 *           example: "San Francisco"
 *         salary:
 *           type: object
 *           properties:
 *             min:
 *               type: number
 *               example: 100000
 *             max:
 *               type: number
 *               example: 150000
 *             currency:
 *               type: string
 *               example: "USD"
 *             payRate:
 *               type: string
 *               enum: [hourly, daily, annual]
 *               example: "annual"
 *         type:
 *           type: string
 *           enum: [fulltime, parttime, contract, internship]
 *           example: "fulltime"
 *         hiringManager:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *           description: "User ID of the hiring manager"
 *         targetClosingDate:
 *           type: string
 *           format: date-time
 *           example: "2024-03-01T23:59:59Z"
 *         clientName:
 *           type: string
 *           example: "TechCorp Inc."
 *         accountManager:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         contactPerson:
 *           type: string
 *           example: "Jane Smith"
 *         workMode:
 *           type: string
 *           enum: [remote, hybrid, onsite]
 *           example: "hybrid"
 *         workExperience:
 *           type: string
 *           example: "5+ years"
 *         educationRequirement:
 *           type: string
 *           example: "Bachelor's degree in Computer Science or related field"
 *         skillsRequired:
 *           type: array
 *           items:
 *             type: string
 *           example: ["JavaScript", "Node.js", "React", "MongoDB"]
 *         preferredSkills:
 *           type: array
 *           items:
 *             type: string
 *           example: ["TypeScript", "AWS", "Docker"]
 *         benefits:
 *           type: string
 *           example: "Health insurance, 401k, flexible PTO, remote work"
 *         employmentType:
 *           type: string
 *           example: "Full-time"
 *         workflowId:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *           description: "Associated workflow ID"
 *         jobSummary:
 *           type: string
 *           example: "We are seeking a Senior Software Engineer to join our team"
 *           maxLength: 1000
 *         jobDescription:
 *           type: string
 *           example: "Join our engineering team to build next-generation AI products"
 *           maxLength: 5000
 *         requirements:
 *           type: string
 *           example: "5+ years of software development experience. Proficiency in JavaScript, Node.js, React"
 *           maxLength: 3000
 *         expectedRevenue:
 *           type: number
 *           example: 25000
 *         probabilityOfClosure:
 *           type: string
 *           example: "high"
 *         numberOfOpenings:
 *           type: number
 *           example: 2
 *           minimum: 1
 *         notes:
 *           type: string
 *           example: "Urgent requirement for Q1 project"
 *         tags:
 *           type: string
 *           example: "urgent,remote,senior"
 *         customFields:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               fieldName:
 *                 type: string
 *                 example: "Project Code"
 *               fieldType:
 *                 type: string
 *                 enum: [text, number, date, select, multiselect]
 *                 example: "text"
 *               fieldValue:
 *                 type: string
 *                 example: "PROJ-2024-001"
 *               isRequired:
 *                 type: boolean
 *                 example: false
 *         templateUsed:
 *           type: string
 *           example: "software-engineer-template"
 *         generateWithAI:
 *           type: boolean
 *           example: true
 *         status:
 *           type: string
 *           enum: [active, draft, closed, onhold]
 *           example: "active"
 *
 *     Candidate:
 *       type: object
 *       required:
 *         - personalInfo
 *       properties:
 *         id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         personalInfo:
 *           type: object
 *           required:
 *             - firstName
 *             - lastName
 *             - email
 *           properties:
 *             firstName:
 *               type: string
 *               example: "Jane"
 *               minLength: 1
 *               maxLength: 50
 *             lastName:
 *               type: string
 *               example: "Smith"
 *               minLength: 1
 *               maxLength: 50
 *             email:
 *               type: string
 *               format: email
 *               example: "jane.smith@example.com"
 *             phone:
 *               type: string
 *               example: "+1234567890"
 *             location:
 *               type: object
 *               properties:
 *                 city:
 *                   type: string
 *                   example: "New York"
 *                 state:
 *                   type: string
 *                   example: "NY"
 *                 country:
 *                   type: string
 *                   example: "USA"
 *             dateOfBirth:
 *               type: string
 *               format: date
 *               example: "1990-05-15"
 *             nationality:
 *               type: string
 *               example: "American"
 *         experience:
 *           type: object
 *           properties:
 *             totalYears:
 *               type: number
 *               example: 5.5
 *             currentPosition:
 *               type: string
 *               example: "Senior Software Engineer"
 *             currentCompany:
 *               type: string
 *               example: "TechStart Inc."
 *             workHistory:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   company:
 *                     type: string
 *                   position:
 *                     type: string
 *                   startDate:
 *                     type: string
 *                     format: date
 *                   endDate:
 *                     type: string
 *                     format: date
 *                   isCurrent:
 *                     type: boolean
 *                   description:
 *                     type: string
 *         education:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               institution:
 *                 type: string
 *                 example: "University of Technology"
 *               degree:
 *                 type: string
 *                 example: "Bachelor of Science"
 *               fieldOfStudy:
 *                 type: string
 *                 example: "Computer Science"
 *               graduationYear:
 *                 type: integer
 *                 example: 2018
 *               gpa:
 *                 type: number
 *                 example: 3.8
 *         skills:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               level:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced, expert]
 *               yearsOfExperience:
 *                 type: number
 *               verified:
 *                 type: boolean
 *         languages:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               language:
 *                 type: string
 *                 example: "English"
 *               proficiency:
 *                 type: string
 *                 enum: [basic, conversational, fluent, native]
 *                 example: "fluent"
 *         resumeUrl:
 *           type: string
 *           format: uri
 *           example: "https://storage.example.com/resumes/candidate-123.pdf"
 *         portfolioUrl:
 *           type: string
 *           format: uri
 *           example: "https://janesmith.dev"
 *         linkedInUrl:
 *           type: string
 *           format: uri
 *           example: "https://linkedin.com/in/janesmith"
 *         githubUrl:
 *           type: string
 *           format: uri
 *           example: "https://github.com/janesmith"
 *         expectedSalary:
 *           type: object
 *           properties:
 *             min:
 *               type: number
 *               example: 90000
 *             max:
 *               type: number
 *               example: 120000
 *             currency:
 *               type: string
 *               example: "USD"
 *         preferences:
 *           type: object
 *           properties:
 *             workMode:
 *               type: array
 *               items:
 *                 type: string
 *                 enum: [remote, onsite, hybrid]
 *               example: ["remote", "hybrid"]
 *             jobTypes:
 *               type: array
 *               items:
 *                 type: string
 *                 enum: [full-time, part-time, contract, freelance]
 *               example: ["full-time"]
 *             locations:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["New York, NY", "Remote"]
 *             industries:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["Technology", "Finance"]
 *         applications:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               jobId:
 *                 type: string
 *               applicationId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [applied, screening, interview, assessment, offer, hired, rejected, withdrawn]
 *               appliedAt:
 *                 type: string
 *                 format: date-time
 *               lastStatusChange:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *         aiAnalysis:
 *           type: object
 *           properties:
 *             matchScore:
 *               type: number
 *               minimum: 0
 *               maximum: 100
 *               example: 85.5
 *             strengths:
 *               type: array
 *               items:
 *                 type: string
 *             weaknesses:
 *               type: array
 *               items:
 *                 type: string
 *             recommendations:
 *               type: array
 *               items:
 *                 type: string
 *         status:
 *           type: string
 *           enum: [active, inactive, blacklisted]
 *           default: active
 *         companyId:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         createdBy:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Interview:
 *       type: object
 *       required:
 *         - candidateId
 *         - jobId
 *         - type
 *         - scheduledAt
 *       properties:
 *         id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         candidateId:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         jobId:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         applicationId:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         interviewers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [primary, secondary, observer]
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *         type:
 *           type: string
 *           enum: [phone, video, onsite, technical, behavioral, panel]
 *           example: "video"
 *         round:
 *           type: integer
 *           minimum: 1
 *           example: 1
 *         status:
 *           type: string
 *           enum: [scheduled, in-progress, completed, cancelled, no-show]
 *           default: scheduled
 *           example: "scheduled"
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *           example: "2024-02-15T10:00:00Z"
 *         duration:
 *           type: integer
 *           description: "Duration in minutes"
 *           example: 60
 *         actualStartTime:
 *           type: string
 *           format: date-time
 *         actualEndTime:
 *           type: string
 *           format: date-time
 *         location:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [onsite, video, phone]
 *             address:
 *               type: string
 *             meetingLink:
 *               type: string
 *               format: uri
 *             dialIn:
 *               type: object
 *               properties:
 *                 number:
 *                   type: string
 *                 accessCode:
 *                   type: string
 *         agenda:
 *           type: string
 *           example: "Technical discussion, code review, Q&A"
 *         notes:
 *           type: object
 *           properties:
 *             interviewerNotes:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   interviewerId:
 *                     type: string
 *                   notes:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *             candidateNotes:
 *               type: string
 *         feedback:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               interviewerId:
 *                 type: string
 *               overallRating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               technicalSkills:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               communication:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               culturalFit:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               strengths:
 *                 type: array
 *                 items:
 *                   type: string
 *               weaknesses:
 *                 type: array
 *                 items:
 *                   type: string
 *               comments:
 *                 type: string
 *               recommendation:
 *                 type: string
 *                 enum: [strong-hire, hire, no-hire, strong-no-hire]
 *               submittedAt:
 *                 type: string
 *                 format: date-time
 *         recordings:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *               type:
 *                 type: string
 *                 enum: [video, audio]
 *               duration:
 *                 type: integer
 *         companyId:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         createdBy:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Assessment:
 *       type: object
 *       required:
 *         - title
 *         - type
 *       properties:
 *         id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         title:
 *           type: string
 *           example: "JavaScript Programming Assessment"
 *           minLength: 1
 *           maxLength: 200
 *         description:
 *           type: string
 *           example: "Comprehensive assessment covering JavaScript fundamentals and advanced concepts"
 *           maxLength: 1000
 *         type:
 *           type: string
 *           enum: [technical, behavioral, cognitive, personality, custom]
 *           example: "technical"
 *         category:
 *           type: string
 *           example: "Programming"
 *         difficulty:
 *           type: string
 *           enum: [beginner, intermediate, advanced, expert]
 *           example: "intermediate"
 *         estimatedDuration:
 *           type: integer
 *           description: "Estimated duration in minutes"
 *           example: 90
 *         passingScore:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           example: 70
 *         questions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [multiple-choice, single-choice, true-false, coding, essay, file-upload]
 *               question:
 *                 type: string
 *               description:
 *                 type: string
 *               points:
 *                 type: number
 *               timeLimit:
 *                 type: integer
 *                 description: "Time limit in seconds"
 *               required:
 *                 type: boolean
 *               options:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     text:
 *                       type: string
 *                     isCorrect:
 *                       type: boolean
 *               correctAnswers:
 *                 type: array
 *                 items:
 *                   type: string
 *               codingConstraints:
 *                 type: object
 *                 properties:
 *                   language:
 *                     type: string
 *                   template:
 *                     type: string
 *                   testCases:
 *                     type: array
 *                     items:
 *                       type: object
 *         instructions:
 *           type: string
 *           example: "Complete all questions to the best of your ability. You have 90 minutes."
 *         settings:
 *           type: object
 *           properties:
 *             randomizeQuestions:
 *               type: boolean
 *               default: false
 *             allowBackward:
 *               type: boolean
 *               default: true
 *             showResults:
 *               type: boolean
 *               default: false
 *             preventCheating:
 *               type: object
 *               properties:
 *                 blockCopyPaste:
 *                   type: boolean
 *                 fullScreen:
 *                   type: boolean
 *                 proctoring:
 *                   type: boolean
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["javascript", "programming", "frontend"]
 *         status:
 *           type: string
 *           enum: [draft, published, archived]
 *           default: draft
 *         companyId:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         createdBy:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     # Request/Response Schemas
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "user@company.com"
 *         password:
 *           type: string
 *           format: password
 *           example: "securepassword123"
 *         rememberMe:
 *           type: boolean
 *           default: false
 *
 *     RegisterCompanyRequest:
 *       type: object
 *       required:
 *         - companyName
 *         - adminEmail
 *         - adminPassword
 *         - adminFirstName
 *         - adminLastName
 *       properties:
 *         companyName:
 *           type: string
 *           example: "TechCorp Inc."
 *           minLength: 1
 *           maxLength: 100
 *         companyDomain:
 *           type: string
 *           example: "techcorp.com"
 *         industry:
 *           type: string
 *           example: "Technology"
 *         adminEmail:
 *           type: string
 *           format: email
 *           example: "admin@techcorp.com"
 *         adminPassword:
 *           type: string
 *           format: password
 *           minLength: 8
 *         adminFirstName:
 *           type: string
 *           example: "John"
 *         adminLastName:
 *           type: string
 *           example: "Doe"
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Authentication successful"
 *         data:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             refreshToken:
 *               type: string
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             user:
 *               $ref: '#/components/schemas/User'
 *             expiresIn:
 *               type: integer
 *               example: 3600
 *               description: "Token expiration time in seconds"
 *
 *     PaginatedList:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             items:
 *               type: array
 *               items:
 *                 type: object
 *             pagination:
 *               $ref: '#/components/schemas/PaginationMeta'
 *
 *     AnalyticsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             analytics:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalCount:
 *                       type: integer
 *                     activeCount:
 *                       type: integer
 *                     growthRate:
 *                       type: number
 *                 trends:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       period:
 *                         type: string
 *                       value:
 *                         type: number
 *                       change:
 *                         type: number
 *                 metrics:
 *                   type: object
 *             generatedAt:
 *               type: string
 *               format: date-time
 *
 *     SearchRequest:
 *       type: object
 *       required:
 *         - query
 *       properties:
 *         query:
 *           type: string
 *           example: "Senior JavaScript Developer"
 *           minLength: 1
 *           maxLength: 500
 *         filters:
 *           type: object
 *           properties:
 *             location:
 *               type: array
 *               items:
 *                 type: string
 *             skills:
 *               type: array
 *               items:
 *                 type: string
 *             experience:
 *               type: object
 *               properties:
 *                 min:
 *                   type: number
 *                 max:
 *                   type: number
 *             salary:
 *               type: object
 *               properties:
 *                 min:
 *                   type: number
 *                 max:
 *                   type: number
 *                 currency:
 *                   type: string
 *         sort:
 *           type: object
 *           properties:
 *             field:
 *               type: string
 *               example: "relevance"
 *             order:
 *               type: string
 *               enum: [asc, desc]
 *               example: "desc"
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *               minimum: 1
 *               default: 1
 *             limit:
 *               type: integer
 *               minimum: 1
 *               maximum: 100
 *               default: 10
 *
 *     SearchResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             results:
 *               type: array
 *               items:
 *                 type: object
 *             searchMeta:
 *               type: object
 *               properties:
 *                 totalResults:
 *                   type: integer
 *                 searchTime:
 *                   type: number
 *                   description: "Search time in milliseconds"
 *                 query:
 *                   type: string
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: string
 *             pagination:
 *               $ref: '#/components/schemas/PaginationMeta'
 */

export {};