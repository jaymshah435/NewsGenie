import { useState } from "react";
import { Filters, defaultFilters } from "@/components/Filters";
import { StatCard, formatNumber } from "@/components/StatCard";
import { ErrorMessage, Loading } from "@/components/States";
import { TrendChart } from "@/components/TrendChart";
import { query } from "@/lib/api";
import { useAuth, type Organization } from "@/lib/auth";
import { useApi } from "@/lib/useApi";

const COLOR = "#ea580c";

interface Summary {
  totals: { comments_reviewed: number; flagged: number; removed: number; approved: number };
  change_pct: Record<string, number | null>;
}
interface Points {
  points: Record<string, number | string>[];
}
interface Settings {
  alert_threshold: number;
  can_edit: boolean;
}

function Threshold({ org }: { org: Organization }) {
  const settings = useApi<Settings>(`/api/moderation/settings${query({ org: org.id })}`);
  if (settings.error) return <ErrorMessage message={settings.error} onRetry={settings.retry} />;
  return (
    <p className="text-sm">
      {org.name}: <strong>{settings.data ? settings.data.alert_threshold : "…"}</strong>
    </p>
  );
}

export default function ModerationPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(() => defaultFilters(user!));

  const params = query({ org: filters.org, start: filters.start, end: filters.end });
  const summary = useApi<Summary>(`/api/moderation/summary${params}`);
  const timeseries = useApi<Points>(`/api/moderation/timeseries${params}`);
  const t = summary.data?.totals;
  const c = summary.data?.change_pct;

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">Community Moderation</h1>
      <p className="mb-6 text-sm text-slate-500">Comments reviewed, flagged content, moderation outcomes and trends.</p>

      <Filters user={user!} value={filters} onChange={setFilters} />

      {summary.loading && <Loading />}
      {summary.error && <ErrorMessage message={summary.error} onRetry={summary.retry} />}
      {t && c && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Comments reviewed" value={formatNumber(t.comments_reviewed)} change={c.comments_reviewed} />
          <StatCard label="Flagged" value={formatNumber(t.flagged)} change={c.flagged} />
          <StatCard label="Removed" value={formatNumber(t.removed)} change={c.removed} />
          <StatCard label="Approved after review" value={formatNumber(t.approved)} change={c.approved} />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold">Comments reviewed per day</h2>
          {timeseries.loading && <Loading />}
          {timeseries.error && <ErrorMessage message={timeseries.error} onRetry={timeseries.retry} />}
          {timeseries.data && (
            <TrendChart data={timeseries.data.points} lines={[{ key: "comments_reviewed", label: "Comments reviewed", color: COLOR }]} />
          )}
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold">Flagged comments and outcomes per day</h2>
          {timeseries.data && (
            <TrendChart
              data={timeseries.data.points}
              lines={[
                { key: "flagged", label: "Flagged", color: COLOR },
                { key: "removed", label: "Removed", color: "#9a3412" },
                { key: "approved", label: "Approved after review", color: "#64748b" },
              ]}
            />
          )}
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-1 font-semibold">Moderation alert threshold</h2>
          <p className="mb-3 text-sm text-slate-500">
            Comments scoring above this are flagged. Admins can change it through the AI Assistant.
          </p>
          <div className="space-y-1">
            {user!.organizations.map((o) => (
              <Threshold key={o.id} org={o} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
