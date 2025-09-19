import Bull, { Queue, Job, JobOptions } from 'bull';
import Redis from 'ioredis';
import { logger } from '../config/logger';

export interface WorkflowActionJob {
  actionType: 'send_email' | 'schedule_interview' | 'assign_assessment' | 'verify_assessment' | 'add_calendar_event' | 'generate_offer_letter';
  candidateId: string;
  jobId: string;
  companyId: string;
  workflowId: string;
  stageId: string;
  actionConfig: any;
  triggeredBy: string;
  metadata?: Record<string, any>;
}

export interface EmailJob {
  templateName: string;
  recipientEmail: string;
  recipientName: string;
  variables: Record<string, any>;
  candidateProfile?: any;
  jobTitle?: string;
  companyName?: string;
  useAIPersonalization?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

export interface ScheduleJob {
  scheduleType: 'interview' | 'assessment' | 'reminder' | 'follow_up';
  candidateId: string;
  jobId: string;
  companyId: string;
  scheduledDate: Date;
  duration?: number;
  participants?: string[];
  details: Record<string, any>;
}

export interface NotificationJob {
  type: 'candidate_stage_change' | 'interview_reminder' | 'assessment_due' | 'application_received';
  recipientId: string;
  recipientType: 'candidate' | 'recruiter' | 'hiring_manager';
  data: Record<string, any>;
  channels: ('email' | 'sms' | 'push')[];
}

export class QueueService {
  private static redis: Redis;
  private static workflowQueue: Queue<WorkflowActionJob>;
  private static emailQueue: Queue<EmailJob>;
  private static scheduleQueue: Queue<ScheduleJob>;
  private static notificationQueue: Queue<NotificationJob>;

  static async initialize() {
    try {
      // Initialize Redis connection
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      // Test Redis connection
      await this.redis.ping();

      // Initialize queues
      const redisConfig = {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0')
        }
      };

      this.workflowQueue = new Bull<WorkflowActionJob>('workflow-actions', redisConfig);
      this.emailQueue = new Bull<EmailJob>('email-sending', redisConfig);
      this.scheduleQueue = new Bull<ScheduleJob>('scheduling', redisConfig);
      this.notificationQueue = new Bull<NotificationJob>('notifications', redisConfig);

      // Configure queue settings
      await this.configureQueues();

      // Set up queue processors
      await this.setupProcessors();

      // Set up queue event listeners
      this.setupEventListeners();

      logger.info('Queue service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize queue service:', error);
      throw error;
    }
  }

  private static async configureQueues() {
    // Configure workflow queue
    await this.workflowQueue.isReady();

    // Configure email queue with priority and rate limiting
    await this.emailQueue.isReady();

    // Configure schedule queue
    await this.scheduleQueue.isReady();

    // Configure notification queue
    await this.notificationQueue.isReady();

    logger.info('All queues configured successfully');
  }

  private static async setupProcessors() {
    // Import processors here to avoid circular dependencies
    const { WorkflowActionProcessor } = await import('./processors/workflowActionProcessor');
    const { EmailProcessor } = await import('./processors/emailProcessor');
    const { ScheduleProcessor } = await import('./processors/scheduleProcessor');
    const { NotificationProcessor } = await import('./processors/notificationProcessor');

    // Set up workflow action processor
    this.workflowQueue.process('execute-action', 5, async (job: Job<WorkflowActionJob>) => {
      return WorkflowActionProcessor.process(job.data);
    });

    // Set up email processor with different priorities
    this.emailQueue.process('high-priority', 3, async (job: Job<EmailJob>) => {
      return EmailProcessor.processHighPriority(job.data);
    });

    this.emailQueue.process('normal-priority', 10, async (job: Job<EmailJob>) => {
      return EmailProcessor.processNormal(job.data);
    });

    this.emailQueue.process('low-priority', 2, async (job: Job<EmailJob>) => {
      return EmailProcessor.processLowPriority(job.data);
    });

    // Set up schedule processor
    this.scheduleQueue.process('create-schedule', 3, async (job: Job<ScheduleJob>) => {
      return ScheduleProcessor.process(job.data);
    });

    // Set up notification processor
    this.notificationQueue.process('send-notification', 8, async (job: Job<NotificationJob>) => {
      return NotificationProcessor.process(job.data);
    });

    logger.info('Queue processors set up successfully');
  }

  private static setupEventListeners() {
    // Workflow queue events
    this.workflowQueue.on('completed', (job, result) => {
      logger.info('Workflow action completed', {
        jobId: job.id,
        actionType: job.data.actionType,
        result
      });
    });

    this.workflowQueue.on('failed', (job, error) => {
      logger.error('Workflow action failed', {
        jobId: job.id,
        actionType: job.data.actionType,
        error: error.message
      });
    });

    // Email queue events
    this.emailQueue.on('completed', (job, result) => {
      logger.info('Email sent successfully', {
        jobId: job.id,
        templateName: job.data.templateName,
        recipient: job.data.recipientEmail
      });
    });

    this.emailQueue.on('failed', (job, error) => {
      logger.error('Email sending failed', {
        jobId: job.id,
        templateName: job.data.templateName,
        recipient: job.data.recipientEmail,
        error: error.message
      });
    });

    // Schedule queue events
    this.scheduleQueue.on('completed', (job, result) => {
      logger.info('Schedule created successfully', {
        jobId: job.id,
        scheduleType: job.data.scheduleType,
        result
      });
    });

    this.scheduleQueue.on('failed', (job, error) => {
      logger.error('Schedule creation failed', {
        jobId: job.id,
        scheduleType: job.data.scheduleType,
        error: error.message
      });
    });

    // Notification queue events
    this.notificationQueue.on('completed', (job, result) => {
      logger.info('Notification sent successfully', {
        jobId: job.id,
        notificationType: job.data.type,
        recipient: job.data.recipientId
      });
    });

    this.notificationQueue.on('failed', (job, error) => {
      logger.error('Notification sending failed', {
        jobId: job.id,
        notificationType: job.data.type,
        recipient: job.data.recipientId,
        error: error.message
      });
    });

    logger.info('Queue event listeners set up successfully');
  }

