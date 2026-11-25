import dotenv from 'dotenv';
import app from './src/app.js';
import { testDBConnection } from './src/config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection before starting HTTP server
    await testDBConnection();

    const server = app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(` Clinic Token Management API is running!`);
      console.log(` Server URL: http://localhost:${PORT}`);
      console.log(` Swagger UI: http://localhost:${PORT}/api-docs`);
      console.log(` OpenAPI JSON: http://localhost:${PORT}/api-docs.json`);
      console.log(`=================================================`);
    });

    // Graceful shutdown
    const handleShutdown = (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server due to database connection error:', error.message);
    process.exit(1);
  }
};

startServer();
