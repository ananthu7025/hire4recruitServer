import { logger } from '../config/logger';
import { eventService, StageChangeEvent, CandidateStatusEvent, ActionTriggeredEvent } from './eventService';
import { QueueService } from './queueService';
import Workflow, { IWorkflow } from '../models/Workflow';
import Candidate, { ICandidate } from '../models/Candidate';
import Job from '../models/Job';
import Company from '../models/Company';
import Employee from '../models/Employee';
import mongoose from 'mongoose';

export interface CandidateWorkflowInstance {
  candidateId: string;
  jobId: string;
  companyId: string;
  workflowId: string;
  currentStageId: string;
  currentStageOrder: number;
  status: 'active' | 'completed' | 'paused' | 'rejected';
  startedAt: Date;
  completedAt?: Date;
  pausedAt?: Date;
  rejectedAt?: Date;
  history: {
    stageId: string;
    stageName: string;
    enteredAt: Date;
    exitedAt?: Date;
    duration?: number;
    outcome?: 'passed' | 'failed' | 'skipped';
    feedback?: string;
    score?: number;
  }[];
  metadata: Record<string, any>;
}

export interface StageAdvanceOptions {
  skipValidation?: boolean;
  reason?: string;
  feedback?: string;
  score?: number;
  triggeredBy: string;
  manualAdvance?: boolean;
}

export interface WorkflowExecutionContext {
  candidate: ICandidate;
  job: any;
  company: any;
  workflow: IWorkflow;
  currentStage: any;
  nextStage?: any;
  triggeredBy: string;
  metadata?: Record<string, any>;
}

