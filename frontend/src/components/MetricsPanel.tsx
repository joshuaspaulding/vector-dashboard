import type { VectorComponent } from "../lib/types";
import type { ComponentMetrics } from "../lib/types";
import type { MetricsHistory } from "../hooks/useMetrics";
import { MetricsSparkline } from "./MetricsSparkline";
import { TapViewer } from "./TapViewer";

interface Props {
  component: VectorComponent;
  metrics?: ComponentMetrics;
  history?: MetricsHistory;
  tapEvents: { id: number; event: unknown }[];
  tapActive: boolean;
  wsConnected: boolean;
  onTapStart: (componentId: string) => void;
  onTapStop: () => void;
}

function MetricRow({ label, value, color = "text-[#d4d4d4]" }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between text-xs py-1 border-b border-[#262626]">
      <span className="text-[#666]">{label}</span>
      <span className={`font-mono tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function formatRate(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k/s`;
  return `${n.toFixed(0)}/s`;
}

const kindLabel: Record<string, string> = {
  source: "source",
  transform: "transform",
  sink: "sink",
};

const kindColor: Record<string, string> = {
  source: "text-teal-300",
  transform: "text-yellow-200",
  sink: "text-red-300",
};

export function MetricsPanel({ component, metrics, history, tapEvents, tapActive, wsConnected, onTapStart, onTapStop }: Props) {
  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto bg-[#1a1a1a] text-[#d4d4d4]">
      {/* Header */}
      <div>
        <div className="text-sm font-bold truncate font-mono" title={component.id}>{component.id}</div>
        <div className="text-[10px] text-[#555] mt-0.5">
          <span className={kindColor[component.kind] ?? "text-[#888]"}>{kindLabel[component.kind] ?? component.kind}</span>
          {" · "}{component.componentType}
        </div>
      </div>

      {/* Metrics */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[#555] mb-1">Metrics</div>
        <MetricRow label="Received/s" value={metrics ? formatRate(metrics.receivedPerSecond) : "—"} color="text-teal-300" />
        <MetricRow label="Sent/s" value={metrics ? formatRate(metrics.sentPerSecond) : "—"} color="text-yellow-200" />
        <MetricRow label="Total in" value={metrics ? metrics.receivedEventsTotal.toLocaleString() : "—"} />
        <MetricRow label="Total out" value={metrics ? metrics.sentEventsTotal.toLocaleString() : "—"} />
      </div>

      {/* Sparkline */}
      {history && history.receivedPerSecond.length > 1 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#555] mb-1">Events/s (60s)</div>
          <MetricsSparkline history={history} />
          <div className="flex gap-3 mt-1 text-[10px] text-[#555]">
            <span><span className="text-teal-400">■</span> received</span>
            <span><span className="text-yellow-400">■</span> sent</span>
          </div>
        </div>
      )}

      {/* Tap */}
      <div>
        <TapViewer
          componentId={component.id}
          events={tapEvents}
          isActive={tapActive}
          wsConnected={wsConnected}
          onStart={onTapStart}
          onStop={onTapStop}
        />
      </div>
    </div>
  );
}
