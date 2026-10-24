import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach } from "vitest";

// Use a separate test database, filled from the same sample-data file as the app.
// These are set before the app code is imported, so config.ts picks them up.
process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), "newsgenie-test-")), "test.db");
process.env.ANTHROPIC_API_KEY = "";

const { createTables, dropTables } = await import("../src/db.js");
const { seed } = await import("../src/seed.js");

// Every test starts from the same freshly seeded database.
beforeEach(() => {
  dropTables();
  createTables();
  seed();
});
