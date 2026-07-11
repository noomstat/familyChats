@AGENTS.md
This file provides guidance to Claude Code (claude.ai/code) when working
with code in this repository.

## Project Overview

FamilyChats — for family chats.

## Database

Data lives in PostgreSQL on a shared VPS (`13.228.240.173`, Ubuntu,
Lightsail). Postgres is **not exposed to the internet** — it listens on
localhost only; all access goes over SSH.

- **Database**: `thfund` (shared instance)
- **Schema**: `familychats` — this project's private namespace
- **Role**: `familychats` — owns the schema; its default `search_path`
  is `familychats`, so unqualified `CREATE TABLE x` / `SELECT FROM x`
  automatically target this schema
- **Credentials**: in `.env` (gitignored — never commit)

### Isolation rules

The `familychats` role has rights **only** on the `familychats` schema.
It cannot read or write the other schemas in this database (they belong
to a different production app). Never attempt to query `public.*`
tables, and never connect as any other role.

### How to connect

**Option A — SSH tunnel** (for the app or a local psql session):

```bash
ssh -N -L 5433:localhost:5432 ubuntu@13.228.240.173 &
psql "$DATABASE_URL"        # DATABASE_URL in .env points at localhost:5433
```

**Option B — one-off query over SSH** (no tunnel needed):

```bash
ssh ubuntu@13.228.240.173 \
  "PGPASSWORD=<PGPASSWORD from .env> psql -U familychats -h localhost -d thfund -c \"SELECT 1\""
```

### .env template

```env
PGHOST=localhost
PGPORT=5433
PGDATABASE=thfund
PGUSER=familychats
PGPASSWORD=<see team secret store / ask owner>
DATABASE_URL=postgresql://familychats:<password>@localhost:5433/thfund
```

### Schema migrations

Keep DDL in `db/schema.sql` in this repo and apply idempotently
(`CREATE TABLE IF NOT EXISTS …`). Tables need no schema prefix thanks to
the role's search_path, but prefix `familychats.` in any SQL executed by
other roles or cron jobs.

## Server notes

- SSH: `ubuntu@13.228.240.173` (key-based; same key as the ThaiFund project)
- The VPS also runs a production app (ThaiFund API on :3001 + its
  Postgres data). **Do not** restart Postgres, modify `pg_hba.conf`,
  touch `/opt/thaifund-*`, or run heavy queries without limits —
  another production service depends on this instance.
- Disk headroom is ample (~68 GB free as of 2026-07-11); Postgres data
  growth from this project should still be kept modest.

## Safety rules for Claude

- Read-mostly by default: `SELECT` freely inside the `familychats`
  schema; get confirmation before destructive DDL (`DROP`, `TRUNCATE`).
- Never widen the role's grants or create new roles without asking.
- Never print the DB password into committed files or logs; reference
  `.env` instead.