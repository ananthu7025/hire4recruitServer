import { TestApiClient, TestDataFactory, expectValidationError, expectUnauthorized, expectForbidden, expectSuccess, expectCreated, expectNotFound } from '../helpers/testHelpers';
import Workflow from '../../src/models/Workflow';

describe('Workflow Routes', () => {
  let apiClient: TestApiClient;
  let testUser: any;
  let testCompany: any;
  let testRole: any;

  beforeEach(async () => {
    apiClient = new TestApiClient();
    testCompany = await TestDataFactory.createTestCompany();
    testRole = await TestDataFactory.createTestRole(testCompany.id, {
      permissions: {
        workflows: { create: true, read: true, update: true, delete: true },
        jobs: { create: true, read: true, update: true, delete: true },
        candidates: { create: true, read: true, update: true, delete: true },
        interviews: { create: true, read: true, update: true, delete: true },
        assessments: { create: true, read: true, update: true, delete: true },
        employees: { create: true, read: true, update: true, delete: true },
        reports: { read: true },
        settings: { read: true, update: true }
      }
    });
    testUser = await TestDataFactory.createTestUser(testCompany.id, testRole.id);
  });

  describe('GET /workflows', () => {
    beforeEach(async () => {
      // Create test workflows
      await TestDataFactory.createTestWorkflow(testCompany.id, testUser.id, {
        name: 'Engineering Workflow',
        description: 'Standard engineering hiring process',
        isTemplate: false,
        isActive: true,
        stages: [
          {
            name: 'Application Review',
            type: 'screening',
            order: 1,
            isRequired: true,
            estimatedDuration: 2
          },
          {
            name: 'Technical Interview',
            type: 'interview',
            order: 2,
            isRequired: true,
            estimatedDuration: 3
          }
        ]
      });
      await TestDataFactory.createTestWorkflow(testCompany.id, testUser.id, {
        name: 'Marketing Template',
        description: 'Template for marketing positions',
        isTemplate: true,
        isActive: true
      });
      await TestDataFactory.createTestWorkflow(testCompany.id, testUser.id, {
        name: 'Inactive Workflow',
        description: 'Disabled workflow',
        isTemplate: false,
        isActive: false
      });
    });

    it('should get workflows successfully', async () => {
      const response = await apiClient.getWorkflows(testUser.token);

      expectSuccess(response);
      expect(response.body.data.workflows).toBeDefined();
      expect(Array.isArray(response.body.data.workflows)).toBe(true);
      expect(response.body.data.workflows.length).toBeGreaterThanOrEqual(3);
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should filter by template status', async () => {
      const response = await apiClient.getWorkflows(testUser.token, { isTemplate: 'true' });

      expectSuccess(response);
      expect(response.body.data.workflows.every((workflow: any) => workflow.isTemplate)).toBe(true);
    });

    it('should filter by active status', async () => {
      const response = await apiClient.getWorkflows(testUser.token, { isActive: 'true' });

      expectSuccess(response);
      expect(response.body.data.workflows.every((workflow: any) => workflow.isActive)).toBe(true);
    });

    it('should search by name', async () => {
      const response = await apiClient.getWorkflows(testUser.token, { search: 'Engineering' });

      expectSuccess(response);
      expect(response.body.data.workflows.some((workflow: any) => workflow.name.includes('Engineering'))).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await apiClient.getWorkflows(testUser.token, { page: '1', limit: '2' });

      expectSuccess(response);
      expect(response.body.data.workflows.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.getWorkflows('');
      expectUnauthorized(response);
    });

    it('should fail without workflow read permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          workflows: { create: false, read: false, update: false, delete: false },
          jobs: { create: true, read: true, update: true, delete: true },
          candidates: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
          employees: { create: true, read: true, update: true, delete: true },
          reports: { read: true },
          settings: { read: true, update: true }
        }
      });
      const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
        email: 'restricted@example.com'
      });

      const response = await apiClient.getWorkflows(restrictedUser.token);
      expectForbidden(response);
    });
  });

  describe('POST /workflows', () => {
    const validWorkflowData = {
      name: 'New Workflow',
      description: 'A comprehensive hiring workflow',
      isTemplate: false,
      stages: [
        {
          name: 'Application Review',
          type: 'screening',
          order: 1,
          isRequired: true,
          estimatedDuration: 2,
          autoAdvance: false,
          actions: [{
            type: 'send_email',
            config: { template: 'application_received' },
            trigger: 'on_enter',
            aiEnhanced: {
              personalizeContent: true,
              optimizeTiming: false,
              adaptToCandidate: true
            }
          }],
          requirements: [{
            type: 'manual_approval',
            config: { requiredApprovers: 1 }
          }],
          aiIntelligence: {
            automatedScreening: {
              enabled: true,
              criteria: {
                skillRequirements: ['JavaScript', 'React'],
                experienceLevel: 'mid',
                minimumScore: 75
              },
              aiModel: 'gemini-pro'
            }
          }
        },
        {
          name: 'Technical Interview',
          type: 'interview',
          order: 2,
          isRequired: true,
          estimatedDuration: 3,
          autoAdvance: false,
          actions: [{
            type: 'schedule_interview',
            config: { duration: 60, type: 'technical' },
            trigger: 'on_enter'
          }]
        }
      ]
    };

    it('should create workflow successfully', async () => {
      const response = await apiClient.createWorkflow(testUser.token, validWorkflowData);

      expectCreated(response);
      expect(response.body.data.workflow.name).toBe(validWorkflowData.name);
      expect(response.body.data.workflow.stages).toHaveLength(2);
      expect(response.body.data.workflow.stages[0].name).toBe('Application Review');

      // Verify in database
      const createdWorkflow = await Workflow.findOne({ name: validWorkflowData.name, companyId: testCompany.id });
      expect(createdWorkflow).toBeTruthy();
      expect(createdWorkflow?.description).toBe(validWorkflowData.description);
    });

    it('should fail with missing required fields', async () => {
      const incompleteData = { ...validWorkflowData };
      delete incompleteData.name;

      const response = await apiClient.createWorkflow(testUser.token, incompleteData);
      expectValidationError(response, 'name');
    });

    it('should fail with empty stages array', async () => {
      const invalidData = { ...validWorkflowData, stages: [] };
      const response = await apiClient.createWorkflow(testUser.token, invalidData);
      expectValidationError(response, 'stages');
    });

    it('should fail with invalid stage type', async () => {
      const invalidData = {
        ...validWorkflowData,
        stages: [{
          name: 'Invalid Stage',
          type: 'invalid_type',
          order: 1,
          isRequired: true
        }]
      };
      const response = await apiClient.createWorkflow(testUser.token, invalidData);
      expectValidationError(response, 'type');
    });

    it('should fail with duplicate stage orders', async () => {
      const invalidData = {
        ...validWorkflowData,
        stages: [
          { name: 'Stage 1', type: 'screening', order: 1, isRequired: true },
          { name: 'Stage 2', type: 'interview', order: 1, isRequired: true } // Duplicate order
        ]
      };
      const response = await apiClient.createWorkflow(testUser.token, invalidData);
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid action type', async () => {
      const invalidData = {
        ...validWorkflowData,
        stages: [{
          name: 'Test Stage',
          type: 'screening',
          order: 1,
          isRequired: true,
          actions: [{
            type: 'invalid_action_type',
            config: {},
            trigger: 'on_enter'
          }]
        }]
      };
      const response = await apiClient.createWorkflow(testUser.token, invalidData);
      expectValidationError(response, 'type');
    });

    it('should fail without workflow create permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          workflows: { create: false, read: true, update: false, delete: false },
          jobs: { create: true, read: true, update: true, delete: true },
          candidates: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
          employees: { create: true, read: true, update: true, delete: true },
          reports: { read: true },
          settings: { read: true, update: true }
        }
      });
      const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
        email: 'restricted@example.com'
      });

      const response = await apiClient.createWorkflow(restrictedUser.token, validWorkflowData);
      expectForbidden(response);
    });

    it('should create workflow with minimal required data', async () => {
      const minimalData = {
        name: 'Minimal Workflow',
        stages: [{
          name: 'Simple Stage',
          type: 'screening',
          order: 1,
          isRequired: true
        }]
      };

      const response = await apiClient.createWorkflow(testUser.token, minimalData);
      expectCreated(response);
      expect(response.body.data.workflow.name).toBe(minimalData.name);
    });
  });

  describe('GET /workflows/:workflowId', () => {
    let targetWorkflow: any;

    beforeEach(async () => {
      targetWorkflow = await TestDataFactory.createTestWorkflow(testCompany.id, testUser.id, {
        name: 'Target Workflow'
      });
    });

    it('should get workflow by ID successfully', async () => {
      const response = await apiClient.agent
        .get(`/api/v1/workflows/${targetWorkflow._id}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.workflow.name).toBe('Target Workflow');
      expect(response.body.data.workflow.stages).toBeDefined();
    });

    it('should fail with invalid workflow ID format', async () => {
      const response = await apiClient.agent
        .get('/api/v1/workflows/invalid-workflow-id')
        .set('Authorization', `Bearer ${testUser.token}`);

      expectValidationError(response, 'workflowId');
    });

    it('should fail with non-existent workflow ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await apiClient.agent
        .get(`/api/v1/workflows/${fakeId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectNotFound(response);
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.agent
        .get(`/api/v1/workflows/${targetWorkflow._id}`);

      expectUnauthorized(response);
    });

    it('should fail without workflow read permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          workflows: { create: false, read: false, update: false, delete: false },
          jobs: { create: true, read: true, update: true, delete: true },
          candidates: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
          employees: { create: true, read: true, update: true, delete: true },
          reports: { read: true },
          settings: { read: true, update: true }
        }
      });
      const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
        email: 'restricted@example.com'
      });

      const response = await apiClient.agent
        .get(`/api/v1/workflows/${targetWorkflow._id}`)
        .set('Authorization', `Bearer ${restrictedUser.token}`);

      expectForbidden(response);
    });
  });

  describe('PUT /workflows/:workflowId', () => {
    let targetWorkflow: any;

    beforeEach(async () => {
      targetWorkflow = await TestDataFactory.createTestWorkflow(testCompany.id, testUser.id, {
        name: 'Updatable Workflow'
      });
    });

    const validUpdateData = {
      name: 'Updated Workflow Name',
      description: 'Updated workflow description',
      stages: [
        {
          name: 'Updated Stage 1',
          type: 'screening',
          order: 1,
          isRequired: true,
          estimatedDuration: 3
        },
        {
          name: 'New Stage 2',
          type: 'interview',
          order: 2,
          isRequired: false,
          estimatedDuration: 5
        }
      ]
    };

    it('should update workflow successfully', async () => {
      const response = await apiClient.updateWorkflow(testUser.token, targetWorkflow._id.toString(), validUpdateData);

      expectSuccess(response);
      expect(response.body.data.workflow.name).toBe(validUpdateData.name);
      expect(response.body.data.workflow.description).toBe(validUpdateData.description);
      expect(response.body.data.workflow.stages).toHaveLength(2);

      // Verify in database
      const updatedWorkflow = await Workflow.findById(targetWorkflow._id);
      expect(updatedWorkflow?.name).toBe(validUpdateData.name);
    });

    it('should fail with invalid workflow ID', async () => {
      const response = await apiClient.updateWorkflow(testUser.token, 'invalid-workflow-id', validUpdateData);
      expectValidationError(response, 'workflowId');
    });

    it('should fail without workflow update permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          workflows: { create: false, read: true, update: false, delete: false },
          jobs: { create: true, read: true, update: true, delete: true },
          candidates: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
          employees: { create: true, read: true, update: true, delete: true },
          reports: { read: true },
          settings: { read: true, update: true }
        }
      });
      const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
        email: 'restricted@example.com'
      });

      const response = await apiClient.updateWorkflow(restrictedUser.token, targetWorkflow._id.toString(), validUpdateData);
      expectForbidden(response);
    });

    it('should handle partial updates', async () => {
      const partialData = { name: 'Partially Updated Workflow' };
      const response = await apiClient.updateWorkflow(testUser.token, targetWorkflow._id.toString(), partialData);

      expectSuccess(response);
      expect(response.body.data.workflow.name).toBe(partialData.name);
      expect(response.body.data.workflow.companyId).toBe(testCompany.id); // Should remain unchanged
    });

    it('should fail with empty stages array', async () => {
      const invalidData = { stages: [] };
      const response = await apiClient.updateWorkflow(testUser.token, targetWorkflow._id.toString(), invalidData);
      expectValidationError(response, 'stages');
    });
  });

  describe('DELETE /workflows/:workflowId', () => {
    let deletableWorkflow: any;

    beforeEach(async () => {
      deletableWorkflow = await TestDataFactory.createTestWorkflow(testCompany.id, testUser.id, {
        name: 'Deletable Workflow'
      });
    });

    it('should delete workflow successfully', async () => {
      const response = await apiClient.deleteWorkflow(testUser.token, deletableWorkflow._id.toString());

      expectSuccess(response);
      expect(response.body.data.message).toContain('successfully');

      // Verify in database (soft delete)
      const deletedWorkflow = await Workflow.findById(deletableWorkflow._id);
      expect(deletedWorkflow?.isDeleted).toBe(true);
    });

    it('should fail with invalid workflow ID', async () => {
      const response = await apiClient.deleteWorkflow(testUser.token, 'invalid-workflow-id');
      expectValidationError(response, 'workflowId');
    });

    it('should fail without workflow delete permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          workflows: { create: false, read: true, update: false, delete: false },
          jobs: { create: true, read: true, update: true, delete: true },
          candidates: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
          employees: { create: true, read: true, update: true, delete: true },
          reports: { read: true },
          settings: { read: true, update: true }
        }
      });
      const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
        email: 'restricted@example.com'
      });

      const response = await apiClient.deleteWorkflow(restrictedUser.token, deletableWorkflow._id.toString());
      expectForbidden(response);
    });

    it('should fail with non-existent workflow ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await apiClient.deleteWorkflow(testUser.token, fakeId);
      expectNotFound(response);
    });

    it('should fail to delete workflow with active jobs', async () => {
      // Create a job using this workflow
      await TestDataFactory.createTestJob(testCompany.id, testUser.id, {
        workflowId: deletableWorkflow._id,
        isActive: true
      });

      const response = await apiClient.deleteWorkflow(testUser.token, deletableWorkflow._id.toString());

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('active jobs');
    });
  });

  describe('POST /workflows/:workflowId/clone', () => {
    let sourceWorkflow: any;

    beforeEach(async () => {
      sourceWorkflow = await TestDataFactory.createTestWorkflow(testCompany.id, testUser.id, {
        name: 'Source Workflow',
        description: 'Original workflow to clone',
        stages: [
          { name: 'Stage 1', type: 'screening', order: 1, isRequired: true },
          { name: 'Stage 2', type: 'interview', order: 2, isRequired: true }
        ]
      });
    });

    it('should clone workflow successfully', async () => {
      const response = await apiClient.agent
        .post(`/api/v1/workflows/${sourceWorkflow._id}/clone`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ name: 'Cloned Workflow' });

      expectCreated(response);
      expect(response.body.data.workflow.name).toBe('Cloned Workflow');
      expect(response.body.data.workflow.stages).toHaveLength(2);
      expect(response.body.data.workflow._id).not.toBe(sourceWorkflow._id.toString());

      // Verify in database
      const clonedWorkflow = await Workflow.findOne({ name: 'Cloned Workflow', companyId: testCompany.id });
      expect(clonedWorkflow).toBeTruthy();
      expect(clonedWorkflow?.description).toBe(sourceWorkflow.description);
    });

    it('should clone workflow with auto-generated name if not provided', async () => {
      const response = await apiClient.agent
        .post(`/api/v1/workflows/${sourceWorkflow._id}/clone`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({});

      expectCreated(response);
      expect(response.body.data.workflow.name).toContain('Copy of');
      expect(response.body.data.workflow.name).toContain('Source Workflow');
    });

    it('should fail with invalid workflow ID', async () => {
      const response = await apiClient.agent
        .post('/api/v1/workflows/invalid-workflow-id/clone')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ name: 'Clone Name' });

      expectValidationError(response, 'workflowId');
    });

    it('should fail without workflow create permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          workflows: { create: false, read: true, update: false, delete: false },
          jobs: { create: true, read: true, update: true, delete: true },
          candidates: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
          employees: { create: true, read: true, update: true, delete: true },
          reports: { read: true },
          settings: { read: true, update: true }
        }
      });
      const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
        email: 'restricted@example.com'
      });

      const response = await apiClient.agent
        .post(`/api/v1/workflows/${sourceWorkflow._id}/clone`)
        .set('Authorization', `Bearer ${restrictedUser.token}`)
        .send({ name: 'Clone Name' });

      expectForbidden(response);
    });
  });

  describe('PUT /workflows/:workflowId/status', () => {
    let targetWorkflow: any;

    beforeEach(async () => {
      targetWorkflow = await TestDataFactory.createTestWorkflow(testCompany.id, testUser.id, {
        name: 'Status Workflow',
        isActive: true
      });
    });

    it('should toggle workflow status successfully', async () => {
      const response = await apiClient.agent
        .put(`/api/v1/workflows/${targetWorkflow._id}/status`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ isActive: false });

      expectSuccess(response);
      expect(response.body.data.workflow.isActive).toBe(false);

      // Verify in database
      const updatedWorkflow = await Workflow.findById(targetWorkflow._id);
      expect(updatedWorkflow?.isActive).toBe(false);
    });

    it('should fail with invalid status value', async () => {
      const response = await apiClient.agent
        .put(`/api/v1/workflows/${targetWorkflow._id}/status`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ isActive: 'invalid' });

      expectValidationError(response, 'isActive');
    });

    it('should fail without workflow update permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          workflows: { create: false, read: true, update: false, delete: false },
          jobs: { create: true, read: true, update: true, delete: true },
          candidates: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
          employees: { create: true, read: true, update: true, delete: true },
          reports: { read: true },
          settings: { read: true, update: true }
        }
      });
      const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
        email: 'restricted@example.com'
      });

      const response = await apiClient.agent
        .put(`/api/v1/workflows/${targetWorkflow._id}/status`)
        .set('Authorization', `Bearer ${restrictedUser.token}`)
        .send({ isActive: false });

      expectForbidden(response);
    });
  });

  describe('GET /workflows/templates', () => {
    beforeEach(async () => {
      // Create workflow templates
      await TestDataFactory.createTestWorkflow(testCompany.id, testUser.id, {
        name: 'Engineering Template',
        isTemplate: true,
        isActive: true
      });
      await TestDataFactory.createTestWorkflow(testCompany.id, testUser.id, {
        name: 'Sales Template',
        isTemplate: true,
        isActive: true
      });
      await TestDataFactory.createTestWorkflow(testCompany.id, testUser.id, {
        name: 'Regular Workflow',
        isTemplate: false,
        isActive: true
      });
    });

    it('should get workflow templates successfully', async () => {
      const response = await apiClient.agent
        .get('/api/v1/workflows/templates')
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.templates).toBeDefined();
      expect(Array.isArray(response.body.data.templates)).toBe(true);
      expect(response.body.data.templates.every((template: any) => template.isTemplate)).toBe(true);
      expect(response.body.data.templates.length).toBeGreaterThanOrEqual(2);
    });

    it('should fail without workflow read permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          workflows: { create: false, read: false, update: false, delete: false },
          jobs: { create: true, read: true, update: true, delete: true },
          candidates: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
          employees: { create: true, read: true, update: true, delete: true },
          reports: { read: true },
          settings: { read: true, update: true }
        }
      });
      const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
        email: 'restricted@example.com'
      });

      const response = await apiClient.agent
        .get('/api/v1/workflows/templates')
        .set('Authorization', `Bearer ${restrictedUser.token}`);

      expectForbidden(response);
    });
  });

  describe('GET /workflows/:workflowId/analytics', () => {
    let analyticsWorkflow: any;

    beforeEach(async () => {
      analyticsWorkflow = await TestDataFactory.createTestWorkflow(testCompany.id, testUser.id, {
        name: 'Analytics Workflow'
      });
    });

    it('should get workflow analytics successfully', async () => {
      const response = await apiClient.agent
        .get(`/api/v1/workflows/${analyticsWorkflow._id}/analytics`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.analytics).toBeDefined();
      expect(response.body.data.analytics).toHaveProperty('totalApplications');
      expect(response.body.data.analytics).toHaveProperty('averageTimeToHire');
      expect(response.body.data.analytics).toHaveProperty('stageAnalytics');
    });

    it('should filter analytics by date range', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await apiClient.agent
        .get(`/api/v1/workflows/${analyticsWorkflow._id}/analytics`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ startDate, endDate });

      expectSuccess(response);
      expect(response.body.data.analytics).toBeDefined();
    });

    it('should fail without workflow read permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          workflows: { create: false, read: false, update: false, delete: false },
          jobs: { create: true, read: true, update: true, delete: true },
          candidates: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
          employees: { create: true, read: true, update: true, delete: true },
          reports: { read: true },
          settings: { read: true, update: true }
        }
      });
      const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
        email: 'restricted@example.com'
      });

      const response = await apiClient.agent
        .get(`/api/v1/workflows/${analyticsWorkflow._id}/analytics`)
        .set('Authorization', `Bearer ${restrictedUser.token}`);

      expectForbidden(response);
    });
  });
});