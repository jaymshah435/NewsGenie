// Assistant tests.
//
// The real app always calls Claude. Here the tools are called directly, so these tests
// run without an API key and check what matters: tools go through the permission-checked
// APIs, and a setting only changes after the user approves.

import { expect, test } from "vitest";
import { ToolRunner } from "../src/agent/tools.js";
import { app } from "../src/app.js";
import { db } from "../src/db.js";
import { ALICE, BOB, api, login, tokenFor } from "./helpers.js";

/** A ToolRunner acting as the given user, like the chat endpoint creates. */
async function toolRunner(email: string): Promise<ToolRunner> {
  const { id } = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number };
  return new ToolRunner(app, await tokenFor(email), id);
}

async function threshold(): Promise<number> {
  const response = await api()
    .get("/api/moderation/settings")
    .query({ org: "dailyplanet" })
    .set(await login(ALICE));
  return response.body.alert_threshold;
}

async function propose(value = 75): Promise<string> {
  const runner = await toolRunner(ALICE);
  const result = await runner.run("propose_threshold_change", { org: "dailyplanet", value });
  expect(result.status).toBe("waiting_for_user_approval");
  return runner.pendingActionIds[0];
}

const approve = async (id: string, email = ALICE) =>
  api().post(`/api/assistant/actions/${id}/approve`).set(await login(email));

// Test 9
test("the assistant's tools cannot read another organization", async () => {
  const result = await (await toolRunner(ALICE)).run("get_product_summary", {
    product: "moderation",
    org: "metrotimes",
    start_date: "2026-09-01",
    end_date: "2026-09-30",
  });
  expect(result.status).toBe(403);

  // A standard user cannot even propose a change.
  const bob = await (await toolRunner(BOB)).run("propose_threshold_change", { org: "dailyplanet", value: 75 });
  expect(bob.error).toContain("Permission denied");
});

// Test 10
test("a change happens only after approval", async () => {
  const actionId = await propose();
  expect(await threshold()).toBe(60); // proposing changes nothing

  const response = await approve(actionId);
  expect(response.body.status).toBe("approved");
  expect(await threshold()).toBe(75);
});

// Test 11
test("cancel changes nothing, and an action cannot be approved twice", async () => {
  const cancelled = await propose();
  await api().post(`/api/assistant/actions/${cancelled}/reject`).set(await login(ALICE));
  expect((await approve(cancelled)).status).toBe(409);
  expect(await threshold()).toBe(60);

  const approved = await propose(80);
  expect((await approve(approved)).status).toBe(200);
  expect((await approve(approved)).status).toBe(409);
});

// Test 12
test("a user cannot approve someone else's action", async () => {
  const actionId = await propose();
  expect((await approve(actionId, BOB)).status).toBe(404);
  expect(await threshold()).toBe(60);
});

test("chat explains clearly when no API key is set", async () => {
  const response = await api()
    .post("/api/assistant/chat")
    .send({ messages: [{ role: "user", content: "Hello" }] })
    .set(await login(ALICE));
  expect(response.status).toBe(503);
  expect(response.body.detail).toContain("ANTHROPIC_API_KEY");
});
