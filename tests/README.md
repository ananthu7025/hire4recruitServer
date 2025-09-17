# hire4recruit Test Suite

Comprehensive automation tests for all API routes with edge case coverage.

## 🎯 Overview

This test suite provides complete coverage for the hire4recruit API, including:
- **Authentication & Authorization**: Registration, login, permissions, role-based access
- **Company Management**: Profile, settings, subscription, analytics
- **Employee Management**: CRUD operations, role assignments, invitations
- **Role Management**: Custom roles, permissions, system roles
- **Job Management**: Creation, publishing, applications, workflow assignment
- **Candidate Management**: Talent pool, applications, status tracking
- **Workflow Management**: Templates, cloning, AI optimization, analytics
- **Interview & Assessment**: Scheduling, creation, status management

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Install testing dependencies (if not already installed)
npm install --save-dev jest @types/jest supertest @types/supertest ts-jest mongodb-memory-server
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode (for development)
npm run test:watch

# Run with verbose output
npm run test:verbose

# Run specific test suite
npx jest auth                    # Authentication tests
npx jest companies              # Company management tests
npx jest employees              # Employee management tests
npx jest roles                  # Role management tests
npx jest jobs                   # Job management tests
npx jest candidates             # Candidate management tests
npx jest workflows              # Workflow management tests
npx jest interviews             # Interview & Assessment tests
```

### Advanced Usage

```bash
# Run tests matching a pattern
npx jest --testNamePattern="login"

# Run tests in a specific file
npx jest tests/routes/auth.test.ts

# Run tests with coverage and bail on first failure
npx jest --coverage --bail

# Debug tests
npm run test:debug
```

## 📁 Test Structure

```
tests/
├── setup.ts                           # Global test setup and database configuration
├── helpers/
│   └── testHelpers.ts                 # Test utilities and factory functions
├── routes/
│   ├── auth.test.ts                   # Authentication route tests
│   ├── companies.test.ts              # Company management tests
│   ├── employees.test.ts              # Employee management tests
│   ├── roles.test.ts                  # Role management tests
│   ├── jobs.test.ts                   # Job management tests
│   ├── candidates.test.ts             # Candidate management tests
│   ├── workflows.test.ts              # Workflow management tests
│   └── interviews-assessments.test.ts # Interview & Assessment tests
├── test-runner.ts                     # Custom test runner with reporting
└── README.md                          # This file
```

## 🧪 Test Categories

### Authentication Tests (`auth.test.ts`)
- ✅ Company registration with validation
- ✅ User login/logout with security checks
- ✅ Password change and reset
- ✅ Employee invitation flow
- ✅ Permission verification
- ✅ Token validation and expiry
- ✅ Email verification process

### Company Management Tests (`companies.test.ts`)
- ✅ Company profile CRUD operations
- ✅ Subscription management and limits
- ✅ Company statistics and analytics
- ✅ User listing with pagination
- ✅ Activity tracking
- ✅ Settings management with permissions

### Employee Management Tests (`employees.test.ts`)
- ✅ Employee CRUD operations
- ✅ Role assignments and updates
- ✅ Employee search and filtering
- ✅ Activation/deactivation
- ✅ Permission-based access control
- ✅ Employee activity tracking

### Role Management Tests (`roles.test.ts`)
- ✅ Custom role creation and management
- ✅ Permission system validation
- ✅ System vs custom role handling
- ✅ Role assignment restrictions
- ✅ Role deletion with dependency checks

### Job Management Tests (`jobs.test.ts`)
- ✅ Job posting creation and validation
- ✅ Publishing/unpublishing workflow
- ✅ Job search and filtering
- ✅ Application tracking
- ✅ Workflow assignment
- ✅ Salary and location validation

### Candidate Management Tests (`candidates.test.ts`)
- ✅ Candidate profile management
- ✅ Application process
- ✅ Status tracking and updates
- ✅ Talent pool management
- ✅ Search and filtering capabilities
- ✅ Resume upload and parsing

### Workflow Management Tests (`workflows.test.ts`)
- ✅ Workflow creation with stages
- ✅ Template management
- ✅ Workflow cloning
- ✅ AI optimization features
- ✅ Analytics and reporting
- ✅ Stage validation and ordering

### Interview & Assessment Tests (`interviews-assessments.test.ts`)
- ✅ Interview scheduling and management
- ✅ Assessment creation and assignment
- ✅ Status tracking and updates
- ✅ Interviewer assignment
- ✅ Time slot validation
- ✅ Assessment scoring and evaluation

## 🔧 Test Utilities

### TestDataFactory
Provides factory methods for creating test data:

```typescript
// Create test company
const company = await TestDataFactory.createTestCompany({
  name: 'Custom Company Name'
});

