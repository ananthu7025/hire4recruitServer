import { Application, Router } from 'express';
import { SwaggerDecorators } from './swagger-decorators';
import fs from 'fs';
import path from 'path';

/**
 * Automatic Swagger documentation generator
 * Scans routes and generates OpenAPI documentation
 */
export class AutoSwaggerGenerator {
  private app: Application;
  private paths: any = {};
  private tags: Set<string> = new Set();

  constructor(app: Application) {
    this.app = app;
  }

  /**
   * Generate complete OpenAPI documentation
   */
  generateDocumentation(): any {
    this.scanRoutes();
    return {
      openapi: '3.0.0',
      info: {
        title: 'hire4recruit API',
        version: '1.0.0',
        description: 'Auto-generated API documentation'
      },
      paths: this.paths,
      tags: Array.from(this.tags).map(tag => ({ name: tag }))
    };
  }

  /**
   * Scan all routes in the application
   */
  private scanRoutes(): void {
    if (this.app._router && this.app._router.stack) {
      this.traverseRouterStack(this.app._router.stack, '');
    }
  }

  /**
   * Recursively traverse router stack
   */
  private traverseRouterStack(stack: any[], basePath: string): void {
    stack.forEach((layer: any) => {
      if (layer.route) {
        // Regular route
        this.processRoute(layer.route, basePath);
      } else if (layer.name === 'router' && layer.handle?.stack) {
        // Sub-router (e.g., /api/v1/users)
        const routerPath = this.extractRouterPath(layer.regexp);
        this.traverseRouterStack(layer.handle.stack, basePath + routerPath);
      }
    });
  }

  /**
   * Process individual route
   */
  private processRoute(route: any, basePath: string): void {
    const fullPath = basePath + route.path;
    const swaggerPath = this.convertToSwaggerPath(fullPath);

    if (!this.paths[swaggerPath]) {
      this.paths[swaggerPath] = {};
    }

    // Process each HTTP method
    Object.keys(route.methods).forEach((method: string) => {
      if (method !== '_all') {
        const operation = this.generateOperation(method, fullPath, route);
        this.paths[swaggerPath][method.toLowerCase()] = operation;

        // Add tags
        if (operation.tags) {
          operation.tags.forEach((tag: string) => this.tags.add(tag));
        }
      }
    });
  }

  /**
   * Generate operation documentation for a route
   */
  private generateOperation(method: string, path: string, route: any): any {
    const pathSegments = path.split('/').filter(Boolean);
    const resource = this.extractResourceName(pathSegments);
    const operationType = this.determineOperationType(method, path);

    const operation: any = {
      summary: this.generateSummary(method, resource, operationType),
      description: this.generateDescription(method, resource, operationType),
      tags: [this.capitalizeFirst(resource)],
      operationId: this.generateOperationId(method, pathSegments),
      security: [{ BearerAuth: [] }],
      parameters: this.generateParameters(pathSegments, method),
      responses: this.generateResponses(method, operationType)
    };

    // Add request body for POST/PUT/PATCH
    if (['post', 'put', 'patch'].includes(method.toLowerCase())) {
      operation.requestBody = this.generateRequestBody(resource, operationType);
    }

    return operation;
  }

  /**
   * Extract resource name from path segments
   */
  private extractResourceName(pathSegments: string[]): string {
    // Find the first non-api, non-version segment
    const resourceSegment = pathSegments.find(segment =>
      !segment.startsWith(':') &&
      segment !== 'api' &&
      !segment.match(/^v\d+$/) &&
      segment !== 'auth'
    );

    return resourceSegment || 'Resource';
  }

