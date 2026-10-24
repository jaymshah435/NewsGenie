import { useState } from "react";
import { Filters, defaultFilters } from "@/components/Filters";
import { StatCard, formatNumber } from "@/components/StatCard";
import { ErrorMessage, Loading } from "@/components/States";
import { TrendChart } from "@/components/TrendChart";
import { query } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";

const COLOR = "#059669";

interface Summary {
  totals: { automated_requests: number; suspicious_requests: number; blocked_requests: number };
  change_pct: Record<string, number | null>;
}
interface Points {
  points: Record<string, number | string>[];
}

export default function ProtectionPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(() => defaultFilters(user!));

  const params = query({ org: filters.org, start: filters.start, end: filters.end });
  const summary = useApi<Summary>(`/api/protection/summary${params}`);
  const timeseries = useApi<Points>(`/api/protection/timeseries${params}`);
  const t = summary.data?.totals;
  const c = summary.data?.change_pct;

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">Content Protection</h1>
      <p className="mb-6 text-sm text-slate-500">Automated content-access requests, suspicious activity and blocked requests.</p>

      <Filters user={user!} value={filters} onChange={setFilters} />

      {summary.loading && <Loading />}
      {summary.error && <ErrorMessage message={summary.error} onRetry={summary.retry} />}
      {t && c && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Automated requests" value={formatNumber(t.automated_requests)} change={c.automated_requests} />
          <StatCard label="Suspicious requests" value={formatNumber(t.suspicious_requests)} change={c.suspicious_requests} />
          <StatCard label="Blocked requests" value={formatNumber(t.blocked_requests)} change={c.blocked_requests} />
        </div>
      )}

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold">Requests per day</h2>
        {timeseries.loading && <Loading />}
        {timeseries.error && <ErrorMessage message={timeseries.error} onRetry={timeseries.retry} />}
        {timeseries.data && (
          <TrendChart
            data={timeseries.data.points}
            lines={[
              { key: "automated_requests", label: "Automated", color: COLOR },
              { key: "suspicious_requests", label: "Suspicious", color: "#d97706" },
              { key: "blocked_requests", label: "Blocked", color: "#dc2626" },
            ]}
          />
        )}
      </section>
    </>
  );
}
