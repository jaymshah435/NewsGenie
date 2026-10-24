// The AI assistant: a system prompt plus Claude's tool-calling loop.
//
// 1. Send Claude the conversation, the system prompt and the tool list.
// 2. If Claude asks for tools, run them (through the product APIs) and send back the results.
// 3. Repeat until Claude gives a final text answer.

import Anthropic from "@anthropic-ai/sdk";
import type { Express } from "express";
import type { CurrentUser } from "../auth.js";
import { config } from "../config.js";
import { today } from "../dates.js";
import { HttpError } from "../errors.js";
import { TOOLS, ToolRunner } from "./tools.js";

const MAX_STEPS = 8;

function systemPrompt(name: string, orgs: string, dataUntil: string): string {
  return `You are the NewsGenie assistant for news publishers. NewsGenie has three products:
- Content Analytics (product "analytics"): articles processed, quality scores, processing time.
- Community Moderation (product "moderation"): comments reviewed, flagged, removed, approved.
- Content Protection (product "protection"): automated content-access requests, suspicious and blocked requests.

Today is ${today()}. Data is available up to ${dataUntil}; treat that as "today" for date ranges
(e.g. "last seven days" = the 7 days ending ${dataUntil}; "this month" = the 1st of that month to ${dataUntil}).
The user is ${name}. Their organizations: ${orgs}.
Unless asked otherwise, cover all of the user's organizations.

Rules:
- Only use numbers returned by the tools. Never guess or invent figures.
- To compare products, use the % change, because the products count different things.
- Point out notable findings and trends (big changes, spikes, rising or falling rates).
- If a tool returns a permission error, explain that the user's account does not have access.
- You cannot change settings yourself. Use propose_threshold_change, then tell the user to review
  and click Approve. Never say a change has been made.
- Reply in plain text, short and clear. Simple "-" bullet lists are fine. Do not use markdown tables or headings.
`;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function runAgent(
  history: ChatMessage[],
  current: CurrentUser,
  orgNames: Record<string, string>,
  dataUntil: string,
  app: Express,
): Promise<{ reply: string; actionIds: string[] }> {
  if (!config.anthropicApiKey) {
    throw new HttpError(503, "The assistant is not set up. Add ANTHROPIC_API_KEY to backend/.env and restart.");
  }

  const orgs = Object.entries(current.roles)
    .map(([id, role]) => `${orgNames[id]} (id '${id}', ${role})`)
    .join(", ");
  const system = systemPrompt(current.user.name, orgs, dataUntil);

  const runner = new ToolRunner(app, current.token, current.user.id);
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const messages: Anthropic.MessageParam[] = [...history];

  for (let step = 0; step < MAX_STEPS; step++) {
    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: config.anthropicModel,
        max_tokens: 1500,
        system,
        tools: TOOLS,
        messages,
      });
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) {
        throw new HttpError(502, "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in backend/.env.");
      }
      if (e instanceof Anthropic.NotFoundError) {
        throw new HttpError(502, `Model '${config.anthropicModel}' was not found. Check ANTHROPIC_MODEL in backend/.env.`);
      }
      if (e instanceof Anthropic.APIError) {
        throw new HttpError(502, `The AI service returned an error: ${e.constructor.name}. Please try again.`);
      }
      throw e;
    }

    if (response.stop_reason !== "tool_use") {
      const text = response.content.map((block) => (block.type === "text" ? block.text : "")).join("");
      return { reply: text.trim(), actionIds: runner.pendingActionIds };
    }

    // Claude asked for one or more tools: run them and send the results back.
    const assistantContent: Anthropic.ContentBlockParam[] = [];
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "text") {
        assistantContent.push({ type: "text", text: block.text });
      } else if (block.type === "tool_use") {
        assistantContent.push({ type: "tool_use", id: block.id, name: block.name, input: block.input });
        const output = await runner.run(block.name, block.input as Record<string, unknown>);
        results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(output) });
      }
    }
    messages.push({ role: "assistant", content: assistantContent });
    messages.push({ role: "user", content: results });
  }

  return { reply: "Sorry, that took too many steps. Please ask a narrower question.", actionIds: runner.pendingActionIds };
}