  // Add workflow action job
  static async addWorkflowActionJob(
    data: WorkflowActionJob,
    options: JobOptions = {}
  ): Promise<Job<WorkflowActionJob>> {
    const defaultOptions: JobOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100,
      removeOnFail: 50
    };

    const job = await this.workflowQueue.add('execute-action', data, {
      ...defaultOptions,
      ...options
    });

    logger.info('Workflow action job added', {
      jobId: job.id,
      actionType: data.actionType,
      candidateId: data.candidateId
    });

    return job;
  }

  // Add email job
  static async addEmailJob(
    data: EmailJob,
    options: JobOptions = {}
  ): Promise<Job<EmailJob>> {
    const priority = data.priority || 'normal';
    const jobName = `${priority}-priority`;

    const defaultOptions: JobOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: 200,
      removeOnFail: 100,
      priority: priority === 'high' ? 10 : priority === 'normal' ? 5 : 1
    };

    const job = await this.emailQueue.add(jobName, data, {
      ...defaultOptions,
      ...options
    });

    logger.info('Email job added', {
      jobId: job.id,
      templateName: data.templateName,
      recipient: data.recipientEmail,
      priority
    });

    return job;
  }

  // Add schedule job
  static async addScheduleJob(
    data: ScheduleJob,
    options: JobOptions = {}
  ): Promise<Job<ScheduleJob>> {
    const defaultOptions: JobOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 50,
      removeOnFail: 25
    };

    const job = await this.scheduleQueue.add('create-schedule', data, {
      ...defaultOptions,
      ...options
    });

    logger.info('Schedule job added', {
      jobId: job.id,
      scheduleType: data.scheduleType,
      candidateId: data.candidateId
    });

    return job;
  }

  // Add notification job
  static async addNotificationJob(
    data: NotificationJob,
    options: JobOptions = {}
  ): Promise<Job<NotificationJob>> {
    const defaultOptions: JobOptions = {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 5000
      },
      removeOnComplete: 100,
      removeOnFail: 50
    };

    const job = await this.notificationQueue.add('send-notification', data, {
      ...defaultOptions,
      ...options
    });

    logger.info('Notification job added', {
      jobId: job.id,
      notificationType: data.type,
      recipient: data.recipientId
    });

    return job;
  }

  // Add delayed job
  static async addDelayedJob<T>(
    queueName: 'workflow' | 'email' | 'schedule' | 'notification',
    data: T,
    delay: number,
    options: JobOptions = {}
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    const jobOptions = {
      delay,
      ...options
    };

    const job = await queue.add(data, jobOptions);

    logger.info('Delayed job added', {
      queueName,
      jobId: job.id,
      delay
    });

    return job;
  }

  // Add recurring job
  static async addRecurringJob<T>(
    queueName: 'workflow' | 'email' | 'schedule' | 'notification',
    data: T,
    cronExpression: string,
    options: JobOptions = {}
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    const jobOptions = {
      repeat: { cron: cronExpression },
      ...options
    };

    const job = await queue.add(data, jobOptions);

    logger.info('Recurring job added', {
      queueName,
      jobId: job.id,
      cronExpression
    });

    return job;
  }

  private static getQueue(queueName: string): Queue {
    switch (queueName) {
      case 'workflow':
        return this.workflowQueue;
      case 'email':
        return this.emailQueue;
      case 'schedule':
        return this.scheduleQueue;
      case 'notification':
        return this.notificationQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }

  // Get queue statistics
  static async getQueueStats() {
    const stats = await Promise.all([
      this.workflowQueue.getJobCounts(),
      this.emailQueue.getJobCounts(),
      this.scheduleQueue.getJobCounts(),
      this.notificationQueue.getJobCounts()
    ]);

    return {
      workflow: stats[0],
      email: stats[1],
      schedule: stats[2],
      notification: stats[3]
    };
  }

  // Clean up completed jobs
  static async cleanupQueues() {
    await Promise.all([
      this.workflowQueue.clean(24 * 60 * 60 * 1000, 'completed'), // 24 hours
      this.workflowQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'), // 7 days
      this.emailQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      this.emailQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'),
      this.scheduleQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      this.scheduleQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'),
      this.notificationQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      this.notificationQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed')
    ]);

    logger.info('Queue cleanup completed');
  }

  // Pause all queues
  static async pauseQueues() {
    await Promise.all([
      this.workflowQueue.pause(),
      this.emailQueue.pause(),
      this.scheduleQueue.pause(),
      this.notificationQueue.pause()
    ]);

    logger.info('All queues paused');
  }

  // Resume all queues
  static async resumeQueues() {
    await Promise.all([
      this.workflowQueue.resume(),
      this.emailQueue.resume(),
      this.scheduleQueue.resume(),
      this.notificationQueue.resume()
    ]);

    logger.info('All queues resumed');
  }

  // Close all connections
  static async shutdown() {
    await Promise.all([
      this.workflowQueue.close(),
      this.emailQueue.close(),
      this.scheduleQueue.close(),
      this.notificationQueue.close(),
      this.redis.disconnect()
    ]);

    logger.info('Queue service shut down successfully');
  }
}