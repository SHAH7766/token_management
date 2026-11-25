import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Create a PostgreSQL connection pool using Neon DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon serverless PostgreSQL connections
  },
});

// Test database connection function
export const testDBConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('Database connected successfully at:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
};

export default pool;
