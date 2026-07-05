// Standalone notification worker — runs as its OWN process (`npm run worker`),
// separate from the API. Scale it independently; if it crashes, the API keeps
// serving and queued jobs wait in Postgres until a worker is back.
import { getBoss, stopBoss } from './src/queue.js';
import { registerPushHandlers } from './src/pushWorker.js';
import { pool } from './src/db.js';

const boss = await getBoss();
registerPushHandlers(boss);
console.log('[worker] push worker started, waiting for jobs');

async function shutdown(signal) {
  console.log(`[worker] ${signal} — shutting down`);
  await stopBoss();
  await pool.end();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
