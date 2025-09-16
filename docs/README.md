# API Documentation

This directory contains the OpenAPI/Swagger documentation for the hire4recruit API, organized using separate YAML files for better maintainability.

## Structure

```
docs/
├── swagger.yaml           # Main OpenAPI specification
├── components/
│   └── index.yaml        # Reusable components (schemas, responses, etc.)
└── paths/
    ├── auth.yaml         # Authentication endpoints
    ├── companies.yaml    # Company management endpoints
    ├── users.yaml        # User management endpoints
    ├── jobs.yaml         # Job management endpoints
    ├── candidates.yaml   # Candidate management endpoints
    ├── interviews.yaml   # Interview management endpoints
    ├── assessments.yaml  # Assessment management endpoints
    └── health.yaml       # Health check endpoints
```

## Development Workflow

### 1. Building Documentation

```bash
# Validate the OpenAPI specification
npm run docs:validate

# Build the bundled JSON specification
npm run docs:build

# Generate ReDoc HTML documentation
npm run docs:redoc

# Run all documentation tasks
npm run docs:generate
```

### 2. Viewing Documentation

**During Development:**
- Start the server: `npm run dev`
- Visit: http://localhost:3000/api-docs

**Static HTML (ReDoc):**
- Build docs: `npm run docs:generate`
- Open: `dist/docs/index.html`

### 3. Adding New Endpoints

1. **Add to appropriate path file** (e.g., `paths/users.yaml`)
2. **Define required schemas** in `components/index.yaml`
3. **Reference in main** `swagger.yaml`
4. **Validate and build** with `npm run docs:generate`

## Available Scripts

| Script | Description |
|--------|-------------|
| `docs:validate` | Validate OpenAPI specification |
| `docs:build` | Bundle YAML files into single JSON |
| `docs:serve` | Serve documentation with Swagger UI |
| `docs:redoc` | Generate static ReDoc HTML |
| `docs:generate` | Run all documentation tasks |

## Component Organization

### Schemas
- **Company**: Company profile and subscription info
- **User**: User management and permissions
- **Job**: Job postings and requirements
- **Candidate**: Candidate profiles and applications
- **Interview**: Interview scheduling and feedback
- **Assessment**: Assessment creation and results

### Common Patterns
- **Authentication**: Bearer token (JWT)
- **Pagination**: `page` and `limit` parameters
- **Error Responses**: Standardized error format
- **Success Responses**: Consistent response structure

## Best Practices

1. **Separate Concerns**: Keep each resource in its own path file
2. **Reuse Components**: Define schemas once in `components/index.yaml`
3. **Consistent Naming**: Use camelCase for properties, kebab-case for endpoints
4. **Validation**: Always validate before committing changes
5. **Examples**: Include realistic examples in request/response schemas

## Production Deployment

For production, the documentation is built into `dist/swagger.json` and served statically for better performance.

The build process:
1. Validates all YAML files
2. Resolves all `$ref` references
3. Bundles into a single JSON file
4. Generates static HTML documentation

## Integration

The documentation is automatically integrated into the Express application:

- **Development**: Live YAML files via swagger-jsdoc
- **Production**: Pre-built JSON specification
- **Endpoint**: `/api-docs` (Swagger UI)
- **JSON spec**: `/api-docs.json` (Raw OpenAPI spec)

## Subscription Plans Integration

The documentation includes detailed information about the subscription-based pricing model:

- **Basic Plan**: ₹999/month - 10 users, 25 jobs
- **Professional Plan**: ₹2999/month - 50 users, 100 jobs, AI features
- **Enterprise Plan**: ₹9999/month - Unlimited users/jobs, full features

Payment integration with Razorpay is fully documented in the authentication endpoints.