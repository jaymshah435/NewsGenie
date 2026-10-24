import { expect, test } from "vitest";
import { ALICE, api, login } from "./helpers.js";

// Test 6
test("the date filter works and the summary matches the daily numbers", async () => {
  const params = { start: "2026-09-01", end: "2026-09-30" };
  const headers = await login(ALICE);

  const summary = (await api().get("/api/moderation/summary").query(params).set(headers)).body;
  const daily = (await api().get("/api/moderation/timeseries").query(params).set(headers)).body;
  const sum = (key: string) => daily.points.reduce((total: number, p: Record<string, number>) => total + p[key], 0);

  expect([summary.start, summary.end]).toEqual(["2026-09-01", "2026-09-30"]);
  expect(daily.points).toHaveLength(30);
  expect(summary.totals.comments_reviewed).toBe(sum("comments_reviewed"));
  expect(summary.totals.flagged).toBe(sum("flagged"));
});

test("a start date after the end date is rejected with a clear message", async () => {
  const response = await api()
    .get("/api/analytics/summary")
    .query({ start: "2026-09-30", end: "2026-09-01" })
    .set(await login(ALICE));
  expect(response.status).toBe(422);
  expect(response.body.detail).toBe("Start date must be on or before end date.");
});

test("the sample data comes from the data file", async () => {
  const { loadSampleData } = await import("../src/seed.js");
  const file = loadSampleData();
  const lastDay = file.analytics_daily.map((r) => r.day).sort().at(-1);

  const me = (await api().get("/api/auth/me").set(await login(ALICE))).body;
  expect(me.data_until).toBe(lastDay);

  // Alice's 90-day total equals the sum of her organization's rows in the file.
  const summary = (
    await api()
      .get("/api/protection/summary")
      .query({ start: "2026-07-26", end: lastDay })
      .set(await login(ALICE))
  ).body;
  const fromFile = file.protection_daily
    .filter((r) => r.org_id === "dailyplanet")
    .reduce((total, r) => total + r.automated_requests, 0);
  expect(summary.totals.automated_requests).toBe(fromFile);
});
