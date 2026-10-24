// AI assistant endpoints: chat, plus approve / reject for proposed changes.

import { Router, type Express } from "express";
import { z } from "zod";
import { requireUser, currentUser, type CurrentUser } from "../auth.js";
import { runAgent } from "../agent/agent.js";
import { callApi } from "../agent/callApi.js";
import { dataUntil, db } from "../db.js";
import { HttpError, parse } from "../errors.js";

export const assistantRouter = Router();
assistantRouter.use(requireUser);

interface PendingAction {
  id: string;
  user_id: number;
  org_id: string;
  old_value: number;
  new_value: number;
  status: "pending" | "approved" | "rejected" | "failed";
}

const chatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
});

function getAction(id: string): PendingAction | undefined {
  return db.prepare("SELECT * FROM pending_actions WHERE id = ?").get(id) as PendingAction | undefined;
}

function actionToJson(action: PendingAction, error: string | null = null) {
  return {
    id: action.id,
    org_id: action.org_id,
    setting: "Moderation alert threshold",
    old_value: action.old_value,
    new_value: action.new_value,
    status: action.status,
    error,
  };
}

assistantRouter.post("/chat", async (req, res) => {
  const { messages } = parse(chatSchema, req.body);
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    throw new HttpError(422, "The last message must come from the user.");
  }
  const orgRows = db.prepare("SELECT id, name FROM organizations").all() as { id: string; name: string }[];
  const orgNames = Object.fromEntries(orgRows.map((o) => [o.id, o.name]));

  const { reply, actionIds } = await runAgent(messages, currentUser(req), orgNames, dataUntil(), req.app as Express);
  const actions = actionIds.map((id) => actionToJson(getAction(id)!));
  res.json({ reply, pending_action: actions.at(-1) ?? null });
});

function loadOwnPendingAction(id: string, current: CurrentUser): PendingAction {
  const action = getAction(id);
  if (!action || action.user_id !== current.user.id) throw new HttpError(404, "Action not found.");
  if (action.status !== "pending") throw new HttpError(409, `This action was already ${action.status}.`);
  return action;
}

function setStatus(action: PendingAction, status: PendingAction["status"]): PendingAction {
  db.prepare("UPDATE pending_actions SET status = ? WHERE id = ?").run(status, action.id);
  return { ...action, status };
}

// Runs only when the user clicks Approve. The change goes through the settings API
// with the user's token, so the admin check is applied again at this moment.
assistantRouter.post("/actions/:id/approve", async (req, res) => {
  const current = currentUser(req);
  const action = loadOwnPendingAction(req.params.id, current);
  const { status, data } = await callApi(
    req.app as Express,
    current.token,
    "PUT",
    "/api/moderation/settings",
    { org: action.org_id },
    { alert_threshold: action.new_value },
  );
  const ok = status === 200;
  res.json(actionToJson(setStatus(action, ok ? "approved" : "failed"), ok ? null : String(data.detail)));
});

assistantRouter.post("/actions/:id/reject", (req, res) => {
  const action = loadOwnPendingAction(req.params.id, currentUser(req));
  res.json(actionToJson(setStatus(action, "rejected")));
});