  /**
   * Determine operation type based on method and path
   */
  private determineOperationType(method: string, path: string): string {
    const lowerMethod = method.toLowerCase();
    const hasId = path.includes(':');

    // Special cases
    if (path.includes('/publish')) return 'publish';
    if (path.includes('/activate')) return 'activate';
    if (path.includes('/deactivate')) return 'deactivate';
    if (path.includes('/search')) return 'search';
    if (path.includes('/analytics')) return 'analytics';
    if (path.includes('/stats')) return 'stats';
    if (path.includes('/applications')) return 'applications';
    if (path.includes('/talent-pool')) return 'talent-pool';
    if (path.includes('/summary')) return 'summary';
    if (path.includes('/feedback')) return 'feedback';
    if (path.includes('/calendar')) return 'calendar';
    if (path.includes('/availability')) return 'availability';
    if (path.includes('/results')) return 'results';
    if (path.includes('/templates')) return 'templates';
    if (path.includes('/clone')) return 'clone';
    if (path.includes('/cancel')) return 'cancel';
    if (path.includes('/assign')) return 'assign';

    // Standard CRUD
    switch (lowerMethod) {
      case 'get':
        return hasId ? 'getById' : 'list';
      case 'post':
        return 'create';
      case 'put':
      case 'patch':
        return 'update';
      case 'delete':
        return 'delete';
      default:
        return lowerMethod;
    }
  }

  /**
   * Generate summary for operation
   */
  private generateSummary(method: string, resource: string, operationType: string): string {
    const summaries: { [key: string]: string } = {
      list: `List ${resource}`,
      getById: `Get ${resource} by ID`,
      create: `Create ${resource}`,
      update: `Update ${resource}`,
      delete: `Delete ${resource}`,
      publish: `Publish ${resource}`,
      activate: `Activate ${resource}`,
      deactivate: `Deactivate ${resource}`,
      search: `Search ${resource}`,
      analytics: `Get ${resource} analytics`,
      stats: `Get ${resource} statistics`,
      applications: `Get ${resource} applications`,
      'talent-pool': `Get talent pool`,
      summary: `Get ${resource} summary`,
      feedback: `Get/Submit ${resource} feedback`,
      calendar: `Get ${resource} calendar`,
      availability: `Check ${resource} availability`,
      results: `Get ${resource} results`,
      templates: `Get ${resource} templates`,
      clone: `Clone ${resource}`,
      cancel: `Cancel ${resource}`,
      assign: `Assign ${resource}`
    };

    return summaries[operationType] || `${method.toUpperCase()} ${resource}`;
  }

  /**
   * Generate description for operation
   */
  private generateDescription(method: string, resource: string, operationType: string): string {
    const descriptions: { [key: string]: string } = {
      list: `Retrieve a paginated list of ${resource} with filtering options`,
      getById: `Get detailed information about a specific ${resource}`,
      create: `Create a new ${resource} with the provided data`,
      update: `Update an existing ${resource} with new information`,
      delete: `Delete a ${resource} from the system`,
      publish: `Make a ${resource} publicly available`,
      activate: `Activate a ${resource}`,
      deactivate: `Deactivate a ${resource}`,
      search: `Search ${resource} with advanced filters and AI matching`,
      analytics: `Get comprehensive analytics and metrics for ${resource}`,
      stats: `Get statistical information about ${resource}`,
      applications: `Retrieve applications related to ${resource}`,
      'talent-pool': `Access the talent pool of candidates`,
      summary: `Get a comprehensive summary of ${resource} including analytics`,
      feedback: `Retrieve or submit feedback for ${resource}`,
      calendar: `Get calendar view for ${resource}`,
      availability: `Check availability for ${resource}`,
      results: `Get results and performance data for ${resource}`,
      templates: `Retrieve available templates for ${resource}`,
      clone: `Create a copy of an existing ${resource}`,
      cancel: `Cancel or abort ${resource}`,
      assign: `Assign ${resource} to users or candidates`
    };

    return descriptions[operationType] || `Perform ${method.toUpperCase()} operation on ${resource}`;
  }

  /**
   * Generate operation ID
   */
  private generateOperationId(method: string, pathSegments: string[]): string {
    const cleanSegments = pathSegments
      .filter(segment => segment !== 'api' && !segment.match(/^v\d+$/))
      .map(segment => {
        if (segment.startsWith(':')) {
          return 'By' + this.capitalizeFirst(segment.slice(1));
        }
        return this.capitalizeFirst(segment);
      });

    return method.toLowerCase() + cleanSegments.join('');
  }

