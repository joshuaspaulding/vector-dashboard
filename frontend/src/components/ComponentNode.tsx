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
  source: {
    border: "border-teal-600",
    bg: "bg-[#0d1f1f]",
    badge: "bg-teal-900 text-teal-300",
    label: "SOURCE",
    dot: "bg-teal-400",
    rateColor: "text-teal-300",
  },
  transform: {
    border: "border-yellow-700",
    bg: "bg-[#1a1a0a]",
    badge: "bg-yellow-900 text-yellow-200",
    label: "XFORM",
    dot: "bg-yellow-400",
    rateColor: "text-yellow-200",
  },
  sink: {
    border: "border-red-700",
    bg: "bg-[#1f0d0d]",
    badge: "bg-red-900 text-red-300",
    label: "SINK",
    dot: "bg-red-400",
    rateColor: "text-red-300",
  },
} as const;

function SourceIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="12" cy="12" r="4" fill="currentColor"/>
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function TransformIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path d="M4 7h16M4 12h10M4 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M18 14l4-2-4-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function SinkIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

const kindIcons = { source: SourceIcon, transform: TransformIcon, sink: SinkIcon };

function formatRate(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k/s`;
  return `${n.toFixed(0)}/s`;
}

export const ComponentNode = memo(({ data }: { data: ComponentNodeData }) => {
  const cfg = kindConfig[data.kind as keyof typeof kindConfig] ?? kindConfig.transform;
  const Icon = kindIcons[data.kind as keyof typeof kindIcons] ?? TransformIcon;
  const received = data.metrics?.receivedPerSecond ?? 0;
  const sent = data.metrics?.sentPerSecond ?? 0;
  const hasFlow = received > 0 || sent > 0;

  return (
    <div className={clsx(
      "relative rounded-lg border px-3 py-2.5 min-w-[160px] text-white text-xs shadow-lg",
      cfg.border, cfg.bg,
    )}>
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-1.5 flex items-center pointer-events-none">
        <span className="text-[8px] text-[#444] font-mono">IN</span>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-[#555] !w-2 !h-2 !border-0" />

      <div className="flex items-center gap-1.5 mb-2">
        <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1", cfg.badge)}>
          <Icon />
          {cfg.label}
        </span>
      </div>
      <div className="font-mono font-semibold text-[11px] text-[#d4d4d4] truncate mb-0.5" title={data.label}>
        {data.label}
      </div>
      <div className="text-[10px] text-[#555] mb-2">{data.componentType}</div>

      <div className="border-t border-[#2a2a2a] pt-1.5 flex flex-col gap-0.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-[#555]">in</span>
          <span className={clsx("text-[10px] font-mono tabular-nums", hasFlow ? cfg.rateColor : "text-[#444]")}>
            {formatRate(received)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-[#555]">out</span>
          <span className={clsx("text-[10px] font-mono tabular-nums", hasFlow ? "text-[#d4d4d4]" : "text-[#444]")}>
            {formatRate(sent)}
          </span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-[#555] !w-2 !h-2 !border-0" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-1.5 flex items-center pointer-events-none">
        <span className="text-[8px] text-[#444] font-mono">OUT</span>
      </div>
    </div>
  );
});

ComponentNode.displayName = "ComponentNode";
