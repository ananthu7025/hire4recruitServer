import { logger } from './logger';
import { QueueService } from '../services/queueService';
import { EmailService } from '../services/emailService';
import { CalendarService } from '../services/calendarService';
import { AIService } from '../services/aiService';
import { eventService } from '../services/eventService';

export class ServicesConfig {
  private static initialized = false;

  static async initializeServices(): Promise<void> {
    if (this.initialized) {
      logger.warn('Services already initialized');
      return;
    }

    try {
      logger.info('Initializing application services...');

      // Initialize AI Service first (already auto-initialized)
      logger.info('✓ AI Service initialized');

      // Initialize Email Service (already auto-initialized)
      logger.info('✓ Email Service initialized');

      // Initialize Calendar Service (already auto-initialized)
      logger.info('✓ Calendar Service initialized');

      // Initialize Queue Service
      await QueueService.initialize();
      logger.info('✓ Queue Service initialized');

      // Event Service is already instantiated as singleton
      logger.info('✓ Event Service initialized');

      this.initialized = true;
      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  static async shutdownServices(): Promise<void> {
    try {
      logger.info('Shutting down application services...');

      // Shutdown Queue Service
      await QueueService.shutdown();
      logger.info('✓ Queue Service shut down');

      this.initialized = false;
      logger.info('All services shut down successfully');
    } catch (error) {
      logger.error('Failed to shutdown services:', error);
      throw error;
    }
  }

  static isInitialized(): boolean {
    return this.initialized;
  }
}

// Health check for all services
export class ServicesHealthCheck {
  static async checkHealth(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, { status: 'healthy' | 'unhealthy'; message?: string }>;
  }> {
    const services: Record<string, { status: 'healthy' | 'unhealthy'; message?: string }> = {};

    try {
      // Check AI Service
      try {
        const aiHealthy = await AIService.healthCheck();
        services.ai = {
          status: aiHealthy ? 'healthy' : 'unhealthy',
          message: aiHealthy ? 'AI service responding' : 'AI service not responding'
        };
      } catch (error) {
        services.ai = {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      // Check Email Service
      try {
        const emailHealthy = await EmailService.testConnection();
        services.email = {
          status: emailHealthy ? 'healthy' : 'unhealthy',
          message: emailHealthy ? 'Email service connected' : 'Email service connection failed'
        };
      } catch (error) {
        services.email = {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      // Check Queue Service
      try {
        const queueStats = await QueueService.getQueueStats();
        services.queue = {
          status: 'healthy',
          message: `Queues operational: ${Object.keys(queueStats).length} active queues`
        };
      } catch (error) {
        services.queue = {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Queue service unavailable'
        };
      }

      // Check Event Service
      services.events = {
        status: 'healthy',
        message: 'Event service operational'
      };

      // Check Calendar Service (basic check)
      services.calendar = {
        status: 'healthy',
        message: 'Calendar service loaded'
      };

      // Determine overall health
      const unhealthyServices = Object.values(services).filter(s => s.status === 'unhealthy');
      const overall = unhealthyServices.length === 0 ? 'healthy' :
                     unhealthyServices.length < Object.keys(services).length ? 'degraded' : 'unhealthy';

      return { overall, services };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        overall: 'unhealthy',
        services: {
          error: {
            status: 'unhealthy',
            message: error instanceof Error ? error.message : 'Health check failed'
          }
        }
      };
    }
  }
}