#!/usr/bin/env node

/**
 * Documentation build script
 * This script builds the OpenAPI documentation from separate YAML files
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Ensure dist directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Recursively resolve $ref references
const resolveRefs = (obj, basePath = '') => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => resolveRefs(item, basePath));
  }

  const resolved = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key === '$ref' && typeof value === 'string') {
      // Handle relative references
      if (value.startsWith('./')) {
        const refPath = path.resolve(path.dirname(basePath), value.split('#')[0]);
        const refFragment = value.split('#')[1];

        try {
          const refContent = yaml.load(fs.readFileSync(refPath, 'utf8'));

          if (refFragment) {
            const fragments = refFragment.split('/').filter(f => f);
            let refValue = refContent;

            for (const fragment of fragments) {
              refValue = refValue[fragment];
            }

            return resolveRefs(refValue, refPath);
          } else {
            return resolveRefs(refContent, refPath);
          }
        } catch (error) {
          console.warn(`Warning: Could not resolve reference ${value}:`, error.message);
          return { $ref: value }; // Keep original ref if resolution fails
        }
      } else {
        // Keep internal references as-is
        return { $ref: value };
      }
    } else {
      resolved[key] = resolveRefs(value, basePath);
    }
  }

  return resolved;
};

// Main build function
const buildDocs = () => {
  try {
    console.log('🏗️  Building API documentation...');

    // Ensure output directories exist
    ensureDir('dist');
    ensureDir('dist/docs');

    // Load main swagger file
    const swaggerPath = path.join(process.cwd(), 'docs', 'swagger.yaml');

    if (!fs.existsSync(swaggerPath)) {
      throw new Error(`Swagger file not found at ${swaggerPath}`);
    }

    console.log('📖 Loading main swagger configuration...');
    const swaggerContent = fs.readFileSync(swaggerPath, 'utf8');
    const swagger = yaml.load(swaggerContent);

    console.log('🔗 Resolving references...');
    const resolvedSwagger = resolveRefs(swagger, swaggerPath);

    // Write the bundled JSON
    const outputPath = path.join(process.cwd(), 'dist', 'swagger.json');
    fs.writeFileSync(outputPath, JSON.stringify(resolvedSwagger, null, 2));

    console.log('✅ Documentation built successfully!');
    console.log(`📄 Output: ${outputPath}`);

    // Validate the output
    console.log('🔍 Validating output...');

    const requiredFields = ['openapi', 'info', 'paths'];
    const missingFields = requiredFields.filter(field => !resolvedSwagger[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const pathCount = Object.keys(resolvedSwagger.paths || {}).length;
    const componentCount = Object.keys(resolvedSwagger.components?.schemas || {}).length;

    console.log(`✅ Validation passed:`);
    console.log(`   - ${pathCount} API endpoints`);
    console.log(`   - ${componentCount} component schemas`);
    console.log(`   - OpenAPI version: ${resolvedSwagger.openapi}`);

    return true;

  } catch (error) {
    console.error('❌ Documentation build failed:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  buildDocs();
}

module.exports = { buildDocs };