import Workflow, { IWorkflow } from '../models/Workflow';
import { AIService } from './aiService';
import { logger } from '../config/logger';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface CreateWorkflowData {
  name: string;
  description?: string;
  isTemplate?: boolean;
  stages: {
    name: string;
    type: 'screening' | 'interview' | 'assessment' | 'review' | 'offer' | 'custom';
    order: number;
    isRequired?: boolean;
    estimatedDuration?: number;
    autoAdvance?: boolean;
    actions?: {
      type: 'send_email' | 'schedule_interview' | 'assign_assessment' | 'verify_assessment' | 'add_calendar_event' | 'generate_offer_letter';
      config: any;
      trigger: 'on_enter' | 'on_exit' | 'manual';
      aiEnhanced?: {
        personalizeContent?: boolean;
        optimizeTiming?: boolean;
        adaptToCandidate?: boolean;
      };
    }[];
    requirements?: {
      type: 'interview_complete' | 'assessment_passed' | 'manual_approval' | 'ai_screening_passed';
      config?: any;
    }[];
    aiIntelligence?: {
      automatedScreening?: {
        enabled?: boolean;
        criteria?: {
          skillRequirements?: string[];
          experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
          cultureFitIndicators?: string[];
          minimumScore?: number;
        };
        aiModel?: 'gemini-pro' | 'custom';
      };
    };
  }[];
}

export interface UpdateWorkflowData extends Partial<CreateWorkflowData> {
  isActive?: boolean;
}

export class WorkflowService {
  // Create new workflow
  static async createWorkflow(workflowData: CreateWorkflowData, companyId: string, createdBy: string): Promise<IWorkflow> {
    try {
      // Generate stage IDs and set defaults
      const stages = workflowData.stages.map((stage, index) => ({
        stageId: `stage-${Date.now()}-${uuidv4().substring(0, 8)}`,
        name: stage.name,
        type: stage.type,
        order: stage.order || index + 1,
        isRequired: stage.isRequired !== undefined ? stage.isRequired : true,
        estimatedDuration: stage.estimatedDuration || 3,
        autoAdvance: stage.autoAdvance || false,
        actions: (stage.actions || []).map(action => ({
          type: action.type,
          config: action.config,
          trigger: action.trigger,
          aiEnhanced: action.aiEnhanced ? {
            personalizeContent: action.aiEnhanced.personalizeContent || false,
            optimizeTiming: action.aiEnhanced.optimizeTiming || false,
            adaptToCandidate: action.aiEnhanced.adaptToCandidate || false
          } : undefined
        })),
        requirements: (stage.requirements || []).map(req => ({
          type: req.type,
          config: req.config
        })),
        aiIntelligence: {
          successPrediction: {
            candidatePassRate: 0.5,
            avgTimeInStage: stage.estimatedDuration || 3,
            commonReasons: [],
            improvementSuggestions: []
          },
          automatedScreening: {
            enabled: stage.aiIntelligence?.automatedScreening?.enabled || false,
            criteria: stage.aiIntelligence?.automatedScreening?.criteria || {
              skillRequirements: [],
              experienceLevel: 'entry' as const,
              cultureFitIndicators: [],
              minimumScore: 70
            },
            aiModel: stage.aiIntelligence?.automatedScreening?.aiModel || 'gemini-pro' as const
          },
          analytics: {
            totalCandidatesProcessed: 0,
            avgProcessingTime: 24,
            candidateDropoffRate: 0
          }
        }
      }));

      const workflow = new Workflow({
        companyId: new mongoose.Types.ObjectId(companyId),
        name: workflowData.name,
        description: workflowData.description,
        isTemplate: workflowData.isTemplate || false,
        isActive: true,
        stages,
        aiOptimizations: {
          optimized: false
        },
        workflowAnalytics: {
          performance: {
            avgTimeToHire: 30,
            candidateExperience: 5,
            hiringManagerSatisfaction: 5,
            costPerHire: 5000,
            qualityOfHire: 5
          },
          predictions: {
            expectedTimeToFill: 45,
            candidateDropoffRisk: 0.3,
            diversityProjection: {
              expectedDiversityScore: 0.5,
              improvementRecommendations: []
            }
          },
          lastAnalyzed: new Date()
        },
        jobs: [],
        usageCount: 0,
        createdBy: new mongoose.Types.ObjectId(createdBy)
      });

      const savedWorkflow = await workflow.save();

      logger.info('Workflow created successfully', {
        workflowId: savedWorkflow._id,
        name: savedWorkflow.name,
        companyId,
        createdBy
      });

      return savedWorkflow;
    } catch (error) {
      logger.error('Error creating workflow:', error);
      throw error;
    }
  }

