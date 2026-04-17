import type { VectorComponent, ComponentMetrics } from "../lib/types";

interface Props {
  components: VectorComponent[];
  metrics: Map<string, ComponentMetrics>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const kindStyle = {
  source:    { text: "text-teal-300",   border: "border-l-teal-500",  badge: "bg-teal-900/60 text-teal-300" },
  transform: { text: "text-yellow-200", border: "border-l-yellow-600", badge: "bg-yellow-900/60 text-yellow-200" },
  sink:      { text: "text-red-300",    border: "border-l-red-600",   badge: "bg-red-900/60 text-red-300" },
} as const;

function fmt(total: number, rate: number): string {
  const t = total >= 1_000_000 ? `${(total / 1_000_000).toFixed(2)}M` : total >= 1000 ? `${(total / 1000).toFixed(1)}k` : String(total);
  const r = rate >= 1000 ? `${(rate / 1000).toFixed(1)}k/s` : `${rate.toFixed(0)}/s`;
  return `${t}  (${r})`;
}

export function TopTable({ components, metrics, selectedId, onSelect }: Props) {
  const sorted = [...components].sort((a, b) => {
    const order = { source: 0, transform: 1, sink: 2 };
    return (order[a.kind] ?? 1) - (order[b.kind] ?? 1);
  });

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-xs font-mono">
        <thead className="sticky top-0 z-10 bg-[#1a1a1a]">
          <tr className="border-b border-[#383838]">
            <th className="text-left px-4 py-2.5 text-[#666] font-medium tracking-widest uppercase text-[10px]">ID</th>
            <th className="text-left px-3 py-2.5 text-[#666] font-medium tracking-widest uppercase text-[10px]">Kind</th>
            <th className="text-left px-3 py-2.5 text-[#666] font-medium tracking-widest uppercase text-[10px]">Type</th>
            <th className="text-right px-4 py-2.5 text-[#666] font-medium tracking-widest uppercase text-[10px]">Events In</th>
            <th className="text-right px-4 py-2.5 text-[#666] font-medium tracking-widest uppercase text-[10px]">Events Out</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(c => {
            const m = metrics.get(c.id);
            const s = kindStyle[c.kind] ?? kindStyle.transform;
            const selected = c.id === selectedId;
            return (
              <tr
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`border-b border-[#262626] cursor-pointer border-l-2 transition-colors ${s.border} ${selected ? "bg-[#2a2a2a]" : "hover:bg-[#232323]"}`}
              >
                <td className="px-4 py-2 text-[#d4d4d4] font-semibold">{c.id}</td>
                <td className="px-3 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${s.badge}`}>{c.kind}</span>
                </td>
                <td className="px-3 py-2 text-[#888]">{c.componentType}</td>
                <td className="px-4 py-2 text-right text-[#9cdcfe] tabular-nums">
                  {m ? fmt(m.receivedEventsTotal, m.receivedPerSecond) : "—"}
                </td>
                <td className="px-4 py-2 text-right text-[#ce9178] tabular-nums">
                  {m ? fmt(m.sentEventsTotal, m.sentPerSecond) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
