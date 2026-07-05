import PgBoss from 'pg-boss';

export const QUEUES = {
  SEND: 'push:send', // fan out a notification to a set of users
  RECEIPTS: 'push:receipts', // delayed check of Expo delivery receipts
};

let boss;

/** Start (or reuse) the pg-boss instance for this process and ensure queues exist. */
export async function getBoss() {
  if (boss) return boss;
  boss = new PgBoss({ connectionString: process.env.DATABASE_URL });
  boss.on('error', (err) => console.error('[pg-boss]', err));
  await boss.start();
  await boss.createQueue(QUEUES.SEND);
  await boss.createQueue(QUEUES.RECEIPTS);
  return boss;
}

export async function stopBoss() {
  if (boss) await boss.stop({ graceful: true });
  boss = undefined;
}
