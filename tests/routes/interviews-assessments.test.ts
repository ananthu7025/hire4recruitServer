import { TestApiClient, TestDataFactory, expectValidationError, expectUnauthorized, expectForbidden, expectSuccess, expectCreated, expectNotFound } from '../helpers/testHelpers';

describe('Interview and Assessment Routes', () => {
  let apiClient: TestApiClient;
  let testUser: any;
  let testCompany: any;
  let testRole: any;
  let testCandidate: any;
  let testJob: any;

  beforeEach(async () => {
    apiClient = new TestApiClient();
    testCompany = await TestDataFactory.createTestCompany();
    testRole = await TestDataFactory.createTestRole(testCompany.id, {
      permissions: {
        interviews: { create: true, read: true, update: true, delete: true },
        assessments: { create: true, read: true, update: true, delete: true },
        candidates: { create: true, read: true, update: true, delete: true },
        jobs: { create: true, read: true, update: true, delete: true },
        employees: { create: true, read: true, update: true, delete: true },
        workflows: { create: true, read: true, update: true, delete: true },
        reports: { read: true },
        settings: { read: true, update: true }
      }
    });
    testUser = await TestDataFactory.createTestUser(testCompany.id, testRole.id);
    testCandidate = await TestDataFactory.createTestCandidate(testCompany.id, testUser.id);
    testJob = await TestDataFactory.createTestJob(testCompany.id, testUser.id);
  });

  describe('Interview Routes', () => {
    describe('GET /interviews', () => {
      beforeEach(async () => {
        // Create test interviews
        await createTestInterview({
          candidateId: testCandidate._id,
          jobId: testJob._id,
          type: 'technical',
          status: 'scheduled',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
        });
        await createTestInterview({
          candidateId: testCandidate._id,
          jobId: testJob._id,
          type: 'behavioral',
          status: 'completed',
          scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
        });
      });

      it('should get interviews successfully', async () => {
        const response = await apiClient.agent
          .get('/api/v1/interviews')
          .set('Authorization', `Bearer ${testUser.token}`);

        expectSuccess(response);
        expect(response.body.data.interviews).toBeDefined();
        expect(Array.isArray(response.body.data.interviews)).toBe(true);
        expect(response.body.data.interviews.length).toBeGreaterThanOrEqual(2);
        expect(response.body.data).toHaveProperty('pagination');
      });

      it('should filter by status', async () => {
        const response = await apiClient.agent
          .get('/api/v1/interviews')
          .set('Authorization', `Bearer ${testUser.token}`)
          .query({ status: 'scheduled' });

        expectSuccess(response);
        expect(response.body.data.interviews.every((interview: any) => interview.status === 'scheduled')).toBe(true);
      });

      it('should filter by type', async () => {
        const response = await apiClient.agent
          .get('/api/v1/interviews')
          .set('Authorization', `Bearer ${testUser.token}`)
          .query({ type: 'technical' });

        expectSuccess(response);
        expect(response.body.data.interviews.every((interview: any) => interview.type === 'technical')).toBe(true);
      });

      it('should filter by date range', async () => {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

        const response = await apiClient.agent
          .get('/api/v1/interviews')
          .set('Authorization', `Bearer ${testUser.token}`)
          .query({ startDate: tomorrow, endDate: dayAfter });

        expectSuccess(response);
        expect(response.body.data.interviews).toBeDefined();
      });

      it('should fail without authentication', async () => {
        const response = await apiClient.agent.get('/api/v1/interviews');
        expectUnauthorized(response);
      });

      it('should fail without interview read permission', async () => {
        const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
          permissions: {
            interviews: { create: false, read: false, update: false, delete: false },
            assessments: { create: true, read: true, update: true, delete: true },
            candidates: { create: true, read: true, update: true, delete: true },
            jobs: { create: true, read: true, update: true, delete: true },
            employees: { create: true, read: true, update: true, delete: true },
            workflows: { create: true, read: true, update: true, delete: true },
            reports: { read: true },
            settings: { read: true, update: true }
          }
        });
        const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
          email: 'restricted@example.com'
        });

        const response = await apiClient.agent
          .get('/api/v1/interviews')
          .set('Authorization', `Bearer ${restrictedUser.token}`);

        expectForbidden(response);
      });
    });

    describe('POST /interviews', () => {
      const validInterviewData = {
        candidateId: '',
        jobId: '',
        type: 'technical',
        duration: 60,
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        location: {
          type: 'video_call',
          meetingLink: 'https://meet.google.com/abc-def-ghi'
        },
        interviewers: [],
        description: 'Technical interview focusing on JavaScript and React',
        questions: [
          { question: 'Explain closures in JavaScript', type: 'technical' },
          { question: 'How does React hooks work?', type: 'technical' }
        ]
      };

      beforeEach(() => {
        validInterviewData.candidateId = testCandidate._id.toString();
        validInterviewData.jobId = testJob._id.toString();
        validInterviewData.interviewers = [testUser.id];
      });

      it('should create interview successfully', async () => {
        const response = await apiClient.agent
          .post('/api/v1/interviews')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send(validInterviewData);

        expectCreated(response);
        expect(response.body.data.interview.candidateId).toBe(validInterviewData.candidateId);
        expect(response.body.data.interview.type).toBe(validInterviewData.type);
        expect(response.body.data.interview.duration).toBe(validInterviewData.duration);
      });

      it('should fail with missing required fields', async () => {
        const incompleteData = { ...validInterviewData };
        delete incompleteData.candidateId;

        const response = await apiClient.agent
          .post('/api/v1/interviews')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send(incompleteData);

        expectValidationError(response, 'candidateId');
      });

      it('should fail with invalid interview type', async () => {
        const invalidData = { ...validInterviewData, type: 'invalid_type' };

        const response = await apiClient.agent
          .post('/api/v1/interviews')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send(invalidData);

        expectValidationError(response, 'type');
      });

      it('should fail with past scheduled time', async () => {
        const invalidData = {
          ...validInterviewData,
          scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
        };

        const response = await apiClient.agent
          .post('/api/v1/interviews')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send(invalidData);

        expectValidationError(response, 'scheduledAt');
      });

      it('should fail without interview create permission', async () => {
        const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
          permissions: {
            interviews: { create: false, read: true, update: false, delete: false },
            assessments: { create: true, read: true, update: true, delete: true },
            candidates: { create: true, read: true, update: true, delete: true },
            jobs: { create: true, read: true, update: true, delete: true },
            employees: { create: true, read: true, update: true, delete: true },
            workflows: { create: true, read: true, update: true, delete: true },
            reports: { read: true },
            settings: { read: true, update: true }
          }
        });
        const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
          email: 'restricted@example.com'
        });

        const response = await apiClient.agent
          .post('/api/v1/interviews')
          .set('Authorization', `Bearer ${restrictedUser.token}`)
          .send(validInterviewData);

        expectForbidden(response);
      });

      it('should fail with invalid candidate ID', async () => {
        const invalidData = { ...validInterviewData, candidateId: 'invalid-id' };

        const response = await apiClient.agent
          .post('/api/v1/interviews')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send(invalidData);

        expectValidationError(response, 'candidateId');
      });

      it('should fail with invalid duration', async () => {
        const invalidData = { ...validInterviewData, duration: 0 };

        const response = await apiClient.agent
          .post('/api/v1/interviews')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send(invalidData);

        expectValidationError(response, 'duration');
      });
    });

    describe('PUT /interviews/:interviewId', () => {
      let targetInterview: any;

      beforeEach(async () => {
        targetInterview = await createTestInterview({
          candidateId: testCandidate._id,
          jobId: testJob._id,
          type: 'technical',
          status: 'scheduled'
        });
      });

      const validUpdateData = {
        type: 'behavioral',
        duration: 90,
        scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        description: 'Updated interview description'
      };

      it('should update interview successfully', async () => {
        const response = await apiClient.agent
          .put(`/api/v1/interviews/${targetInterview._id}`)
          .set('Authorization', `Bearer ${testUser.token}`)
          .send(validUpdateData);

        expectSuccess(response);
        expect(response.body.data.interview.type).toBe(validUpdateData.type);
        expect(response.body.data.interview.duration).toBe(validUpdateData.duration);
      });

      it('should fail with invalid interview ID', async () => {
        const response = await apiClient.agent
          .put('/api/v1/interviews/invalid-interview-id')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send(validUpdateData);

        expectValidationError(response, 'interviewId');
      });

      it('should fail without interview update permission', async () => {
        const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
          permissions: {
            interviews: { create: false, read: true, update: false, delete: false },
            assessments: { create: true, read: true, update: true, delete: true },
            candidates: { create: true, read: true, update: true, delete: true },
            jobs: { create: true, read: true, update: true, delete: true },
            employees: { create: true, read: true, update: true, delete: true },
            workflows: { create: true, read: true, update: true, delete: true },
            reports: { read: true },
            settings: { read: true, update: true }
          }
        });
        const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
          email: 'restricted@example.com'
        });

        const response = await apiClient.agent
          .put(`/api/v1/interviews/${targetInterview._id}`)
          .set('Authorization', `Bearer ${restrictedUser.token}`)
          .send(validUpdateData);

        expectForbidden(response);
      });
    });
  });

  describe('Assessment Routes', () => {
    describe('GET /assessments', () => {
      beforeEach(async () => {
        // Create test assessments
        await createTestAssessment({
          candidateId: testCandidate._id,
          jobId: testJob._id,
          type: 'coding',
          status: 'pending',
          title: 'JavaScript Coding Challenge'
        });
        await createTestAssessment({
          candidateId: testCandidate._id,
          jobId: testJob._id,
          type: 'personality',
          status: 'completed',
          title: 'Personality Assessment'
        });
      });

      it('should get assessments successfully', async () => {
        const response = await apiClient.agent
          .get('/api/v1/assessments')
          .set('Authorization', `Bearer ${testUser.token}`);

        expectSuccess(response);
        expect(response.body.data.assessments).toBeDefined();
        expect(Array.isArray(response.body.data.assessments)).toBe(true);
        expect(response.body.data.assessments.length).toBeGreaterThanOrEqual(2);
        expect(response.body.data).toHaveProperty('pagination');
      });

      it('should filter by status', async () => {
        const response = await apiClient.agent
          .get('/api/v1/assessments')
          .set('Authorization', `Bearer ${testUser.token}`)
          .query({ status: 'pending' });

        expectSuccess(response);
        expect(response.body.data.assessments.every((assessment: any) => assessment.status === 'pending')).toBe(true);
      });

      it('should filter by type', async () => {
        const response = await apiClient.agent
          .get('/api/v1/assessments')
          .set('Authorization', `Bearer ${testUser.token}`)
          .query({ type: 'coding' });

        expectSuccess(response);
        expect(response.body.data.assessments.every((assessment: any) => assessment.type === 'coding')).toBe(true);
      });

      it('should fail without authentication', async () => {
        const response = await apiClient.agent.get('/api/v1/assessments');
        expectUnauthorized(response);
      });

      it('should fail without assessment read permission', async () => {
        const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
          permissions: {
            assessments: { create: false, read: false, update: false, delete: false },
            interviews: { create: true, read: true, update: true, delete: true },
            candidates: { create: true, read: true, update: true, delete: true },
            jobs: { create: true, read: true, update: true, delete: true },
            employees: { create: true, read: true, update: true, delete: true },
            workflows: { create: true, read: true, update: true, delete: true },
            reports: { read: true },
            settings: { read: true, update: true }
          }
        });
        const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
          email: 'restricted@example.com'
        });

        const response = await apiClient.agent
          .get('/api/v1/assessments')
          .set('Authorization', `Bearer ${restrictedUser.token}`);

        expectForbidden(response);
      });
    });

    describe('POST /assessments', () => {
      const validAssessmentData = {
        candidateId: '',
        jobId: '',
        type: 'coding',
        title: 'React Developer Assessment',
        description: 'Build a simple React application with given requirements',
        duration: 120, // 2 hours
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        questions: [
          {
            question: 'Create a React component that displays a list of users',
            type: 'coding',
            points: 50
          },
          {
            question: 'Implement state management using React hooks',
            type: 'coding',
            points: 50
          }
        ],
        passingScore: 70
      };

      beforeEach(() => {
        validAssessmentData.candidateId = testCandidate._id.toString();
        validAssessmentData.jobId = testJob._id.toString();
      });

      it('should create assessment successfully', async () => {
        const response = await apiClient.agent
          .post('/api/v1/assessments')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send(validAssessmentData);

        expectCreated(response);
        expect(response.body.data.assessment.candidateId).toBe(validAssessmentData.candidateId);
        expect(response.body.data.assessment.type).toBe(validAssessmentData.type);
        expect(response.body.data.assessment.title).toBe(validAssessmentData.title);
      });

      it('should fail with missing required fields', async () => {
        const incompleteData = { ...validAssessmentData };
        delete incompleteData.title;

        const response = await apiClient.agent
          .post('/api/v1/assessments')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send(incompleteData);

        expectValidationError(response, 'title');
      });

      it('should fail with invalid assessment type', async () => {
        const invalidData = { ...validAssessmentData, type: 'invalid_type' };

        const response = await apiClient.agent
          .post('/api/v1/assessments')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send(invalidData);

        expectValidationError(response, 'type');
      });

      it('should fail with invalid duration', async () => {
        const invalidData = { ...validAssessmentData, duration: -1 };

        const response = await apiClient.agent
          .post('/api/v1/assessments')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send(invalidData);

        expectValidationError(response, 'duration');
      });

      it('should fail without assessment create permission', async () => {
        const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
          permissions: {
            assessments: { create: false, read: true, update: false, delete: false },
            interviews: { create: true, read: true, update: true, delete: true },
            candidates: { create: true, read: true, update: true, delete: true },
            jobs: { create: true, read: true, update: true, delete: true },
            employees: { create: true, read: true, update: true, delete: true },
            workflows: { create: true, read: true, update: true, delete: true },
            reports: { read: true },
            settings: { read: true, update: true }
          }
        });
        const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
          email: 'restricted@example.com'
        });

        const response = await apiClient.agent
          .post('/api/v1/assessments')
          .set('Authorization', `Bearer ${restrictedUser.token}`)
          .send(validAssessmentData);

        expectForbidden(response);
      });

      it('should fail with past due date', async () => {
        const invalidData = {
          ...validAssessmentData,
          dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
        };

        const response = await apiClient.agent
          .post('/api/v1/assessments')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send(invalidData);

        expectValidationError(response, 'dueDate');
      });
    });

    describe('PUT /assessments/:assessmentId', () => {
      let targetAssessment: any;

      beforeEach(async () => {
        targetAssessment = await createTestAssessment({
          candidateId: testCandidate._id,
          jobId: testJob._id,
          type: 'coding',
          status: 'pending'
        });
      });

      const validUpdateData = {
        title: 'Updated Assessment Title',
        description: 'Updated assessment description',
        duration: 180,
        passingScore: 80
      };

      it('should update assessment successfully', async () => {
        const response = await apiClient.agent
          .put(`/api/v1/assessments/${targetAssessment._id}`)
          .set('Authorization', `Bearer ${testUser.token}`)
          .send(validUpdateData);

        expectSuccess(response);
        expect(response.body.data.assessment.title).toBe(validUpdateData.title);
        expect(response.body.data.assessment.duration).toBe(validUpdateData.duration);
      });

      it('should fail with invalid assessment ID', async () => {
        const response = await apiClient.agent
          .put('/api/v1/assessments/invalid-assessment-id')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send(validUpdateData);

        expectValidationError(response, 'assessmentId');
      });

      it('should fail without assessment update permission', async () => {
        const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
          permissions: {
            assessments: { create: false, read: true, update: false, delete: false },
            interviews: { create: true, read: true, update: true, delete: true },
            candidates: { create: true, read: true, update: true, delete: true },
            jobs: { create: true, read: true, update: true, delete: true },
            employees: { create: true, read: true, update: true, delete: true },
            workflows: { create: true, read: true, update: true, delete: true },
            reports: { read: true },
            settings: { read: true, update: true }
          }
        });
        const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
          email: 'restricted@example.com'
        });

        const response = await apiClient.agent
          .put(`/api/v1/assessments/${targetAssessment._id}`)
          .set('Authorization', `Bearer ${restrictedUser.token}`)
          .send(validUpdateData);

        expectForbidden(response);
      });
    });
  });

  // Helper functions to create test data
  async function createTestInterview(data: any) {
    const mockInterview = {
      _id: new (require('mongoose')).Types.ObjectId(),
      companyId: testCompany.id,
      candidateId: data.candidateId,
      jobId: data.jobId,
      type: data.type || 'technical',
      status: data.status || 'scheduled',
      duration: data.duration || 60,
      scheduledAt: data.scheduledAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
      location: data.location || { type: 'video_call' },
      interviewers: data.interviewers || [testUser.id],
      createdBy: testUser.id,
      updatedBy: testUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };

    // Mock database save
    return mockInterview;
  }

  async function createTestAssessment(data: any) {
    const mockAssessment = {
      _id: new (require('mongoose')).Types.ObjectId(),
      companyId: testCompany.id,
      candidateId: data.candidateId,
      jobId: data.jobId,
      type: data.type || 'coding',
      status: data.status || 'pending',
      title: data.title || 'Test Assessment',
      description: data.description || 'Test assessment description',
      duration: data.duration || 120,
      dueDate: data.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      questions: data.questions || [],
      passingScore: data.passingScore || 70,
      createdBy: testUser.id,
      updatedBy: testUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    };

    // Mock database save
    return mockAssessment;
  }
});