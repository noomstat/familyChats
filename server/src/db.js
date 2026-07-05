import pg from 'pg';

// Single shared pool per process. Both the API and the worker import this.
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export const query = (text, params) => pool.query(text, params);
