// Minimal forward-only migration runner: applies db/*.sql in filename order,
// tracking applied files in a _migrations table. Idempotent.
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './src/db.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'db');

await pool.query('CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');

const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
for (const name of files) {
  const { rowCount } = await pool.query('SELECT 1 FROM _migrations WHERE name = $1', [name]);
  if (rowCount) {
    console.log(`= skip ${name}`);
    continue;
  }
  const sql = await readFile(join(dir, name), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO _migrations (name) VALUES ($1)', [name]);
    await client.query('COMMIT');
    console.log(`+ applied ${name}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

await pool.end();
console.log('migrations done');
