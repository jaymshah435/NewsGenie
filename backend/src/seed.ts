// Loads the demo data from backend/data/sample-data.json into the database.
//
// The file holds everything: 2 organizations, 5 users and 90 days of numbers per
// organization and product. Nothing is generated at runtime, so every computer gets
// exactly the same data. Run `npm run reset-db` to reload it from scratch.
//
// Built-in trends, so the assistant has something to find:
//   * The Daily Planet: automated (bot) requests rise sharply over the last 10 days,
//     and there is a spike in comments about two weeks before the last day.
//   * Metro Times: the share of flagged comments climbs over the last three weeks.

import { readFileSync } from "node:fs";
import { z } from "zod";
import { hashPassword } from "./auth.js";
import { createTables, db, transaction } from "./db.js";

export const DEMO_PASSWORD = "Demo1234!";
const DATA_FILE = new URL("../data/sample-data.json", import.meta.url);

// The expected shape of the file, so a mistake in it gives a clear message on startup.
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date like 2026-10-23");
const count = z.number().int().nonnegative();
const sampleDataSchema = z.object({
  organizations: z.array(z.object({ id: z.string(), name: z.string(), moderation_alert_threshold: count })),
  users: z.array(
    z.object({ email: z.string(), name: z.string(), roles: z.record(z.string(), z.enum(["admin", "standard"])) }),
  ),
  analytics_daily: z.array(
    z.object({
      org_id: z.string(),
      day,
      articles_processed: count,
      avg_quality_score: z.number(),
      avg_processing_seconds: z.number(),
    }),
  ),
  moderation_daily: z.array(
    z.object({ org_id: z.string(), day, comments_reviewed: count, flagged: count, removed: count, approved: count }),
  ),
  protection_daily: z.array(
    z.object({ org_id: z.string(), day, automated_requests: count, suspicious_requests: count, blocked_requests: count }),
  ),
});

export type SampleData = z.infer<typeof sampleDataSchema>;

export function loadSampleData(): SampleData {
  const result = sampleDataSchema.safeParse(JSON.parse(readFileSync(DATA_FILE, "utf8")));
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`backend/data/sample-data.json is not valid at "${issue.path.join(".")}": ${issue.message}`);
  }
  return result.data;
}

/** Inserts rows into a table, using the object keys as column names. */
function insertAll(table: string, rows: Record<string, string | number>[]): void {
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const insert = db.prepare(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
  );
  for (const row of rows) insert.run(...columns.map((c) => row[c]));
}

/** Fills empty tables with the demo data from the file. */
export function seed(): void {
  const data = loadSampleData();
  const passwordHash = hashPassword(DEMO_PASSWORD);
  transaction(() => {
    for (const org of data.organizations) {
      db.prepare("INSERT INTO organizations (id, name) VALUES (?, ?)").run(org.id, org.name);
      db.prepare("INSERT INTO settings (org_id, key, value) VALUES (?, 'moderation_alert_threshold', ?)").run(
        org.id,
        org.moderation_alert_threshold,
      );
    }
    for (const user of data.users) {
      const { lastInsertRowid } = db
        .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)")
        .run(user.email.toLowerCase(), user.name, passwordHash);
      for (const [orgId, role] of Object.entries(user.roles)) {
        db.prepare("INSERT INTO memberships (user_id, org_id, role) VALUES (?, ?, ?)").run(lastInsertRowid, orgId, role);
      }
    }
    insertAll("analytics_daily", data.analytics_daily);
    insertAll("moderation_daily", data.moderation_daily);
    insertAll("protection_daily", data.protection_daily);
  });
}

/** Called on startup: creates the tables and loads the data the first time only. */
export function seedIfEmpty(): void {
  createTables();
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM organizations").get() as { count: number };
  if (count === 0) seed();
}
