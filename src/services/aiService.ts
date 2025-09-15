import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { logger } from '../config/logger';

export interface JobDescriptionRequest {
  jobTitle: string;
  department: string;
  skillsRequired: string[];
  experienceLevel: string;
  workMode: 'remote' | 'hybrid' | 'onsite';
  location?: string;
  companyName: string;
  industry?: string;
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  benefits?: string[];
  additionalRequirements?: string;
}

export interface JobDescriptionResponse {
  jobDescription: string;
  requirements: string;
  keySkills: string[];
  seoOptimized: boolean;
  inclusivityScore: number;
  readabilityScore: number;
  suggestedImprovements: string[];
}

export interface ResumeParsingRequest {
  resumeText: string;
  jobTitle?: string;
  requiredSkills?: string[];
}

export interface ResumeParsingResponse {
  personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
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
  profileSummary: string;
  skillsConfidence: {
    skill: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    confidence: number;
  }[];
  careerProgression: {
    seniorityLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
    careerGrowth: 'declining' | 'stable' | 'growing' | 'accelerating';
    industryExperience: string[];
  };
}

export interface CandidateMatchingRequest {
  jobDescription: string;
  jobSkills: string[];
  candidateProfile: ResumeParsingResponse;
  jobTitle: string;
  experienceRequired: string;
  location: string;
}

export interface CandidateMatchingResponse {
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
}

export interface EmailPersonalizationRequest {
  candidateName: string;
  candidateProfile: Partial<ResumeParsingResponse>;
  jobTitle: string;
  companyName: string;
  emailType: 'interview_invitation' | 'rejection' | 'offer' | 'follow_up' | 'assessment_invitation';
  baseTemplate: string;
  personalityInsights?: string[];
  communicationStyle?: 'professional' | 'friendly' | 'enthusiastic' | 'formal';
}

export interface EmailPersonalizationResponse {
  personalizedSubject: string;
  personalizedContent: string;
  personalizationReason: string;
  sentimentTone: 'professional' | 'friendly' | 'enthusiastic' | 'formal';
  improvementSuggestions: string[];
}

export class AIService {
  private static genAI: GoogleGenerativeAI;
  private static model: GenerativeModel;

