import { expect, test } from "vitest";
import { DEMO_PASSWORD } from "../src/seed.js";
import { ALICE, api } from "./helpers.js";

// Test 1
test("login with the correct password", async () => {
  const response = await api().post("/api/auth/login").send({ email: ALICE, password: DEMO_PASSWORD });
  expect(response.status).toBe(200);

  const me = await api().get("/api/auth/me").set("Authorization", `Bearer ${response.body.token}`);
  expect(me.body.organizations).toEqual([{ id: "dailyplanet", name: "The Daily Planet", role: "admin" }]);
});

// Test 2
test("login with a wrong password", async () => {
  const response = await api().post("/api/auth/login").send({ email: ALICE, password: "wrong" });
  expect(response.status).toBe(401);
  expect(response.body.detail).toBe("Incorrect email or password.");
});

// Test 3
test("the API rejects requests without a token", async () => {
  for (const path of ["/api/auth/me", "/api/analytics/summary", "/api/moderation/summary", "/api/protection/summary"]) {
    expect((await api().get(path)).status).toBe(401);
  }
});
