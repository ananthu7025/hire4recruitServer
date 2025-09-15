import swaggerJSDoc from 'swagger-jsdoc';
import { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import { logger } from './logger';

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'hire4recruit API',
    version: '1.0.0',
    description: 'Multi-tenant recruitment management system with AI-powered features',
    contact: {
      name: 'hire4recruit Team',
      email: 'support@hire4recruit.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: process.env.API_BASE_URL || 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://api.hire4recruit.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /api/v1/auth/login'
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication information is missing or invalid',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Unauthorized' },
                message: { type: 'string', example: 'Invalid or missing authentication token' }
              }
            }
          }
        }
      },
      ForbiddenError: {
        description: 'Access denied due to insufficient permissions',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Forbidden' },
                message: { type: 'string', example: 'Insufficient permissions for this action' }
              }
            }
          }
        }
      },
      ValidationError: {
        description: 'Invalid input data',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Validation Error' },
                message: { type: 'string', example: 'Invalid input data' },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Not Found' },
                message: { type: 'string', example: 'The requested resource was not found' }
              }
            }
          }
        }
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'Internal Server Error' },
                message: { type: 'string', example: 'An unexpected error occurred' }
              }
            }
          }
        }
      }
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number for pagination',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1
        }
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Number of items per page',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 10
        }
      },
      SortByParam: {
        name: 'sortBy',
        in: 'query',
        description: 'Field to sort by',
        required: false,
        schema: {
          type: 'string'
        }
      },
      SortOrderParam: {
        name: 'sortOrder',
        in: 'query',
        description: 'Sort order',
        required: false,
        schema: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'desc'
        }
      }
    },
    schemas: {
      // Pagination Schema
      PaginationMeta: {
        type: 'object',
        properties: {
          currentPage: { type: 'integer', example: 1 },
          totalPages: { type: 'integer', example: 10 },
          totalItems: { type: 'integer', example: 100 },
          itemsPerPage: { type: 'integer', example: 10 }
        }
      },
      // Success Response Schema
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object' }
        }
      },
      // User Schema
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Doe' },
          role: {
            type: 'string',
            enum: ['company_admin', 'hr_manager', 'recruiter', 'hiring_manager', 'interviewer'],
            example: 'hr_manager'
          },
          status: { type: 'string', enum: ['active', 'inactive', 'pending'], example: 'active' },
          companyId: { type: 'string', example: '507f1f77bcf86cd799439011' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      // Company Schema
      Company: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          name: { type: 'string', example: 'TechCorp Inc.' },
          domain: { type: 'string', example: 'techcorp.com' },
          industry: { type: 'string', example: 'Technology' },
          size: { type: 'string', enum: ['startup', 'small', 'medium', 'large', 'enterprise'] },
          description: { type: 'string' },
          website: { type: 'string', format: 'uri' },
          location: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'trial'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      // Job Schema
      Job: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          title: { type: 'string', example: 'Senior Software Engineer' },
          department: { type: 'string', example: 'Engineering' },
          type: { type: 'string', enum: ['full-time', 'part-time', 'contract', 'internship'] },
          workMode: { type: 'string', enum: ['remote', 'onsite', 'hybrid'] },
          location: { type: 'string', example: 'San Francisco, CA' },
          description: { type: 'string' },
          requirements: { type: 'array', items: { type: 'string' } },
          benefits: { type: 'array', items: { type: 'string' } },
          salaryRange: {
            type: 'object',
            properties: {
              min: { type: 'number', example: 80000 },
              max: { type: 'number', example: 120000 },
              currency: { type: 'string', example: 'USD' }
            }
          },
          skills: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['draft', 'published', 'closed', 'archived'] },
          hiringManager: { type: 'string', example: '507f1f77bcf86cd799439011' },
          companyId: { type: 'string', example: '507f1f77bcf86cd799439011' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      // Candidate Schema
      Candidate: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          personalInfo: {
            type: 'object',
            properties: {
              firstName: { type: 'string', example: 'Jane' },
              lastName: { type: 'string', example: 'Smith' },
              email: { type: 'string', format: 'email', example: 'jane@example.com' },
              phone: { type: 'string', example: '+1234567890' },
              location: { type: 'string', example: 'New York, NY' },
              nationality: { type: 'string', example: 'US' }
            }
          },
          experience: { type: 'string', example: '5+ years' },
          currentPosition: { type: 'string', example: 'Software Engineer' },
          currentCompany: { type: 'string', example: 'TechStart' },
          skills: { type: 'array', items: { type: 'string' } },
          resumeUrl: { type: 'string', format: 'uri' },
          applications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                jobId: { type: 'string' },
                status: { type: 'string', enum: ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'] },
                appliedAt: { type: 'string', format: 'date-time' }
              }
            }
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      // Interview Schema
      Interview: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          candidateId: { type: 'string', example: '507f1f77bcf86cd799439011' },
          jobId: { type: 'string', example: '507f1f77bcf86cd799439011' },
          interviewerIds: { type: 'array', items: { type: 'string' } },
          type: { type: 'string', enum: ['phone', 'video', 'onsite', 'technical'] },
          status: { type: 'string', enum: ['scheduled', 'in-progress', 'completed', 'cancelled'] },
          scheduledAt: { type: 'string', format: 'date-time' },
          duration: { type: 'integer', description: 'Duration in minutes', example: 60 },
          location: { type: 'string' },
          notes: { type: 'string' },
          feedback: {
            type: 'object',
            properties: {
              rating: { type: 'number', minimum: 1, maximum: 5 },
              comments: { type: 'string' },
              recommendation: { type: 'string', enum: ['hire', 'no-hire', 'maybe'] }
            }
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      // Assessment Schema
      Assessment: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '507f1f77bcf86cd799439011' },
          title: { type: 'string', example: 'JavaScript Skills Assessment' },
          description: { type: 'string' },
          type: { type: 'string', enum: ['technical', 'behavioral', 'cognitive'] },
          difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
          duration: { type: 'integer', description: 'Duration in minutes', example: 90 },
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string', enum: ['multiple-choice', 'coding', 'essay'] },
                question: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } },
                correctAnswer: { type: 'string' }
              }
            }
          },
          status: { type: 'string', enum: ['draft', 'published', 'archived'] },
          companyId: { type: 'string', example: '507f1f77bcf86cd799439011' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ]
};

const options: swaggerJSDoc.Options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/utils/swagger-helpers.ts'
  ]
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Application): void => {
  try {
    // Swagger UI setup
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 20px 0 }
        .swagger-ui .scheme-container { background: #fafafa; padding: 10px; border-radius: 4px; }
      `,
      customSiteTitle: 'hire4recruit API Documentation',
      swaggerOptions: {
        defaultModelExpandDepth: 2,
        defaultModelsExpandDepth: 1,
        docExpansion: 'list',
        filter: true,
        showRequestDuration: true,
        tryItOutEnabled: true
      }
    }));

    // Swagger JSON endpoint
    app.get('/swagger.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    logger.info('📚 Swagger documentation setup complete');
    logger.info(`📖 API docs available at: /api-docs`);
    logger.info(`📄 Swagger JSON available at: /swagger.json`);

  } catch (error) {
    logger.error('Failed to setup Swagger:', error);
  }
};

export { swaggerSpec };