import { TestApiClient, TestDataFactory, expectValidationError, expectUnauthorized, expectSuccess, expectCreated } from '../helpers/testHelpers';
import Company from '../../src/models/Company';
import Employee from '../../src/models/Employee';
import Role from '../../src/models/Role';

describe('Authentication Routes', () => {
  let apiClient: TestApiClient;

  beforeEach(() => {
    apiClient = new TestApiClient();
  });

  describe('POST /auth/register-company', () => {
    const validCompanyData = {
      companyName: 'Test Company',
      companyEmail: 'test@testcompany.com',
      domain: 'testcompany.com',
      website: 'https://testcompany.com',
      phone: '+1234567890',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Test Country'
      },
      industry: 'Technology',
      companySize: '51-200',
      adminFirstName: 'John',
      adminLastName: 'Doe',
      adminEmail: 'john@testcompany.com',
      adminPassword: 'StrongPassword123!',
      subscriptionPlan: 'professional'
    };

    it('should register a company successfully', async () => {
      const response = await apiClient.registerCompany(validCompanyData);

      expectCreated(response);
      expect(response.body.data).toHaveProperty('company');
      expect(response.body.data).toHaveProperty('admin');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.company.name).toBe(validCompanyData.companyName);
      expect(response.body.data.admin.email).toBe(validCompanyData.adminEmail);

      // Verify company was created in database
      const company = await Company.findOne({ email: validCompanyData.companyEmail });
      expect(company).toBeTruthy();
      expect(company?.name).toBe(validCompanyData.companyName);

      // Verify admin user was created
      const admin = await Employee.findOne({ email: validCompanyData.adminEmail });
      expect(admin).toBeTruthy();
      expect(admin?.firstName).toBe(validCompanyData.adminFirstName);

      // Verify default roles were created
      const roles = await Role.find({ companyId: company?._id });
      expect(roles).toHaveLength(5);
      const roleNames = roles.map(r => r.name);
      expect(roleNames).toContain('company_admin');
      expect(roleNames).toContain('hr_manager');
      expect(roleNames).toContain('recruiter');
      expect(roleNames).toContain('interviewer');
      expect(roleNames).toContain('hiring_manager');
    });

    it('should fail with missing required fields', async () => {
      const incompleteData: Partial<typeof validCompanyData> = { ...validCompanyData };
      delete incompleteData.companyName;

      const response = await apiClient.registerCompany(incompleteData);
      expectValidationError(response, 'companyName');
    });

    it('should fail with invalid email format', async () => {
      const invalidData = { ...validCompanyData, companyEmail: 'invalid-email' };

      const response = await apiClient.registerCompany(invalidData);
      expectValidationError(response, 'email');
    });

    it('should fail with weak password', async () => {
      const weakPasswordData = { ...validCompanyData, adminPassword: '123' };

      const response = await apiClient.registerCompany(weakPasswordData);
      expectValidationError(response, 'password');
    });

    it('should fail with duplicate company email', async () => {
      // Register first company
      await apiClient.registerCompany(validCompanyData);

      // Try to register with same email
      const duplicateData = { ...validCompanyData, adminEmail: 'different@email.com' };
      const response = await apiClient.registerCompany(duplicateData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should fail with duplicate admin email', async () => {
      // Register first company
      await apiClient.registerCompany(validCompanyData);

      // Try to register with same admin email
      const duplicateData = {
        ...validCompanyData,
        companyEmail: 'different@company.com',
        domain: 'different.com'
      };
      const response = await apiClient.registerCompany(duplicateData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should handle invalid subscription plan', async () => {
      const invalidPlanData = { ...validCompanyData, subscriptionPlan: 'invalid_plan' };

      const response = await apiClient.registerCompany(invalidPlanData);
      expectValidationError(response, 'subscriptionPlan');
    });
  });

  describe('POST /auth/login', () => {
    let testCompany: any;
    let testUser: any;

    beforeEach(async () => {
      testCompany = await TestDataFactory.createTestCompany();
      const testRole = await TestDataFactory.createTestRole(testCompany.id);
      testUser = await TestDataFactory.createTestUser(testCompany.id, testRole.id, {
        email: 'test@example.com'
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await apiClient.login('test@example.com', 'testpassword123');

      expectSuccess(response);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.token).toBeTruthy();
    });

    it('should fail with invalid email', async () => {
      const response = await apiClient.login('nonexistent@example.com', 'testpassword123');

      expectUnauthorized(response);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should fail with invalid password', async () => {
      const response = await apiClient.login('test@example.com', 'wrongpassword');

      expectUnauthorized(response);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should fail with missing email', async () => {
      const response = await apiClient.login('', 'testpassword123');
      expectValidationError(response, 'email');
    });

    it('should fail with missing password', async () => {
      const response = await apiClient.login('test@example.com', '');
      expectValidationError(response, 'password');
    });

    it('should fail for inactive user', async () => {
      // Create inactive user
      const inactiveUser = await TestDataFactory.createTestUser(testCompany.id, testUser.roleId, {
        email: 'inactive@example.com',
        isActive: false
      });

      const response = await apiClient.login('inactive@example.com', 'testpassword123');

      expectUnauthorized(response);
      expect(response.body.error).toContain('deactivated');
    });

    it('should fail for unverified email', async () => {
      // Create unverified user
      const unverifiedUser = await TestDataFactory.createTestUser(testCompany.id, testUser.roleId, {
        email: 'unverified@example.com',
        isEmailVerified: false
      });

      const response = await apiClient.login('unverified@example.com', 'testpassword123');

      expectUnauthorized(response);
      expect(response.body.error).toContain('verify');
    });
  });

  describe('POST /auth/logout', () => {
    let testUser: any;

    beforeEach(async () => {
      const testCompany = await TestDataFactory.createTestCompany();
      const testRole = await TestDataFactory.createTestRole(testCompany.id);
      testUser = await TestDataFactory.createTestUser(testCompany.id, testRole.id);
    });

    it('should logout successfully', async () => {
      const response = await apiClient.logout(testUser.token);

      expectSuccess(response);
      expect(response.body.data.message).toContain('successfully');
    });

    it('should fail without token', async () => {
      const response = await apiClient.logout('');
      expectUnauthorized(response);
    });

    it('should fail with invalid token', async () => {
      const response = await apiClient.logout('invalid-token');
      expectUnauthorized(response);
    });
  });

  describe('GET /auth/profile', () => {
    let testUser: any;

    beforeEach(async () => {
      const testCompany = await TestDataFactory.createTestCompany();
      const testRole = await TestDataFactory.createTestRole(testCompany.id);
      testUser = await TestDataFactory.createTestUser(testCompany.id, testRole.id);
    });

    it('should get user profile successfully', async () => {
      const response = await apiClient.getProfile(testUser.token);

      expectSuccess(response);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.companyId).toBe(testUser.companyId);
    });

    it('should fail without token', async () => {
      const response = await apiClient.getProfile('');
      expectUnauthorized(response);
    });

    it('should fail with invalid token', async () => {
      const response = await apiClient.getProfile('invalid-token');
      expectUnauthorized(response);
    });
  });

  describe('POST /auth/invite-employee', () => {
    let testUser: any;
    let testRole: any;

    beforeEach(async () => {
      const testCompany = await TestDataFactory.createTestCompany();
      testRole = await TestDataFactory.createTestRole(testCompany.id);
      testUser = await TestDataFactory.createTestUser(testCompany.id, testRole.id, {
        permissions: {
          employees: { create: true, read: true, update: true, delete: true },
          jobs: { create: true, read: true, update: true, delete: true },
          candidates: { create: true, read: true, update: true, delete: true },
          interviews: { create: true, read: true, update: true, delete: true },
          assessments: { create: true, read: true, update: true, delete: true },
          workflows: { create: true, read: true, update: true, delete: true },
          reports: { read: true },
          settings: { read: true, update: true }
        }
      });
    });

    const validInviteData = {
      email: 'newemployee@example.com',
      firstName: 'New',
      lastName: 'Employee',
      roleId: '',
      department: 'Engineering'
    };

    it('should invite employee successfully', async () => {
      const inviteData = { ...validInviteData, roleId: testRole.id };
      const response = await apiClient.inviteEmployee(testUser.token, inviteData);

      expectCreated(response);
      expect(response.body.data.employee.email).toBe(validInviteData.email);
      expect(response.body.data.employee.firstName).toBe(validInviteData.firstName);

      // Verify employee was created in database
      const employee = await Employee.findOne({ email: validInviteData.email });
      expect(employee).toBeTruthy();
      expect(employee?.inviteToken).toBeTruthy();
    });

    it('should fail without permission', async () => {
      // Create user without employee creation permission
      const restrictedUser = await TestDataFactory.createTestUser(testUser.companyId, testRole.id, {
        email: 'restricted@example.com',
        permissions: {
          employees: { create: false, read: true, update: false, delete: false },
          jobs: { create: false, read: true, update: false, delete: false },
          candidates: { create: false, read: true, update: false, delete: false },
          interviews: { create: false, read: true, update: false, delete: false },
          assessments: { create: false, read: true, update: false, delete: false },
          workflows: { create: false, read: true, update: false, delete: false },
          reports: { read: true },
          settings: { read: false, update: false }
        }
      });

      const inviteData = { ...validInviteData, roleId: testRole.id };
      const response = await apiClient.inviteEmployee(restrictedUser.token, inviteData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should fail with duplicate email', async () => {
      // Create existing employee
      await TestDataFactory.createTestUser(testUser.companyId, testRole.id, {
        email: validInviteData.email
      });

      const inviteData = { ...validInviteData, roleId: testRole.id };
      const response = await apiClient.inviteEmployee(testUser.token, inviteData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid role ID', async () => {
      const inviteData = { ...validInviteData, roleId: 'invalid-role-id' };
      const response = await apiClient.inviteEmployee(testUser.token, inviteData);

      expectValidationError(response, 'roleId');
    });

    it('should fail without required fields', async () => {
      const incompleteData: Partial<typeof validInviteData> = { ...validInviteData };
      delete incompleteData.email;

      const response = await apiClient.inviteEmployee(testUser.token, incompleteData);
      expectValidationError(response, 'email');
    });
  });

  describe('POST /auth/change-password', () => {
    let testUser: any;

    beforeEach(async () => {
      const testCompany = await TestDataFactory.createTestCompany();
      const testRole = await TestDataFactory.createTestRole(testCompany.id);
      testUser = await TestDataFactory.createTestUser(testCompany.id, testRole.id);
    });

    const validPasswordData = {
      currentPassword: 'testpassword123',
      newPassword: 'NewStrongPassword123!'
    };

    it('should change password successfully', async () => {
      const response = await apiClient.agent
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(validPasswordData);

      expectSuccess(response);
      expect(response.body.data.message).toContain('successfully');
    });

    it('should fail with incorrect current password', async () => {
      const invalidData = { ...validPasswordData, currentPassword: 'wrongpassword' };
      const response = await apiClient.agent
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('current password');
    });

    it('should fail with weak new password', async () => {
      const weakPasswordData = { ...validPasswordData, newPassword: '123' };
      const response = await apiClient.agent
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(weakPasswordData);

      expectValidationError(response, 'password');
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.agent
        .post('/api/v1/auth/change-password')
        .send(validPasswordData);

      expectUnauthorized(response);
    });
  });

  describe('GET /auth/permissions', () => {
    let testUser: any;

    beforeEach(async () => {
      const testCompany = await TestDataFactory.createTestCompany();
      const testRole = await TestDataFactory.createTestRole(testCompany.id);
      testUser = await TestDataFactory.createTestUser(testCompany.id, testRole.id);
    });

    it('should get user permissions successfully', async () => {
      const response = await apiClient.agent
        .get('/api/v1/auth/permissions')
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data).toHaveProperty('permissions');
      expect(response.body.data.permissions).toHaveProperty('jobs');
      expect(response.body.data.permissions).toHaveProperty('candidates');
      expect(response.body.data.permissions).toHaveProperty('employees');
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.agent
        .get('/api/v1/auth/permissions');

      expectUnauthorized(response);
    });
  });
});