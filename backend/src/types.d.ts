import type { CurrentUser } from "./auth.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by the requireUser middleware. */
      current?: CurrentUser;
    }
  }
}

export {};
