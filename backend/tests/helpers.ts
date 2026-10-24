import request from "supertest";
import { app } from "../src/app.js";
import { DEMO_PASSWORD } from "../src/seed.js";

export const ALICE = "alice@dailyplanet.com"; // admin, The Daily Planet
export const BOB = "bob@dailyplanet.com"; // standard, The Daily Planet
export const CAROL = "carol@metrotimes.com"; // admin, Metro Times
export const ERIN = "erin@newsgroup.com"; // standard, both organizations

export const api = () => request(app);

/** Logs in and returns that user's token. */
export async function tokenFor(email: string): Promise<string> {
  const response = await api().post("/api/auth/login").send({ email, password: DEMO_PASSWORD });
  return response.body.token;
}

/** login(ALICE) -> headers with that user's token. */
export async function login(email: string): Promise<{ Authorization: string }> {
  return { Authorization: `Bearer ${await tokenFor(email)}` };
}
