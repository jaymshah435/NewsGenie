import { useState } from "react";
import { Filters, defaultFilters } from "@/components/Filters";
import { StatCard, formatNumber } from "@/components/StatCard";
import { ErrorMessage, Loading } from "@/components/States";
import { TrendChart } from "@/components/TrendChart";
import { query } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";

const COLOR = "#2563eb";

interface Summary {
  totals: { articles_processed: number; avg_quality_score: number; avg_processing_seconds: number };
  change_pct: Record<string, number | null>;
}
interface Points {
  points: Record<string, number | string>[];
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(() => defaultFilters(user!));

  const params = query({ org: filters.org, start: filters.start, end: filters.end });
  const summary = useApi<Summary>(`/api/analytics/summary${params}`);
  const timeseries = useApi<Points>(`/api/analytics/timeseries${params}`);

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">Content Analytics</h1>
      <p className="mb-6 text-sm text-slate-500">Articles processed, quality scores and processing activity.</p>

      <Filters user={user!} value={filters} onChange={setFilters} />

      {summary.loading && <Loading />}
      {summary.error && <ErrorMessage message={summary.error} onRetry={summary.retry} />}
      {summary.data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Articles processed" value={formatNumber(summary.data.totals.articles_processed)} change={summary.data.change_pct.articles_processed} />
          <StatCard label="Average quality score" value={`${summary.data.totals.avg_quality_score} / 100`} change={summary.data.change_pct.avg_quality_score} />
          <StatCard label="Average processing time" value={`${summary.data.totals.avg_processing_seconds} s`} change={summary.data.change_pct.avg_processing_seconds} />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold">Articles processed per day</h2>
          {timeseries.loading && <Loading />}
          {timeseries.error && <ErrorMessage message={timeseries.error} onRetry={timeseries.retry} />}
          {timeseries.data && <TrendChart data={timeseries.data.points} lines={[{ key: "articles_processed", label: "Articles processed", color: COLOR }]} />}
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold">Average quality score per day</h2>
          {timeseries.data && <TrendChart data={timeseries.data.points} lines={[{ key: "avg_quality_score", label: "Quality score", color: COLOR }]} />}
        </section>
      </div>
    </>
  );
}
