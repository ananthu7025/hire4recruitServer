import { EventEmitter } from 'events';
import { logger } from '../config/logger';
import { QueueService } from './queueService';
import mongoose from 'mongoose';

export interface WorkflowEvent {
  type: 'stage_entered' | 'stage_exited' | 'workflow_completed' | 'candidate_advanced' | 'candidate_rejected' | 'action_triggered';
  candidateId: string;
  jobId: string;
  companyId: string;
  workflowId: string;
  stageId?: string;
  triggeredBy: string;
  timestamp: Date;
  data?: Record<string, any>;
}

export interface StageChangeEvent extends WorkflowEvent {
  type: 'stage_entered' | 'stage_exited';
  stageId: string;
  previousStageId?: string;
  nextStageId?: string;
  stageDetails: {
    name: string;
    type: string;
    order: number;
    isRequired: boolean;
    autoAdvance: boolean;
    actions: any[];
    requirements: any[];
  };
}

export interface CandidateStatusEvent extends WorkflowEvent {
  type: 'candidate_advanced' | 'candidate_rejected';
  reason?: string;
  feedback?: string;
  score?: number;
}

export interface ActionTriggeredEvent extends WorkflowEvent {
  type: 'action_triggered';
  actionType: string;
  actionConfig: any;
  trigger: 'on_enter' | 'on_exit' | 'manual';
}

export class EventService extends EventEmitter {
  private static instance: EventService;

  private constructor() {
    super();
    this.setupEventListeners();
  }

  static getInstance(): EventService {
    if (!this.instance) {
      this.instance = new EventService();
    }
    return this.instance;
  }

  private setupEventListeners() {
    // Listen for stage change events
    this.on('stage_entered', this.handleStageEntered.bind(this));
    this.on('stage_exited', this.handleStageExited.bind(this));

    // Listen for workflow completion events
    this.on('workflow_completed', this.handleWorkflowCompleted.bind(this));

    // Listen for candidate status events
    this.on('candidate_advanced', this.handleCandidateAdvanced.bind(this));
    this.on('candidate_rejected', this.handleCandidateRejected.bind(this));

    // Listen for action triggered events
    this.on('action_triggered', this.handleActionTriggered.bind(this));

    logger.info('Event service listeners set up successfully');
  }

  // Emit a workflow event
  emitWorkflowEvent(event: WorkflowEvent): void {
    logger.info('Emitting workflow event', {
      type: event.type,
      candidateId: event.candidateId,
      jobId: event.jobId,
      stageId: event.stageId
    });

    this.emit(event.type, event);
  }

  // Emit stage entered event
  emitStageEntered(event: StageChangeEvent): void {
    event.type = 'stage_entered';
    event.timestamp = new Date();
    this.emitWorkflowEvent(event);
  }

  // Emit stage exited event
  emitStageExited(event: StageChangeEvent): void {
    event.type = 'stage_exited';
    event.timestamp = new Date();
    this.emitWorkflowEvent(event);
  }

  // Emit candidate advanced event
  emitCandidateAdvanced(event: CandidateStatusEvent): void {
    event.type = 'candidate_advanced';
    event.timestamp = new Date();
    this.emitWorkflowEvent(event);
  }

  // Emit candidate rejected event
  emitCandidateRejected(event: CandidateStatusEvent): void {
    event.type = 'candidate_rejected';
    event.timestamp = new Date();
    this.emitWorkflowEvent(event);
  }

  // Emit workflow completed event
  emitWorkflowCompleted(event: WorkflowEvent): void {
    event.type = 'workflow_completed';
    event.timestamp = new Date();
    this.emitWorkflowEvent(event);
  }

  // Emit action triggered event
  emitActionTriggered(event: ActionTriggeredEvent): void {
    event.type = 'action_triggered';
    event.timestamp = new Date();
    this.emitWorkflowEvent(event);
  }

