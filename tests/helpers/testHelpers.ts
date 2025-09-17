import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import app from '../../src/app';
import Company from '../../src/models/Company';
import Employee from '../../src/models/Employee';
import Role from '../../src/models/Role';
import Job from '../../src/models/Job';
import Candidate from '../../src/models/Candidate';
import Workflow from '../../src/models/Workflow';

export interface TestUser {
  id: string;
  email: string;
  companyId: string;
  roleId: string;
  token: string;
}

export interface TestCompany {
  id: string;
  name: string;
  email: string;
  domain: string;
}

export interface TestRole {
  id: string;
  name: string;
  companyId: string;
  permissions: any;
}

export class TestDataFactory {
  static async createTestCompany(overrides: Partial<any> = {}): Promise<TestCompany> {
    const companyData = {
      name: 'Test Company',
      email: 'test@testcompany.com',
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
      isActive: true,
      subscription: {
        plan: 'professional',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        features: {
          maxUsers: 50,
          maxJobs: 100,
          aiFeatures: true,
          analytics: true,
          customWorkflows: true
        }
      },
      ...overrides
    };

    const company = await Company.create(companyData);
    return {
      id: company._id.toString(),
      name: company.name,
      email: company.email,
      domain: company.domain
    };
  }

  static async createTestRole(companyId: string, overrides: Partial<any> = {}): Promise<TestRole> {
    const roleData = {
      name: 'test_role',
      displayName: 'Test Role',
      description: 'Test role for testing',
      companyId: new mongoose.Types.ObjectId(companyId),
      permissions: {
        jobs: { create: true, read: true, update: true, delete: true },
        candidates: { create: true, read: true, update: true, delete: true },
        interviews: { create: true, read: true, update: true, delete: true },
        assessments: { create: true, read: true, update: true, delete: true },
        employees: { create: true, read: true, update: true, delete: true },
        workflows: { create: true, read: true, update: true, delete: true },
        reports: { read: true },
        settings: { read: true, update: true }
      },
      isSystemRole: false,
      isActive: true,
      ...overrides
    };

    const role = await Role.create(roleData);
    return {
      id: role._id.toString(),
      name: role.name,
      companyId: role.companyId.toString(),
      permissions: role.permissions
    };
  }

  static async createTestUser(companyId: string, roleId: string, overrides: Partial<any> = {}): Promise<TestUser> {
    const password = await bcrypt.hash('testpassword123', 12);

    const userData = {
      companyId: new mongoose.Types.ObjectId(companyId),
      email: 'test@example.com',
      password,
      firstName: 'Test',
      lastName: 'User',
      roleId: new mongoose.Types.ObjectId(roleId),
      permissions: {
        jobs: { create: true, read: true, update: true, delete: true },
        candidates: { create: true, read: true, update: true, delete: true },
        interviews: { create: true, read: true, update: true, delete: true },
        assessments: { create: true, read: true, update: true, delete: true },
        employees: { create: true, read: true, update: true, delete: true },
        workflows: { create: true, read: true, update: true, delete: true },
        reports: { read: true },
        settings: { read: true, update: true }
      },
      isActive: true,
      isEmailVerified: true,
      preferences: {
        emailNotifications: true,
        pushNotifications: true
      },
      createdBy: new mongoose.Types.ObjectId(),
      updatedBy: new mongoose.Types.ObjectId(),
      ...overrides
    };

    const user = await Employee.create(userData);
    const token = jwt.sign(
      { userId: user._id, companyId: user.companyId },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    return {
      id: user._id.toString(),
      email: user.email,
      companyId: user.companyId.toString(),
      roleId: user.roleId.toString(),
      token
    };
  }

  static async createTestJob(companyId: string, createdBy: string, overrides: Partial<any> = {}): Promise<any> {
    const jobData = {
      companyId: new mongoose.Types.ObjectId(companyId),
      title: 'Test Software Engineer',
      description: 'Test job description',
      requirements: ['JavaScript', 'TypeScript', 'Node.js'],
      responsibilities: ['Develop applications', 'Write tests'],
      department: 'Engineering',
      location: {
        type: 'remote',
        city: 'Remote',
        state: 'Remote',
        country: 'Remote'
      },
      jobType: 'full-time',
      experienceLevel: 'mid',
      salary: {
        min: 80000,
        max: 120000,
        currency: 'USD',
        payRate: 'annual'
      },
      skillsRequired: ['JavaScript', 'TypeScript'],
      skillsPreferred: ['React', 'Node.js'],
      isActive: true,
      isPublished: true,
      publishedAt: new Date(),
      createdBy: new mongoose.Types.ObjectId(createdBy),
      updatedBy: new mongoose.Types.ObjectId(createdBy),
      ...overrides
    };

    return await Job.create(jobData);
  }

  static async createTestCandidate(companyId: string, createdBy: string, overrides: Partial<any> = {}): Promise<any> {
    const candidateData = {
      companyId: new mongoose.Types.ObjectId(companyId),
      firstName: 'Test',
      lastName: 'Candidate',
      email: 'candidate@example.com',
      phone: '+1234567890',
      currentPosition: 'Software Engineer',
      currentCompany: 'Current Company',
      experience: {
        totalYears: 5,
        relevantYears: 3
      },
      skills: ['JavaScript', 'TypeScript', 'React'],
      education: [{
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        institution: 'Test University',
        graduationYear: 2019
      }],
      status: 'active',
      source: 'career_site',
      createdBy: new mongoose.Types.ObjectId(createdBy),
      updatedBy: new mongoose.Types.ObjectId(createdBy),
      ...overrides
    };

    return await Candidate.create(candidateData);
  }

  static async createTestWorkflow(companyId: string, createdBy: string, overrides: Partial<any> = {}): Promise<any> {
    const workflowData = {
      companyId: new mongoose.Types.ObjectId(companyId),
      name: 'Test Workflow',
      description: 'Test workflow description',
      isTemplate: false,
      isActive: true,
      stages: [{
        name: 'Application Review',
        type: 'screening',
        order: 1,
        isRequired: true,
        estimatedDuration: 2,
        autoAdvance: false
      }],
      createdBy: new mongoose.Types.ObjectId(createdBy),
      updatedBy: new mongoose.Types.ObjectId(createdBy),
      ...overrides
    };

    return await Workflow.create(workflowData);
  }
}

export class TestApiClient {
  public agent: request.SuperTest<request.Test>;

