// Content Analytics API: articles processed, quality scores and processing activity.

import { createProductRouter } from "./productApi.js";

const round = (n: number | null, digits: number) => Math.round((n ?? 0) * 10 ** digits) / 10 ** digits;

export const analyticsRouter = createProductRouter({
  product: "analytics",
  table: "analytics_daily",
  // Averages are weighted by the number of articles each row represents.
  columns: `
    SUM(articles_processed) AS articles_processed,
    SUM(avg_quality_score * articles_processed) * 1.0 / SUM(articles_processed) AS avg_quality_score,
    SUM(avg_processing_seconds * articles_processed) * 1.0 / SUM(articles_processed) AS avg_processing_seconds`,
  toTotals: (row) => ({
    articles_processed: row.articles_processed ?? 0,
    avg_quality_score: round(row.avg_quality_score, 1),
    avg_processing_seconds: round(row.avg_processing_seconds, 2),
  }),
});