  // Handle stage entered event
  private async handleStageEntered(event: StageChangeEvent): Promise<void> {
    try {
      logger.info('Handling stage entered event', {
        candidateId: event.candidateId,
        stageId: event.stageId,
        stageName: event.stageDetails.name
      });

      // Execute on_enter actions
      const onEnterActions = event.stageDetails.actions.filter(action => action.trigger === 'on_enter');

      for (const action of onEnterActions) {
        await this.executeAction(event, action);
      }

      // Send stage change notifications
      await this.sendStageChangeNotifications(event);

      // Check if stage should auto-advance
      if (event.stageDetails.autoAdvance) {
        await this.checkAutoAdvance(event);
      }

      logger.info('Stage entered event handled successfully', {
        candidateId: event.candidateId,
        stageId: event.stageId,
        actionsExecuted: onEnterActions.length
      });
    } catch (error) {
      logger.error('Failed to handle stage entered event', {
        candidateId: event.candidateId,
        stageId: event.stageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Handle stage exited event
  private async handleStageExited(event: StageChangeEvent): Promise<void> {
    try {
      logger.info('Handling stage exited event', {
        candidateId: event.candidateId,
        stageId: event.stageId,
        stageName: event.stageDetails.name
      });

      // Execute on_exit actions
      const onExitActions = event.stageDetails.actions.filter(action => action.trigger === 'on_exit');

      for (const action of onExitActions) {
        await this.executeAction(event, action);
      }

      logger.info('Stage exited event handled successfully', {
        candidateId: event.candidateId,
        stageId: event.stageId,
        actionsExecuted: onExitActions.length
      });
    } catch (error) {
      logger.error('Failed to handle stage exited event', {
        candidateId: event.candidateId,
        stageId: event.stageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Handle workflow completed event
  private async handleWorkflowCompleted(event: WorkflowEvent): Promise<void> {
    try {
      logger.info('Handling workflow completed event', {
        candidateId: event.candidateId,
        workflowId: event.workflowId
      });

      // Send completion notifications
      await QueueService.addNotificationJob({
        type: 'candidate_stage_change',
        recipientId: event.candidateId,
        recipientType: 'candidate',
        data: {
          candidateId: event.candidateId,
          jobId: event.jobId,
          workflowId: event.workflowId,
          status: 'completed',
          message: 'Congratulations! You have completed the hiring process.'
        },
        channels: ['email']
      });

      // Notify hiring managers
      await QueueService.addNotificationJob({
        type: 'candidate_stage_change',
        recipientId: event.triggeredBy,
        recipientType: 'recruiter',
        data: {
          candidateId: event.candidateId,
          jobId: event.jobId,
          workflowId: event.workflowId,
          status: 'completed',
          message: 'Candidate has completed the hiring workflow.'
        },
        channels: ['email']
      });

      logger.info('Workflow completed event handled successfully', {
        candidateId: event.candidateId,
        workflowId: event.workflowId
      });
    } catch (error) {
      logger.error('Failed to handle workflow completed event', {
        candidateId: event.candidateId,
        workflowId: event.workflowId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Handle candidate advanced event
  private async handleCandidateAdvanced(event: CandidateStatusEvent): Promise<void> {
    try {
      logger.info('Handling candidate advanced event', {
        candidateId: event.candidateId,
        stageId: event.stageId
      });

      // Send advancement notifications
      await QueueService.addNotificationJob({
        type: 'candidate_stage_change',
        recipientId: event.candidateId,
        recipientType: 'candidate',
        data: {
          candidateId: event.candidateId,
          jobId: event.jobId,
          oldStage: event.data?.previousStage,
          newStage: event.data?.currentStage,
          reason: event.reason,
          feedback: event.feedback
        },
        channels: ['email']
      });

      logger.info('Candidate advanced event handled successfully', {
        candidateId: event.candidateId
      });
    } catch (error) {
      logger.error('Failed to handle candidate advanced event', {
        candidateId: event.candidateId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Handle candidate rejected event
  private async handleCandidateRejected(event: CandidateStatusEvent): Promise<void> {
    try {
      logger.info('Handling candidate rejected event', {
        candidateId: event.candidateId,
        reason: event.reason
      });

      // Send rejection notification
      await QueueService.addEmailJob({
        templateName: 'rejection',
        recipientEmail: event.data?.candidateEmail || '',
        recipientName: event.data?.candidateName || 'Candidate',
        variables: {
          candidateName: event.data?.candidateName || 'Candidate',
          jobTitle: event.data?.jobTitle || 'Position',
          companyName: event.data?.companyName || 'Company',
          recruiterName: event.data?.recruiterName || 'Hiring Team',
          reason: event.reason,
          feedback: event.feedback
        },
        priority: 'normal'
      });

      logger.info('Candidate rejected event handled successfully', {
        candidateId: event.candidateId
      });
    } catch (error) {
      logger.error('Failed to handle candidate rejected event', {
        candidateId: event.candidateId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Handle action triggered event
  private async handleActionTriggered(event: ActionTriggeredEvent): Promise<void> {
    try {
      logger.info('Handling action triggered event', {
        candidateId: event.candidateId,
        actionType: event.actionType,
        trigger: event.trigger
      });

      await this.executeAction(event, {
        type: event.actionType,
        config: event.actionConfig,
        trigger: event.trigger
      });

      logger.info('Action triggered event handled successfully', {
        candidateId: event.candidateId,
        actionType: event.actionType
      });
    } catch (error) {
      logger.error('Failed to handle action triggered event', {
        candidateId: event.candidateId,
        actionType: event.actionType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Execute a workflow action
  private async executeAction(event: WorkflowEvent, action: any): Promise<void> {
    try {
      logger.info('Executing workflow action', {
        candidateId: event.candidateId,
        actionType: action.type,
        trigger: action.trigger
      });

      const actionJob = {
        actionType: action.type,
        candidateId: event.candidateId,
        jobId: event.jobId,
        companyId: event.companyId,
        workflowId: event.workflowId,
        stageId: event.stageId || '',
        actionConfig: action.config,
        triggeredBy: event.triggeredBy,
        metadata: event.data
      };

      await QueueService.addWorkflowActionJob(actionJob);

      logger.info('Workflow action queued successfully', {
        candidateId: event.candidateId,
        actionType: action.type
      });
    } catch (error) {
      logger.error('Failed to execute workflow action', {
        candidateId: event.candidateId,
        actionType: action.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Send stage change notifications
  private async sendStageChangeNotifications(event: StageChangeEvent): Promise<void> {
    try {
      // Notify candidate about stage change
      await QueueService.addNotificationJob({
        type: 'candidate_stage_change',
        recipientId: event.candidateId,
        recipientType: 'candidate',
        data: {
          candidateId: event.candidateId,
          jobId: event.jobId,
          stageId: event.stageId,
          stageName: event.stageDetails.name,
          stageType: event.stageDetails.type,
          companyName: event.data?.companyName,
          jobTitle: event.data?.jobTitle
        },
        channels: ['email']
      });

      // Notify hiring team about stage change
      if (event.data?.hiringManagerId) {
        await QueueService.addNotificationJob({
          type: 'candidate_stage_change',
          recipientId: event.data.hiringManagerId,
          recipientType: 'hiring_manager',
          data: {
            candidateId: event.candidateId,
            candidateName: event.data?.candidateName,
            jobId: event.jobId,
            jobTitle: event.data?.jobTitle,
            stageId: event.stageId,
            stageName: event.stageDetails.name,
            previousStageId: event.previousStageId
          },
          channels: ['email']
        });
      }

      logger.info('Stage change notifications sent', {
        candidateId: event.candidateId,
        stageId: event.stageId
      });
    } catch (error) {
      logger.error('Failed to send stage change notifications', {
        candidateId: event.candidateId,
        stageId: event.stageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Check if stage should auto-advance
  private async checkAutoAdvance(event: StageChangeEvent): Promise<void> {
    try {
      logger.info('Checking auto-advance conditions', {
        candidateId: event.candidateId,
        stageId: event.stageId
      });

      // Check stage requirements
      const allRequirementsMet = await this.checkStageRequirements(event);

      if (allRequirementsMet) {
        logger.info('Auto-advance conditions met, advancing candidate', {
          candidateId: event.candidateId,
          stageId: event.stageId
        });

        // Emit stage exited event
        this.emitStageExited(event);

        // Auto-advance logic would go here
        // This would typically involve updating the candidate's current stage
        // and emitting a new stage entered event
      } else {
        logger.info('Auto-advance conditions not met', {
          candidateId: event.candidateId,
          stageId: event.stageId
        });
      }
    } catch (error) {
      logger.error('Failed to check auto-advance conditions', {
        candidateId: event.candidateId,
        stageId: event.stageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Check if stage requirements are met
  private async checkStageRequirements(event: StageChangeEvent): Promise<boolean> {
    try {
      const requirements = event.stageDetails.requirements;

      if (!requirements || requirements.length === 0) {
        return true; // No requirements to check
      }

      for (const requirement of requirements) {
        const isRequirementMet = await this.checkIndividualRequirement(event, requirement);
        if (!isRequirementMet) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Failed to check stage requirements', {
        candidateId: event.candidateId,
        stageId: event.stageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  // Check individual requirement
  private async checkIndividualRequirement(event: StageChangeEvent, requirement: any): Promise<boolean> {
    try {
      switch (requirement.type) {
        case 'interview_complete':
          // Check if interview is completed
          return await this.checkInterviewComplete(event.candidateId, event.jobId, requirement.config);

        case 'assessment_passed':
          // Check if assessment is passed
          return await this.checkAssessmentPassed(event.candidateId, event.jobId, requirement.config);

        case 'manual_approval':
          // Check if manual approval is given
          return await this.checkManualApproval(event.candidateId, event.stageId, requirement.config);

        case 'ai_screening_passed':
          // Check if AI screening is passed
          return await this.checkAIScreeningPassed(event.candidateId, event.jobId, requirement.config);

        default:
          logger.warn('Unknown requirement type', {
            candidateId: event.candidateId,
            requirementType: requirement.type
          });
          return false;
      }
    } catch (error) {
      logger.error('Failed to check individual requirement', {
        candidateId: event.candidateId,
        requirementType: requirement.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  // Check if interview is completed
  private async checkInterviewComplete(candidateId: string, jobId: string, config: any): Promise<boolean> {
    // This would check the Interview model for completed interviews
    // For now, return false as placeholder
    logger.info('Checking interview completion (placeholder)', { candidateId, jobId });
    return false;
  }

  // Check if assessment is passed
  private async checkAssessmentPassed(candidateId: string, jobId: string, config: any): Promise<boolean> {
    // This would check the Assessment model for passed assessments
    // For now, return false as placeholder
    logger.info('Checking assessment pass (placeholder)', { candidateId, jobId });
    return false;
  }

  // Check if manual approval is given
  private async checkManualApproval(candidateId: string, stageId: string, config: any): Promise<boolean> {
    // This would check for manual approval records
    // For now, return false as placeholder
    logger.info('Checking manual approval (placeholder)', { candidateId, stageId });
    return false;
  }

  // Check if AI screening is passed
  private async checkAIScreeningPassed(candidateId: string, jobId: string, config: any): Promise<boolean> {
    // This would check AI screening results
    // For now, return false as placeholder
    logger.info('Checking AI screening (placeholder)', { candidateId, jobId });
    return false;
  }
}

// Export singleton instance
export const eventService = EventService.getInstance();