export class WorkflowExecutionService {
  // Start workflow for a candidate
  static async startWorkflow(
    candidateId: string,
    jobId: string,
    companyId: string,
    workflowId: string,
    triggeredBy: string,
    metadata: Record<string, any> = {}
  ): Promise<CandidateWorkflowInstance | null> {
    try {
      logger.info('Starting workflow execution', {
        candidateId,
        jobId,
        workflowId,
        triggeredBy
      });

      // Get workflow and validate
      const workflow = await Workflow.findById(workflowId);
      if (!workflow || !workflow.isActive) {
        throw new Error('Workflow not found or inactive');
      }

      // Get candidate and job
      const [candidate, job] = await Promise.all([
        Candidate.findById(candidateId),
        Job.findById(jobId)
      ]);

      if (!candidate || !job) {
        throw new Error('Candidate or job not found');
      }

      // Check if workflow instance already exists
      const existingInstance = await this.getCandidateWorkflowInstance(candidateId, jobId);
      if (existingInstance && existingInstance.status === 'active') {
        logger.warn('Workflow instance already exists and is active', {
          candidateId,
          jobId,
          existingStatus: existingInstance.status
        });
        return existingInstance;
      }

      // Create workflow instance
      const firstStage = workflow.stages.sort((a, b) => a.order - b.order)[0];
      if (!firstStage) {
        throw new Error('Workflow has no stages');
      }

      const workflowInstance: CandidateWorkflowInstance = {
        candidateId,
        jobId,
        companyId,
        workflowId,
        currentStageId: firstStage.stageId,
        currentStageOrder: firstStage.order,
        status: 'active',
        startedAt: new Date(),
        history: [],
        metadata: {
          ...metadata,
          workflowStartedBy: triggeredBy,
          initialStage: {
            id: firstStage.stageId,
            name: firstStage.name,
            type: firstStage.type
          }
        }
      };

      // Save workflow instance (you might want to create a WorkflowInstance model)
      await this.saveWorkflowInstance(workflowInstance);

      // Enter first stage
      await this.enterStage(workflowInstance, firstStage, triggeredBy);

      logger.info('Workflow started successfully', {
        candidateId,
        jobId,
        workflowId,
        firstStageId: firstStage.stageId,
        firstStageName: firstStage.name
      });

      return workflowInstance;
    } catch (error) {
      logger.error('Failed to start workflow', {
        candidateId,
        jobId,
        workflowId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Advance candidate to next stage
  static async advanceCandidate(
    candidateId: string,
    jobId: string,
    targetStageId: string,
    options: StageAdvanceOptions
  ): Promise<boolean> {
    try {
      logger.info('Advancing candidate to next stage', {
        candidateId,
        jobId,
        targetStageId,
        triggeredBy: options.triggeredBy
      });

      // Get workflow instance
      const instance = await this.getCandidateWorkflowInstance(candidateId, jobId);
      if (!instance || instance.status !== 'active') {
        throw new Error('No active workflow instance found');
      }

      // Get workflow and stages
      const workflow = await Workflow.findById(instance.workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const currentStage = workflow.stages.find(s => s.stageId === instance.currentStageId);
      const targetStage = workflow.stages.find(s => s.stageId === targetStageId);

      if (!currentStage || !targetStage) {
        throw new Error('Current or target stage not found');
      }

      // Validate stage progression (unless skipping validation)
      if (!options.skipValidation) {
        const canAdvance = await this.validateStageAdvancement(instance, currentStage, targetStage);
        if (!canAdvance) {
          throw new Error('Stage advancement validation failed');
        }
      }

      // Exit current stage
      await this.exitStage(instance, currentStage, options.triggeredBy, {
        outcome: 'passed',
        feedback: options.feedback,
        score: options.score,
        reason: options.reason
      });

      // Update instance
      instance.currentStageId = targetStageId;
      instance.currentStageOrder = targetStage.order;
      await this.updateWorkflowInstance(instance);

      // Enter new stage
      await this.enterStage(instance, targetStage, options.triggeredBy);

      // Emit candidate advanced event
      eventService.emitCandidateAdvanced({
        type: 'candidate_advanced',
        candidateId,
        jobId: instance.jobId,
        companyId: instance.companyId,
        workflowId: instance.workflowId,
        stageId: targetStageId,
        triggeredBy: options.triggeredBy,
        timestamp: new Date(),
        reason: options.reason,
        feedback: options.feedback,
        score: options.score,
        data: {
          previousStage: currentStage.name,
          currentStage: targetStage.name,
          manualAdvance: options.manualAdvance || false
        }
      });

      logger.info('Candidate advanced successfully', {
        candidateId,
        fromStage: currentStage.name,
        toStage: targetStage.name,
        triggeredBy: options.triggeredBy
      });

      return true;
    } catch (error) {
      logger.error('Failed to advance candidate', {
        candidateId,
        jobId,
        targetStageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Reject candidate
  static async rejectCandidate(
    candidateId: string,
    jobId: string,
    reason: string,
    feedback: string,
    triggeredBy: string
  ): Promise<boolean> {
    try {
      logger.info('Rejecting candidate', {
        candidateId,
        jobId,
        reason,
        triggeredBy
      });

      // Get workflow instance
      const instance = await this.getCandidateWorkflowInstance(candidateId, jobId);
      if (!instance) {
        throw new Error('Workflow instance not found');
      }

      // Update instance status
      instance.status = 'rejected';
      instance.rejectedAt = new Date();
      instance.metadata.rejectionReason = reason;
      instance.metadata.rejectionFeedback = feedback;
      instance.metadata.rejectedBy = triggeredBy;

      await this.updateWorkflowInstance(instance);

      // Get additional data for event
      const [candidate, job, company] = await Promise.all([
        Candidate.findById(candidateId),
        Job.findById(jobId),
        Company.findById(instance.companyId)
      ]);

      // Emit candidate rejected event
      eventService.emitCandidateRejected({
        type: 'candidate_rejected',
        candidateId,
        jobId: instance.jobId,
        companyId: instance.companyId,
        workflowId: instance.workflowId,
        triggeredBy,
        timestamp: new Date(),
        reason,
        feedback,
        data: {
          candidateName: candidate ? `${candidate.personalInfo.firstName} ${candidate.personalInfo.lastName}` : 'Candidate',
          candidateEmail: candidate?.personalInfo.email,
          jobTitle: job?.title,
          companyName: company?.name,
          recruiterName: 'Hiring Team' // This should be populated from the triggeredBy user
        }
      });

      logger.info('Candidate rejected successfully', {
        candidateId,
        jobId,
        reason,
        triggeredBy
      });

      return true;
    } catch (error) {
      logger.error('Failed to reject candidate', {
        candidateId,
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Complete workflow
  static async completeWorkflow(
    candidateId: string,
    jobId: string,
    triggeredBy: string,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      logger.info('Completing workflow', {
        candidateId,
        jobId,
        triggeredBy
      });

      // Get workflow instance
      const instance = await this.getCandidateWorkflowInstance(candidateId, jobId);
      if (!instance) {
        throw new Error('Workflow instance not found');
      }

      // Update instance status
      instance.status = 'completed';
      instance.completedAt = new Date();
      instance.metadata = { ...instance.metadata, ...metadata, completedBy: triggeredBy };

      await this.updateWorkflowInstance(instance);

      // Emit workflow completed event
      eventService.emitWorkflowCompleted({
        type: 'workflow_completed',
        candidateId,
        jobId: instance.jobId,
        companyId: instance.companyId,
        workflowId: instance.workflowId,
        triggeredBy,
        timestamp: new Date(),
        data: metadata
      });

      logger.info('Workflow completed successfully', {
        candidateId,
        jobId,
        workflowId: instance.workflowId,
        duration: instance.completedAt.getTime() - instance.startedAt.getTime()
      });

      return true;
    } catch (error) {
      logger.error('Failed to complete workflow', {
        candidateId,
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Pause workflow
  static async pauseWorkflow(
    candidateId: string,
    jobId: string,
    reason: string,
    triggeredBy: string
  ): Promise<boolean> {
    try {
      logger.info('Pausing workflow', {
        candidateId,
        jobId,
        reason,
        triggeredBy
      });

      // Get workflow instance
      const instance = await this.getCandidateWorkflowInstance(candidateId, jobId);
      if (!instance) {
        throw new Error('Workflow instance not found');
      }

      // Update instance status
      instance.status = 'paused';
      instance.pausedAt = new Date();
      instance.metadata.pauseReason = reason;
      instance.metadata.pausedBy = triggeredBy;

      await this.updateWorkflowInstance(instance);

      logger.info('Workflow paused successfully', {
        candidateId,
        jobId,
        reason
      });

      return true;
    } catch (error) {
      logger.error('Failed to pause workflow', {
        candidateId,
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Resume workflow
  static async resumeWorkflow(
    candidateId: string,
    jobId: string,
    triggeredBy: string
  ): Promise<boolean> {
    try {
      logger.info('Resuming workflow', {
        candidateId,
        jobId,
        triggeredBy
      });

      // Get workflow instance
      const instance = await this.getCandidateWorkflowInstance(candidateId, jobId);
      if (!instance || instance.status !== 'paused') {
        throw new Error('No paused workflow instance found');
      }

      // Update instance status
      instance.status = 'active';
      instance.pausedAt = undefined;
      instance.metadata.resumedBy = triggeredBy;
      instance.metadata.resumedAt = new Date();

      await this.updateWorkflowInstance(instance);

      logger.info('Workflow resumed successfully', {
        candidateId,
        jobId
      });

      return true;
    } catch (error) {
      logger.error('Failed to resume workflow', {
        candidateId,
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Execute manual action
  static async executeManualAction(
    candidateId: string,
    jobId: string,
    actionType: string,
    actionConfig: any,
    triggeredBy: string
  ): Promise<boolean> {
    try {
      logger.info('Executing manual action', {
        candidateId,
        jobId,
        actionType,
        triggeredBy
      });

      // Get workflow instance
      const instance = await this.getCandidateWorkflowInstance(candidateId, jobId);
      if (!instance || instance.status !== 'active') {
        throw new Error('No active workflow instance found');
      }

      // Emit action triggered event
      eventService.emitActionTriggered({
        type: 'action_triggered',
        candidateId,
        jobId: instance.jobId,
        companyId: instance.companyId,
        workflowId: instance.workflowId,
        stageId: instance.currentStageId,
        triggeredBy,
        timestamp: new Date(),
        actionType,
        actionConfig,
        trigger: 'manual'
      });

      logger.info('Manual action executed successfully', {
        candidateId,
        jobId,
        actionType
      });

      return true;
    } catch (error) {
      logger.error('Failed to execute manual action', {
        candidateId,
        jobId,
        actionType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Enter a stage
  private static async enterStage(
    instance: CandidateWorkflowInstance,
    stage: any,
    triggeredBy: string
  ): Promise<void> {
    try {
      logger.info('Entering stage', {
        candidateId: instance.candidateId,
        stageId: stage.stageId,
        stageName: stage.name
      });

      // Add to history
      instance.history.push({
        stageId: stage.stageId,
        stageName: stage.name,
        enteredAt: new Date()
      });

      await this.updateWorkflowInstance(instance);

      // Get execution context
      const context = await this.getExecutionContext(instance, stage, triggeredBy);

      // Emit stage entered event
      eventService.emitStageEntered({
        type: 'stage_entered',
        candidateId: instance.candidateId,
        jobId: instance.jobId,
        companyId: instance.companyId,
        workflowId: instance.workflowId,
        stageId: stage.stageId,
        triggeredBy,
        timestamp: new Date(),
        stageDetails: {
          name: stage.name,
          type: stage.type,
          order: stage.order,
          isRequired: stage.isRequired,
          autoAdvance: stage.autoAdvance,
          actions: stage.actions || [],
          requirements: stage.requirements || []
        },
        data: {
          candidateName: context.candidate ? `${context.candidate.personalInfo.firstName} ${context.candidate.personalInfo.lastName}` : 'Candidate',
          jobTitle: context.job?.title,
          companyName: context.company?.name,
          hiringManagerId: context.job?.hiringManager
        }
      });

      logger.info('Stage entered successfully', {
        candidateId: instance.candidateId,
        stageId: stage.stageId,
        stageName: stage.name
      });
    } catch (error) {
      logger.error('Failed to enter stage', {
        candidateId: instance.candidateId,
        stageId: stage.stageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Exit a stage
  private static async exitStage(
    instance: CandidateWorkflowInstance,
    stage: any,
    triggeredBy: string,
    exitData: {
      outcome?: 'passed' | 'failed' | 'skipped';
      feedback?: string;
      score?: number;
      reason?: string;
    } = {}
  ): Promise<void> {
    try {
      logger.info('Exiting stage', {
        candidateId: instance.candidateId,
        stageId: stage.stageId,
        stageName: stage.name,
        outcome: exitData.outcome
      });

      // Update history
      const historyEntry = instance.history.find(h => h.stageId === stage.stageId && !h.exitedAt);
      if (historyEntry) {
        historyEntry.exitedAt = new Date();
        historyEntry.duration = historyEntry.exitedAt.getTime() - historyEntry.enteredAt.getTime();
        historyEntry.outcome = exitData.outcome;
        historyEntry.feedback = exitData.feedback;
        historyEntry.score = exitData.score;
      }

      await this.updateWorkflowInstance(instance);

      // Get execution context
      const context = await this.getExecutionContext(instance, stage, triggeredBy);

      // Emit stage exited event
      eventService.emitStageExited({
        type: 'stage_exited',
        candidateId: instance.candidateId,
        jobId: instance.jobId,
        companyId: instance.companyId,
        workflowId: instance.workflowId,
        stageId: stage.stageId,
        triggeredBy,
        timestamp: new Date(),
        stageDetails: {
          name: stage.name,
          type: stage.type,
          order: stage.order,
          isRequired: stage.isRequired,
          autoAdvance: stage.autoAdvance,
          actions: stage.actions || [],
          requirements: stage.requirements || []
        },
        data: {
          candidateName: context.candidate ? `${context.candidate.personalInfo.firstName} ${context.candidate.personalInfo.lastName}` : 'Candidate',
          jobTitle: context.job?.title,
          companyName: context.company?.name,
          ...exitData
        }
      });

      logger.info('Stage exited successfully', {
        candidateId: instance.candidateId,
        stageId: stage.stageId,
        stageName: stage.name,
        outcome: exitData.outcome
      });
    } catch (error) {
      logger.error('Failed to exit stage', {
        candidateId: instance.candidateId,
        stageId: stage.stageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Validate stage advancement
  private static async validateStageAdvancement(
    instance: CandidateWorkflowInstance,
    currentStage: any,
    targetStage: any
  ): Promise<boolean> {
    try {
      // Check if target stage order is valid
      if (targetStage.order <= currentStage.order) {
        logger.warn('Invalid stage advancement: target stage order is not greater than current', {
          candidateId: instance.candidateId,
          currentOrder: currentStage.order,
          targetOrder: targetStage.order
        });
        return false;
      }

      // Check stage requirements
      if (currentStage.requirements && currentStage.requirements.length > 0) {
        // This would check if all requirements are met
        // For now, we'll return true as placeholder
        logger.info('Stage requirements validation (placeholder)', {
          candidateId: instance.candidateId,
          stageId: currentStage.stageId,
          requirementsCount: currentStage.requirements.length
        });
      }

      return true;
    } catch (error) {
      logger.error('Failed to validate stage advancement', {
        candidateId: instance.candidateId,
        currentStageId: currentStage.stageId,
        targetStageId: targetStage.stageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  // Get execution context
  private static async getExecutionContext(
    instance: CandidateWorkflowInstance,
    stage: any,
    triggeredBy: string
  ): Promise<WorkflowExecutionContext> {
    const [candidate, job, company, workflow] = await Promise.all([
      Candidate.findById(instance.candidateId),
      Job.findById(instance.jobId).populate('hiringManager'),
      Company.findById(instance.companyId),
      Workflow.findById(instance.workflowId)
    ]);

    return {
      candidate: candidate!,
      job,
      company,
      workflow: workflow!,
      currentStage: stage,
      triggeredBy,
      metadata: instance.metadata
    };
  }

  // Get candidate workflow instance (placeholder - you'd implement with a proper model)
  private static async getCandidateWorkflowInstance(
    candidateId: string,
    jobId: string
  ): Promise<CandidateWorkflowInstance | null> {
    // This is a placeholder implementation
    // In a real application, you would store workflow instances in a separate collection
    // For now, we'll simulate by returning null
    logger.info('Getting workflow instance (placeholder)', { candidateId, jobId });
    return null;
  }

  // Save workflow instance (placeholder)
  private static async saveWorkflowInstance(instance: CandidateWorkflowInstance): Promise<void> {
    // This is a placeholder implementation
    logger.info('Saving workflow instance (placeholder)', {
      candidateId: instance.candidateId,
      workflowId: instance.workflowId
    });
  }

  // Update workflow instance (placeholder)
  private static async updateWorkflowInstance(instance: CandidateWorkflowInstance): Promise<void> {
    // This is a placeholder implementation
    logger.info('Updating workflow instance (placeholder)', {
      candidateId: instance.candidateId,
      status: instance.status
    });
  }

  // Get workflow analytics
  static async getWorkflowAnalytics(workflowId: string): Promise<any> {
    try {
      // This would return analytics about workflow execution
      // Placeholder implementation
      return {
        totalExecutions: 0,
        activeExecutions: 0,
        completedExecutions: 0,
        rejectedExecutions: 0,
        averageCompletionTime: 0,
        stageAnalytics: {},
        conversionRates: {}
      };
    } catch (error) {
      logger.error('Failed to get workflow analytics', {
        workflowId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}