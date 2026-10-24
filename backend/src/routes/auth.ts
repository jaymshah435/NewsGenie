import { Router } from "express";
import { z } from "zod";
import { createToken, currentUser, requireUser, verifyPassword, type User } from "../auth.js";
import { dataUntil, db } from "../db.js";
import { HttpError, parse } from "../errors.js";

export const authRouter = Router();

const loginSchema = z.object({ email: z.string(), password: z.string() });

authRouter.post("/login", (req, res) => {
  const body = parse(loginSchema, req.body);
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(body.email.trim().toLowerCase()) as
    | User
    | undefined;
  if (!user || !verifyPassword(body.password, user.password_hash)) {
    throw new HttpError(401, "Incorrect email or password.");
  }
  res.json({ token: createToken(user) });
});

authRouter.get("/me", requireUser, (req, res) => {
  const { user, roles } = currentUser(req);
  const orgIds = Object.keys(roles);
  const orgs = db
    .prepare(`SELECT id, name FROM organizations WHERE id IN (${orgIds.map(() => "?").join(", ")}) ORDER BY name`)
    .all(...orgIds) as { id: string; name: string }[];
  res.json({
    email: user.email,
    name: user.name,
    organizations: orgs.map((o) => ({ id: o.id, name: o.name, role: roles[o.id] })),
    data_until: dataUntil(),
  });
});
