import { TestApiClient, TestDataFactory, expectValidationError, expectUnauthorized, expectForbidden, expectSuccess, expectCreated, expectNotFound } from '../helpers/testHelpers';
import Job from '../../src/models/Job';

describe('Job Routes', () => {
  let apiClient: TestApiClient;
  let testUser: any;
  let testCompany: any;
  let testRole: any;

  beforeEach(async () => {
    apiClient = new TestApiClient();
    testCompany = await TestDataFactory.createTestCompany();
    testRole = await TestDataFactory.createTestRole(testCompany.id, {
      permissions: {
        jobs: { create: true, read: true, update: true, delete: true },
        candidates: { create: true, read: true, update: true, delete: true },
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

  describe('GET /jobs', () => {
    beforeEach(async () => {
      // Create test jobs
      await TestDataFactory.createTestJob(testCompany.id, testUser.id, {
        title: 'Senior Software Engineer',
        department: 'Engineering',
        location: { type: 'remote' },
        experienceLevel: 'senior',
        isActive: true
      });
      await TestDataFactory.createTestJob(testCompany.id, testUser.id, {
        title: 'Marketing Manager',
        department: 'Marketing',
        location: { type: 'on-site', city: 'New York' },
        experienceLevel: 'mid',
        isActive: false
      });
      await TestDataFactory.createTestJob(testCompany.id, testUser.id, {
        title: 'Data Scientist',
        department: 'Data',
        location: { type: 'hybrid', city: 'San Francisco' },
        experienceLevel: 'senior',
        isActive: true
      });
    });

    it('should get jobs successfully', async () => {
      const response = await apiClient.getJobs(testUser.token);

      expectSuccess(response);
      expect(response.body.data.jobs).toBeDefined();
      expect(Array.isArray(response.body.data.jobs)).toBe(true);
      expect(response.body.data.jobs.length).toBeGreaterThanOrEqual(3);
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should filter by department', async () => {
      const response = await apiClient.getJobs(testUser.token, { department: 'Engineering' });

      expectSuccess(response);
      expect(response.body.data.jobs.every((job: any) => job.department === 'Engineering')).toBe(true);
    });

    it('should filter by location type', async () => {
      const response = await apiClient.getJobs(testUser.token, { locationType: 'remote' });

      expectSuccess(response);
      expect(response.body.data.jobs.every((job: any) => job.location.type === 'remote')).toBe(true);
    });

    it('should filter by experience level', async () => {
      const response = await apiClient.getJobs(testUser.token, { experienceLevel: 'senior' });

      expectSuccess(response);
      expect(response.body.data.jobs.every((job: any) => job.experienceLevel === 'senior')).toBe(true);
    });

    it('should filter by active status', async () => {
      const response = await apiClient.getJobs(testUser.token, { isActive: 'true' });

      expectSuccess(response);
      expect(response.body.data.jobs.every((job: any) => job.isActive)).toBe(true);
    });

    it('should search by title', async () => {
      const response = await apiClient.getJobs(testUser.token, { search: 'Engineer' });

      expectSuccess(response);
      expect(response.body.data.jobs.some((job: any) => job.title.includes('Engineer'))).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await apiClient.getJobs(testUser.token, { page: '1', limit: '2' });

      expectSuccess(response);
      expect(response.body.data.jobs.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should sort by creation date', async () => {
      const response = await apiClient.getJobs(testUser.token, { sortBy: 'createdAt', sortOrder: 'desc' });

      expectSuccess(response);
      expect(response.body.data.jobs.length).toBeGreaterThan(1);
      // Verify sorting
      const jobs = response.body.data.jobs;
      for (let i = 1; i < jobs.length; i++) {
        expect(new Date(jobs[i-1].createdAt).getTime()).toBeGreaterThanOrEqual(new Date(jobs[i].createdAt).getTime());
      }
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.getJobs('');
      expectUnauthorized(response);
    });

    it('should fail without job read permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          jobs: { create: false, read: false, update: false, delete: false },
          candidates: { create: true, read: true, update: true, delete: true },
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

      const response = await apiClient.getJobs(restrictedUser.token);
      expectForbidden(response);
    });
  });

  describe('POST /jobs', () => {
    const validJobData = {
      title: 'Full Stack Developer',
      description: 'We are looking for a talented full stack developer to join our team.',
      requirements: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
      responsibilities: ['Develop web applications', 'Write clean code', 'Collaborate with team'],
      department: 'Engineering',
      location: {
        type: 'hybrid',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA'
      },
      jobType: 'full-time',
      experienceLevel: 'mid',
      salary: {
        min: 90000,
        max: 130000,
        currency: 'USD',
        payRate: 'annual'
      },
      skillsRequired: ['JavaScript', 'React', 'Node.js'],
      skillsPreferred: ['TypeScript', 'GraphQL', 'AWS'],
      benefits: ['Health insurance', 'Dental insurance', '401k matching'],
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    };

    it('should create job successfully', async () => {
      const response = await apiClient.createJob(testUser.token, validJobData);

      expectCreated(response);
      expect(response.body.data.job.title).toBe(validJobData.title);
      expect(response.body.data.job.department).toBe(validJobData.department);
      expect(response.body.data.job.salary.min).toBe(validJobData.salary.min);

      // Verify in database
      const createdJob = await Job.findOne({ title: validJobData.title, companyId: testCompany.id });
      expect(createdJob).toBeTruthy();
      expect(createdJob?.description).toBe(validJobData.description);
    });

    it('should fail with missing required fields', async () => {
      const incompleteData = { ...validJobData };
      delete incompleteData.title;

      const response = await apiClient.createJob(testUser.token, incompleteData);
      expectValidationError(response, 'title');
    });

    it('should fail with invalid job type', async () => {
      const invalidData = { ...validJobData, jobType: 'invalid-type' };
      const response = await apiClient.createJob(testUser.token, invalidData);
      expectValidationError(response, 'jobType');
    });

    it('should fail with invalid experience level', async () => {
      const invalidData = { ...validJobData, experienceLevel: 'invalid-level' };
      const response = await apiClient.createJob(testUser.token, invalidData);
      expectValidationError(response, 'experienceLevel');
    });

    it('should fail with invalid location type', async () => {
      const invalidData = {
        ...validJobData,
        location: { ...validJobData.location, type: 'invalid-type' }
      };
      const response = await apiClient.createJob(testUser.token, invalidData);
      expectValidationError(response, 'location');
    });

    it('should fail with invalid salary range', async () => {
      const invalidData = {
        ...validJobData,
        salary: { ...validJobData.salary, min: 150000, max: 100000 } // min > max
      };
      const response = await apiClient.createJob(testUser.token, invalidData);
      expectValidationError(response, 'salary');
    });

    it('should fail without job create permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          jobs: { create: false, read: true, update: false, delete: false },
          candidates: { create: true, read: true, update: true, delete: true },
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

      const response = await apiClient.createJob(restrictedUser.token, validJobData);
      expectForbidden(response);
    });

    it('should create job with workflow assignment', async () => {
      const workflow = await TestDataFactory.createTestWorkflow(testCompany.id, testUser.id);
      const jobDataWithWorkflow = { ...validJobData, workflowId: workflow._id.toString() };

      const response = await apiClient.createJob(testUser.token, jobDataWithWorkflow);
      expectCreated(response);
      expect(response.body.data.job.workflowId).toBe(workflow._id.toString());
    });

    it('should create job with minimal required data', async () => {
      const minimalData = {
        title: 'Minimal Job',
        description: 'Minimal job description',
        department: 'Test',
        location: { type: 'remote' },
        jobType: 'full-time',
        experienceLevel: 'entry'
      };

      const response = await apiClient.createJob(testUser.token, minimalData);
      expectCreated(response);
      expect(response.body.data.job.title).toBe(minimalData.title);
    });
  });

  describe('GET /jobs/:jobId', () => {
    let targetJob: any;

    beforeEach(async () => {
      targetJob = await TestDataFactory.createTestJob(testCompany.id, testUser.id, {
        title: 'Target Job Position'
      });
    });

    it('should get job by ID successfully', async () => {
      const response = await apiClient.agent
        .get(`/api/v1/jobs/${targetJob._id}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.job.title).toBe('Target Job Position');
      expect(response.body.data.job._id).toBe(targetJob._id.toString());
    });

    it('should fail with invalid job ID format', async () => {
      const response = await apiClient.agent
        .get('/api/v1/jobs/invalid-job-id')
        .set('Authorization', `Bearer ${testUser.token}`);

      expectValidationError(response, 'jobId');
    });

    it('should fail with non-existent job ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await apiClient.agent
        .get(`/api/v1/jobs/${fakeId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectNotFound(response);
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.agent
        .get(`/api/v1/jobs/${targetJob._id}`);

      expectUnauthorized(response);
    });

    it('should fail without job read permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          jobs: { create: false, read: false, update: false, delete: false },
          candidates: { create: true, read: true, update: true, delete: true },
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
        .get(`/api/v1/jobs/${targetJob._id}`)
        .set('Authorization', `Bearer ${restrictedUser.token}`);

      expectForbidden(response);
    });
  });

  describe('PUT /jobs/:jobId', () => {
    let targetJob: any;

    beforeEach(async () => {
      targetJob = await TestDataFactory.createTestJob(testCompany.id, testUser.id, {
        title: 'Updatable Job'
      });
    });

    const validUpdateData = {
      title: 'Updated Job Title',
      description: 'Updated job description',
      department: 'Updated Department',
      salary: {
        min: 100000,
        max: 140000,
        currency: 'USD',
        payRate: 'annual'
      },
      skillsRequired: ['Updated', 'Skills']
    };

    it('should update job successfully', async () => {
      const response = await apiClient.updateJob(testUser.token, targetJob._id.toString(), validUpdateData);

      expectSuccess(response);
      expect(response.body.data.job.title).toBe(validUpdateData.title);
      expect(response.body.data.job.department).toBe(validUpdateData.department);

      // Verify in database
      const updatedJob = await Job.findById(targetJob._id);
      expect(updatedJob?.title).toBe(validUpdateData.title);
    });

    it('should fail with invalid job ID', async () => {
      const response = await apiClient.updateJob(testUser.token, 'invalid-job-id', validUpdateData);
      expectValidationError(response, 'jobId');
    });

    it('should fail without job update permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          jobs: { create: false, read: true, update: false, delete: false },
          candidates: { create: true, read: true, update: true, delete: true },
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

      const response = await apiClient.updateJob(restrictedUser.token, targetJob._id.toString(), validUpdateData);
      expectForbidden(response);
    });

    it('should handle partial updates', async () => {
      const partialData = { title: 'Partially Updated Job' };
      const response = await apiClient.updateJob(testUser.token, targetJob._id.toString(), partialData);

      expectSuccess(response);
      expect(response.body.data.job.title).toBe(partialData.title);
      expect(response.body.data.job.companyId).toBe(testCompany.id); // Should remain unchanged
    });

    it('should fail with invalid salary data', async () => {
      const invalidData = {
        salary: { min: 150000, max: 100000, currency: 'USD', payRate: 'annual' }
      };
      const response = await apiClient.updateJob(testUser.token, targetJob._id.toString(), invalidData);
      expectValidationError(response, 'salary');
    });
  });

  describe('DELETE /jobs/:jobId', () => {
    let deletableJob: any;

    beforeEach(async () => {
      deletableJob = await TestDataFactory.createTestJob(testCompany.id, testUser.id, {
        title: 'Deletable Job'
      });
    });

    it('should delete job successfully', async () => {
      const response = await apiClient.deleteJob(testUser.token, deletableJob._id.toString());

      expectSuccess(response);
      expect(response.body.data.message).toContain('successfully');

      // Verify in database (soft delete)
      const deletedJob = await Job.findById(deletableJob._id);
      expect(deletedJob?.isDeleted).toBe(true);
    });

    it('should fail with invalid job ID', async () => {
      const response = await apiClient.deleteJob(testUser.token, 'invalid-job-id');
      expectValidationError(response, 'jobId');
    });

    it('should fail without job delete permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          jobs: { create: false, read: true, update: false, delete: false },
          candidates: { create: true, read: true, update: true, delete: true },
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

      const response = await apiClient.deleteJob(restrictedUser.token, deletableJob._id.toString());
      expectForbidden(response);
    });

    it('should fail with non-existent job ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await apiClient.deleteJob(testUser.token, fakeId);
      expectNotFound(response);
    });
  });

  describe('POST /jobs/:jobId/publish', () => {
    let unpublishedJob: any;

    beforeEach(async () => {
      unpublishedJob = await TestDataFactory.createTestJob(testCompany.id, testUser.id, {
        title: 'Unpublished Job',
        isPublished: false,
        isActive: true
      });
    });

    it('should publish job successfully', async () => {
      const response = await apiClient.agent
        .post(`/api/v1/jobs/${unpublishedJob._id}/publish`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.job.isPublished).toBe(true);
      expect(response.body.data.job.publishedAt).toBeTruthy();

      // Verify in database
      const publishedJob = await Job.findById(unpublishedJob._id);
      expect(publishedJob?.isPublished).toBe(true);
      expect(publishedJob?.publishedAt).toBeTruthy();
    });

    it('should handle already published job', async () => {
      // First publish the job
      await apiClient.agent
        .post(`/api/v1/jobs/${unpublishedJob._id}/publish`)
        .set('Authorization', `Bearer ${testUser.token}`);

      // Try to publish again
      const response = await apiClient.agent
        .post(`/api/v1/jobs/${unpublishedJob._id}/publish`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.job.isPublished).toBe(true);
    });

    it('should fail without job update permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          jobs: { create: false, read: true, update: false, delete: false },
          candidates: { create: true, read: true, update: true, delete: true },
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
        .post(`/api/v1/jobs/${unpublishedJob._id}/publish`)
        .set('Authorization', `Bearer ${restrictedUser.token}`);

      expectForbidden(response);
    });
  });

  describe('POST /jobs/:jobId/unpublish', () => {
    let publishedJob: any;

    beforeEach(async () => {
      publishedJob = await TestDataFactory.createTestJob(testCompany.id, testUser.id, {
        title: 'Published Job',
        isPublished: true,
        publishedAt: new Date()
      });
    });

    it('should unpublish job successfully', async () => {
      const response = await apiClient.agent
        .post(`/api/v1/jobs/${publishedJob._id}/unpublish`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.job.isPublished).toBe(false);

      // Verify in database
      const unpublishedJob = await Job.findById(publishedJob._id);
      expect(unpublishedJob?.isPublished).toBe(false);
    });

    it('should handle already unpublished job', async () => {
      // First unpublish the job
      await apiClient.agent
        .post(`/api/v1/jobs/${publishedJob._id}/unpublish`)
        .set('Authorization', `Bearer ${testUser.token}`);

      // Try to unpublish again
      const response = await apiClient.agent
        .post(`/api/v1/jobs/${publishedJob._id}/unpublish`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.job.isPublished).toBe(false);
    });

    it('should fail without job update permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          jobs: { create: false, read: true, update: false, delete: false },
          candidates: { create: true, read: true, update: true, delete: true },
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
        .post(`/api/v1/jobs/${publishedJob._id}/unpublish`)
        .set('Authorization', `Bearer ${restrictedUser.token}`);

      expectForbidden(response);
    });
  });

  describe('GET /jobs/:jobId/applications', () => {
    let jobWithApplications: any;

    beforeEach(async () => {
      jobWithApplications = await TestDataFactory.createTestJob(testCompany.id, testUser.id, {
        title: 'Job with Applications'
      });

      // Create candidates and applications
      const candidate1 = await TestDataFactory.createTestCandidate(testCompany.id, testUser.id, {
        email: 'candidate1@example.com'
      });
      const candidate2 = await TestDataFactory.createTestCandidate(testCompany.id, testUser.id, {
        email: 'candidate2@example.com'
      });

      // Add applications (this would typically be done through the application endpoint)
      await TestDataFactory.createTestCandidate(testCompany.id, testUser.id, {
        email: 'candidate3@example.com',
        applications: [{
          jobId: jobWithApplications._id,
          appliedAt: new Date(),
          status: 'applied'
        }]
      });
    });

    it('should get job applications successfully', async () => {
      const response = await apiClient.agent
        .get(`/api/v1/jobs/${jobWithApplications._id}/applications`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.applications).toBeDefined();
      expect(Array.isArray(response.body.data.applications)).toBe(true);
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should filter applications by status', async () => {
      const response = await apiClient.agent
        .get(`/api/v1/jobs/${jobWithApplications._id}/applications`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ status: 'applied' });

      expectSuccess(response);
      expect(response.body.data.applications).toBeDefined();
    });

    it('should fail without job read permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          jobs: { create: false, read: false, update: false, delete: false },
          candidates: { create: true, read: true, update: true, delete: true },
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
        .get(`/api/v1/jobs/${jobWithApplications._id}/applications`)
        .set('Authorization', `Bearer ${restrictedUser.token}`);

      expectForbidden(response);
    });
  });
});