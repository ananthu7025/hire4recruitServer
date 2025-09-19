import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { logger } from '../config/logger';
import { AIService } from './aiService';

export interface EmailTemplate {
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
}

export interface EmailData {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }[];
}

export interface PersonalizedEmailRequest {
  templateName: string;
  recipientEmail: string;
  recipientName: string;
  variables: Record<string, any>;
  candidateProfile?: any;
  jobTitle?: string;
  companyName?: string;
  useAIPersonalization?: boolean;
}

export class EmailService {
  private static transporter: Transporter;
  private static templates: Map<string, EmailTemplate> = new Map();

  static initialize() {
    try {
      // Initialize nodemailer transporter
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Load default email templates
      this.loadDefaultTemplates();

      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      throw error;
    }
  }

  // Load default email templates
  private static loadDefaultTemplates() {
    const defaultTemplates: EmailTemplate[] = [
      {
        name: 'interview_invitation',
        subject: 'Interview Invitation - {{jobTitle}} at {{companyName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h2 style="color: #333; margin-bottom: 20px;">Interview Invitation</h2>

              <p>Dear {{candidateName}},</p>

              <p>We are pleased to invite you for an interview for the <strong>{{jobTitle}}</strong> position at {{companyName}}.</p>

              <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #0066cc; margin-top: 0;">Interview Details:</h3>
                <ul style="list-style: none; padding: 0;">
                  <li><strong>Date:</strong> {{interviewDate}}</li>
                  <li><strong>Time:</strong> {{interviewTime}}</li>
                  <li><strong>Duration:</strong> {{duration}} minutes</li>
                  <li><strong>Type:</strong> {{interviewType}}</li>
                  {{#if location}}<li><strong>Location:</strong> {{location}}</li>{{/if}}
                  {{#if meetingLink}}<li><strong>Meeting Link:</strong> <a href="{{meetingLink}}">{{meetingLink}}</a></li>{{/if}}
                </ul>
              </div>

              <p>Please confirm your availability by replying to this email.</p>

              <p>We look forward to meeting you!</p>

              <p>Best regards,<br>
              {{recruiterName}}<br>
              {{companyName}} Hiring Team</p>
            </div>
          </div>
        `,
        variables: ['candidateName', 'jobTitle', 'companyName', 'interviewDate', 'interviewTime', 'duration', 'interviewType', 'location', 'meetingLink', 'recruiterName']
      },
      {
        name: 'application_received',
        subject: 'Application Received - {{jobTitle}} at {{companyName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h2 style="color: #333; margin-bottom: 20px;">Application Received</h2>

              <p>Dear {{candidateName}},</p>

              <p>Thank you for your interest in the <strong>{{jobTitle}}</strong> position at {{companyName}}.</p>

              <p>We have successfully received your application and will review it carefully. Our hiring team will be in touch within {{expectedResponseTime}} if your qualifications match our requirements.</p>

              <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #0066cc; margin-top: 0;">What's Next?</h3>
                <ul>
                  <li>Our team will review your application</li>
                  <li>If selected, you'll hear from us within {{expectedResponseTime}}</li>
                  <li>Keep an eye on your email for updates</li>
                </ul>
              </div>

              <p>We appreciate your interest in joining our team!</p>

              <p>Best regards,<br>
              {{companyName}} Hiring Team</p>
            </div>
          </div>
        `,
        variables: ['candidateName', 'jobTitle', 'companyName', 'expectedResponseTime']
      },
      {
        name: 'assessment_invitation',
        subject: 'Assessment Invitation - {{jobTitle}} at {{companyName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h2 style="color: #333; margin-bottom: 20px;">Assessment Invitation</h2>

              <p>Dear {{candidateName}},</p>

              <p>Congratulations! We would like to invite you to complete an assessment for the <strong>{{jobTitle}}</strong> position at {{companyName}}.</p>

              <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #0066cc; margin-top: 0;">Assessment Details:</h3>
                <ul style="list-style: none; padding: 0;">
                  <li><strong>Assessment Type:</strong> {{assessmentType}}</li>
                  <li><strong>Estimated Duration:</strong> {{duration}} minutes</li>
                  <li><strong>Deadline:</strong> {{deadline}}</li>
                </ul>

                <div style="text-align: center; margin: 20px 0;">
                  <a href="{{assessmentLink}}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Start Assessment</a>
                </div>
              </div>

              <p><strong>Important:</strong> Please complete the assessment by {{deadline}}. The assessment can only be taken once.</p>

              <p>Good luck!</p>

              <p>Best regards,<br>
              {{recruiterName}}<br>
              {{companyName}} Hiring Team</p>
            </div>
          </div>
        `,
        variables: ['candidateName', 'jobTitle', 'companyName', 'assessmentType', 'duration', 'deadline', 'assessmentLink', 'recruiterName']
      },
      {
        name: 'rejection',
        subject: 'Update on Your Application - {{jobTitle}} at {{companyName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h2 style="color: #333; margin-bottom: 20px;">Application Update</h2>

              <p>Dear {{candidateName}},</p>

              <p>Thank you for your interest in the <strong>{{jobTitle}}</strong> position at {{companyName}} and for the time you invested in our hiring process.</p>

              <p>After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current needs.</p>

              <p>We were impressed by your background and encourage you to apply for future opportunities that match your skills and interests.</p>

              <p>We wish you the best in your job search.</p>

              <p>Best regards,<br>
              {{recruiterName}}<br>
              {{companyName}} Hiring Team</p>
            </div>
          </div>
        `,
        variables: ['candidateName', 'jobTitle', 'companyName', 'recruiterName']
      },
      {
        name: 'offer_letter',
        subject: 'Job Offer - {{jobTitle}} at {{companyName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h2 style="color: #333; margin-bottom: 20px;">Congratulations! Job Offer</h2>

              <p>Dear {{candidateName}},</p>

              <p>We are delighted to offer you the position of <strong>{{jobTitle}}</strong> at {{companyName}}!</p>

              <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #0066cc; margin-top: 0;">Offer Details:</h3>
                <ul style="list-style: none; padding: 0;">
                  <li><strong>Position:</strong> {{jobTitle}}</li>
                  <li><strong>Department:</strong> {{department}}</li>
                  <li><strong>Start Date:</strong> {{startDate}}</li>
                  <li><strong>Salary:</strong> {{salary}}</li>
                  <li><strong>Benefits:</strong> {{benefits}}</li>
                  <li><strong>Work Mode:</strong> {{workMode}}</li>
                </ul>
              </div>

              <p>Please review the attached offer letter for complete details. We would appreciate your response by {{responseDeadline}}.</p>

              <p>We are excited about the possibility of you joining our team!</p>

              <p>Best regards,<br>
              {{recruiterName}}<br>
              {{companyName}} Hiring Team</p>
            </div>
          </div>
        `,
        variables: ['candidateName', 'jobTitle', 'companyName', 'department', 'startDate', 'salary', 'benefits', 'workMode', 'responseDeadline', 'recruiterName']
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.name, template);
    });

    logger.info(`Loaded ${defaultTemplates.length} default email templates`);
  }

  // Send basic email
  static async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      const mailOptions: SendMailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Hire4Recruit'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        attachments: emailData.attachments
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        messageId: result.messageId,
        to: emailData.to,
        subject: emailData.subject
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: emailData.to,
        subject: emailData.subject
      });
      return false;
    }
  }

  // Send personalized email using template
  static async sendPersonalizedEmail(request: PersonalizedEmailRequest): Promise<boolean> {
    try {
      const template = this.templates.get(request.templateName);
      if (!template) {
        throw new Error(`Email template '${request.templateName}' not found`);
      }

      let subject = template.subject;
      let htmlContent = template.htmlContent;

      // Replace template variables
      Object.entries(request.variables).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(placeholder, String(value));
        htmlContent = htmlContent.replace(placeholder, String(value));
      });

      // Use AI personalization if requested and candidate profile is available
      if (request.useAIPersonalization && request.candidateProfile && request.jobTitle && request.companyName) {
        try {
          const aiPersonalization = await AIService.personalizeEmail({
            candidateName: request.recipientName,
            candidateProfile: request.candidateProfile,
            jobTitle: request.jobTitle,
            companyName: request.companyName,
            emailType: this.mapTemplateToEmailType(request.templateName),
            baseTemplate: htmlContent,
            communicationStyle: 'professional'
          });

          subject = aiPersonalization.personalizedSubject;
          htmlContent = aiPersonalization.personalizedContent;

          logger.info('Email personalized with AI', {
            templateName: request.templateName,
            candidateName: request.recipientName,
            personalizationReason: aiPersonalization.personalizationReason
          });
        } catch (aiError) {
          logger.warn('AI personalization failed, using template content', { error: aiError });
        }
      }

      const emailData: EmailData = {
        to: request.recipientEmail,
        subject,
        html: htmlContent
      };

      return await this.sendEmail(emailData);
    } catch (error) {
      logger.error('Failed to send personalized email:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        templateName: request.templateName,
        recipientEmail: request.recipientEmail
      });
      return false;
    }
  }

  // Map template name to AI email type
  private static mapTemplateToEmailType(templateName: string): 'interview_invitation' | 'rejection' | 'offer' | 'follow_up' | 'assessment_invitation' {
    switch (templateName) {
      case 'interview_invitation':
        return 'interview_invitation';
      case 'assessment_invitation':
        return 'assessment_invitation';
      case 'rejection':
        return 'rejection';
      case 'offer_letter':
        return 'offer';
      default:
        return 'follow_up';
    }
  }

  // Add custom email template
  static addTemplate(template: EmailTemplate): void {
    this.templates.set(template.name, template);
    logger.info(`Added email template: ${template.name}`);
  }

  // Get template by name
  static getTemplate(name: string): EmailTemplate | undefined {
    return this.templates.get(name);
  }

  // List all available templates
  static getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  // Send bulk emails
  static async sendBulkEmails(emails: EmailData[]): Promise<{ success: number; failed: number }> {
    const results = await Promise.allSettled(
      emails.map(email => this.sendEmail(email))
    );

    const success = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const failed = results.length - success;

    logger.info('Bulk email sending completed', {
      total: emails.length,
      success,
      failed
    });

    return { success, failed };
  }

  // Test email configuration
  static async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('SMTP connection test successful');
      return true;
    } catch (error) {
      logger.error('SMTP connection test failed:', error);
      return false;
    }
  }

  // Send test email
  static async sendTestEmail(to: string): Promise<boolean> {
    const testEmailData: EmailData = {
      to,
      subject: 'Hire4Recruit - Email Service Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333;">Email Service Test</h2>
            <p>This is a test email from Hire4Recruit to verify email service functionality.</p>
            <p>If you received this email, the email service is working correctly!</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
          </div>
        </div>
      `
    };

    return await this.sendEmail(testEmailData);
  }
}

// Initialize email service when module is loaded
try {
  EmailService.initialize();
} catch (error) {
  logger.error('Failed to initialize email service:', error);
}