  constructor() {
    this.agent = request(app);
  }

  // Authentication endpoints
  async registerCompany(data: any) {
    return this.agent
      .post('/api/v1/auth/register-company')
      .send(data);
  }

  async login(email: string, password: string) {
    return this.agent
      .post('/api/v1/auth/login')
      .send({ email, password });
  }

  async logout(token: string) {
    return this.agent
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);
  }

  async getProfile(token: string) {
    return this.agent
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`);
  }

  // Company endpoints
  async getCompanyProfile(token: string) {
    return this.agent
      .get('/api/v1/companies/profile')
      .set('Authorization', `Bearer ${token}`);
  }

  async updateCompanyProfile(token: string, data: any) {
    return this.agent
      .put('/api/v1/companies/profile')
      .set('Authorization', `Bearer ${token}`)
      .send(data);
  }

  // Employee endpoints
  async getEmployees(token: string, query: any = {}) {
    return this.agent
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${token}`)
      .query(query);
  }

  async inviteEmployee(token: string, data: any) {
    return this.agent
      .post('/api/v1/auth/invite-employee')
      .set('Authorization', `Bearer ${token}`)
      .send(data);
  }

  // Role endpoints
  async getRoles(token: string) {
    return this.agent
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${token}`);
  }

  async createRole(token: string, data: any) {
    return this.agent
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${token}`)
      .send(data);
  }

  // Job endpoints
  async getJobs(token: string, query: any = {}) {
    return this.agent
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`)
      .query(query);
  }

  async createJob(token: string, data: any) {
    return this.agent
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send(data);
  }

  async updateJob(token: string, jobId: string, data: any) {
    return this.agent
      .put(`/api/v1/jobs/${jobId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(data);
  }

  async deleteJob(token: string, jobId: string) {
    return this.agent
      .delete(`/api/v1/jobs/${jobId}`)
      .set('Authorization', `Bearer ${token}`);
  }

  // Candidate endpoints
  async getCandidates(token: string, query: any = {}) {
    return this.agent
      .get('/api/v1/candidates')
      .set('Authorization', `Bearer ${token}`)
      .query(query);
  }

  async createCandidate(token: string, data: any) {
    return this.agent
      .post('/api/v1/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send(data);
  }

  // Workflow endpoints
  async getWorkflows(token: string, query: any = {}) {
    return this.agent
      .get('/api/v1/workflows')
      .set('Authorization', `Bearer ${token}`)
      .query(query);
  }

  async createWorkflow(token: string, data: any) {
    return this.agent
      .post('/api/v1/workflows')
      .set('Authorization', `Bearer ${token}`)
      .send(data);
  }

  async updateWorkflow(token: string, workflowId: string, data: any) {
    return this.agent
      .put(`/api/v1/workflows/${workflowId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(data);
  }

  async deleteWorkflow(token: string, workflowId: string) {
    return this.agent
      .delete(`/api/v1/workflows/${workflowId}`)
      .set('Authorization', `Bearer ${token}`);
  }
}

export const expectValidationError = (response: request.Response, field?: string) => {
  expect(response.status).toBe(400);
  expect(response.body).toHaveProperty('success', false);
  expect(response.body).toHaveProperty('error');
  if (field) {
    expect(response.body.error).toContain(field);
  }
};

export const expectUnauthorized = (response: request.Response) => {
  expect(response.status).toBe(401);
  expect(response.body).toHaveProperty('success', false);
  expect(response.body).toHaveProperty('error');
};

export const expectForbidden = (response: request.Response) => {
  expect(response.status).toBe(403);
  expect(response.body).toHaveProperty('success', false);
  expect(response.body).toHaveProperty('error');
};

export const expectNotFound = (response: request.Response) => {
  expect(response.status).toBe(404);
  expect(response.body).toHaveProperty('success', false);
  expect(response.body).toHaveProperty('error');
};

export const expectSuccess = (response: request.Response, expectedData?: any) => {
  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('success', true);
  expect(response.body).toHaveProperty('data');
  if (expectedData) {
    expect(response.body.data).toMatchObject(expectedData);
  }
};

export const expectCreated = (response: request.Response, expectedData?: any) => {
  expect(response.status).toBe(201);
  expect(response.body).toHaveProperty('success', true);
  expect(response.body).toHaveProperty('data');
  if (expectedData) {
    expect(response.body.data).toMatchObject(expectedData);
  }
};