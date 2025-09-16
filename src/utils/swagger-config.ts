import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';

export class SwaggerConfig {
  private static swaggerSpec: any;


  // Initialize swagger configuration
  static initialize(): any {
    if (this.swaggerSpec) {
      return this.swaggerSpec;
    }

    // Try to load pre-built swagger.json first
    const builtSpecPath = path.join(process.cwd(), 'dist', 'swagger.json');

    if (fs.existsSync(builtSpecPath)) {
      try {
        console.log('📖 Loading swagger documentation from built JSON...');
        const builtSpec = JSON.parse(fs.readFileSync(builtSpecPath, 'utf8'));
        this.swaggerSpec = builtSpec;
        console.log('✅ Swagger documentation loaded successfully');
        return this.swaggerSpec;
      } catch (error) {
        console.warn('Failed to load built swagger.json, using fallback configuration');
      }
    } else {
      console.warn('⚠️  Built swagger.json not found. Run "npm run docs:build" to generate it.');
    }

    // Fallback to basic configuration if YAML loading fails
    const options = {
      definition: {
        openapi: '3.0.3',
        info: {
          title: 'hire4recruit API',
          version: '1.0.0',
          description: 'Comprehensive recruitment management system API',
        },
        servers: [
          {
            url: process.env.NODE_ENV === 'production'
              ? 'https://api.hire4recruit.com/v1'
              : 'http://localhost:3000/api/v1',
            description: process.env.NODE_ENV === 'production'
              ? 'Production server'
              : 'Development server'
          }
        ],
        components: {
          securitySchemes: {
            BearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          }
        },
        security: [
          {
            BearerAuth: []
          }
        ]
      },
      apis: [
        './src/routes/*.ts',
        './src/controllers/*.ts',
        './src/models/*.ts',
      ],
    };

    this.swaggerSpec = swaggerJsdoc(options);
    return this.swaggerSpec;
  }

  // Setup swagger UI middleware
  static setupSwaggerUI(app: Application): void {
    const spec = this.initialize();

    // Swagger UI options
    const swaggerOptions = {
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #2c5aa0 }
      `,
      customSiteTitle: 'hire4recruit API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        showExtensions: true,
        tryItOutEnabled: true
      }
    };

    // Serve swagger docs
    app.use('/api-docs', swaggerUi.serve);
    app.get('/api-docs', swaggerUi.setup(spec, swaggerOptions));

    // Serve raw JSON spec
    app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(spec);
    });

    console.log(`📚 API Documentation available at: ${this.getDocsUrl()}`);
  }

  // Get documentation URL
  static getDocsUrl(): string {
    const port = process.env.PORT || 3000;
    const host = process.env.NODE_ENV === 'production'
      ? 'https://your-domain.com'
      : `http://localhost:${port}`;

    return `${host}/api-docs`;
  }

  // Get the swagger specification
  static getSpec(): any {
    return this.swaggerSpec || this.initialize();
  }

  // Validate the swagger specification
  static validate(): boolean {
    try {
      const spec = this.getSpec();

      // Basic validation checks
      if (!spec.openapi) {
        throw new Error('Missing openapi version');
      }

      if (!spec.info || !spec.info.title || !spec.info.version) {
        throw new Error('Missing required info fields');
      }

      if (!spec.paths || Object.keys(spec.paths).length === 0) {
        throw new Error('No paths defined');
      }

      console.log('✅ Swagger specification is valid');
      return true;
    } catch (error) {
      console.error('❌ Swagger specification validation failed:', error);
      return false;
    }
  }
}