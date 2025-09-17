import { TestApiClient, TestDataFactory, expectValidationError, expectUnauthorized, expectForbidden, expectSuccess } from '../helpers/testHelpers';
import Company from '../../src/models/Company';

describe('Company Routes', () => {
  let apiClient: TestApiClient;
  let testUser: any;
  let testCompany: any;

  beforeEach(async () => {
    apiClient = new TestApiClient();
    testCompany = await TestDataFactory.createTestCompany();
    const testRole = await TestDataFactory.createTestRole(testCompany.id, {
      permissions: {
        settings: { read: true, update: true },
        jobs: { create: true, read: true, update: true, delete: true },
        candidates: { create: true, read: true, update: true, delete: true },
        interviews: { create: true, read: true, update: true, delete: true },
        assessments: { create: true, read: true, update: true, delete: true },
        employees: { create: true, read: true, update: true, delete: true },
        workflows: { create: true, read: true, update: true, delete: true },
        reports: { read: true }
      }
    });
    testUser = await TestDataFactory.createTestUser(testCompany.id, testRole.id);
  });

  describe('GET /companies/profile', () => {
    it('should get company profile successfully', async () => {
      const response = await apiClient.getCompanyProfile(testUser.token);

      expectSuccess(response);
      expect(response.body.data.company.name).toBe(testCompany.name);
      expect(response.body.data.company.email).toBe(testCompany.email);
      expect(response.body.data.company.domain).toBe(testCompany.domain);
      expect(response.body.data.company).toHaveProperty('subscription');
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.getCompanyProfile('');
      expectUnauthorized(response);
    });

    it('should fail with invalid token', async () => {
      const response = await apiClient.getCompanyProfile('invalid-token');
      expectUnauthorized(response);
    });

    it('should fail without settings read permission', async () => {
      // Create user without settings read permission
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          settings: { read: false, update: false },
          jobs: { create: true, read: true, update: true, delete: true },
          candidates: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
          employees: { create: true, read: true, update: true, delete: true },
          workflows: { create: true, read: true, update: true, delete: true },
          reports: { read: true }
        }
      });
      const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
        email: 'restricted@example.com'
      });

      const response = await apiClient.getCompanyProfile(restrictedUser.token);
      expectForbidden(response);
    });
  });

  describe('PUT /companies/profile', () => {
    const validUpdateData = {
      name: 'Updated Test Company',
      website: 'https://updated-testcompany.com',
      phone: '+9876543210',
      address: {
        street: '456 Updated St',
        city: 'Updated City',
        state: 'Updated State',
        zipCode: '54321',
        country: 'Updated Country'
      },
      industry: 'Healthcare',
      companySize: '201-500'
    };

    it('should update company profile successfully', async () => {
      const response = await apiClient.updateCompanyProfile(testUser.token, validUpdateData);

      expectSuccess(response);
      expect(response.body.data.company.name).toBe(validUpdateData.name);
      expect(response.body.data.company.website).toBe(validUpdateData.website);
      expect(response.body.data.company.industry).toBe(validUpdateData.industry);

      // Verify in database
      const updatedCompany = await Company.findById(testCompany.id);
      expect(updatedCompany?.name).toBe(validUpdateData.name);
      expect(updatedCompany?.website).toBe(validUpdateData.website);
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.updateCompanyProfile('', validUpdateData);
      expectUnauthorized(response);
    });

    it('should fail without settings update permission', async () => {
      // Create user without settings update permission
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          settings: { read: true, update: false },
          jobs: { create: true, read: true, update: true, delete: true },
          candidates: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
          employees: { create: true, read: true, update: true, delete: true },
          workflows: { create: true, read: true, update: true, delete: true },
          reports: { read: true }
        }
      });
      const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
        email: 'restricted@example.com'
      });

      const response = await apiClient.updateCompanyProfile(restrictedUser.token, validUpdateData);
      expectForbidden(response);
    });

    it('should fail with invalid company size', async () => {
      const invalidData = { ...validUpdateData, companySize: 'invalid-size' };
      const response = await apiClient.updateCompanyProfile(testUser.token, invalidData);
      expectValidationError(response, 'companySize');
    });

    it('should fail with invalid industry', async () => {
      const invalidData = { ...validUpdateData, industry: 'InvalidIndustry' };
      const response = await apiClient.updateCompanyProfile(testUser.token, invalidData);
      expectValidationError(response, 'industry');
    });

    it('should fail with invalid website URL', async () => {
      const invalidData = { ...validUpdateData, website: 'not-a-url' };
      const response = await apiClient.updateCompanyProfile(testUser.token, invalidData);
      expectValidationError(response, 'website');
    });

    it('should handle partial updates', async () => {
      const partialData = { name: 'Partially Updated Company' };
      const response = await apiClient.updateCompanyProfile(testUser.token, partialData);

      expectSuccess(response);
      expect(response.body.data.company.name).toBe(partialData.name);

      // Other fields should remain unchanged
      expect(response.body.data.company.email).toBe(testCompany.email);
      expect(response.body.data.company.domain).toBe(testCompany.domain);
    });
  });

  describe('GET /companies/stats', () => {
    beforeEach(async () => {
      // Create some test data for stats
      await TestDataFactory.createTestJob(testCompany.id, testUser.id);
      await TestDataFactory.createTestJob(testCompany.id, testUser.id, { isActive: false });
      await TestDataFactory.createTestCandidate(testCompany.id, testUser.id);
      await TestDataFactory.createTestCandidate(testCompany.id, testUser.id, { status: 'hired' });
    });

    it('should get company stats successfully', async () => {
      const response = await apiClient.agent
        .get('/api/v1/companies/stats')
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.stats).toHaveProperty('totalJobs');
      expect(response.body.data.stats).toHaveProperty('activeJobs');
      expect(response.body.data.stats).toHaveProperty('totalCandidates');
      expect(response.body.data.stats).toHaveProperty('totalEmployees');
      expect(response.body.data.stats.totalJobs).toBeGreaterThanOrEqual(2);
      expect(response.body.data.stats.activeJobs).toBeGreaterThanOrEqual(1);
      expect(response.body.data.stats.totalCandidates).toBeGreaterThanOrEqual(2);
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.agent.get('/api/v1/companies/stats');
      expectUnauthorized(response);
    });
  });

  describe('GET /companies/users', () => {
    beforeEach(async () => {
      // Create additional test users
      const role = await TestDataFactory.createTestRole(testCompany.id);
      await TestDataFactory.createTestUser(testCompany.id, role.id, { email: 'user2@example.com' });
      await TestDataFactory.createTestUser(testCompany.id, role.id, { email: 'user3@example.com', isActive: false });
    });

    it('should get company users successfully', async () => {
      const response = await apiClient.agent
        .get('/api/v1/companies/users')
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.users).toBeDefined();
      expect(Array.isArray(response.body.data.users)).toBe(true);
      expect(response.body.data.users.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should filter active users', async () => {
      const response = await apiClient.agent
        .get('/api/v1/companies/users')
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ isActive: 'true' });

      expectSuccess(response);
      expect(response.body.data.users.every((user: any) => user.isActive)).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await apiClient.agent
        .get('/api/v1/companies/users')
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ page: '1', limit: '2' });

      expectSuccess(response);
      expect(response.body.data.users.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.agent.get('/api/v1/companies/users');
      expectUnauthorized(response);
    });

    it('should fail without employee read permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          employees: { create: false, read: false, update: false, delete: false },
          jobs: { create: true, read: true, update: true, delete: true },
          candidates: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
          workflows: { create: true, read: true, update: true, delete: true },
          reports: { read: true },
          settings: { read: true, update: true }
        }
      });
      const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
        email: 'restricted@example.com'
      });

      const response = await apiClient.agent
        .get('/api/v1/companies/users')
        .set('Authorization', `Bearer ${restrictedUser.token}`);

      expectForbidden(response);
    });
  });

  describe('GET /companies/subscription', () => {
    it('should get subscription details successfully', async () => {
      const response = await apiClient.agent
        .get('/api/v1/companies/subscription')
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.subscription).toHaveProperty('plan');
      expect(response.body.data.subscription).toHaveProperty('status');
      expect(response.body.data.subscription).toHaveProperty('features');
      expect(response.body.data.subscription.plan).toBe('professional');
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.agent.get('/api/v1/companies/subscription');
      expectUnauthorized(response);
    });

    it('should fail without settings read permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          settings: { read: false, update: false },
          jobs: { create: true, read: true, update: true, delete: true },
          candidates: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
          employees: { create: true, read: true, update: true, delete: true },
          workflows: { create: true, read: true, update: true, delete: true },
          reports: { read: true }
        }
      });
      const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
        email: 'restricted@example.com'
      });

      const response = await apiClient.agent
        .get('/api/v1/companies/subscription')
        .set('Authorization', `Bearer ${restrictedUser.token}`);

      expectForbidden(response);
    });
  });

  describe('GET /companies/subscription/limits', () => {
    it('should get subscription limits successfully', async () => {
      const response = await apiClient.agent
        .get('/api/v1/companies/subscription/limits')
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.limits).toHaveProperty('maxUsers');
      expect(response.body.data.limits).toHaveProperty('maxJobs');
      expect(response.body.data.usage).toHaveProperty('currentUsers');
      expect(response.body.data.usage).toHaveProperty('currentJobs');
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.agent.get('/api/v1/companies/subscription/limits');
      expectUnauthorized(response);
    });
  });

  describe('GET /companies/activity', () => {
    it('should get company activity successfully', async () => {
      const response = await apiClient.agent
        .get('/api/v1/companies/activity')
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.activities).toBeDefined();
      expect(Array.isArray(response.body.data.activities)).toBe(true);
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should filter by date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await apiClient.agent
        .get('/api/v1/companies/activity')
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ startDate, endDate });

      expectSuccess(response);
      expect(response.body.data.activities).toBeDefined();
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.agent.get('/api/v1/companies/activity');
      expectUnauthorized(response);
    });

    it('should fail without settings read permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          settings: { read: false, update: false },
          jobs: { create: true, read: true, update: true, delete: true },
          candidates: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
          employees: { create: true, read: true, update: true, delete: true },
          workflows: { create: true, read: true, update: true, delete: true },
          reports: { read: true }
        }
      });
      const restrictedUser = await TestDataFactory.createTestUser(testCompany.id, restrictedRole.id, {
        email: 'restricted@example.com'
      });

      const response = await apiClient.agent
        .get('/api/v1/companies/activity')
        .set('Authorization', `Bearer ${restrictedUser.token}`);

      expectForbidden(response);
    });
  });
});