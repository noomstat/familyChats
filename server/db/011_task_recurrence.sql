-- Phase Q — recurring tasks (weekly/monthly, auto-spawn next occurrence).

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence text;
-- nullable; 'weekly' | 'monthly'. NULL = one-off (existing behavior).
