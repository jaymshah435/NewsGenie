// Line chart of one or more metrics over time.

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface LineDef {
  key: string;
  label: string;
  color: string;
}

export function TrendChart({
  data,
  lines,
  height = 260,
}: {
  data: Record<string, number | string>[];
  lines: LineDef[];
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(d: string) => d.slice(5)} minTickGap={20} />
          <YAxis tick={{ fontSize: 12 }} width={56} />
          <Tooltip />
          {lines.length > 1 && <Legend />}
          {lines.map((l) => (
            <Line key={l.key} dataKey={l.key} name={l.label} stroke={l.color} strokeWidth={2} dot={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