// Create test user with specific permissions
const user = await TestDataFactory.createTestUser(companyId, roleId, {
  email: 'custom@email.com',
  permissions: { jobs: { create: true, read: true } }
});

// Create test job
const job = await TestDataFactory.createTestJob(companyId, userId);
```

### TestApiClient
Provides convenient API client for testing:

```typescript
const apiClient = new TestApiClient();

// Authentication
const response = await apiClient.login(email, password);

// CRUD operations
const jobs = await apiClient.getJobs(token, { department: 'Engineering' });
const newJob = await apiClient.createJob(token, jobData);
```

### Assertion Helpers
Convenient assertion functions:

```typescript
expectSuccess(response);           // Expect 200 status
expectCreated(response);          // Expect 201 status
expectValidationError(response);  // Expect 400 validation error
expectUnauthorized(response);     // Expect 401 unauthorized
expectForbidden(response);        // Expect 403 forbidden
expectNotFound(response);         // Expect 404 not found
```

## 🎯 Edge Cases Covered

### Security & Authentication
- Invalid tokens and expired sessions
- Permission boundary testing
- SQL injection and XSS prevention
- Rate limiting validation
- CORS policy enforcement

### Data Validation
- Required field validation
- Data type validation
- Field length limits
- Email format validation
- Date range validation
- Enum value validation

### Business Logic
- Duplicate email prevention
- Role hierarchy enforcement
- Subscription limit checking
- Workflow stage ordering
- Application status transitions
- Interview scheduling conflicts

### Error Handling
- Database connection failures
- Invalid ObjectId formats
- Missing resource handling
- Concurrent modification scenarios
- File upload limitations

## 📊 Coverage Report

Run `npm run test:coverage` to generate a detailed coverage report. The report includes:

- **Line Coverage**: Percentage of code lines executed
- **Function Coverage**: Percentage of functions called
- **Branch Coverage**: Percentage of code branches taken
- **Statement Coverage**: Percentage of statements executed

Coverage reports are generated in the `coverage/` directory.

## 🐛 Debugging Tests

### Debug Mode
```bash
# Run tests in debug mode
npm run test:debug

# Debug specific test
npx jest --debug tests/routes/auth.test.ts
```

### Verbose Output
```bash
# Run with detailed output
npm run test:verbose

# Show console.log statements
NODE_ENV=test-verbose npm test
```

### Database Inspection
Tests use MongoDB Memory Server for isolation. To inspect database state:

```typescript
// In test files
beforeEach(async () => {
  // Database is clean before each test
});

afterEach(async () => {
  // Inspect data if needed before cleanup
  const users = await Employee.find({});
  console.log('Users in database:', users);
});
```

## 🤝 Contributing

### Adding New Tests

1. Create test file in appropriate directory
2. Follow existing naming conventions
3. Use TestDataFactory for test data creation
4. Include edge cases and error scenarios
5. Add comprehensive assertions

### Test Guidelines

- **Isolation**: Each test should be independent
- **Clarity**: Test names should describe the scenario
- **Coverage**: Include positive and negative test cases
- **Performance**: Keep tests fast and efficient
- **Maintainability**: Use helper functions and avoid duplication

### Example Test Structure

```typescript
describe('Feature Name', () => {
  let testUser: any;
  let testCompany: any;

  beforeEach(async () => {
    // Setup test data
    testCompany = await TestDataFactory.createTestCompany();
    testUser = await TestDataFactory.createTestUser(testCompany.id);
  });

  describe('POST /api/endpoint', () => {
    it('should succeed with valid data', async () => {
      // Test implementation
    });

    it('should fail with invalid data', async () => {
      // Test implementation
    });

    it('should fail without permission', async () => {
      // Test implementation
    });
  });
});
```

## 📝 Notes

- Tests use in-memory MongoDB for speed and isolation
- All tests clean up after themselves automatically
- Environment variables are mocked for testing
- API responses follow consistent format validation
- Permission testing covers all role combinations

## 🔗 Related Documentation

- [API Documentation](../docs/swagger.yaml)
- [Database Models](../src/models/)
- [Route Handlers](../src/routes/)
- [Permission System](../src/middleware/auth.ts)