  static initialize() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-pro'
    });

    logger.info('Gemini AI service initialized');
  }

  // Generate job description using AI
  static async generateJobDescription(request: JobDescriptionRequest): Promise<JobDescriptionResponse> {
    try {
      const prompt = `
        Generate a comprehensive, inclusive, and SEO-optimized job description for the following role:

        Job Title: ${request.jobTitle}
        Department: ${request.department}
        Company: ${request.companyName}
        Industry: ${request.industry || 'Not specified'}
        Work Mode: ${request.workMode}
        Location: ${request.location || 'Not specified'}
        Experience Level: ${request.experienceLevel}
        Required Skills: ${request.skillsRequired.join(', ')}
        ${request.salaryRange ? `Salary Range: ${request.salaryRange.currency} ${request.salaryRange.min} - ${request.salaryRange.max}` : ''}
        ${request.benefits ? `Benefits: ${request.benefits.join(', ')}` : ''}
        ${request.additionalRequirements ? `Additional Requirements: ${request.additionalRequirements}` : ''}

        Please provide:
        1. A compelling job description (2-3 paragraphs) that attracts top talent
        2. Clear requirements section with bullet points
        3. Key skills extraction with prioritization
        4. SEO optimization suggestions
        5. Inclusivity analysis and score (0-100)
        6. Readability score (0-100)
        7. Suggestions for improvement

        Format the response as JSON with the following structure:
        {
          "jobDescription": "HTML formatted job description",
          "requirements": "HTML formatted requirements",
          "keySkills": ["skill1", "skill2", ...],
          "seoOptimized": boolean,
          "inclusivityScore": number,
          "readabilityScore": number,
          "suggestedImprovements": ["improvement1", "improvement2", ...]
        }

        Make sure the language is inclusive, avoids bias, and uses clear, professional terminology.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);

      logger.info('Job description generated successfully', {
        jobTitle: request.jobTitle,
        companyName: request.companyName,
        inclusivityScore: parsedResponse.inclusivityScore,
        readabilityScore: parsedResponse.readabilityScore
      });

      return parsedResponse;

    } catch (error) {
      logger.error('Job description generation failed:', error);
      throw new Error('Failed to generate job description');
    }
  }

  // Parse resume using AI
  static async parseResume(request: ResumeParsingRequest): Promise<ResumeParsingResponse> {
    try {
      const prompt = `
        Parse the following resume text and extract structured information:

        Resume Text:
        ${request.resumeText}

        ${request.jobTitle ? `Target Job Title: ${request.jobTitle}` : ''}
        ${request.requiredSkills ? `Required Skills: ${request.requiredSkills.join(', ')}` : ''}

        Please analyze and extract:
        1. Personal information (name, email, phone, location)
        2. Technical and soft skills with confidence levels
        3. Work history with responsibilities and achievements
        4. Education background
        5. Professional summary
        6. Skills confidence assessment
        7. Career progression analysis
        8. Industry experience

        Format the response as JSON with this exact structure:
        {
          "personalInfo": {
            "name": "string or null",
            "email": "string or null",
            "phone": "string or null",
            "location": "string or null"
          },
          "skills": {
            "technical": ["skill1", "skill2", ...],
            "soft": ["skill1", "skill2", ...],
            "certifications": ["cert1", "cert2", ...],
            "languages": ["lang1", "lang2", ...]
          },
          "workHistory": [
            {
              "company": "string",
              "position": "string",
              "duration": "string",
              "responsibilities": ["resp1", "resp2", ...],
              "achievements": ["ach1", "ach2", ...]
            }
          ],
          "education": [
            {
              "institution": "string",
              "degree": "string",
              "field": "string",
              "graduationYear": number or null
            }
          ],
          "profileSummary": "string",
          "skillsConfidence": [
            {
              "skill": "string",
              "level": "beginner|intermediate|advanced|expert",
              "confidence": number (0-1)
            }
          ],
          "careerProgression": {
            "seniorityLevel": "entry|mid|senior|lead|executive",
            "careerGrowth": "declining|stable|growing|accelerating",
            "industryExperience": ["industry1", "industry2", ...]
          }
        }

        Be thorough and accurate in extraction. For confidence levels, analyze the depth of experience and context provided.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);

      logger.info('Resume parsed successfully', {
        candidateName: parsedResponse.personalInfo?.name,
        technicalSkillsCount: parsedResponse.skills?.technical?.length || 0,
        workExperienceCount: parsedResponse.workHistory?.length || 0,
        seniorityLevel: parsedResponse.careerProgression?.seniorityLevel
      });

      return parsedResponse;

    } catch (error) {
      logger.error('Resume parsing failed:', error);
      throw new Error('Failed to parse resume');
    }
  }

  // Match candidate to job using AI
  static async matchCandidateToJob(request: CandidateMatchingRequest): Promise<CandidateMatchingResponse> {
    try {
      const prompt = `
        Analyze the match between a candidate and a job opening:

        Job Information:
        Title: ${request.jobTitle}
        Description: ${request.jobDescription}
        Required Skills: ${request.jobSkills.join(', ')}
        Experience Required: ${request.experienceRequired}
        Location: ${request.location}

        Candidate Profile:
        Name: ${request.candidateProfile.personalInfo?.name || 'Not provided'}
        Location: ${request.candidateProfile.personalInfo?.location || 'Not provided'}
        Technical Skills: ${request.candidateProfile.skills?.technical?.join(', ') || 'None listed'}
        Work Experience: ${request.candidateProfile.workHistory?.map(w => `${w.position} at ${w.company} (${w.duration})`).join('; ') || 'None listed'}
        Education: ${request.candidateProfile.education?.map(e => `${e.degree} in ${e.field} from ${e.institution}`).join('; ') || 'None listed'}
        Career Level: ${request.candidateProfile.careerProgression?.seniorityLevel || 'Unknown'}

        Provide a comprehensive matching analysis with scores (0-100) for each category:
        1. Skills Match: How well technical skills align
        2. Experience Match: How relevant work experience is
        3. Education Match: How education background fits
        4. Location Match: Geographic alignment
        5. Salary Match: Expected compensation alignment
        6. Culture Fit Match: Soft skills and career progression fit

        Format response as JSON:
        {
          "overallScore": number (0-100),
          "breakdown": {
            "skillsMatch": number,
            "experienceMatch": number,
            "educationMatch": number,
            "locationMatch": number,
            "salaryMatch": number,
            "cultureFitMatch": number
          },
          "matchReasons": ["reason1", "reason2", ...],
          "missingSkills": ["skill1", "skill2", ...],
          "overqualifications": ["area1", "area2", ...],
          "riskFactors": ["risk1", "risk2", ...],
          "improvementRecommendations": ["rec1", "rec2", ...],
          "scoreConfidence": number (0-1)
        }

        Be objective and provide actionable insights.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);

      logger.info('Candidate matching completed', {
        jobTitle: request.jobTitle,
        candidateName: request.candidateProfile.personalInfo?.name,
        overallScore: parsedResponse.overallScore,
        confidence: parsedResponse.scoreConfidence
      });

      return parsedResponse;

    } catch (error) {
      logger.error('Candidate matching failed:', error);
      throw new Error('Failed to match candidate to job');
    }
  }

  // Personalize email content using AI
  static async personalizeEmail(request: EmailPersonalizationRequest): Promise<EmailPersonalizationResponse> {
    try {
      const prompt = `
        Personalize an email for a recruitment context:

        Candidate Information:
        Name: ${request.candidateName}
        Technical Skills: ${request.candidateProfile.skills?.technical?.join(', ') || 'Not specified'}
        Experience Level: ${request.candidateProfile.careerProgression?.seniorityLevel || 'Unknown'}
        Industry Background: ${request.candidateProfile.careerProgression?.industryExperience?.join(', ') || 'Unknown'}

        Email Context:
        Job Title: ${request.jobTitle}
        Company: ${request.companyName}
        Email Type: ${request.emailType}
        Desired Communication Style: ${request.communicationStyle || 'professional'}

        Base Template:
        ${request.baseTemplate}

        Instructions:
        1. Personalize the email based on the candidate's background and the specific role
        2. Maintain the specified communication style
        3. Include relevant details that show you've reviewed their profile
        4. Keep it professional but engaging
        5. Ensure the tone matches the email type

        Format response as JSON:
        {
          "personalizedSubject": "string",
          "personalizedContent": "string (HTML formatted)",
          "personalizationReason": "string explaining why these personalizations were made",
          "sentimentTone": "professional|friendly|enthusiastic|formal",
          "improvementSuggestions": ["suggestion1", "suggestion2", ...]
        }

        Make the personalization meaningful and not generic.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);

      logger.info('Email personalized successfully', {
        candidateName: request.candidateName,
        emailType: request.emailType,
        sentimentTone: parsedResponse.sentimentTone
      });

      return parsedResponse;

    } catch (error) {
      logger.error('Email personalization failed:', error);
      throw new Error('Failed to personalize email');
    }
  }

  // Generate interview questions based on job and candidate profile
  static async generateInterviewQuestions(jobTitle: string, candidateProfile: Partial<ResumeParsingResponse>, interviewType: 'technical' | 'behavioral' | 'mixed'): Promise<{
    questions: {
      question: string;
      type: 'technical' | 'behavioral' | 'situational';
      difficulty: 'easy' | 'medium' | 'hard';
      expectedAnswer?: string;
      evaluationCriteria: string[];
    }[];
    suggestedDuration: number;
    preparationNotes: string[];
  }> {
    try {
      const prompt = `
        Generate interview questions for:

        Job Title: ${jobTitle}
        Interview Type: ${interviewType}

        Candidate Background:
        Technical Skills: ${candidateProfile.skills?.technical?.join(', ') || 'Unknown'}
        Experience Level: ${candidateProfile.careerProgression?.seniorityLevel || 'Unknown'}
        Work History: ${candidateProfile.workHistory?.map(w => `${w.position} at ${w.company}`).join('; ') || 'Unknown'}

        Generate 8-12 relevant questions with:
        1. Mix of technical and behavioral questions based on interview type
        2. Appropriate difficulty level for the candidate's experience
        3. Evaluation criteria for each question
        4. Suggested interview duration
        5. Preparation notes for the interviewer

        Format as JSON:
        {
          "questions": [
            {
              "question": "string",
              "type": "technical|behavioral|situational",
              "difficulty": "easy|medium|hard",
              "expectedAnswer": "string (optional)",
              "evaluationCriteria": ["criteria1", "criteria2", ...]
            }
          ],
          "suggestedDuration": number (minutes),
          "preparationNotes": ["note1", "note2", ...]
        }
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }

      return JSON.parse(jsonMatch[0]);

    } catch (error) {
      logger.error('Interview question generation failed:', error);
      throw new Error('Failed to generate interview questions');
    }
  }

  // Health check for AI service
  static async healthCheck(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('Respond with "OK" if you are working properly.');
      const response = await result.response;
      const text = response.text();

      return text.toLowerCase().includes('ok');
    } catch (error) {
      logger.error('AI service health check failed:', error);
      return false;
    }
  }
}

// Initialize AI service when module is loaded
try {
  AIService.initialize();
} catch (error) {
  logger.error('Failed to initialize AI service:', error);
}