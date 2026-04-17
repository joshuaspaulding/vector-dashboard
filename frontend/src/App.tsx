import { useState, useEffect } from "react";
import { useTopology } from "./hooks/useTopology";
import { useMetrics } from "./hooks/useMetrics";
import { useTap } from "./hooks/useTap";
import { TopologyGraph } from "./components/TopologyGraph";
import { MetricsPanel } from "./components/MetricsPanel";
import { TopTable } from "./components/TopTable";

type View = "topology" | "top";

export default function App() {
  const { components, error } = useTopology(5000);
  const { metrics, history } = useMetrics(1000);
  const { events, activeComponentId, connected: wsConnected, start: tapStart, stop: tapStop } = useTap();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>("topology");

  useEffect(() => {
    if (components.length > 0 && !selectedId) {
      setSelectedId(components[0].id);
    }
  }, [components, selectedId]);

  const selectedComponent = components.find(c => c.id === selectedId) ?? null;
  const selectedMetrics = selectedId ? metrics.get(selectedId) : undefined;
  const selectedHistory = selectedId ? history.get(selectedId) : undefined;
  const tapEventsForSelected = selectedId ? events.filter(e => e.componentId === selectedId) : [];

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-[#d4d4d4]" style={{ fontFamily: "'JetBrainsMono Nerd Font', 'JetBrains Mono', ui-monospace, monospace" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-2 bg-[#1a1a1a] border-b border-[#333] shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none" className="shrink-0">
              <path d="M4 6h6l6 14 6-14h6L16 28 4 6z" fill="#4ec9b0"/>
            </svg>
            <span className="font-semibold text-sm text-[#d4d4d4] tracking-wide">Vector Dashboard</span>
          </div>
          {/* Tab switcher */}
          <div className="flex items-center gap-1 bg-[#111] rounded border border-[#333] p-0.5">
            <button
              onClick={() => setView("topology")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${view === "topology" ? "bg-[#2a2a2a] text-[#d4d4d4]" : "text-[#666] hover:text-[#aaa]"}`}
            >
               Topology
            </button>
            <button
              onClick={() => setView("top")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${view === "top" ? "bg-[#2a2a2a] text-[#d4d4d4]" : "text-[#666] hover:text-[#aaa]"}`}
            >
               Top
            </button>
          </div>
          {components.length > 0 && (
            <span className="text-[11px] text-[#555] font-mono">{components.length} components</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono">
          {error ? (
            <span className="text-red-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block"/>error</span>
          ) : components.length > 0 ? (
            <span className="text-teal-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block animate-pulse"/>connected</span>
          ) : (
            <span className="text-yellow-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block"/>connecting…</span>
          )}
          <span className={wsConnected ? "text-[#888] flex items-center gap-1.5" : "text-[#444] flex items-center gap-1.5"}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${wsConnected ? "bg-[#888]" : "bg-[#444]"}`}/>
            tap ws
          </span>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {error && components.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[#555] text-sm flex-col gap-2 font-mono">
              <span className="text-xl">✗</span>
              <span>Cannot reach Vector API</span>
              <span className="text-xs text-[#444]">Make sure Vector is running with <code className="bg-[#222] px-1 rounded">api.enabled = true</code></span>
            </div>
          ) : components.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[#444] text-sm font-mono">
              Loading topology…
            </div>
          ) : view === "topology" ? (
            <TopologyGraph
              components={components}
              metricsMap={metrics}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : (
            <TopTable
              components={components}
              metrics={metrics}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>

        {/* Sidebar — shown in both views when a component is selected */}
        {selectedComponent && (
          <div className="w-80 border-l border-[#333] shrink-0 overflow-hidden">
            <MetricsPanel
              component={selectedComponent}
              metrics={selectedMetrics}
              history={selectedHistory}
              tapEvents={tapEventsForSelected}
              tapActive={activeComponentId === selectedId}
              wsConnected={wsConnected}
              onTapStart={tapStart}
              onTapStop={tapStop}
            />
          </div>
        )}
      </div>
    </div>
  );
}
