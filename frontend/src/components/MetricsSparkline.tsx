import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import type { MetricsHistory } from "../hooks/useMetrics";

interface Props {
  history: MetricsHistory;
}

export function MetricsSparkline({ history }: Props) {
  const data = history.receivedPerSecond.map((v, i) => ({
    i,
    received: Math.round(v),
    sent: Math.round(history.sentPerSecond[i] ?? 0),
  }));

  return (
    <div className="h-20 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="received" stroke="#22c55e" fill="url(#colorReceived)" strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="sent" stroke="#3b82f6" fill="url(#colorSent)" strokeWidth={1.5} dot={false} />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "none", borderRadius: "4px", fontSize: "11px", color: "#e2e8f0" }}
            labelFormatter={() => ""}
            formatter={(value: number, name: string) => [`${value}/s`, name]}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
