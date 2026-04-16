import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import clsx from "clsx";
import type { ComponentMetrics } from "../lib/types";

interface ComponentNodeData {
  label: string;
  kind: string;
  componentType: string;
  metrics?: ComponentMetrics;
  selected?: boolean;
}

const kindConfig = {
  source: { color: "border-green-500 bg-green-950", badge: "bg-green-600", label: "SRC" },
  transform: { color: "border-blue-500 bg-blue-950", badge: "bg-blue-600", label: "TRF" },
  sink: { color: "border-amber-500 bg-amber-950", badge: "bg-amber-600", label: "SNK" },
} as const;

function formatRate(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k/s`;
  return `${n.toFixed(0)}/s`;
}

export const ComponentNode = memo(({ data }: { data: ComponentNodeData }) => {
  const cfg = kindConfig[data.kind as keyof typeof kindConfig] ?? kindConfig.transform;
  const utilPct = data.metrics?.utilization != null ? Math.round(data.metrics.utilization * 100) : null;

  return (
    <div className={clsx("rounded-lg border-2 px-3 py-2 min-w-[140px] text-white text-xs", cfg.color)}>
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />

      <div className="flex items-center gap-1.5 mb-1">
        <span className={clsx("text-[10px] font-bold px-1 rounded", cfg.badge)}>{cfg.label}</span>
        <span className="font-semibold truncate max-w-[100px]" title={data.label}>{data.label}</span>
      </div>

      <div className="text-gray-400 text-[10px] mb-1">{data.componentType}</div>

      {data.metrics && (
        <div className="flex flex-col gap-0.5 text-[10px]">
          <div className="flex justify-between">
            <span className="text-gray-400">in</span>
            <span className="text-green-400">{formatRate(data.metrics.receivedPerSecond)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">out</span>
            <span className="text-blue-400">{formatRate(data.metrics.sentPerSecond)}</span>
          </div>
          {utilPct !== null && (
            <div className="flex justify-between">
              <span className="text-gray-400">util</span>
              <span className={clsx(utilPct > 80 ? "text-red-400" : utilPct > 50 ? "text-yellow-400" : "text-gray-300")}>
                {utilPct}%
              </span>
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-gray-400" />
    </div>
  );
});

ComponentNode.displayName = "ComponentNode";
