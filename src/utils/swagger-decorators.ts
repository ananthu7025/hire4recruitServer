import { Request, Response, NextFunction } from 'express';

/**
 * Extended Swagger decorators for more specific use cases
 */
export class SwaggerDecorators {
  /**
   * Authentication endpoints
   */
  static auth = {
    login: () => ({
      summary: 'User login',
      description: 'Authenticate user and return JWT token',
      tags: ['Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', format: 'email', example: 'user@example.com' },
                password: { type: 'string', format: 'password', example: 'password123' }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Login successful' },
                  data: {
                    type: 'object',
                    properties: {
                      token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                      user: { $ref: '#/components/schemas/User' }
                    }
                  }
                }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '400': { $ref: '#/components/responses/ValidationError' }
      }
    }),

    register: () => ({
      summary: 'Register company',
      description: 'Register a new company and create admin user',
      tags: ['Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['companyName', 'adminEmail', 'adminPassword'],
              properties: {
                companyName: { type: 'string', example: 'TechCorp Inc.' },
                adminEmail: { type: 'string', format: 'email', example: 'admin@techcorp.com' },
                adminPassword: { type: 'string', format: 'password', minLength: 8 },
                adminFirstName: { type: 'string', example: 'John' },
                adminLastName: { type: 'string', example: 'Doe' },
                companyDomain: { type: 'string', example: 'techcorp.com' },
                industry: { type: 'string', example: 'Technology' }
              }
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Company registered successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          company: { $ref: '#/components/schemas/Company' },
                          admin: { $ref: '#/components/schemas/User' },
                          token: { type: 'string' }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '409': {
          description: 'Company already exists',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string', example: 'Company already exists' },
                  message: { type: 'string', example: 'A company with this email domain already exists' }
                }
              }
            }
          }
        }
      }
    })
  };

  /**
   * File upload endpoints
   */
  static fileUpload = {
    resume: () => ({
      summary: 'Upload resume',
      description: 'Upload and process candidate resume using AI',
      tags: ['Candidates'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                resume: {
                  type: 'string',
                  format: 'binary',
                  description: 'Resume file (PDF, DOC, DOCX)'
                }
              },
              required: ['resume']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Resume uploaded and processed successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Resume uploaded and processed successfully' },
                  data: {
                    type: 'object',
                    properties: {
                      resumeUrl: { type: 'string', format: 'uri' },
                      extractedData: {
                        type: 'object',
                        properties: {
                          skills: { type: 'array', items: { type: 'string' } },
                          experience: { type: 'string' },
                          education: { type: 'array', items: { type: 'object' } }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '400': {
          description: 'Invalid file or missing file',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string', example: 'Invalid file format' },
                  message: { type: 'string', example: 'Please upload a valid resume file (PDF, DOC, DOCX)' }
                }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' }
      }
    })
  };

  /**
   * Analytics endpoints
   */
  static analytics = {
    general: (resource: string) => ({
      summary: `Get ${resource} analytics`,
      description: `Retrieve analytics and metrics for ${resource}`,
      tags: ['Analytics', resource],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'dateFrom',
          in: 'query',
          description: 'Start date for analytics period',
          schema: { type: 'string', format: 'date', example: '2023-01-01' }
        },
        {
          name: 'dateTo',
          in: 'query',
          description: 'End date for analytics period',
          schema: { type: 'string', format: 'date', example: '2023-12-31' }
        },
        {
          name: 'groupBy',
          in: 'query',
          description: 'Group results by time period',
          schema: { type: 'string', enum: ['day', 'week', 'month'], default: 'month' }
        }
      ],
      responses: {
        '200': {
          description: 'Analytics retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      analytics: {
                        type: 'object',
                        properties: {
                          totalCount: { type: 'integer' },
                          trends: { type: 'array', items: { type: 'object' } },
                          summary: { type: 'object' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' }
      }
    })
  };

  /**
   * Bulk operations
   */
  static bulk = {
    operation: (resource: string, operation: string) => ({
      summary: `Bulk ${operation} ${resource}`,
      description: `Perform ${operation} on multiple ${resource} items`,
      tags: [resource, 'Bulk Operations'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ids: {
                  type: 'array',
                  items: { type: 'string' },
                  description: `Array of ${resource} IDs to ${operation}`,
                  minItems: 1,
                  maxItems: 100
                },
                options: {
                  type: 'object',
                  description: 'Additional options for the operation'
                }
              },
              required: ['ids']
            }
          }
        }
      },
      responses: {
        '200': {
          description: `Bulk ${operation} completed`,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: `Bulk ${operation} completed` },
                  data: {
                    type: 'object',
                    properties: {
                      processed: { type: 'integer', description: 'Number of items processed' },
                      successful: { type: 'integer', description: 'Number of successful operations' },
                      failed: { type: 'integer', description: 'Number of failed operations' },
                      errors: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            error: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '403': { $ref: '#/components/responses/ForbiddenError' }
      }
    })
  };

  /**
   * Status change operations
   */
  static statusChange = {
    update: (resource: string, statusField: string = 'status') => ({
      summary: `Update ${resource} ${statusField}`,
      description: `Change the ${statusField} of a ${resource}`,
      tags: [resource],
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: `${resource} ID`,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                [statusField]: { type: 'string', description: `New ${statusField} value` },
                reason: { type: 'string', description: 'Reason for status change' },
                notes: { type: 'string', description: 'Additional notes' }
              },
              required: [statusField]
            }
          }
        }
      },
      responses: {
        '200': {
          description: `${resource} ${statusField} updated successfully`,
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        description: `Updated ${resource}`
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '404': { $ref: '#/components/responses/NotFoundError' }
      }
    })
  };

  /**
   * Search operations
   */
  static search = {
    advanced: (resource: string) => ({
      summary: `Advanced ${resource} search`,
      description: `Perform advanced search with multiple filters and AI-powered matching`,
      tags: [resource, 'Search'],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
                filters: {
                  type: 'object',
                  description: 'Advanced filters',
                  properties: {
                    skills: { type: 'array', items: { type: 'string' } },
                    experience: { type: 'string' },
                    location: { type: 'string' },
                    dateRange: {
                      type: 'object',
                      properties: {
                        from: { type: 'string', format: 'date' },
                        to: { type: 'string', format: 'date' }
                      }
                    }
                  }
                },
                sort: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    order: { type: 'string', enum: ['asc', 'desc'] }
                  }
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer', minimum: 1, default: 1 },
                    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
                  }
                }
              },
              required: ['query']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Search completed successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      results: {
                        type: 'array',
                        items: { type: 'object' }
                      },
                      pagination: { $ref: '#/components/schemas/PaginationMeta' },
                      searchMeta: {
                        type: 'object',
                        properties: {
                          totalMatches: { type: 'integer' },
                          searchTime: { type: 'number', description: 'Search time in milliseconds' },
                          suggestions: { type: 'array', items: { type: 'string' } }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/ValidationError' },
        '401': { $ref: '#/components/responses/UnauthorizedError' }
      }
    })
  };
}

