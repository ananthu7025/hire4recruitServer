import { Request, Response, NextFunction } from 'express';

/**
 * Simple middleware for adding Swagger documentation to routes
 */
export function swagger(config: {
  summary?: string;
  description?: string;
  tags?: string[];
  auth?: boolean;
  params?: { [key: string]: 'string' | 'number' | 'boolean' };
  query?: { [key: string]: 'string' | 'number' | 'boolean' };
  body?: any;
  responses?: { [statusCode: string]: string };
}) {
  return function (req: Request, res: Response, next: NextFunction) {
    // Store swagger config on the request for later processing
    (req as any).swaggerConfig = config;
    next();
  };
}

/**
 * Quick documentation helpers
 */
export const SwaggerHelpers = {
  // Auth required
  auth: () => swagger({ auth: true }),

  // Common CRUD operations
  getAll: (resource: string) => swagger({
    summary: `Get all ${resource}`,
    description: `Retrieve a list of ${resource} with pagination and filters`,
    tags: [resource],
    auth: true,
    query: {
      page: 'number',
      limit: 'number',
      search: 'string'
    },
    responses: {
      '200': 'Success with paginated results',
      '401': 'Unauthorized'
    }
  }),

  getById: (resource: string) => swagger({
    summary: `Get ${resource} by ID`,
    description: `Retrieve a specific ${resource} by its ID`,
    tags: [resource],
    auth: true,
    params: { id: 'string' },
    responses: {
      '200': 'Success',
      '401': 'Unauthorized',
      '404': 'Not found'
    }
  }),

  create: (resource: string) => swagger({
    summary: `Create ${resource}`,
    description: `Create a new ${resource}`,
    tags: [resource],
    auth: true,
    body: { type: 'object', description: `${resource} data` },
    responses: {
      '201': 'Created successfully',
      '400': 'Validation error',
      '401': 'Unauthorized'
    }
  }),

  update: (resource: string) => swagger({
    summary: `Update ${resource}`,
    description: `Update an existing ${resource}`,
    tags: [resource],
    auth: true,
    params: { id: 'string' },
    body: { type: 'object', description: `Updated ${resource} data` },
    responses: {
      '200': 'Updated successfully',
      '400': 'Validation error',
      '401': 'Unauthorized',
      '404': 'Not found'
    }
  }),

  delete: (resource: string) => swagger({
    summary: `Delete ${resource}`,
    description: `Delete a ${resource}`,
    tags: [resource],
    auth: true,
    params: { id: 'string' },
    responses: {
      '200': 'Deleted successfully',
      '401': 'Unauthorized',
      '404': 'Not found'
    }
  }),

  // Common actions
  search: (resource: string) => swagger({
    summary: `Search ${resource}`,
    description: `Search ${resource} with various filters`,
    tags: [resource],
    auth: true,
    query: {
      q: 'string',
      filter: 'string',
      sort: 'string'
    }
  }),

  publish: (resource: string) => swagger({
    summary: `Publish ${resource}`,
    description: `Make ${resource} active/public`,
    tags: [resource],
    auth: true,
    params: { id: 'string' }
  }),

  activate: (resource: string) => swagger({
    summary: `Activate ${resource}`,
    description: `Activate a ${resource}`,
    tags: [resource],
    auth: true,
    params: { id: 'string' }
  }),

  deactivate: (resource: string) => swagger({
    summary: `Deactivate ${resource}`,
    description: `Deactivate a ${resource}`,
    tags: [resource],
    auth: true,
    params: { id: 'string' }
  })
};

/**
 * Extract Swagger documentation from Express app routes
 */
export function extractSwaggerFromApp(app: any): any {
  const paths: any = {};

  // Function to traverse router stack
  function traverseStack(stack: any[], basePath: string = '') {
    stack.forEach((layer: any) => {
      if (layer.route) {
        // This is a route
        const route = layer.route;
        const fullPath = basePath + route.path;
        const swaggerPath = fullPath.replace(/:([^/]+)/g, '{$1}');

        if (!paths[swaggerPath]) {
          paths[swaggerPath] = {};
        }

        Object.keys(route.methods).forEach((method: string) => {
          paths[swaggerPath][method.toLowerCase()] = generateOperationFromRoute(
            method.toLowerCase(),
            fullPath,
            route
          );
        });
      } else if (layer.name === 'router' && layer.handle.stack) {
        // This is a sub-router
        const routerPath = extractRouterPath(layer.regexp);
        traverseStack(layer.handle.stack, basePath + routerPath);
      }
    });
  }

  // Start traversal
  if (app._router && app._router.stack) {
    traverseStack(app._router.stack);
  }

  return paths;
}

