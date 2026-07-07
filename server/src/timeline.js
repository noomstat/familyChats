// Memory Timeline (#9): a read-only, derived feed merging photos, past
// calendar events, and family "milestones" (family created, members joined,
// groups created) into one reverse-chronological, month-grouped list.
//
// Deliberately NOT part of /bootstrap or /sync: unlike chat/grocery/tasks/
// events (which need to feel live), this is a "look back" screen the user
// opens occasionally — recomputing it from scratch on each open is cheap
// (a handful of indexed SELECTs) and keeps the hot bootstrap/sync payloads
// from growing with every photo/milestone a family ever accumulates.
import { query } from './db.js';

// A member who joined within this many ms of the family's creation is
// considered a "founding member" — bundled into one "Founded by ..." item
// instead of getting their own "<name> joined" line.
const FOUNDING_WINDOW_MS = 60_000;

const MAX_ITEMS = 200;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date) {
  return `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** "A" / "A and B" / "A, B, and C" — Oxford-comma join of names. */
function joinNames(names) {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

async function userFamilyId(userId) {
  const { rows } = await query('SELECT family_id FROM family_members WHERE user_id = $1 LIMIT 1', [userId]);
  return rows[0]?.family_id ?? null;
}

/**
 * The family's merged memory feed: photos, past events, and milestones
 * (family began, founding members, later joiners, group-created), capped to
 * the most recent 200 items and grouped by month (most recent month first,
 * items reverse-chronological within a month).
 *
 * Membership-checked like every other family-scoped read: a user not (yet)
 * in a family gets an empty timeline rather than an error.
 */
export async function getTimeline(userId) {
  const familyId = await userFamilyId(userId);
  if (!familyId) return { months: [], serverTime: new Date().toISOString() };

  const items = [];

  // ── Photos ─────────────────────────────────────────────────
  const { rows: photoRows } = await query(
    `SELECT p.*, a.name AS album_name, u.name AS uploader_name
     FROM photos p
     JOIN albums a ON a.id = p.album_id
     LEFT JOIN users u ON u.id = p.uploader_id
     WHERE p.family_id = $1`,
    [familyId],
  );
  for (const row of photoRows) {
    items.push({
      type: 'photo',
      id: row.id,
      ts: row.ts.toISOString(),
      filePath: row.file_path,
      caption: row.caption,
      uploaderName: row.uploader_name ?? null,
      albumId: row.album_id,
      albumName: row.album_name,
    });
  }

  // ── Past calendar events ─────────────────────────────────────
  const { rows: eventRows } = await query(
    `SELECT * FROM events WHERE family_id = $1 AND start_ts <= now()`,
    [familyId],
  );
  for (const row of eventRows) {
    items.push({
      type: 'event',
      id: row.id,
      ts: row.start_ts.toISOString(),
      title: row.title,
      allDay: row.all_day,
      startTs: row.start_ts.toISOString(),
    });
  }

  // ── Milestones ────────────────────────────────────────────────
  const { rows: familyRows } = await query('SELECT id, name, created_at FROM families WHERE id = $1', [familyId]);
  const family = familyRows[0];

  if (family) {
    items.push({
      type: 'milestone',
      id: `family-began-${family.id}`,
      ts: family.created_at.toISOString(),
      text: `${family.name} began`,
    });

    const { rows: memberRows } = await query(
      `SELECT fm.user_id, fm.joined_at, u.name
       FROM family_members fm JOIN users u ON u.id = fm.user_id
       WHERE fm.family_id = $1
       ORDER BY fm.joined_at ASC`,
      [familyId],
    );

    const founders = [];
    const laterJoiners = [];
    for (const row of memberRows) {
      const delta = Math.abs(row.joined_at.getTime() - family.created_at.getTime());
      if (delta <= FOUNDING_WINDOW_MS) founders.push(row);
      else laterJoiners.push(row);
    }

    if (founders.length) {
      items.push({
        type: 'milestone',
        id: `founded-${family.id}`,
        ts: family.created_at.toISOString(),
        text: `Founded by ${joinNames(founders.map((f) => f.name))}`,
      });
    }
    for (const row of laterJoiners) {
      items.push({
        type: 'milestone',
        id: `joined-${row.user_id}`,
        ts: row.joined_at.toISOString(),
        text: `${row.name} joined`,
      });
    }
  }

  const { rows: groupRows } = await query('SELECT id, name, created_at FROM groups WHERE family_id = $1', [familyId]);
  for (const row of groupRows) {
    items.push({
      type: 'milestone',
      id: `group-${row.id}`,
      ts: row.created_at.toISOString(),
      text: `New chat: ${row.name}`,
    });
  }

  // ── Cap + group by month ──────────────────────────────────────
  items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  const capped = items.slice(0, MAX_ITEMS);

  const monthsByKey = new Map();
  for (const item of capped) {
    const d = new Date(item.ts);
    const key = monthKey(d);
    let bucket = monthsByKey.get(key);
    if (!bucket) {
      bucket = { month: key, label: monthLabel(d), items: [] };
      monthsByKey.set(key, bucket); // capped is ts-desc, so insertion order is already month-desc
    }
    bucket.items.push(item);
  }

  return { months: [...monthsByKey.values()], serverTime: new Date().toISOString() };
}
