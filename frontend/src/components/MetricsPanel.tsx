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

function MetricRow({ label, value, color = "text-gray-200" }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between text-xs py-1 border-b border-gray-800">
      <span className="text-gray-400">{label}</span>
      <span className={color}>{value}</span>
    </div>
  );
}

function formatRate(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k/s`;
  return `${n.toFixed(0)}/s`;
}

const kindLabel: Record<string, string> = {
  source: "Source",
  transform: "Transform",
  sink: "Sink",
};

export function MetricsPanel({ component, metrics, history, tapEvents, tapActive, wsConnected, onTapStart, onTapStop }: Props) {
  const utilPct = metrics?.utilization != null ? `${Math.round(metrics.utilization * 100)}%` : "—";
  const utilColor = metrics?.utilization != null
    ? metrics.utilization > 0.8 ? "text-red-400" : metrics.utilization > 0.5 ? "text-yellow-400" : "text-gray-200"
    : "text-gray-500";

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto bg-gray-900 text-white">
      {/* Header */}
      <div>
        <div className="text-sm font-bold truncate" title={component.id}>{component.id}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {kindLabel[component.kind] ?? component.kind} · {component.componentType}
        </div>
      </div>

      {/* Metrics */}
      <div>
        <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Metrics</div>
        <MetricRow label="Received" value={metrics ? formatRate(metrics.receivedPerSecond) : "—"} color="text-green-400" />
        <MetricRow label="Sent" value={metrics ? formatRate(metrics.sentPerSecond) : "—"} color="text-blue-400" />
        <MetricRow label="Utilization" value={utilPct} color={utilColor} />
        <MetricRow label="Errors" value={metrics ? String(metrics.errorsTotal) : "—"} color={metrics?.errorsTotal ? "text-red-400" : "text-gray-200"} />
      </div>

      {/* Sparkline */}
      {history && history.receivedPerSecond.length > 1 && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Events/s (60s)</div>
          <MetricsSparkline history={history} />
          <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
            <span><span className="text-green-400">■</span> received</span>
            <span><span className="text-blue-400">■</span> sent</span>
          </div>
        </div>
      )}

      {/* Tap */}
      <div>
        <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-2">Live Tap</div>
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