  // Get workflow by ID
  static async getWorkflowById(workflowId: string, companyId: string): Promise<IWorkflow | null> {
    try {
      const workflow = await Workflow.findOne({
        _id: workflowId,
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false
      }).populate('createdBy', 'firstName lastName email');

      return workflow;
    } catch (error) {
      logger.error('Error getting workflow by ID:', error);
      throw error;
    }
  }

  // Get all workflows for a company
  static async getWorkflows(
    companyId: string,
    filters: {
      isTemplate?: boolean;
      isActive?: boolean;
      search?: string;
    } = {},
    pagination: {
      page: number;
      limit: number;
    } = { page: 1, limit: 10 }
  ): Promise<{
    workflows: IWorkflow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const query: any = {
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false
      };

      // Apply filters
      if (filters.isTemplate !== undefined) {
        query.isTemplate = filters.isTemplate;
      }

      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const skip = (pagination.page - 1) * pagination.limit;

      const [workflows, total] = await Promise.all([
        Workflow.find(query)
          .populate('createdBy', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pagination.limit),
        Workflow.countDocuments(query)
      ]);

      return {
        workflows,
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit)
      };
    } catch (error) {
      logger.error('Error getting workflows:', error);
      throw error;
    }
  }

  // Update workflow
  static async updateWorkflow(
    workflowId: string,
    updateData: UpdateWorkflowData,
    companyId: string,
    updatedBy: string
  ): Promise<IWorkflow | null> {
    try {
      const workflow = await Workflow.findOne({
        _id: workflowId,
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false
      });

      if (!workflow) {
        return null;
      }

      // Update stages if provided
      if (updateData.stages) {
        const updatedStages = updateData.stages.map((stage, index) => ({
          stageId: `stage-${Date.now()}-${uuidv4().substring(0, 8)}`,
          name: stage.name,
          type: stage.type,
          order: stage.order || index + 1,
          isRequired: stage.isRequired !== undefined ? stage.isRequired : true,
          estimatedDuration: stage.estimatedDuration || 3,
          autoAdvance: stage.autoAdvance || false,
          actions: (stage.actions || []).map(action => ({
            type: action.type,
            config: action.config,
            trigger: action.trigger,
            aiEnhanced: action.aiEnhanced ? {
              personalizeContent: action.aiEnhanced.personalizeContent || false,
              optimizeTiming: action.aiEnhanced.optimizeTiming || false,
              adaptToCandidate: action.aiEnhanced.adaptToCandidate || false
            } : undefined
          })),
          requirements: (stage.requirements || []).map(req => ({
            type: req.type,
            config: req.config
          })),
          aiIntelligence: {
            successPrediction: {
              candidatePassRate: 0.5,
              avgTimeInStage: stage.estimatedDuration || 3,
              commonReasons: [],
              improvementSuggestions: []
            },
            automatedScreening: {
              enabled: stage.aiIntelligence?.automatedScreening?.enabled || false,
              criteria: {
                skillRequirements: stage.aiIntelligence?.automatedScreening?.criteria?.skillRequirements || [],
                experienceLevel: stage.aiIntelligence?.automatedScreening?.criteria?.experienceLevel || 'entry' as const,
                cultureFitIndicators: stage.aiIntelligence?.automatedScreening?.criteria?.cultureFitIndicators || [],
                minimumScore: stage.aiIntelligence?.automatedScreening?.criteria?.minimumScore || 70
              },
              aiModel: stage.aiIntelligence?.automatedScreening?.aiModel || 'gemini-pro' as const
            },
            analytics: {
              totalCandidatesProcessed: 0,
              avgProcessingTime: 24,
              candidateDropoffRate: 0
            }
          }
        }));
        workflow.stages = updatedStages;
      }

      // Update other fields
      if (updateData.name) workflow.name = updateData.name;
      if (updateData.description !== undefined) workflow.description = updateData.description;
      if (updateData.isTemplate !== undefined) workflow.isTemplate = updateData.isTemplate;
      if (updateData.isActive !== undefined) workflow.isActive = updateData.isActive;

      const updatedWorkflow = await workflow.save();

      logger.info('Workflow updated successfully', {
        workflowId: updatedWorkflow._id,
        name: updatedWorkflow.name,
        companyId,
        updatedBy
      });

      return updatedWorkflow;
    } catch (error) {
      logger.error('Error updating workflow:', error);
      throw error;
    }
  }

  // Delete workflow (soft delete)
  static async deleteWorkflow(workflowId: string, companyId: string, deletedBy: string): Promise<boolean> {
    try {
      const workflow = await Workflow.findOne({
        _id: workflowId,
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false
      });

      if (!workflow) {
        return false;
      }

      workflow.isDeleted = true;
      workflow.deletedAt = new Date();
      workflow.deletedBy = new mongoose.Types.ObjectId(deletedBy);
      workflow.isActive = false;

      await workflow.save();

      logger.info('Workflow deleted successfully', {
        workflowId,
        companyId,
        deletedBy
      });

      return true;
    } catch (error) {
      logger.error('Error deleting workflow:', error);
      throw error;
    }
  }

  // Clone workflow
  static async cloneWorkflow(
    workflowId: string,
    companyId: string,
    createdBy: string,
    newName?: string
  ): Promise<IWorkflow | null> {
    try {
      const originalWorkflow = await Workflow.findOne({
        _id: workflowId,
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false
      });

      if (!originalWorkflow) {
        return null;
      }

      const clonedWorkflow = new Workflow({
        companyId: originalWorkflow.companyId,
        name: newName || `${originalWorkflow.name} (Copy)`,
        description: originalWorkflow.description,
        isTemplate: false,
        isActive: false,
        stages: originalWorkflow.stages.map(stage => ({
          stageId: `stage-${Date.now()}-${uuidv4().substring(0, 8)}`,
          name: stage.name,
          type: stage.type,
          order: stage.order,
          isRequired: stage.isRequired,
          estimatedDuration: stage.estimatedDuration,
          autoAdvance: stage.autoAdvance,
          actions: (stage.actions || []).map(action => ({
            type: action.type,
            config: action.config,
            trigger: action.trigger,
            aiEnhanced: action.aiEnhanced ? {
              personalizeContent: action.aiEnhanced.personalizeContent || false,
              optimizeTiming: action.aiEnhanced.optimizeTiming || false,
              adaptToCandidate: action.aiEnhanced.adaptToCandidate || false
            } : undefined
          })),
          requirements: (stage.requirements || []).map(req => ({
            type: req.type,
            config: req.config
          })),
          aiIntelligence: {
            successPrediction: stage.aiIntelligence.successPrediction,
            automatedScreening: {
              enabled: stage.aiIntelligence.automatedScreening?.enabled || false,
              criteria: {
                skillRequirements: stage.aiIntelligence.automatedScreening?.criteria?.skillRequirements || [],
                experienceLevel: stage.aiIntelligence.automatedScreening?.criteria?.experienceLevel || 'entry' as const,
                cultureFitIndicators: stage.aiIntelligence.automatedScreening?.criteria?.cultureFitIndicators || [],
                minimumScore: stage.aiIntelligence.automatedScreening?.criteria?.minimumScore || 70
              },
              aiModel: stage.aiIntelligence.automatedScreening?.aiModel || 'gemini-pro' as const
            },
            analytics: {
              totalCandidatesProcessed: 0,
              avgProcessingTime: 24,
              candidateDropoffRate: 0
            }
          }
        })),
        aiOptimizations: {
          optimized: false
        },
        workflowAnalytics: {
          performance: {
            avgTimeToHire: 30,
            candidateExperience: 5,
            hiringManagerSatisfaction: 5,
            costPerHire: 5000,
            qualityOfHire: 5
          },
          predictions: {
            expectedTimeToFill: 45,
            candidateDropoffRisk: 0.3,
            diversityProjection: {
              expectedDiversityScore: 0.5,
              improvementRecommendations: []
            }
          },
          lastAnalyzed: new Date()
        },
        jobs: [],
        usageCount: 0,
        createdBy: new mongoose.Types.ObjectId(createdBy)
      });

      const savedWorkflow = await clonedWorkflow.save();

      logger.info('Workflow cloned successfully', {
        originalWorkflowId: workflowId,
        clonedWorkflowId: savedWorkflow._id,
        companyId,
        createdBy
      });

      return savedWorkflow;
    } catch (error) {
      logger.error('Error cloning workflow:', error);
      throw error;
    }
  }

  // Optimize workflow with AI
  static async optimizeWorkflow(workflowId: string, companyId: string): Promise<IWorkflow | null> {
    try {
      const workflow = await Workflow.findOne({
        _id: workflowId,
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false
      });

      if (!workflow) {
        return null;
      }

      // Simulate AI optimization (you can integrate with actual AI service)
      const optimizationResults = {
        suggestedImprovements: [
          'Add automated skill screening in the first stage',
          'Reduce interview rounds from 3 to 2 for efficiency',
          'Implement parallel assessment and technical interview'
        ],
        bottleneckStages: ['technical_interview', 'reference_check'],
        recommendedTimelines: workflow.stages.map(stage => ({
          stageId: stage.stageId,
          currentAvgDays: stage.aiIntelligence.successPrediction.avgTimeInStage,
          recommendedDays: Math.max(1, stage.aiIntelligence.successPrediction.avgTimeInStage - 1),
          reasoning: 'Based on industry benchmarks and historical data'
        })),
        predictedSuccessRate: 0.85,
        complianceRecommendations: [
          'Ensure consistent evaluation criteria across all interviewers',
          'Add diversity checkpoints in the hiring process'
        ],
        diversityOptimizations: [
          'Implement blind resume screening',
          'Use structured interviews to reduce bias'
        ],
        optimizedAt: new Date(),
        aiConfidence: 0.92
      };

      workflow.aiOptimizations = {
        optimized: true,
        optimizationResults,
        lastOptimized: new Date()
      };

      const optimizedWorkflow = await workflow.save();

      logger.info('Workflow optimized successfully', {
        workflowId,
        companyId,
        aiConfidence: optimizationResults.aiConfidence
      });

      return optimizedWorkflow;
    } catch (error) {
      logger.error('Error optimizing workflow:', error);
      throw error;
    }
  }

  // Get workflow analytics
  static async getWorkflowAnalytics(workflowId: string, companyId: string): Promise<any> {
    try {
      const workflow = await Workflow.findOne({
        _id: workflowId,
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false
      });

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // You can enhance this with actual job and candidate data
      const analytics = {
        overview: {
          totalJobs: workflow.jobs.length,
          usageCount: workflow.usageCount,
          isOptimized: workflow.aiOptimizations.optimized,
          lastOptimized: workflow.aiOptimizations.lastOptimized
        },
        performance: workflow.workflowAnalytics.performance,
        predictions: workflow.workflowAnalytics.predictions,
        stageAnalytics: workflow.stages.map(stage => ({
          stageId: stage.stageId,
          name: stage.name,
          type: stage.type,
          analytics: stage.aiIntelligence.analytics,
          successPrediction: stage.aiIntelligence.successPrediction
        }))
      };

      return analytics;
    } catch (error) {
      logger.error('Error getting workflow analytics:', error);
      throw error;
    }
  }

  // Get workflow templates
  static async getWorkflowTemplates(): Promise<IWorkflow[]> {
    try {
      const templates = await Workflow.find({
        isTemplate: true,
        isActive: true,
        isDeleted: false
      }).sort({ usageCount: -1 });

      return templates;
    } catch (error) {
      logger.error('Error getting workflow templates:', error);
      throw error;
    }
  }
}