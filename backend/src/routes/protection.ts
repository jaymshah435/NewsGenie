// Content Protection API: automated content-access requests, suspicious and blocked requests.

import { createProductRouter, sums } from "./productApi.js";

export const protectionRouter = createProductRouter({
  product: "protection",
  table: "protection_daily",
  ...sums("automated_requests", "suspicious_requests", "blocked_requests"),
});
