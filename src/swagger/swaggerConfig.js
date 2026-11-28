import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Clinic Client Token Management REST API',
      version: '1.0.0',
      description: 'A robust REST API for managing clinic patients, doctors, queue tokens, user authentication, and RBAC authorization using Node.js, Express, JWT, and Neon PostgreSQL.',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT Bearer token in the format: Bearer <token>',
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication, login, registration, and profile management',
      },
      {
        name: 'Users (Admin)',
        description: 'User account management (Admin only)',
      },
      {
        name: 'Patients',
        description: 'Patient registration and management operations',
      },
      {
        name: 'Doctors',
        description: 'Doctor management, status toggling, and queue endpoints',
      },
      {
        name: 'Tokens',
        description: 'Queue token generation, status transitions, cancellation, and history',
      },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app) => {
  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Serve OpenAPI JSON spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};
