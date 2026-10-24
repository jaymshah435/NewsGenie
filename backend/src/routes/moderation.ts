// Community Moderation API: comments reviewed, flagged content, outcomes and trends.
//
// Also owns the one changeable setting: the moderation alert threshold.

import { z } from "zod";
import { allowedOrgs, currentUser, requireAdmin } from "../auth.js";
import { db } from "../db.js";
import { HttpError, parse } from "../errors.js";
import { createProductRouter, sums } from "./productApi.js";

export const moderationRouter = createProductRouter({
  product: "moderation",
  table: "moderation_daily",
  ...sums("comments_reviewed", "flagged", "removed", "approved"),
});

// ----- Settings -----

const THRESHOLD_KEY = "moderation_alert_threshold";

const orgQuery = z.object({ org: z.string({ error: "is required" }).min(1, "is required") });
const settingsUpdate = z.object({ alert_threshold: z.number({ error: "must be a number" }).int("must be a whole number") });

function getThreshold(org: string): number {
  const row = db.prepare("SELECT value FROM settings WHERE org_id = ? AND key = ?").get(org, THRESHOLD_KEY) as
    | { value: number }
    | undefined;
  if (!row) throw new HttpError(404, "Setting not found.");
  return row.value;
}

moderationRouter.get("/settings", (req, res) => {
  const current = currentUser(req);
  const { org } = parse(orgQuery, req.query);
  allowedOrgs(current, org);
  res.json({ org, alert_threshold: getThreshold(org), can_edit: current.roles[org] === "admin" });
});

moderationRouter.put("/settings", (req, res) => {
  const current = currentUser(req);
  const { org } = parse(orgQuery, req.query);
  const body = parse(settingsUpdate, req.body);
  requireAdmin(current, org);
  if (body.alert_threshold < 0 || body.alert_threshold > 100) {
    throw new HttpError(422, "The alert threshold must be between 0 and 100.");
  }
  db.prepare("UPDATE settings SET value = ? WHERE org_id = ? AND key = ?").run(body.alert_threshold, org, THRESHOLD_KEY);
  res.json({ org, alert_threshold: getThreshold(org), can_edit: true });
});
