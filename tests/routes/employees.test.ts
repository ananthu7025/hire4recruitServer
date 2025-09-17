import { TestApiClient, TestDataFactory, expectValidationError, expectUnauthorized, expectForbidden, expectSuccess, expectNotFound } from '../helpers/testHelpers';
import Employee from '../../src/models/Employee';

describe('Employee Routes', () => {
  let apiClient: TestApiClient;
  let testUser: any;
  let testCompany: any;
  let testRole: any;

  beforeEach(async () => {
    apiClient = new TestApiClient();
    testCompany = await TestDataFactory.createTestCompany();
    testRole = await TestDataFactory.createTestRole(testCompany.id, {
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
    testUser = await TestDataFactory.createTestUser(testCompany.id, testRole.id);
  });

  describe('GET /employees', () => {
    beforeEach(async () => {
      // Create additional test employees
      await TestDataFactory.createTestUser(testCompany.id, testRole.id, {
        email: 'employee2@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        department: 'Engineering'
      });
      await TestDataFactory.createTestUser(testCompany.id, testRole.id, {
        email: 'employee3@example.com',
        firstName: 'Bob',
        lastName: 'Johnson',
        department: 'Marketing',
        isActive: false
      });
    });

    it('should get employees successfully', async () => {
      const response = await apiClient.getEmployees(testUser.token);

      expectSuccess(response);
      expect(response.body.data.employees).toBeDefined();
      expect(Array.isArray(response.body.data.employees)).toBe(true);
      expect(response.body.data.employees.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should filter by department', async () => {
      const response = await apiClient.getEmployees(testUser.token, { department: 'Engineering' });

      expectSuccess(response);
      expect(response.body.data.employees.every((emp: any) => emp.department === 'Engineering')).toBe(true);
    });

    it('should filter by active status', async () => {
      const response = await apiClient.getEmployees(testUser.token, { isActive: 'true' });

      expectSuccess(response);
      expect(response.body.data.employees.every((emp: any) => emp.isActive)).toBe(true);
    });

    it('should search by name', async () => {
      const response = await apiClient.getEmployees(testUser.token, { search: 'Jane' });

      expectSuccess(response);
      expect(response.body.data.employees.some((emp: any) => emp.firstName.includes('Jane'))).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await apiClient.getEmployees(testUser.token, { page: '1', limit: '2' });

      expectSuccess(response);
      expect(response.body.data.employees.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.getEmployees('');
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

      const response = await apiClient.getEmployees(restrictedUser.token);
      expectForbidden(response);
    });
  });

  describe('GET /employees/search', () => {
    beforeEach(async () => {
      await TestDataFactory.createTestUser(testCompany.id, testRole.id, {
        email: 'searchable@example.com',
        firstName: 'Searchable',
        lastName: 'User',
        expertise: ['JavaScript', 'React', 'Node.js']
      });
    });

    it('should search employees by name', async () => {
      const response = await apiClient.agent
        .get('/api/v1/employees/search')
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ q: 'Searchable' });

      expectSuccess(response);
      expect(response.body.data.employees.some((emp: any) => emp.firstName === 'Searchable')).toBe(true);
    });

    it('should search employees by skills', async () => {
      const response = await apiClient.agent
        .get('/api/v1/employees/search')
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ skills: 'JavaScript,React' });

      expectSuccess(response);
      expect(response.body.data.employees.length).toBeGreaterThan(0);
    });

    it('should fail without search query', async () => {
      const response = await apiClient.agent
        .get('/api/v1/employees/search')
        .set('Authorization', `Bearer ${testUser.token}`);

      expectValidationError(response, 'query');
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.agent
        .get('/api/v1/employees/search')
        .query({ q: 'test' });

      expectUnauthorized(response);
    });
  });

  describe('GET /employees/role/:roleId', () => {
    let specificRole: any;
    let employeeWithSpecificRole: any;

    beforeEach(async () => {
      specificRole = await TestDataFactory.createTestRole(testCompany.id, { name: 'specific_role' });
      employeeWithSpecificRole = await TestDataFactory.createTestUser(testCompany.id, specificRole.id, {
        email: 'specific@example.com'
      });
    });

    it('should get employees by role successfully', async () => {
      const response = await apiClient.agent
        .get(`/api/v1/employees/role/${specificRole.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.employees.length).toBe(1);
      expect(response.body.data.employees[0].email).toBe('specific@example.com');
    });

    it('should return empty array for role with no employees', async () => {
      const emptyRole = await TestDataFactory.createTestRole(testCompany.id, { name: 'empty_role' });

      const response = await apiClient.agent
        .get(`/api/v1/employees/role/${emptyRole.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.employees.length).toBe(0);
    });

    it('should fail with invalid role ID', async () => {
      const response = await apiClient.agent
        .get('/api/v1/employees/role/invalid-role-id')
        .set('Authorization', `Bearer ${testUser.token}`);

      expectValidationError(response, 'roleId');
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.agent
        .get(`/api/v1/employees/role/${specificRole.id}`);

      expectUnauthorized(response);
    });
  });

  describe('GET /employees/:employeeId', () => {
    let targetEmployee: any;

    beforeEach(async () => {
      targetEmployee = await TestDataFactory.createTestUser(testCompany.id, testRole.id, {
        email: 'target@example.com',
        firstName: 'Target',
        lastName: 'Employee'
      });
    });

    it('should get employee by ID successfully', async () => {
      const response = await apiClient.agent
        .get(`/api/v1/employees/${targetEmployee.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.employee.email).toBe('target@example.com');
      expect(response.body.data.employee.firstName).toBe('Target');
    });

    it('should fail with invalid employee ID', async () => {
      const response = await apiClient.agent
        .get('/api/v1/employees/invalid-employee-id')
        .set('Authorization', `Bearer ${testUser.token}`);

      expectValidationError(response, 'employeeId');
    });

    it('should fail with non-existent employee ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await apiClient.agent
        .get(`/api/v1/employees/${fakeId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectNotFound(response);
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.agent
        .get(`/api/v1/employees/${targetEmployee.id}`);

      expectUnauthorized(response);
    });
  });

  describe('PUT /employees/:employeeId', () => {
    let targetEmployee: any;

    beforeEach(async () => {
      targetEmployee = await TestDataFactory.createTestUser(testCompany.id, testRole.id, {
        email: 'target@example.com'
      });
    });

    const validUpdateData = {
      firstName: 'Updated',
      lastName: 'Name',
      phone: '+9876543210',
      department: 'Updated Department',
      jobTitle: 'Updated Title',
      expertise: ['Updated', 'Skills']
    };

    it('should update employee successfully', async () => {
      const response = await apiClient.agent
        .put(`/api/v1/employees/${targetEmployee.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(validUpdateData);

      expectSuccess(response);
      expect(response.body.data.employee.firstName).toBe(validUpdateData.firstName);
      expect(response.body.data.employee.department).toBe(validUpdateData.department);

      // Verify in database
      const updatedEmployee = await Employee.findById(targetEmployee.id);
      expect(updatedEmployee?.firstName).toBe(validUpdateData.firstName);
    });

    it('should fail with invalid employee ID', async () => {
      const response = await apiClient.agent
        .put('/api/v1/employees/invalid-employee-id')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(validUpdateData);

      expectValidationError(response, 'employeeId');
    });

    it('should fail without employee update permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          employees: { create: false, read: true, update: false, delete: false },
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
        .put(`/api/v1/employees/${targetEmployee.id}`)
        .set('Authorization', `Bearer ${restrictedUser.token}`)
        .send(validUpdateData);

      expectForbidden(response);
    });

    it('should handle partial updates', async () => {
      const partialData = { firstName: 'PartiallyUpdated' };
      const response = await apiClient.agent
        .put(`/api/v1/employees/${targetEmployee.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(partialData);

      expectSuccess(response);
      expect(response.body.data.employee.firstName).toBe(partialData.firstName);
      expect(response.body.data.employee.email).toBe('target@example.com'); // Should remain unchanged
    });
  });

  describe('PUT /employees/:employeeId/role', () => {
    let targetEmployee: any;
    let newRole: any;

    beforeEach(async () => {
      targetEmployee = await TestDataFactory.createTestUser(testCompany.id, testRole.id, {
        email: 'target@example.com'
      });
      newRole = await TestDataFactory.createTestRole(testCompany.id, { name: 'new_role' });
    });

    it('should update employee role successfully', async () => {
      const response = await apiClient.agent
        .put(`/api/v1/employees/${targetEmployee.id}/role`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ roleId: newRole.id });

      expectSuccess(response);
      expect(response.body.data.employee.roleId).toBe(newRole.id);

      // Verify in database
      const updatedEmployee = await Employee.findById(targetEmployee.id);
      expect(updatedEmployee?.roleId.toString()).toBe(newRole.id);
    });

    it('should fail with invalid role ID', async () => {
      const response = await apiClient.agent
        .put(`/api/v1/employees/${targetEmployee.id}/role`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ roleId: 'invalid-role-id' });

      expectValidationError(response, 'roleId');
    });

    it('should fail with non-existent role', async () => {
      const fakeRoleId = '507f1f77bcf86cd799439011';
      const response = await apiClient.agent
        .put(`/api/v1/employees/${targetEmployee.id}/role`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ roleId: fakeRoleId });

      expectNotFound(response);
    });

    it('should fail without employee update permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          employees: { create: false, read: true, update: false, delete: false },
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
        .put(`/api/v1/employees/${targetEmployee.id}/role`)
        .set('Authorization', `Bearer ${restrictedUser.token}`)
        .send({ roleId: newRole.id });

      expectForbidden(response);
    });
  });

  describe('POST /employees/:employeeId/activate', () => {
    let inactiveEmployee: any;

    beforeEach(async () => {
      inactiveEmployee = await TestDataFactory.createTestUser(testCompany.id, testRole.id, {
        email: 'inactive@example.com',
        isActive: false
      });
    });

    it('should activate employee successfully', async () => {
      const response = await apiClient.agent
        .post(`/api/v1/employees/${inactiveEmployee.id}/activate`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.employee.isActive).toBe(true);

      // Verify in database
      const updatedEmployee = await Employee.findById(inactiveEmployee.id);
      expect(updatedEmployee?.isActive).toBe(true);
    });

    it('should handle already active employee', async () => {
      const response = await apiClient.agent
        .post(`/api/v1/employees/${testUser.id}/activate`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.employee.isActive).toBe(true);
    });

    it('should fail without employee update permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          employees: { create: false, read: true, update: false, delete: false },
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
        .post(`/api/v1/employees/${inactiveEmployee.id}/activate`)
        .set('Authorization', `Bearer ${restrictedUser.token}`);

      expectForbidden(response);
    });
  });

  describe('POST /employees/:employeeId/deactivate', () => {
    let activeEmployee: any;

    beforeEach(async () => {
      activeEmployee = await TestDataFactory.createTestUser(testCompany.id, testRole.id, {
        email: 'active@example.com',
        isActive: true
      });
    });

    it('should deactivate employee successfully', async () => {
      const response = await apiClient.agent
        .post(`/api/v1/employees/${activeEmployee.id}/deactivate`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.employee.isActive).toBe(false);

      // Verify in database
      const updatedEmployee = await Employee.findById(activeEmployee.id);
      expect(updatedEmployee?.isActive).toBe(false);
    });

    it('should prevent self-deactivation', async () => {
      const response = await apiClient.agent
        .post(`/api/v1/employees/${testUser.id}/deactivate`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('deactivate yourself');
    });

    it('should fail without employee update permission', async () => {
      const restrictedRole = await TestDataFactory.createTestRole(testCompany.id, {
        permissions: {
          employees: { create: false, read: true, update: false, delete: false },
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
        .post(`/api/v1/employees/${activeEmployee.id}/deactivate`)
        .set('Authorization', `Bearer ${restrictedUser.token}`);

      expectForbidden(response);
    });
  });
});