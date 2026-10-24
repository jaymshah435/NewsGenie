// Unified dashboard: one card per product, all data from the three product APIs.

import { Link } from "react-router";
import { useState } from "react";
import { Filters, defaultFilters, type FilterValues } from "@/components/Filters";
import { ChangeLine, formatNumber } from "@/components/StatCard";
import { ErrorMessage, Loading } from "@/components/States";
import { TrendChart } from "@/components/TrendChart";
import { query } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";

const PRODUCTS = [
  { id: "analytics", name: "Content Analytics", metric: "articles_processed", label: "Articles processed", color: "#2563eb" },
  { id: "moderation", name: "Community Moderation", metric: "comments_reviewed", label: "Comments reviewed", color: "#ea580c" },
  { id: "protection", name: "Content Protection", metric: "automated_requests", label: "Automated requests", color: "#059669" },
];

interface Summary {
  totals: Record<string, number>;
  change_pct: Record<string, number | null>;
}
interface Timeseries {
  points: Record<string, number | string>[];
}

function ProductCard({ product, filters }: { product: (typeof PRODUCTS)[number]; filters: FilterValues }) {
  const params = query({ org: filters.org, start: filters.start, end: filters.end });
  const summary = useApi<Summary>(`/api/${product.id}/summary${params}`);
  const timeseries = useApi<Timeseries>(`/api/${product.id}/timeseries${params}`);

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-semibold" style={{ color: product.color }}>
        {product.name}
      </h2>
      {summary.loading && <Loading />}
      {summary.error && <ErrorMessage message={summary.error} onRetry={summary.retry} />}
      {summary.data && (
        <>
          <p className="mt-2 text-sm text-slate-500">{product.label}</p>
          <p className="text-3xl font-semibold">{formatNumber(summary.data.totals[product.metric])}</p>
          <ChangeLine change={summary.data.change_pct[product.metric]} />
        </>
      )}
      {timeseries.data && (
        <div className="mt-3">
          <TrendChart data={timeseries.data.points} lines={[{ key: product.metric, label: product.label, color: product.color }]} height={140} />
        </div>
      )}
      {timeseries.error && <ErrorMessage message={timeseries.error} onRetry={timeseries.retry} />}
      <Link to={`/${product.id}`} className="mt-4 text-sm font-medium text-slate-900 hover:underline">
        Open {product.name} →
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(() => defaultFilters(user!));

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">Dashboard</h1>
      <p className="mb-6 text-sm text-slate-500">Activity across your three products.</p>
      <Filters user={user!} value={filters} onChange={setFilters} />
      <div className="grid gap-4 md:grid-cols-3">
        {PRODUCTS.map((p) => (
          <ProductCard key={p.id} product={p} filters={filters} />
        ))}
      </div>
    </>
  );
}