/**
 * Route documentation extractor
 */
export class RouteDocumentationExtractor {
  private static routeDocs: Map<string, any> = new Map();

  /**
   * Register route documentation
   */
  static registerRoute(method: string, path: string, documentation: any) {
    const key = `${method.toUpperCase()}:${path}`;
    this.routeDocs.set(key, documentation);
  }

  /**
   * Get all route documentation
   */
  static getAllDocs(): Map<string, any> {
    return this.routeDocs;
  }

  /**
   * Middleware to auto-document routes
   */
  static autoDocument(resource: string, operation?: string) {
    return function(req: Request, res: Response, next: NextFunction) {
      const method = req.method.toLowerCase();
      const path = req.route?.path || req.path;

      // Auto-generate documentation based on route pattern
      let documentation: any;

      if (operation) {
        // Use specific operation documentation
        documentation = SwaggerDecorators.analytics.general(resource);
      } else {
        // Auto-detect operation type
        if (method === 'get' && path.includes(':')) {
          documentation = {
            summary: `Get ${resource} by ID`,
            tags: [resource],
            security: [{ BearerAuth: [] }]
          };
        } else if (method === 'get') {
          documentation = {
            summary: `List ${resource}`,
            tags: [resource],
            security: [{ BearerAuth: [] }]
          };
        } else if (method === 'post') {
          documentation = {
            summary: `Create ${resource}`,
            tags: [resource],
            security: [{ BearerAuth: [] }]
          };
        } else if (method === 'put' || method === 'patch') {
          documentation = {
            summary: `Update ${resource}`,
            tags: [resource],
            security: [{ BearerAuth: [] }]
          };
        } else if (method === 'delete') {
          documentation = {
            summary: `Delete ${resource}`,
            tags: [resource],
            security: [{ BearerAuth: [] }]
          };
        }
      }

      if (documentation) {
        RouteDocumentationExtractor.registerRoute(method, path, documentation);
      }

      next();
    };
  }
}

/**
 * JSDoc style comments for automatic extraction
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Error Type"
 *         message:
 *           type: string
 *           example: "Error description"
 *         details:
 *           type: object
 *           description: "Additional error details"
 *
 *     PaginatedResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             items:
 *               type: array
 *               items:
 *                 type: object
 *             pagination:
 *               $ref: '#/components/schemas/PaginationMeta'
 *
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Operation completed successfully"
 *         data:
 *           type: object
 *         timestamp:
 *           type: string
 *           format: date-time
 *
 * tags:
 *   - name: Authentication
 *     description: User authentication and authorization
 *   - name: Companies
 *     description: Company management
 *   - name: Users
 *     description: User management
 *   - name: Jobs
 *     description: Job posting and management
 *   - name: Candidates
 *     description: Candidate management and profiles
 *   - name: Interviews
 *     description: Interview scheduling and management
 *   - name: Assessments
 *     description: Skills assessments and testing
 *   - name: Analytics
 *     description: Analytics and reporting
 *   - name: Search
 *     description: Search and filtering operations
 *   - name: Bulk Operations
 *     description: Bulk operations on multiple items
 */