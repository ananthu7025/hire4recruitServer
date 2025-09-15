import { Express, Router } from 'express';
import path from 'path';
import fs from 'fs';

export interface RouteInfo {
  method: string;
  path: string;
  middleware: string[];
  handler: string;
  file: string;
}

export interface SwaggerPath {
  [method: string]: {
    summary: string;
    description: string;
    tags: string[];
    security?: Array<{ [key: string]: string[] }>;
    parameters?: any[];
    requestBody?: any;
    responses: any;
  };
}

/**
 * Analyze Express app routes and generate Swagger documentation
 */
export class RouteAnalyzer {
  private app: Express;
  private routes: RouteInfo[] = [];

  constructor(app: Express) {
    this.app = app;
  }

  /**
   * Extract all routes from Express app
   */
  analyzeRoutes(): RouteInfo[] {
    this.routes = [];
    this.extractRoutes(this.app._router);
    return this.routes;
  }

  /**
   * Generate Swagger paths from analyzed routes
   */
  generateSwaggerPaths(): { [path: string]: SwaggerPath } {
    const routes = this.analyzeRoutes();
    const swaggerPaths: { [path: string]: SwaggerPath } = {};

    routes.forEach(route => {
      const swaggerPath = this.convertExpressPathToSwagger(route.path);

      if (!swaggerPaths[swaggerPath]) {
        swaggerPaths[swaggerPath] = {};
      }

      swaggerPaths[swaggerPath][route.method.toLowerCase()] = this.generateSwaggerOperation(route);
    });

    return swaggerPaths;
  }

  /**
   * Extract routes from Express router recursively
   */
  private extractRoutes(router: any, basePath: string = '') {
    if (!router || !router.stack) return;

    router.stack.forEach((layer: any) => {
      if (layer.route) {
        // This is a route
        const route = layer.route;
        Object.keys(route.methods).forEach(method => {
          this.routes.push({
            method: method.toUpperCase(),
            path: basePath + route.path,
            middleware: this.extractMiddleware(route.stack),
            handler: this.extractHandler(route.stack),
            file: this.extractSourceFile()
          });
        });
      } else if (layer.name === 'router') {
        // This is a nested router
        const nestedPath = basePath + (layer.regexp.source.match(/\^\\?\/(.*?)\\\//)?.[1] || '');
        this.extractRoutes(layer.handle, `/${nestedPath.replace(/\\\//g, '/')}`);
      }
    });
  }

  /**
   * Extract middleware names from route stack
   */
  private extractMiddleware(stack: any[]): string[] {
    return stack
      .filter(layer => layer.name !== '<anonymous>')
      .map(layer => layer.name || 'unknown');
  }

  /**
   * Extract handler name from route stack
   */
  private extractHandler(stack: any[]): string {
    const lastLayer = stack[stack.length - 1];
    return lastLayer?.name || 'anonymous';
  }

  /**
   * Extract source file (simplified)
   */
  private extractSourceFile(): string {
    const stack = new Error().stack;
    const lines = stack?.split('\\n') || [];
    const relevantLine = lines.find(line => line.includes('routes/'));
    return relevantLine?.split('(')[1]?.split(')')[0] || 'unknown';
  }

  /**
   * Convert Express path format to Swagger path format
   */
  private convertExpressPathToSwagger(expressPath: string): string {
    return expressPath.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
  }

  /**
   * Generate Swagger operation from route info
   */
  private generateSwaggerOperation(route: RouteInfo): any {
    const tags = this.inferTags(route.path);
    const operationId = this.generateOperationId(route.method, route.path);
    const parameters = this.extractParameters(route.path);

    return {
      summary: this.generateSummary(route.method, route.path),
      description: this.generateDescription(route.method, route.path, route.middleware),
      tags,
      operationId,
      security: this.inferSecurity(route.middleware),
      parameters,
      requestBody: this.inferRequestBody(route.method),
      responses: this.generateDefaultResponses()
    };
  }

  /**
   * Infer tags from route path
   */
  private inferTags(path: string): string[] {
    const segments = path.split('/').filter(Boolean);
    if (segments.length > 0) {
      const firstSegment = segments[0];
      if (firstSegment === 'api' && segments.length > 2) {
        return [this.capitalize(segments[2])];
      }
      return [this.capitalize(firstSegment)];
    }
    return ['Default'];
  }

  /**
   * Generate operation ID
   */
  private generateOperationId(method: string, path: string): string {
    const pathParts = path.split('/').filter(Boolean).map(part =>
      part.startsWith('{') ? 'By' + this.capitalize(part.slice(1, -1)) : this.capitalize(part)
    );
    return method.toLowerCase() + pathParts.join('');
  }

  /**
   * Generate summary
   */
  private generateSummary(method: string, path: string): string {
    const action = this.getActionFromMethod(method);
    const resource = this.getResourceFromPath(path);
    return `${action} ${resource}`;
  }

  /**
   * Generate description
   */
  private generateDescription(method: string, path: string, middleware: string[]): string {
    const action = this.getActionFromMethod(method);
    const resource = this.getResourceFromPath(path);
    const middlewareInfo = middleware.length > 0 ? ` (${middleware.join(', ')})` : '';
    return `${action} ${resource}${middlewareInfo}`;
  }

  /**
   * Infer security requirements from middleware
   */
  private inferSecurity(middleware: string[]): Array<{ [key: string]: string[] }> {
    if (middleware.some(m => m.includes('auth') || m.includes('Auth'))) {
      return [{ bearerAuth: [] }];
    }
    return [];
  }

  /**
   * Extract parameters from path
   */
  private extractParameters(path: string): any[] {
    const parameters: any[] = [];
    const pathParams = path.match(/{([^}]+)}/g);

    if (pathParams) {
      pathParams.forEach(param => {
        const paramName = param.slice(1, -1);
        parameters.push({
          name: paramName,
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: `${paramName} parameter`
        });
      });
    }

    return parameters;
  }

  /**
   * Infer request body for POST/PUT/PATCH methods
   */
  private inferRequestBody(method: string): any {
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      return {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              description: 'Request body'
            }
          }
        }
      };
    }
    return undefined;
  }

  /**
   * Generate default responses
   */
  private generateDefaultResponses(): any {
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
      '400': { description: 'Bad Request' },
      '401': { description: 'Unauthorized' },
      '500': { description: 'Internal Server Error' }
    };
  }

  /**
   * Helper methods
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private getActionFromMethod(method: string): string {
    const actions: { [key: string]: string } = {
      'GET': 'Get',
      'POST': 'Create',
      'PUT': 'Update',
      'PATCH': 'Update',
      'DELETE': 'Delete'
    };
    return actions[method] || method;
  }

  private getResourceFromPath(path: string): string {
    const segments = path.split('/').filter(Boolean);
    const resourceSegment = segments.find(segment =>
      !segment.startsWith('{') &&
      segment !== 'api' &&
      !segment.match(/^v\d+$/)
    );
    return resourceSegment ? this.capitalize(resourceSegment) : 'Resource';
  }
}