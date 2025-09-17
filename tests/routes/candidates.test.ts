import { TestApiClient, TestDataFactory, expectValidationError, expectUnauthorized, expectForbidden, expectSuccess, expectCreated, expectNotFound } from '../helpers/testHelpers';
import Candidate from '../../src/models/Candidate';

describe('Candidate Routes', () => {
  let apiClient: TestApiClient;
  let testUser: any;
  let testCompany: any;
  let testRole: any;

  beforeEach(async () => {
    apiClient = new TestApiClient();
    testCompany = await TestDataFactory.createTestCompany();
    testRole = await TestDataFactory.createTestRole(testCompany.id, {
      permissions: {
        candidates: { create: true, read: true, update: true, delete: true },
        jobs: { create: true, read: true, update: true, delete: true },
        interviews: { create: true, read: true, update: true, delete: true },
        assessments: { create: true, read: true, update: true, delete: true },
        employees: { create: true, read: true, update: true, delete: true },
        workflows: { create: true, read: true, update: true, delete: true },
        reports: { read: true },
        settings: { read: true, update: true }
      }
    });
    testUser = await TestDataFactory.createTestUser(testCompany.id, testRole.id);
  });

  describe('GET /candidates', () => {
    beforeEach(async () => {
      // Create test candidates
      await TestDataFactory.createTestCandidate(testCompany.id, testUser.id, {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        skills: ['JavaScript', 'React', 'Node.js'],
        status: 'active',
        source: 'career_site'
      });
      await TestDataFactory.createTestCandidate(testCompany.id, testUser.id, {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        skills: ['Python', 'Django', 'PostgreSQL'],
        status: 'interviewed',
        source: 'referral'
      });
      await TestDataFactory.createTestCandidate(testCompany.id, testUser.id, {
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob.johnson@example.com',
        skills: ['Java', 'Spring', 'MySQL'],
        status: 'hired',
        source: 'job_board'
      });
    });

    it('should get candidates successfully', async () => {
      const response = await apiClient.getCandidates(testUser.token);

      expectSuccess(response);
      expect(response.body.data.candidates).toBeDefined();
      expect(Array.isArray(response.body.data.candidates)).toBe(true);
      expect(response.body.data.candidates.length).toBeGreaterThanOrEqual(3);
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should filter by status', async () => {
      const response = await apiClient.getCandidates(testUser.token, { status: 'active' });

      expectSuccess(response);
      expect(response.body.data.candidates.every((candidate: any) => candidate.status === 'active')).toBe(true);
    });

    it('should filter by source', async () => {
      const response = await apiClient.getCandidates(testUser.token, { source: 'career_site' });

      expectSuccess(response);
      expect(response.body.data.candidates.every((candidate: any) => candidate.source === 'career_site')).toBe(true);
    });

    it('should search by name', async () => {
      const response = await apiClient.getCandidates(testUser.token, { search: 'John' });

      expectSuccess(response);
      expect(response.body.data.candidates.some((candidate: any) => candidate.firstName.includes('John'))).toBe(true);
    });

    it('should filter by skills', async () => {
      const response = await apiClient.getCandidates(testUser.token, { skills: 'JavaScript,React' });

      expectSuccess(response);
      expect(response.body.data.candidates.length).toBeGreaterThan(0);
    });

    it('should paginate results', async () => {
      const response = await apiClient.getCandidates(testUser.token, { page: '1', limit: '2' });

      expectSuccess(response);
      expect(response.body.data.candidates.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should sort by creation date', async () => {
      const response = await apiClient.getCandidates(testUser.token, { sortBy: 'createdAt', sortOrder: 'desc' });

      expectSuccess(response);
      const candidates = response.body.data.candidates;
      for (let i = 1; i < candidates.length; i++) {
        expect(new Date(candidates[i-1].createdAt).getTime()).toBeGreaterThanOrEqual(new Date(candidates[i].createdAt).getTime());
      }
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.getCandidates('');
      expectUnauthorized(response);
    });

    it('should fail without candidate read permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          candidates: { create: false, read: false, update: false, delete: false },
          jobs: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
          employees: { create: true, read: true, update: true, delete: true },
          workflows: { create: true, read: true, update: true, delete: true },
          reports: { read: true },
          settings: { read: true, update: true }
        }
      });
      const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
        email: 'restricted@example.com'
      });

      const response = await apiClient.getCandidates(restrictedUser.token);
      expectForbidden(response);
    });
  });

  describe('POST /candidates', () => {
    const validCandidateData = {
      firstName: 'Alice',
      lastName: 'Williams',
      email: 'alice.williams@example.com',
      phone: '+1234567890',
      currentPosition: 'Software Engineer',
      currentCompany: 'Tech Corp',
      experience: {
        totalYears: 5,
        relevantYears: 3
      },
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
      education: [{
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        institution: 'Tech University',
        graduationYear: 2019
      }],
      expectedSalary: {
        min: 80000,
        max: 120000,
        currency: 'USD'
      },
      availabilityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      source: 'career_site',
      notes: 'Strong candidate with excellent technical skills'
    };

    it('should create candidate successfully', async () => {
      const response = await apiClient.createCandidate(testUser.token, validCandidateData);

      expectCreated(response);
      expect(response.body.data.candidate.firstName).toBe(validCandidateData.firstName);
      expect(response.body.data.candidate.email).toBe(validCandidateData.email);
      expect(response.body.data.candidate.skills).toEqual(validCandidateData.skills);

      // Verify in database
      const createdCandidate = await Candidate.findOne({ email: validCandidateData.email, companyId: testCompany.id });
      expect(createdCandidate).toBeTruthy();
      expect(createdCandidate?.firstName).toBe(validCandidateData.firstName);
    });

    it('should fail with missing required fields', async () => {
      const incompleteData = { ...validCandidateData };
      delete incompleteData.firstName;

      const response = await apiClient.createCandidate(testUser.token, incompleteData);
      expectValidationError(response, 'firstName');
    });

    it('should fail with invalid email format', async () => {
      const invalidData = { ...validCandidateData, email: 'invalid-email' };
      const response = await apiClient.createCandidate(testUser.token, invalidData);
      expectValidationError(response, 'email');
    });

    it('should fail with duplicate email', async () => {
      // Create first candidate
      await apiClient.createCandidate(testUser.token, validCandidateData);

      // Try to create with same email
      const duplicateData = { ...validCandidateData, firstName: 'Different' };
      const response = await apiClient.createCandidate(testUser.token, duplicateData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should fail with invalid source', async () => {
      const invalidData = { ...validCandidateData, source: 'invalid_source' };
      const response = await apiClient.createCandidate(testUser.token, invalidData);
      expectValidationError(response, 'source');
    });

    it('should fail without candidate create permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          candidates: { create: false, read: true, update: false, delete: false },
          jobs: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
          employees: { create: true, read: true, update: true, delete: true },
          workflows: { create: true, read: true, update: true, delete: true },
          reports: { read: true },
          settings: { read: true, update: true }
        }
      });
      const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
        email: 'restricted@example.com'
      });

      const response = await apiClient.createCandidate(restrictedUser.token, validCandidateData);
      expectForbidden(response);
    });

    it('should create candidate with minimal required data', async () => {
      const minimalData = {
        firstName: 'Minimal',
        lastName: 'Candidate',
        email: 'minimal@example.com'
      };

      const response = await apiClient.createCandidate(testUser.token, minimalData);
      expectCreated(response);
      expect(response.body.data.candidate.firstName).toBe(minimalData.firstName);
    });

    it('should handle invalid experience data', async () => {
      const invalidData = {
        ...validCandidateData,
        experience: { totalYears: -1, relevantYears: 5 }
      };
      const response = await apiClient.createCandidate(testUser.token, invalidData);
      expectValidationError(response, 'experience');
    });
  });

  describe('GET /candidates/search', () => {
    beforeEach(async () => {
      await TestDataFactory.createTestCandidate(testCompany.id, testUser.id, {
        firstName: 'Searchable',
        lastName: 'Candidate',
        email: 'searchable@example.com',
        skills: ['Python', 'Machine Learning', 'Data Science'],
        currentPosition: 'Data Scientist'
      });
    });

    it('should search candidates by name', async () => {
      const response = await apiClient.agent
        .get('/api/v1/candidates/search')
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ q: 'Searchable' });

      expectSuccess(response);
      expect(response.body.data.candidates.some((candidate: any) => candidate.firstName === 'Searchable')).toBe(true);
    });

    it('should search candidates by skills', async () => {
      const response = await apiClient.agent
        .get('/api/v1/candidates/search')
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ skills: 'Python,Machine Learning' });

      expectSuccess(response);
      expect(response.body.data.candidates.length).toBeGreaterThan(0);
    });

    it('should search candidates by position', async () => {
      const response = await apiClient.agent
        .get('/api/v1/candidates/search')
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ position: 'Data Scientist' });

      expectSuccess(response);
      expect(response.body.data.candidates.some((candidate: any) => candidate.currentPosition === 'Data Scientist')).toBe(true);
    });

    it('should fail without search parameters', async () => {
      const response = await apiClient.agent
        .get('/api/v1/candidates/search')
        .set('Authorization', `Bearer ${testUser.token}`);

      expectValidationError(response, 'query');
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.agent
        .get('/api/v1/candidates/search')
        .query({ q: 'test' });

      expectUnauthorized(response);
    });
  });

  describe('GET /candidates/:candidateId', () => {
    let targetCandidate: any;

    beforeEach(async () => {
      targetCandidate = await TestDataFactory.createTestCandidate(testCompany.id, testUser.id, {
        firstName: 'Target',
        lastName: 'Candidate'
      });
    });

    it('should get candidate by ID successfully', async () => {
      const response = await apiClient.agent
        .get(`/api/v1/candidates/${targetCandidate._id}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.candidate.firstName).toBe('Target');
      expect(response.body.data.candidate.lastName).toBe('Candidate');
    });

    it('should fail with invalid candidate ID format', async () => {
      const response = await apiClient.agent
        .get('/api/v1/candidates/invalid-candidate-id')
        .set('Authorization', `Bearer ${testUser.token}`);

      expectValidationError(response, 'candidateId');
    });

    it('should fail with non-existent candidate ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await apiClient.agent
        .get(`/api/v1/candidates/${fakeId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectNotFound(response);
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.agent
        .get(`/api/v1/candidates/${targetCandidate._id}`);

      expectUnauthorized(response);
    });

    it('should fail without candidate read permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          candidates: { create: false, read: false, update: false, delete: false },
          jobs: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
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
        .get(`/api/v1/candidates/${targetCandidate._id}`)
        .set('Authorization', `Bearer ${restrictedUser.token}`);

      expectForbidden(response);
    });
  });

  describe('PUT /candidates/:candidateId', () => {
    let targetCandidate: any;

    beforeEach(async () => {
      targetCandidate = await TestDataFactory.createTestCandidate(testCompany.id, testUser.id, {
        firstName: 'Updatable',
        lastName: 'Candidate'
      });
    });

    const validUpdateData = {
      firstName: 'Updated',
      lastName: 'Name',
      phone: '+9876543210',
      currentPosition: 'Senior Software Engineer',
      skills: ['Updated', 'Skills', 'List'],
      notes: 'Updated notes about the candidate'
    };

    it('should update candidate successfully', async () => {
      const response = await apiClient.agent
        .put(`/api/v1/candidates/${targetCandidate._id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(validUpdateData);

      expectSuccess(response);
      expect(response.body.data.candidate.firstName).toBe(validUpdateData.firstName);
      expect(response.body.data.candidate.currentPosition).toBe(validUpdateData.currentPosition);

      // Verify in database
      const updatedCandidate = await Candidate.findById(targetCandidate._id);
      expect(updatedCandidate?.firstName).toBe(validUpdateData.firstName);
    });

    it('should fail with invalid candidate ID', async () => {
      const response = await apiClient.agent
        .put('/api/v1/candidates/invalid-candidate-id')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(validUpdateData);

      expectValidationError(response, 'candidateId');
    });

    it('should fail without candidate update permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          candidates: { create: false, read: true, update: false, delete: false },
          jobs: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
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
        .put(`/api/v1/candidates/${targetCandidate._id}`)
        .set('Authorization', `Bearer ${restrictedUser.token}`)
        .send(validUpdateData);

      expectForbidden(response);
    });

    it('should handle partial updates', async () => {
      const partialData = { firstName: 'PartiallyUpdated' };
      const response = await apiClient.agent
        .put(`/api/v1/candidates/${targetCandidate._id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(partialData);

      expectSuccess(response);
      expect(response.body.data.candidate.firstName).toBe(partialData.firstName);
      expect(response.body.data.candidate.lastName).toBe('Candidate'); // Should remain unchanged
    });

    it('should fail with invalid email format', async () => {
      const invalidData = { email: 'invalid-email-format' };
      const response = await apiClient.agent
        .put(`/api/v1/candidates/${targetCandidate._id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(invalidData);

      expectValidationError(response, 'email');
    });
  });

  describe('PUT /candidates/:candidateId/status', () => {
    let targetCandidate: any;

    beforeEach(async () => {
      targetCandidate = await TestDataFactory.createTestCandidate(testCompany.id, testUser.id, {
        status: 'active'
      });
    });

    it('should update candidate status successfully', async () => {
      const response = await apiClient.agent
        .put(`/api/v1/candidates/${targetCandidate._id}/status`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ status: 'interviewed', reason: 'Completed first round interview' });

      expectSuccess(response);
      expect(response.body.data.candidate.status).toBe('interviewed');

      // Verify in database
      const updatedCandidate = await Candidate.findById(targetCandidate._id);
      expect(updatedCandidate?.status).toBe('interviewed');
    });

    it('should fail with invalid status', async () => {
      const response = await apiClient.agent
        .put(`/api/v1/candidates/${targetCandidate._id}/status`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ status: 'invalid_status' });

      expectValidationError(response, 'status');
    });

    it('should fail without candidate update permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          candidates: { create: false, read: true, update: false, delete: false },
          jobs: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
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
        .put(`/api/v1/candidates/${targetCandidate._id}/status`)
        .set('Authorization', `Bearer ${restrictedUser.token}`)
        .send({ status: 'interviewed' });

      expectForbidden(response);
    });
  });

  describe('POST /candidates/:candidateId/apply', () => {
    let targetCandidate: any;
    let targetJob: any;

    beforeEach(async () => {
      targetCandidate = await TestDataFactory.createTestCandidate(testCompany.id, testUser.id);
      targetJob = await TestDataFactory.createTestJob(testCompany.id, testUser.id, {
        isActive: true,
        isPublished: true
      });
    });

    it('should apply candidate to job successfully', async () => {
      const response = await apiClient.agent
        .post(`/api/v1/candidates/${targetCandidate._id}/apply`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ jobId: targetJob._id.toString() });

      expectSuccess(response);
      expect(response.body.data.application).toBeDefined();
      expect(response.body.data.application.jobId).toBe(targetJob._id.toString());
      expect(response.body.data.application.candidateId).toBe(targetCandidate._id.toString());
    });

    it('should fail with invalid job ID', async () => {
      const response = await apiClient.agent
        .post(`/api/v1/candidates/${targetCandidate._id}/apply`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ jobId: 'invalid-job-id' });

      expectValidationError(response, 'jobId');
    });

    it('should fail with inactive job', async () => {
      const inactiveJob = await TestDataFactory.createTestJob(testCompany.id, testUser.id, {
        isActive: false
      });

      const response = await apiClient.agent
        .post(`/api/v1/candidates/${targetCandidate._id}/apply`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ jobId: inactiveJob._id.toString() });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not active');
    });

    it('should fail with duplicate application', async () => {
      // First application
      await apiClient.agent
        .post(`/api/v1/candidates/${targetCandidate._id}/apply`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ jobId: targetJob._id.toString() });

      // Duplicate application
      const response = await apiClient.agent
        .post(`/api/v1/candidates/${targetCandidate._id}/apply`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ jobId: targetJob._id.toString() });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already applied');
    });

    it('should fail without candidate update permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          candidates: { create: false, read: true, update: false, delete: false },
          jobs: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
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
        .post(`/api/v1/candidates/${targetCandidate._id}/apply`)
        .set('Authorization', `Bearer ${restrictedUser.token}`)
        .send({ jobId: targetJob._id.toString() });

      expectForbidden(response);
    });
  });

  describe('GET /candidates/:candidateId/applications', () => {
    let candidateWithApplications: any;

    beforeEach(async () => {
      candidateWithApplications = await TestDataFactory.createTestCandidate(testCompany.id, testUser.id, {
        firstName: 'Candidate',
        lastName: 'WithApps'
      });

      // Create jobs and applications
      const job1 = await TestDataFactory.createTestJob(testCompany.id, testUser.id, { title: 'Job 1' });
      const job2 = await TestDataFactory.createTestJob(testCompany.id, testUser.id, { title: 'Job 2' });

      // Apply to jobs
      await apiClient.agent
        .post(`/api/v1/candidates/${candidateWithApplications._id}/apply`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ jobId: job1._id.toString() });

      await apiClient.agent
        .post(`/api/v1/candidates/${candidateWithApplications._id}/apply`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ jobId: job2._id.toString() });
    });

    it('should get candidate applications successfully', async () => {
      const response = await apiClient.agent
        .get(`/api/v1/candidates/${candidateWithApplications._id}/applications`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.applications).toBeDefined();
      expect(Array.isArray(response.body.data.applications)).toBe(true);
      expect(response.body.data.applications.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter applications by status', async () => {
      const response = await apiClient.agent
        .get(`/api/v1/candidates/${candidateWithApplications._id}/applications`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ status: 'applied' });

      expectSuccess(response);
      expect(response.body.data.applications).toBeDefined();
    });

    it('should fail without candidate read permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          candidates: { create: false, read: false, update: false, delete: false },
          jobs: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
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
        .get(`/api/v1/candidates/${candidateWithApplications._id}/applications`)
        .set('Authorization', `Bearer ${restrictedUser.token}`);

      expectForbidden(response);
    });
  });

  describe('GET /candidates/talent-pool', () => {
    beforeEach(async () => {
      // Create candidates for talent pool
      await TestDataFactory.createTestCandidate(testCompany.id, testUser.id, {
        firstName: 'Talented',
        lastName: 'One',
        skills: ['React', 'Node.js', 'MongoDB'],
        status: 'active'
      });
      await TestDataFactory.createTestCandidate(testCompany.id, testUser.id, {
        firstName: 'Skilled',
        lastName: 'Two',
        skills: ['Python', 'Django', 'PostgreSQL'],
        status: 'active'
      });
    });

    it('should get talent pool successfully', async () => {
      const response = await apiClient.agent
        .get('/api/v1/candidates/talent-pool')
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.candidates).toBeDefined();
      expect(Array.isArray(response.body.data.candidates)).toBe(true);
      expect(response.body.data.candidates.length).toBeGreaterThan(0);
    });

    it('should filter talent pool by skills', async () => {
      const response = await apiClient.agent
        .get('/api/v1/candidates/talent-pool')
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ skills: 'React,Node.js' });

      expectSuccess(response);
      expect(response.body.data.candidates.length).toBeGreaterThan(0);
    });

    it('should fail without candidate read permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          candidates: { create: false, read: false, update: false, delete: false },
          jobs: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
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
        .get('/api/v1/candidates/talent-pool')
        .set('Authorization', `Bearer ${restrictedUser.token}`);

      expectForbidden(response);
    });
  });
});