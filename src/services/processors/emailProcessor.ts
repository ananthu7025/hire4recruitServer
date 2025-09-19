import { EmailService } from '../emailService';
import { logger } from '../../config/logger';
import { EmailJob } from '../queueService';

export class EmailProcessor {
  static async processHighPriority(data: EmailJob): Promise<boolean> {
    logger.info('Processing high priority email', {
      templateName: data.templateName,
      recipient: data.recipientEmail
    });

    return this.processEmail(data);
  }

  static async processNormal(data: EmailJob): Promise<boolean> {
    logger.info('Processing normal priority email', {
      templateName: data.templateName,
      recipient: data.recipientEmail
    });

    return this.processEmail(data);
  }

  static async processLowPriority(data: EmailJob): Promise<boolean> {
    logger.info('Processing low priority email', {
      templateName: data.templateName,
      recipient: data.recipientEmail
    });

    return this.processEmail(data);
  }

  private static async processEmail(data: EmailJob): Promise<boolean> {
    try {
      const result = await EmailService.sendPersonalizedEmail({
        templateName: data.templateName,
        recipientEmail: data.recipientEmail,
        recipientName: data.recipientName,
        variables: data.variables,
        candidateProfile: data.candidateProfile,
        jobTitle: data.jobTitle,
        companyName: data.companyName,
        useAIPersonalization: data.useAIPersonalization || false
      });

      if (!result) {
        throw new Error('Email service returned false');
      }

      logger.info('Email processed successfully', {
        templateName: data.templateName,
        recipient: data.recipientEmail
      });

      return true;
    } catch (error) {
      logger.error('Email processing failed', {
        templateName: data.templateName,
        recipient: data.recipientEmail,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }
}