import { useState, useEffect } from "react";
import { useTopology } from "./hooks/useTopology";
import { useMetrics } from "./hooks/useMetrics";
import { useTap } from "./hooks/useTap";
import { TopologyGraph } from "./components/TopologyGraph";
import { MetricsPanel } from "./components/MetricsPanel";

export default function App() {
  const { components, error } = useTopology(5000);
  const { metrics, history } = useMetrics(1000);
  const { events, activeComponentId, connected: wsConnected, start: tapStart, stop: tapStop } = useTap();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select first component when topology loads
  useEffect(() => {
    if (components.length > 0 && !selectedId) {
      setSelectedId(components[0].id);
    }
  }, [components, selectedId]);

  const selectedComponent = components.find(c => c.id === selectedId) ?? null;
  const selectedMetrics = selectedId ? metrics.get(selectedId) : undefined;
  const selectedHistory = selectedId ? history.get(selectedId) : undefined;

  const tapEventsForSelected = selectedId
    ? events.filter(e => e.componentId === selectedId)
    : [];

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm tracking-wide">Vector Dashboard</span>
          {components.length > 0 && (
            <span className="text-xs text-gray-500">{components.length} components</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          {error ? (
            <span className="text-red-400">● {error}</span>
          ) : components.length > 0 ? (
            <span className="text-green-400">● Connected</span>
          ) : (
            <span className="text-yellow-400">● Connecting…</span>
          )}
          <span className={wsConnected ? "text-blue-400" : "text-gray-600"}>
            {wsConnected ? "WS ●" : "WS ○"}
          </span>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Graph */}
        <div className="flex-1">
          {error && components.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm flex-col gap-2">
              <span className="text-2xl">⚠</span>
              <span>Cannot reach Vector API</span>
              <span className="text-xs text-gray-600">Make sure Vector is running with <code className="bg-gray-800 px-1 rounded">api.enabled = true</code></span>
            </div>
          ) : components.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-600 text-sm">
              Loading topology…
            </div>
          ) : (
            <TopologyGraph
              components={components}
              metricsMap={metrics}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>

        {/* Sidebar */}
        {selectedComponent && (
          <div className="w-72 border-l border-gray-800 shrink-0 overflow-hidden">
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
