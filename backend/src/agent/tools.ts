// The tools the AI assistant can use.
//
// Every tool calls the product REST APIs using the signed-in user's own token, exactly
// like the dashboard does. So the assistant can only see what the user can see, and the
// API's permission checks apply to it too.
//
// The assistant has NO tool that changes a setting. `propose_threshold_change` only
// saves a pending action; the change happens later, when the user clicks Approve.

import type Anthropic from "@anthropic-ai/sdk";
import type { Express } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { callApi } from "./callApi.js";

const PRODUCTS = ["analytics", "moderation", "protection"];

const productInput: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    product: { type: "string", enum: PRODUCTS },
    start_date: { type: "string", description: "YYYY-MM-DD" },
    end_date: { type: "string", description: "YYYY-MM-DD" },
    org: { type: "string", description: "Organization id. Omit for all of the user's organizations." },
  },
  required: ["product", "start_date", "end_date"],
};

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_product_summary",
    description:
      "Totals for one product over a date range, plus the previous period of the same " +
      "length and the % change. Products: analytics (articles processed, quality score, " +
      "processing time), moderation (comments reviewed, flagged, removed, approved), " +
      "protection (automated, suspicious and blocked requests).",
    input_schema: productInput,
  },
  {
    name: "get_product_timeseries",
    description: "Day-by-day numbers for one product over a date range. Use it to describe trends.",
    input_schema: productInput,
  },
  {
    name: "propose_threshold_change",
    description:
      "Propose a new moderation alert threshold (0-100) for one organization. This does NOT " +
      "change anything: it creates a proposal that the user must approve with a button. " +
      "Only organization admins can change settings.",
    input_schema: {
      type: "object",
      properties: {
        org: { type: "string", description: "Organization id" },
        value: { type: "integer", description: "New threshold, 0-100" },
      },
      required: ["org", "value"],
    },
  },
];

type ToolOutput = Record<string, unknown>;

export class ToolRunner {
  pendingActionIds: string[] = [];

  constructor(
    private app: Express,
    private token: string,
    private userId: number,
  ) {}

  async run(name: string, args: Record<string, unknown>): Promise<ToolOutput> {
    if (name === "get_product_summary" || name === "get_product_timeseries") {
      const product = args.product as string;
      if (!PRODUCTS.includes(product)) return { error: `Unknown product. Use one of ${PRODUCTS.join(", ")}.` };
      const endpoint = name === "get_product_summary" ? "summary" : "timeseries";
      const { status, data } = await callApi(this.app, this.token, "GET", `/api/${product}/${endpoint}`, {
        start: args.start_date as string | undefined,
        end: args.end_date as string | undefined,
        org: args.org as string | undefined,
      });
      return status === 200 ? data : { error: data.detail, status };
    }

    if (name === "propose_threshold_change") {
      return this.proposeThresholdChange(args.org as string | undefined, args.value);
    }

    return { error: `Unknown tool ${name}.` };
  }

  private async proposeThresholdChange(org: string | undefined, value: unknown): Promise<ToolOutput> {
    if (!org) return { error: "Say which organization (org id) the change is for." };
    // Reading the current setting through the API also checks the user belongs to the org.
    const { status, data } = await callApi(this.app, this.token, "GET", "/api/moderation/settings", { org });
    if (status !== 200) return { error: data.detail, status };
    if (!data.can_edit) {
      return { error: "Permission denied: only administrators of this organization can change settings." };
    }
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) {
      return { error: "The threshold must be a whole number between 0 and 100." };
    }
    const oldValue = data.alert_threshold as number;
    if (value === oldValue) return { message: `The threshold is already ${value}. Nothing to change.` };

    const id = randomUUID();
    db.prepare("INSERT INTO pending_actions (id, user_id, org_id, old_value, new_value) VALUES (?, ?, ?, ?, ?)").run(
      id,
      this.userId,
      org,
      oldValue,
      value,
    );
    this.pendingActionIds.push(id);
    return {
      status: "waiting_for_user_approval",
      message: `Proposed changing the threshold from ${oldValue} to ${value}. Nothing has changed yet; the user must click Approve.`,
    };
  }
}