/**
 * Generate operation object from route
 */
function generateOperationFromRoute(method: string, path: string, route: any): any {
  const pathSegments = path.split('/').filter(Boolean);
  const resourceName = pathSegments.find(segment =>
    !segment.startsWith(':') &&
    segment !== 'api' &&
    !segment.match(/^v\d+$/)
  ) || 'Resource';

  const operationId = `${method}${pathSegments
    .map(segment => segment.startsWith(':')
      ? 'By' + capitalize(segment.slice(1))
      : capitalize(segment)
    ).join('')}`;

  // Extract parameters from path
  const parameters = pathSegments
    .filter(segment => segment.startsWith(':'))
    .map(segment => ({
      name: segment.slice(1),
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: `${segment.slice(1)} parameter`
    }));

  // Common query parameters for GET requests
  if (method === 'get' && !pathSegments.some(segment => segment.startsWith(':'))) {
    parameters.push(
      {
        name: 'page',
        in: 'query',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1
        } as any,
        description: 'Page number'
      },
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 10
        } as any,
        description: 'Items per page'
      },
      {
        name: 'search',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Search term'
      }
    );
  }

  return {
    summary: generateSummary(method, resourceName, path),
    description: generateDescription(method, resourceName, path),
    tags: [capitalize(resourceName)],
    operationId,
    security: [{ bearerAuth: [] }],
    parameters: parameters.length > 0 ? parameters : undefined,
    requestBody: ['post', 'put', 'patch'].includes(method) ? {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            description: 'Request body'
          }
        }
      }
    } : undefined,
    responses: generateResponses(method, resourceName)
  };
}

/**
 * Extract router path from regexp
 */
function extractRouterPath(regexp: RegExp): string {
  const source = regexp.source;
  const match = source.match(/\^\\?\/(.*?)\\\//);
  return match ? `/${match[1].replace(/\\\//g, '/')}` : '';
}

/**
 * Generate summary
 */
function generateSummary(method: string, resource: string, path: string): string {
  const actions: { [key: string]: string } = {
    get: path.includes(':') ? 'Get' : 'List',
    post: 'Create',
    put: 'Update',
    patch: 'Update',
    delete: 'Delete'
  };

  const action = actions[method] || method.toUpperCase();
  return `${action} ${resource}`;
}

/**
 * Generate description
 */
function generateDescription(method: string, resource: string, path: string): string {
  const actions: { [key: string]: string } = {
    get: path.includes(':') ? `Retrieve a specific ${resource}` : `List ${resource} with pagination`,
    post: `Create a new ${resource}`,
    put: `Update an existing ${resource}`,
    patch: `Partially update a ${resource}`,
    delete: `Delete a ${resource}`
  };

  return actions[method] || `${method.toUpperCase()} operation for ${resource}`;
}

/**
 * Generate responses
 */
function generateResponses(method: string, resource: string): any {
  const baseResponses = {
    '401': { description: 'Unauthorized' },
    '403': { description: 'Forbidden' },
    '500': { description: 'Internal server error' }
  };

  switch (method) {
    case 'get':
      return {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { type: 'object' }
                }
              }
            }
          }
        },
        '404': { description: 'Not found' },
        ...baseResponses
      };

    case 'post':
      return {
        '201': {
          description: 'Created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                  data: { type: 'object' }
                }
              }
            }
          }
        },
        '400': { description: 'Validation error' },
        ...baseResponses
      };

    case 'put':
    case 'patch':
      return {
        '200': {
          description: 'Updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                  data: { type: 'object' }
                }
              }
            }
          }
        },
        '400': { description: 'Validation error' },
        '404': { description: 'Not found' },
        ...baseResponses
      };

    case 'delete':
      return {
        '200': {
          description: 'Deleted successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' }
                }
              }
            }
          }
        },
        '404': { description: 'Not found' },
        ...baseResponses
      };

    default:
      return {
        '200': { description: 'Success' },
        ...baseResponses
      };
  }
}

/**
 * Capitalize string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}