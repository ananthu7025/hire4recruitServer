#!/usr/bin/env ts-node

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestSuite {
  name: string;
  file: string;
  description: string;
}

class TestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Authentication',
      file: 'tests/routes/auth.test.ts',
      description: 'Tests for authentication routes including registration, login, logout, and user management'
    },
    {
      name: 'Companies',
      file: 'tests/routes/companies.test.ts',
      description: 'Tests for company management routes including profile, stats, and subscription management'
    },
    {
      name: 'Employees',
      file: 'tests/routes/employees.test.ts',
      description: 'Tests for employee management routes including CRUD operations and role assignments'
    },
    {
      name: 'Roles',
      file: 'tests/routes/roles.test.ts',
      description: 'Tests for role management routes including permissions and role hierarchies'
    },
    {
      name: 'Jobs',
      file: 'tests/routes/jobs.test.ts',
      description: 'Tests for job management routes including creation, publishing, and application handling'
    },
    {
      name: 'Candidates',
      file: 'tests/routes/candidates.test.ts',
      description: 'Tests for candidate management routes including talent pool and application tracking'
    },
    {
      name: 'Workflows',
      file: 'tests/routes/workflows.test.ts',
      description: 'Tests for workflow management routes including templates, cloning, and analytics'
    },
    {
      name: 'Interviews & Assessments',
      file: 'tests/routes/interviews-assessments.test.ts',
      description: 'Tests for interview scheduling and assessment management routes'
    }
  ];

  private colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
  };

  constructor() {
    this.printHeader();
  }

  private printHeader() {
    console.log(this.colors.cyan + this.colors.bright);
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    hire4recruit Test Suite                   ║');
    console.log('║              Comprehensive API Route Testing                 ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(this.colors.reset);
  }

  private printTestSuiteInfo() {
    console.log(this.colors.yellow + 'Available Test Suites:' + this.colors.reset);
    console.log('');

    this.testSuites.forEach((suite, index) => {
      console.log(this.colors.bright + `${index + 1}. ${suite.name}` + this.colors.reset);
      console.log(`   ${this.colors.blue}${suite.description}${this.colors.reset}`);
      console.log(`   ${this.colors.magenta}File: ${suite.file}${this.colors.reset}`);
      console.log('');
    });
  }

  private async runJest(args: string[] = []): Promise<boolean> {
    return new Promise((resolve) => {
      const jestProcess = spawn('npx', ['jest', ...args], {
        stdio: 'inherit',
        shell: true,
        cwd: process.cwd()
      });

      jestProcess.on('close', (code) => {
        resolve(code === 0);
      });

      jestProcess.on('error', (error) => {
        console.error(this.colors.red + 'Error running Jest:' + this.colors.reset, error);
        resolve(false);
      });
    });
  }

  private validateTestFiles(): boolean {
    console.log(this.colors.yellow + 'Validating test files...' + this.colors.reset);

    let allFilesExist = true;
    const missingFiles: string[] = [];

    this.testSuites.forEach(suite => {
      const filePath = path.join(process.cwd(), suite.file);
      if (!fs.existsSync(filePath)) {
        allFilesExist = false;
        missingFiles.push(suite.file);
      }
    });

    if (!allFilesExist) {
      console.log(this.colors.red + 'Missing test files:' + this.colors.reset);
      missingFiles.forEach(file => {
        console.log(this.colors.red + `  ✗ ${file}` + this.colors.reset);
      });
      return false;
    }

    console.log(this.colors.green + '✓ All test files found' + this.colors.reset);
    return true;
  }

  private async checkDependencies(): Promise<boolean> {
    console.log(this.colors.yellow + 'Checking test dependencies...' + this.colors.reset);

    const packageJsonPath = path.join(process.cwd(), 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      console.log(this.colors.red + '✗ package.json not found' + this.colors.reset);
      return false;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const devDeps = packageJson.devDependencies || {};

      const requiredDeps = ['jest', '@types/jest', 'supertest', '@types/supertest', 'ts-jest'];
      const missingDeps = requiredDeps.filter(dep => !devDeps[dep]);

      if (missingDeps.length > 0) {
        console.log(this.colors.red + 'Missing dependencies:' + this.colors.reset);
        missingDeps.forEach(dep => {
          console.log(this.colors.red + `  ✗ ${dep}` + this.colors.reset);
        });
        console.log(this.colors.yellow + 'Run: npm install --save-dev ' + missingDeps.join(' ') + this.colors.reset);
        return false;
      }

      console.log(this.colors.green + '✓ All dependencies found' + this.colors.reset);
      return true;
    } catch (error) {
      console.log(this.colors.red + '✗ Error reading package.json' + this.colors.reset);
      return false;
    }
  }

  private printUsage() {
    console.log(this.colors.cyan + 'Usage:' + this.colors.reset);
    console.log('  npm run test                    # Run all tests');
    console.log('  npm run test:coverage           # Run tests with coverage report');
    console.log('  npm run test:watch              # Run tests in watch mode');
    console.log('  npm run test:verbose            # Run tests with verbose output');
    console.log('  npm run test:debug              # Run tests in debug mode');
    console.log('');
    console.log(this.colors.cyan + 'Jest Options:' + this.colors.reset);
    console.log('  --testPathPattern=<pattern>     # Run tests matching pattern');
    console.log('  --testNamePattern=<pattern>     # Run tests with names matching pattern');
    console.log('  --updateSnapshot                # Update snapshots');
    console.log('  --bail                          # Stop on first test failure');
    console.log('  --maxWorkers=<num>              # Set number of worker processes');
    console.log('');
    console.log(this.colors.cyan + 'Examples:' + this.colors.reset);
    console.log('  npx jest auth                   # Run only authentication tests');
    console.log('  npx jest --testNamePattern="login"  # Run tests with "login" in name');
    console.log('  npx jest --coverage --verbose   # Run with coverage and verbose output');
  }

  async runAllTests(): Promise<void> {
    console.log(this.colors.green + this.colors.bright + 'Running All Test Suites' + this.colors.reset);
    console.log('');

    const success = await this.runJest(['--coverage', '--verbose']);

    if (success) {
      console.log('');
      console.log(this.colors.green + this.colors.bright + '🎉 All tests completed successfully!' + this.colors.reset);
    } else {
      console.log('');
      console.log(this.colors.red + this.colors.bright + '❌ Some tests failed. Please check the output above.' + this.colors.reset);
    }
  }

  async runSpecificSuite(suiteName: string): Promise<void> {
    const suite = this.testSuites.find(s =>
      s.name.toLowerCase().includes(suiteName.toLowerCase()) ||
      s.file.toLowerCase().includes(suiteName.toLowerCase())
    );

    if (!suite) {
      console.log(this.colors.red + `Test suite "${suiteName}" not found` + this.colors.reset);
      this.printTestSuiteInfo();
      return;
    }

    console.log(this.colors.green + this.colors.bright + `Running ${suite.name} Tests` + this.colors.reset);
    console.log(this.colors.blue + suite.description + this.colors.reset);
    console.log('');

    const success = await this.runJest([suite.file, '--verbose']);

    if (success) {
      console.log('');
      console.log(this.colors.green + this.colors.bright + `✅ ${suite.name} tests completed successfully!` + this.colors.reset);
    } else {
      console.log('');
      console.log(this.colors.red + this.colors.bright + `❌ ${suite.name} tests failed.` + this.colors.reset);
    }
  }

  async run(): Promise<void> {
    const args = process.argv.slice(2);

    // Validate test files and dependencies
    if (!this.validateTestFiles() || !(await this.checkDependencies())) {
      process.exit(1);
    }

    if (args.length === 0) {
      this.printTestSuiteInfo();
      this.printUsage();
      console.log(this.colors.yellow + 'Run "npm test" to execute all tests' + this.colors.reset);
      return;
    }

    const command = args[0].toLowerCase();

    switch (command) {
      case 'all':
      case '--all':
        await this.runAllTests();
        break;

      case 'list':
      case '--list':
        this.printTestSuiteInfo();
        break;

      case 'help':
      case '--help':
      case '-h':
        this.printUsage();
        break;

      default:
        await this.runSpecificSuite(command);
        break;
    }
  }
}

// Run the test runner if this file is executed directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.run().catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
}

export default TestRunner;