  /**
   * Generate parameters for operation
   */
  private generateParameters(pathSegments: string[], method: string): any[] {
    const parameters: any[] = [];

    // Path parameters
    pathSegments
      .filter(segment => segment.startsWith(':'))
      .forEach(segment => {
        const paramName = segment.slice(1);
        parameters.push({
          name: paramName,
          in: 'path',
          required: true,
          description: `${this.capitalizeFirst(paramName)} identifier`,
          schema: { type: 'string' }
        });
      });

    // Query parameters for GET requests (list operations)
    if (method.toLowerCase() === 'get' && !pathSegments.some(seg => seg.startsWith(':'))) {
      parameters.push(
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
        {
          name: 'search',
          in: 'query',
          required: false,
          description: 'Search term for filtering results',
          schema: { type: 'string' }
        },
        {
          name: 'status',
          in: 'query',
          required: false,
          description: 'Filter by status',
          schema: { type: 'string' }
        }
      );
    }

    return parameters;
  }

  /**
   * Generate request body for operation
   */
  private generateRequestBody(resource: string, operationType: string): any {
    const schemas: { [key: string]: string } = {
      User: 'User',
      Company: 'Company',
      Job: 'Job',
      Candidate: 'Candidate',
      Interview: 'Interview',
      Assessment: 'Assessment'
    };

    const resourceSchema = schemas[this.capitalizeFirst(resource)];

    if (operationType === 'create' && resourceSchema) {
      return {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${resourceSchema}` }
          }
        }
      };
    }

    return {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            description: `${this.capitalizeFirst(resource)} data`
          }
        }
      }
    };
  }

  /**
   * Generate responses for operation
   */
  private generateResponses(method: string, operationType: string): any {
    const baseResponses = {
      '401': { $ref: '#/components/responses/UnauthorizedError' },
      '403': { $ref: '#/components/responses/ForbiddenError' },
      '500': { $ref: '#/components/responses/InternalServerError' }
    };

    switch (method.toLowerCase()) {
      case 'get':
        if (operationType === 'list') {
          return {
            '200': {
              description: 'List retrieved successfully',
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
                              items: { type: 'array', items: { type: 'object' } },
                              pagination: { $ref: '#/components/schemas/PaginationMeta' }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            },
            ...baseResponses
          };
        } else {
          return {
            '200': {
              description: 'Retrieved successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessResponse' }
                }
              }
            },
            '404': { $ref: '#/components/responses/NotFoundError' },
            ...baseResponses
          };
        }

      case 'post':
        return {
          '201': {
            description: 'Created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' }
              }
            }
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          ...baseResponses
        };

      case 'put':
      case 'patch':
        return {
          '200': {
            description: 'Updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' }
              }
            }
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '404': { $ref: '#/components/responses/NotFoundError' },
          ...baseResponses
        };

      case 'delete':
        return {
          '200': {
            description: 'Deleted successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' }
              }
            }
          },
          '404': { $ref: '#/components/responses/NotFoundError' },
          ...baseResponses
        };

      default:
        return {
          '200': {
            description: 'Operation completed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' }
              }
            }
          },
          ...baseResponses
        };
    }
  }

  /**
   * Convert Express path to OpenAPI path
   */
  private convertToSwaggerPath(path: string): string {
    return path.replace(/:([^/]+)/g, '{$1}');
  }

  /**
   * Extract router path from regexp
   */
  private extractRouterPath(regexp: RegExp): string {
    const source = regexp.source;
    const match = source.match(/\^\\?\/(.*?)\\\//);
    return match ? `/${match[1].replace(/\\\//g, '/')}` : '';
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Save documentation to file
   */
  saveToFile(outputPath: string): void {
    const docs = this.generateDocumentation();
    fs.writeFileSync(outputPath, JSON.stringify(docs, null, 2));
  }
}

/**
 * Middleware to automatically generate docs
 */
export function autoGenerateSwagger(app: Application): any {
  const generator = new AutoSwaggerGenerator(app);
  return generator.generateDocumentation();
}

/**
 * Generate documentation and merge with existing config
 */
export function generateAndMergeSwagger(app: Application, existingSpec: any): any {
  const generator = new AutoSwaggerGenerator(app);
  const autoGenerated = generator.generateDocumentation();

  // Merge auto-generated paths with existing spec
  const mergedSpec = {
    ...existingSpec,
    paths: {
      ...existingSpec.paths,
      ...autoGenerated.paths
    },
    tags: [
      ...(existingSpec.tags || []),
      ...autoGenerated.tags.filter((tag: any) =>
        !existingSpec.tags?.find((existingTag: any) => existingTag.name === tag.name)
      )
    ]
  };

  return mergedSpec;
}