// Shared building blocks for the three product APIs: filters, date range and % change.
// Each product still has its own API (own URL prefix and code file); this file only
// holds the parts that are identical for all three.

import { Router } from "express";
import { z } from "zod";
import { allowedOrgs, currentUser, requireUser } from "../auth.js";
import { addDays, daysBetween, today } from "../dates.js";
import { db } from "../db.js";
import { HttpError, parse } from "../errors.js";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date like 2026-06-30");

const filtersSchema = z.object({
  org: z.string().optional(),
  start: isoDate.optional(),
  end: isoDate.optional(),
});

type Totals = Record<string, number>;

export interface ProductDefinition {
  product: string;
  table: string;
  /** SQL that sums up the rows, e.g. "SUM(flagged) AS flagged". */
  columns: string;
  /** Turns a database row into the JSON numbers (rounding, empty values). */
  toTotals: (row: Record<string, number | null>) => Totals;
}

/** Default: the last 30 days of available data. */
function dateRange(table: string, start?: string, end?: string): [string, string] {
  if (!end) {
    const row = db.prepare(`SELECT MAX(day) AS day FROM ${table}`).get() as { day: string | null };
    end = row.day ?? today();
  }
  start = start ?? addDays(end, -29);
  if (start > end) throw new HttpError(422, "Start date must be on or before end date.");
  return [start, end];
}

/** The period of the same length just before [start, end], for % change. */
function previousPeriod(start: string, end: string): [string, string] {
  const length = daysBetween(start, end) + 1;
  return [addDays(start, -length), addDays(start, -1)];
}

export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round((1000 * (current - previous)) / previous) / 10;
}

export function createProductRouter(def: ProductDefinition): Router {
  const router = Router();
  router.use(requireUser);

  function totals(orgs: string[], start: string, end: string): Totals {
    const placeholders = orgs.map(() => "?").join(", ");
    const row = db
      .prepare(`SELECT ${def.columns} FROM ${def.table} WHERE org_id IN (${placeholders}) AND day >= ? AND day <= ?`)
      .get(...orgs, start, end) as Record<string, number | null>;
    return def.toTotals(row);
  }

  router.get("/summary", (req, res) => {
    const filters = parse(filtersSchema, req.query);
    const orgs = allowedOrgs(currentUser(req), filters.org);
    const [start, end] = dateRange(def.table, filters.start, filters.end);
    const current = totals(orgs, start, end);
    const previous = totals(orgs, ...previousPeriod(start, end));
    res.json({
      product: def.product,
      orgs,
      start,
      end,
      totals: current,
      previous,
      change_pct: Object.fromEntries(Object.keys(current).map((k) => [k, pctChange(current[k], previous[k])])),
    });
  });

  router.get("/timeseries", (req, res) => {
    const filters = parse(filtersSchema, req.query);
    const orgs = allowedOrgs(currentUser(req), filters.org);
    const [start, end] = dateRange(def.table, filters.start, filters.end);
    const placeholders = orgs.map(() => "?").join(", ");
    const rows = db
      .prepare(
        `SELECT day, ${def.columns} FROM ${def.table}
         WHERE org_id IN (${placeholders}) AND day >= ? AND day <= ?
         GROUP BY day ORDER BY day`,
      )
      .all(...orgs, start, end) as ({ day: string } & Record<string, number | null>)[];
    res.json({
      product: def.product,
      orgs,
      start,
      end,
      points: rows.map((r) => ({ date: r.day, ...def.toTotals(r) })),
    });
  });

  return router;
}

/** Sums of whole-number columns, with 0 instead of empty values. */
export function sums(...names: string[]): Pick<ProductDefinition, "columns" | "toTotals"> {
  return {
    columns: names.map((n) => `SUM(${n}) AS ${n}`).join(", "),
    toTotals: (row) => Object.fromEntries(names.map((n) => [n, row[n] ?? 0])),
  };
}
