// Call one of our own REST APIs as the signed-in user.
//
// The request goes through the full Express app (routing, auth, permission checks),
// exactly like a request from the browser. To do that without any extra setup, the app
// is also served on a private random port on 127.0.0.1 the first time this is used.

import type { Express } from "express";
import http from "node:http";
import type { AddressInfo } from "node:net";

const internalUrls = new WeakMap<Express, Promise<string>>();

function internalUrl(app: Express): Promise<string> {
  let url = internalUrls.get(app);
  if (!url) {
    url = new Promise((resolve) => {
      const server = http.createServer(app).listen(0, "127.0.0.1", () => {
        server.unref(); // never keeps the process alive on its own
        resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
      });
    });
    internalUrls.set(app, url);
  }
  return url;
}

export interface ApiResult {
  status: number;
  data: Record<string, unknown>;
}

export async function callApi(
  app: Express,
  token: string,
  method: "GET" | "PUT",
  path: string,
  params: Record<string, string | undefined> = {},
  body?: unknown,
): Promise<ApiResult> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const qs = query.toString();

  const response = await fetch(`${await internalUrl(app)}${path}${qs ? `?${qs}` : ""}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: (await response.json()) as Record<string, unknown> };
}
