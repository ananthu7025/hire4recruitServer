import { TestApiClient, TestDataFactory, expectValidationError, expectUnauthorized, expectForbidden, expectSuccess, expectCreated, expectNotFound } from '../helpers/testHelpers';
import Role from '../../src/models/Role';

describe('Role Routes', () => {
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

  describe('GET /roles', () => {
    beforeEach(async () => {
      // Create additional test roles
      await TestDataFactory.createTestRole(testCompany.id, {
        name: 'custom_role_1',
        displayName: 'Custom Role 1',
        isSystemRole: false
      });
      await TestDataFactory.createTestRole(testCompany.id, {
        name: 'custom_role_2',
        displayName: 'Custom Role 2',
        isSystemRole: false,
        isActive: false
      });
    });

    it('should get all roles successfully', async () => {
      const response = await apiClient.getRoles(testUser.token);

      expectSuccess(response);
      expect(response.body.data.roles).toBeDefined();
      expect(Array.isArray(response.body.data.roles)).toBe(true);
      expect(response.body.data.roles.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter by system roles', async () => {
      const response = await apiClient.agent
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ isSystemRole: 'true' });

      expectSuccess(response);
      // Note: Depends on whether system roles were created during setup
      expect(response.body.data.roles).toBeDefined();
    });

    it('should filter by active status', async () => {
      const response = await apiClient.agent
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ isActive: 'true' });

      expectSuccess(response);
      expect(response.body.data.roles.every((role: any) => role.isActive)).toBe(true);
    });

    it('should search roles by name', async () => {
      const response = await apiClient.agent
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ search: 'custom' });

      expectSuccess(response);
      expect(response.body.data.roles.some((role: any) => role.name.includes('custom'))).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.getRoles('');
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

      const response = await apiClient.getRoles(restrictedUser.token);
      expectForbidden(response);
    });
  });

  describe('POST /roles', () => {
    const validRoleData = {
      name: 'new_test_role',
      displayName: 'New Test Role',
      description: 'A new test role for testing',
      permissions: {
        jobs: { create: true, read: true, update: false, delete: false },
        candidates: { create: true, read: true, update: true, delete: false },
        interviews: { create: false, read: true, update: false, delete: false },
        assessments: { create: false, read: true, update: false, delete: false },
        employees: { create: false, read: true, update: false, delete: false },
        workflows: { create: false, read: true, update: false, delete: false },
        reports: { read: false },
        settings: { read: false, update: false }
      }
    };

    it('should create role successfully', async () => {
      const response = await apiClient.createRole(testUser.token, validRoleData);

      expectCreated(response);
      expect(response.body.data.role.name).toBe(validRoleData.name);
      expect(response.body.data.role.displayName).toBe(validRoleData.displayName);
      expect(response.body.data.role.permissions).toEqual(validRoleData.permissions);

      // Verify in database
      const createdRole = await Role.findOne({ name: validRoleData.name, companyId: testCompany.id });
      expect(createdRole).toBeTruthy();
      expect(createdRole?.displayName).toBe(validRoleData.displayName);
    });

    it('should fail with missing required fields', async () => {
      const incompleteData = { ...validRoleData };
      delete incompleteData.name;

      const response = await apiClient.createRole(testUser.token, incompleteData);
      expectValidationError(response, 'name');
    });

    it('should fail with invalid role name format', async () => {
      const invalidData = { ...validRoleData, name: 'Invalid Role Name!' };
      const response = await apiClient.createRole(testUser.token, invalidData);
      expectValidationError(response, 'name');
    });

    it('should fail with duplicate role name', async () => {
      // Create first role
      await apiClient.createRole(testUser.token, validRoleData);

      // Try to create with same name
      const duplicateData = { ...validRoleData, displayName: 'Different Display Name' };
      const response = await apiClient.createRole(testUser.token, duplicateData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should fail with invalid permissions structure', async () => {
      const invalidData = { ...validRoleData, permissions: { invalid: 'permission' } };
      const response = await apiClient.createRole(testUser.token, invalidData);
      expectValidationError(response, 'permissions');
    });

    it('should fail without employee create permission', async () => {
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

      const response = await apiClient.createRole(restrictedUser.token, validRoleData);
      expectForbidden(response);
    });

    it('should create role with default permissions when not provided', async () => {
      const minimalData = {
        name: 'minimal_role',
        displayName: 'Minimal Role'
      };

      const response = await apiClient.createRole(testUser.token, minimalData);
      expectCreated(response);
      expect(response.body.data.role.permissions).toBeDefined();
      expect(response.body.data.role.permissions.jobs).toBeDefined();
    });
  });

  describe('GET /roles/:roleId', () => {
    let targetRole: any;

    beforeEach(async () => {
      targetRole = await TestDataFactory.createTestRole(testCompany.id, {
        name: 'target_role',
        displayName: 'Target Role'
      });
    });

    it('should get role by ID successfully', async () => {
      const response = await apiClient.agent
        .get(`/api/v1/roles/${targetRole.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.role.name).toBe('target_role');
      expect(response.body.data.role.displayName).toBe('Target Role');
    });

    it('should fail with invalid role ID format', async () => {
      const response = await apiClient.agent
        .get('/api/v1/roles/invalid-role-id')
        .set('Authorization', `Bearer ${testUser.token}`);

      expectValidationError(response, 'roleId');
    });

    it('should fail with non-existent role ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await apiClient.agent
        .get(`/api/v1/roles/${fakeId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectNotFound(response);
    });

    it('should fail without authentication', async () => {
      const response = await apiClient.agent
        .get(`/api/v1/roles/${targetRole.id}`);

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
        .get(`/api/v1/roles/${targetRole.id}`)
        .set('Authorization', `Bearer ${restrictedUser.token}`);

      expectForbidden(response);
    });
  });

  describe('PUT /roles/:roleId', () => {
    let targetRole: any;

    beforeEach(async () => {
      targetRole = await TestDataFactory.createTestRole(testCompany.id, {
        name: 'updatable_role',
        displayName: 'Updatable Role',
        isSystemRole: false
      });
    });

    const validUpdateData = {
      displayName: 'Updated Role Name',
      description: 'Updated description',
      permissions: {
        jobs: { create: false, read: true, update: false, delete: false },
        candidates: { create: false, read: true, update: false, delete: false },
        interviews: { create: false, read: false, update: false, delete: false },
        assessments: { create: false, read: false, update: false, delete: false },
        employees: { create: false, read: false, update: false, delete: false },
        workflows: { create: false, read: false, update: false, delete: false },
        reports: { read: false },
        settings: { read: false, update: false }
      }
    };

    it('should update role successfully', async () => {
      const response = await apiClient.agent
        .put(`/api/v1/roles/${targetRole.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(validUpdateData);

      expectSuccess(response);
      expect(response.body.data.role.displayName).toBe(validUpdateData.displayName);
      expect(response.body.data.role.description).toBe(validUpdateData.description);

      // Verify in database
      const updatedRole = await Role.findById(targetRole.id);
      expect(updatedRole?.displayName).toBe(validUpdateData.displayName);
    });

    it('should fail to update system role', async () => {
      const systemRole = await TestDataFactory.createTestRole(testCompany.id, {
        name: 'system_role',
        isSystemRole: true
      });

      const response = await apiClient.agent
        .put(`/api/v1/roles/${systemRole.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(validUpdateData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('system role');
    });

    it('should fail with invalid role ID', async () => {
      const response = await apiClient.agent
        .put('/api/v1/roles/invalid-role-id')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(validUpdateData);

      expectValidationError(response, 'roleId');
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
        .put(`/api/v1/roles/${targetRole.id}`)
        .set('Authorization', `Bearer ${restrictedUser.token}`)
        .send(validUpdateData);

      expectForbidden(response);
    });

    it('should handle partial updates', async () => {
      const partialData = { displayName: 'Partially Updated' };
      const response = await apiClient.agent
        .put(`/api/v1/roles/${targetRole.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(partialData);

      expectSuccess(response);
      expect(response.body.data.role.displayName).toBe(partialData.displayName);
      expect(response.body.data.role.name).toBe('updatable_role'); // Should remain unchanged
    });

    it('should fail with invalid permissions structure', async () => {
      const invalidData = { permissions: { invalid: 'structure' } };
      const response = await apiClient.agent
        .put(`/api/v1/roles/${targetRole.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(invalidData);

      expectValidationError(response, 'permissions');
    });
  });

  describe('DELETE /roles/:roleId', () => {
    let deletableRole: any;

    beforeEach(async () => {
      deletableRole = await TestDataFactory.createTestRole(testCompany.id, {
        name: 'deletable_role',
        displayName: 'Deletable Role',
        isSystemRole: false
      });
    });

    it('should delete role successfully', async () => {
      const response = await apiClient.agent
        .delete(`/api/v1/roles/${deletableRole.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectSuccess(response);
      expect(response.body.data.message).toContain('successfully');

      // Verify in database
      const deletedRole = await Role.findById(deletableRole.id);
      expect(deletedRole).toBeNull();
    });

    it('should fail to delete system role', async () => {
      const systemRole = await TestDataFactory.createTestRole(testCompany.id, {
        name: 'system_role',
        isSystemRole: true
      });

      const response = await apiClient.agent
        .delete(`/api/v1/roles/${systemRole.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('system role');
    });

    it('should fail to delete role with assigned employees', async () => {
      // Create employee with this role
      await TestDataFactory.createTestUser(testCompany.id, deletableRole.id, {
        email: 'assigned@example.com'
      });

      const response = await apiClient.agent
        .delete(`/api/v1/roles/${deletableRole.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('employees assigned');
    });

    it('should fail with invalid role ID', async () => {
      const response = await apiClient.agent
        .delete('/api/v1/roles/invalid-role-id')
        .set('Authorization', `Bearer ${testUser.token}`);

      expectValidationError(response, 'roleId');
    });

    it('should fail without employee delete permission', async () => {
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
        .delete(`/api/v1/roles/${deletableRole.id}`)
        .set('Authorization', `Bearer ${restrictedUser.token}`);

      expectForbidden(response);
    });

    it('should fail with non-existent role ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await apiClient.agent
        .delete(`/api/v1/roles/${fakeId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expectNotFound(response);
    });
  });

  describe('POST /roles/:roleId/toggle-status', () => {
    let toggleableRole: any;

    beforeEach(async () => {
      toggleableRole = await TestDataFactory.createTestRole(testCompany.id, {
        name: 'toggleable_role',
        displayName: 'Toggleable Role',
        isSystemRole: false,
        isActive: true
      });
    });

    it('should toggle role status successfully', async () => {
      const response = await apiClient.agent
        .post(`/api/v1/roles/${toggleableRole.id}/toggle-status`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ isActive: false });

      expectSuccess(response);
      expect(response.body.data.role.isActive).toBe(false);

      // Verify in database
      const updatedRole = await Role.findById(toggleableRole.id);
      expect(updatedRole?.isActive).toBe(false);
    });

    it('should fail to toggle system role status', async () => {
      const systemRole = await TestDataFactory.createTestRole(testCompany.id, {
        name: 'system_role',
        isSystemRole: true
      });

      const response = await apiClient.agent
        .post(`/api/v1/roles/${systemRole.id}/toggle-status`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ isActive: false });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('system role');
    });

    it('should fail with invalid status value', async () => {
      const response = await apiClient.agent
        .post(`/api/v1/roles/${toggleableRole.id}/toggle-status`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ isActive: 'invalid' });

      expectValidationError(response, 'isActive');
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
        .post(`/api/v1/roles/${toggleableRole.id}/toggle-status`)
        .set('Authorization', `Bearer ${restrictedUser.token}`)
        .send({ isActive: false });

      expectForbidden(response);
    });
  });
});