// Passwords, login tokens and permission checks.
//
// Every protected endpoint uses `requireUser`. Permission checks happen here, on
// the server, so the frontend (or the AI assistant) cannot get around them.

import bcrypt from "bcryptjs";
import type { Request, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { db } from "./db.js";
import { HttpError } from "./errors.js";

export type Role = "admin" | "standard";

export interface User {
  id: number;
  email: string;
  name: string;
  password_hash: string;
}

export interface CurrentUser {
  user: User;
  roles: Record<string, Role>; // org_id -> "admin" or "standard"
  token: string;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  return bcrypt.compareSync(password, passwordHash);
}

export function createToken(user: User): string {
  return jwt.sign({ sub: String(user.id) }, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: config.jwtExpiresMinutes * 60,
  });
}

/** Middleware: reads the login token and puts the signed-in user on `req.current`. */
export const requireUser: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) throw new HttpError(401, "Not signed in.");

  let userId: number;
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    userId = Number(payload.sub);
  } catch (e) {
    if (e instanceof jwt.TokenExpiredError) throw new HttpError(401, "Your session has expired. Please sign in again.");
    throw new HttpError(401, "Invalid login token.");
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as User | undefined;
  if (!user) throw new HttpError(401, "User not found.");
  const memberships = db
    .prepare("SELECT org_id, role FROM memberships WHERE user_id = ? ORDER BY id")
    .all(user.id) as { org_id: string; role: Role }[];

  req.current = { user, roles: Object.fromEntries(memberships.map((m) => [m.org_id, m.role])), token };
  next();
};

/** The signed-in user. Only use in routes behind `requireUser`. */
export function currentUser(req: Request): CurrentUser {
  if (!req.current) throw new HttpError(401, "Not signed in.");
  return req.current;
}

/**
 * Which organizations a request may read.
 *
 * No org given -> every org the user belongs to.
 * An org the user does not belong to -> 403.
 */
export function allowedOrgs(current: CurrentUser, org?: string): string[] {
  if (!org) return Object.keys(current.roles);
  if (!(org in current.roles)) throw new HttpError(403, `You do not have access to organization '${org}'.`);
  return [org];
}

/** Only admins of this specific organization may change its settings. */
export function requireAdmin(current: CurrentUser, org: string): void {
  allowedOrgs(current, org);
  if (current.roles[org] !== "admin") throw new HttpError(403, "Only administrators can change settings.");
}
