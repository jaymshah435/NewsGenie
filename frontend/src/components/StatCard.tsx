// One summary number with its label and, optionally, the % change vs the previous period.

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** 12.3 -> "▲ +12.3% vs previous period", -4 -> "▼ -4% vs previous period". */
export function formatChange(change: number | null): string {
  if (change === null) return "No data for the previous period";
  if (change === 0) return "No change vs previous period";
  return `${change > 0 ? "▲ +" : "▼ "}${change}% vs previous period`;
}

export function ChangeLine({ change }: { change: number | null }) {
  const color = change === null || change === 0 ? "text-slate-500" : change > 0 ? "text-emerald-700" : "text-red-700";
  return <p className={`mt-1 text-xs font-medium ${color}`}>{formatChange(change)}</p>;
}

export function StatCard({ label, value, change }: { label: string; value: string; change?: number | null }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {change !== undefined && <ChangeLine change={change} />}
    </div>
  );
}
