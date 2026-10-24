// SQLite connection and the database tables.
//
// Every piece of product data belongs to an organization. Users reach an organization
// only through a membership, which also stores their role there ("admin" or "standard").

import { createRequire } from "node:module";
import { config } from "./config.js";

// Uses SQLite built into Node.js (`node:sqlite`), so there is no native package to compile.
// Node prints "SQLite is an experimental feature" when the module loads; that notice is
// hidden here because it is expected and would only confuse people running the demo.
const emitWarning = process.emitWarning;
process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
  if (String(warning).includes("SQLite is an experimental feature")) return;
  return (emitWarning as (...args: unknown[]) => void).call(process, warning, ...rest);
}) as typeof process.emitWarning;
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");

export const db = new DatabaseSync(config.databasePath);
db.exec("PRAGMA foreign_keys = ON");

/** Runs `work` as one transaction: everything is saved, or nothing is. */
export function transaction(work: () => void): void {
  db.exec("BEGIN");
  try {
    work();
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

const TABLES = `
  CREATE TABLE IF NOT EXISTS organizations (
    id   TEXT PRIMARY KEY,              -- e.g. "dailyplanet"
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS memberships (
    id      INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    org_id  TEXT NOT NULL REFERENCES organizations(id),
    role    TEXT NOT NULL                -- "admin" or "standard"
  );

  -- Product data: one row per organization and day (days are stored as YYYY-MM-DD).
  CREATE TABLE IF NOT EXISTS analytics_daily (
    id                     INTEGER PRIMARY KEY,
    org_id                 TEXT NOT NULL REFERENCES organizations(id),
    day                    TEXT NOT NULL,
    articles_processed     INTEGER NOT NULL,
    avg_quality_score      REAL NOT NULL,
    avg_processing_seconds REAL NOT NULL
  );
  CREATE TABLE IF NOT EXISTS moderation_daily (
    id                INTEGER PRIMARY KEY,
    org_id            TEXT NOT NULL REFERENCES organizations(id),
    day               TEXT NOT NULL,
    comments_reviewed INTEGER NOT NULL,
    flagged           INTEGER NOT NULL,
    removed           INTEGER NOT NULL,
    approved          INTEGER NOT NULL   -- flagged, then approved after review
  );
  CREATE TABLE IF NOT EXISTS protection_daily (
    id                  INTEGER PRIMARY KEY,
    org_id              TEXT NOT NULL REFERENCES organizations(id),
    day                 TEXT NOT NULL,
    automated_requests  INTEGER NOT NULL,
    suspicious_requests INTEGER NOT NULL,
    blocked_requests    INTEGER NOT NULL
  );

  -- Per-organization settings. The demo has one: moderation_alert_threshold.
  CREATE TABLE IF NOT EXISTS settings (
    id     INTEGER PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id),
    key    TEXT NOT NULL,
    value  INTEGER NOT NULL
  );

  -- A settings change proposed by the AI assistant, waiting for the user to approve.
  CREATE TABLE IF NOT EXISTS pending_actions (
    id         TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    org_id     TEXT NOT NULL REFERENCES organizations(id),
    old_value  INTEGER NOT NULL,
    new_value  INTEGER NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | failed
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

export function createTables(): void {
  db.exec(TABLES);
}

export function dropTables(): void {
  db.exec(`
    DROP TABLE IF EXISTS pending_actions;
    DROP TABLE IF EXISTS settings;
    DROP TABLE IF EXISTS protection_daily;
    DROP TABLE IF EXISTS moderation_daily;
    DROP TABLE IF EXISTS analytics_daily;
    DROP TABLE IF EXISTS memberships;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS organizations;
  `);
}

/** Last day that has data, so date filters default to a range with data in it. */
export function dataUntil(): string {
  const row = db.prepare("SELECT MAX(day) AS day FROM analytics_daily").get() as { day: string | null };
  return row.day ?? "";
}
