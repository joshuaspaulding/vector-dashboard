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
              <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#facc15" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#facc15" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="received" stroke="#2dd4bf" fill="url(#colorReceived)" strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="sent" stroke="#facc15" fill="url(#colorSent)" strokeWidth={1.5} dot={false} />
          <Tooltip
            contentStyle={{ background: "#222", border: "1px solid #383838", borderRadius: "4px", fontSize: "11px", color: "#d4d4d4", fontFamily: "monospace" }}
            labelFormatter={() => ""}
            formatter={(value: number, name: string) => [`${value}/s`, name]}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
