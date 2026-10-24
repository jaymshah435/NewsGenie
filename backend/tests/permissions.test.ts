import { expect, test } from "vitest";
import { ALICE, BOB, CAROL, ERIN, api, login } from "./helpers.js";

// Test 4
test.each(["analytics", "moderation", "protection"])("a user cannot read another organization's %s data", async (product) => {
  const headers = await login(ALICE);
  const other = await api().get(`/api/${product}/summary`).query({ org: "metrotimes" }).set(headers);
  expect(other.status).toBe(403);

  // Without an org filter, Alice only gets her own organization.
  const own = await api().get(`/api/${product}/summary`).set(headers);
  expect(own.body.orgs).toEqual(["dailyplanet"]);
});

// Test 5
test("a user in two organizations can filter by organization", async () => {
  const headers = await login(ERIN);
  const both = (await api().get("/api/analytics/summary").set(headers)).body;
  const planet = (await api().get("/api/analytics/summary").query({ org: "dailyplanet" }).set(headers)).body;
  const metro = (await api().get("/api/analytics/summary").query({ org: "metrotimes" }).set(headers)).body;

  expect([...both.orgs].sort()).toEqual(["dailyplanet", "metrotimes"]);
  expect(both.totals.articles_processed).toBe(planet.totals.articles_processed + metro.totals.articles_processed);
});

// Test 7
test("a standard user cannot change settings", async () => {
  const response = await api()
    .put("/api/moderation/settings")
    .query({ org: "dailyplanet" })
    .send({ alert_threshold: 75 })
    .set(await login(BOB));
  expect(response.status).toBe(403);
});

// Test 8
test("an admin can change only their own organization's settings", async () => {
  const ok = await api()
    .put("/api/moderation/settings")
    .query({ org: "dailyplanet" })
    .send({ alert_threshold: 75 })
    .set(await login(ALICE));
  expect(ok.status).toBe(200);
  expect(ok.body.alert_threshold).toBe(75);

  const otherOrg = await api()
    .put("/api/moderation/settings")
    .query({ org: "dailyplanet" })
    .send({ alert_threshold: 80 })
    .set(await login(CAROL));
  expect(otherOrg.status).toBe(403);
});
