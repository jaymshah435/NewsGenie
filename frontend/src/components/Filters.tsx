// Date range + organization filters, shared by the dashboards.

import type { User } from "@/lib/auth";

export interface FilterValues {
  org: string; // "" = all of the user's organizations
  start: string; // YYYY-MM-DD
  end: string;
}

function daysBefore(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Default: the last 30 days that have data, all organizations. */
export function defaultFilters(user: User): FilterValues {
  return { org: "", start: daysBefore(user.data_until, 29), end: user.data_until };
}

export function Filters({
  user,
  value,
  onChange,
}: {
  user: User;
  value: FilterValues;
  onChange: (v: FilterValues) => void;
}) {
  const last = user.data_until;
  const presets = [
    { label: "Last 7 days", start: daysBefore(last, 6) },
    { label: "Last 30 days", start: daysBefore(last, 29) },
    { label: "Last 90 days", start: daysBefore(last, 89) },
  ];
  // Shows the matching preset, or "Custom" after the dates were picked by hand.
  const period = presets.find((p) => p.start === value.start && value.end === last)?.label ?? "custom";

  return (
    <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4">
      {user.organizations.length > 1 && (
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Organization
          <select
            value={value.org}
            onChange={(e) => onChange({ ...value, org: e.target.value })}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-slate-900"
          >
            <option value="">All my organizations</option>
            {user.organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm text-slate-600">
        Period
        <select
          value={period}
          onChange={(e) => {
            const preset = presets.find((p) => p.label === e.target.value);
            if (preset) onChange({ ...value, start: preset.start, end: last });
          }}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-slate-900"
        >
          {presets.map((p) => (
            <option key={p.label}>{p.label}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-600">
        From
        <input
          type="date"
          value={value.start}
          max={value.end}
          onChange={(e) => e.target.value && onChange({ ...value, start: e.target.value })}
          className="rounded-md border border-slate-300 px-2 py-1 text-slate-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-slate-600">
        To
        <input
          type="date"
          value={value.end}
          min={value.start}
          max={last}
          onChange={(e) => e.target.value && onChange({ ...value, end: e.target.value })}
          className="rounded-md border border-slate-300 px-2 py-1 text-slate-900"
        />
      </label>

    </div>
  );
}
