import pg from 'pg';

// Single shared pool per process. Both the API and the worker import this.
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// An idle client can emit 'error' outside any query (e.g. the SSH tunnel to
// the VPS drops, or Postgres restarts) — pg's Pool docs call this out
// explicitly: without a listener, that event is unhandled and crashes the
// process. pg already discards the broken client itself; we just need to not
// die. The next query grabs a fresh client and reconnects.
pool.on('error', (err) => {
  console.error('[pg] idle client error (pool recovers automatically):', err.message);
});

export const query = (text, params) => pool.query(text, params);
