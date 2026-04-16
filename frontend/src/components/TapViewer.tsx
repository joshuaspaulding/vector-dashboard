import { useCallback } from "react";
import clsx from "clsx";

interface Props {
  componentId: string;
  events: { id: number; event: unknown }[];
  isActive: boolean;
  wsConnected: boolean;
  onStart: (componentId: string) => void;
  onStop: () => void;
}

export function TapViewer({ componentId, events, isActive, wsConnected, onStart, onStop }: Props) {
  const handleCopy = useCallback(() => {
    const text = events.map(e => JSON.stringify(e.event, null, 2)).join("\n---\n");
    navigator.clipboard.writeText(text);
  }, [events]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Tap Viewer</span>
        <div className="flex gap-2 items-center">
          {events.length > 0 && (
            <button
              onClick={handleCopy}
              className="text-[10px] text-gray-400 hover:text-gray-200 px-1.5 py-0.5 rounded border border-gray-700 hover:border-gray-500"
            >
              copy
            </button>
          )}
          <button
            disabled={!wsConnected}
            onClick={() => (isActive ? onStop() : onStart(componentId))}
            className={clsx(
              "text-xs px-3 py-1 rounded font-medium transition-colors",
              isActive
                ? "bg-red-600 hover:bg-red-700 text-white"
                : wsConnected
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            )}
          >
            {isActive ? "■ Stop" : "▶ Tap"}
          </button>
        </div>
      </div>

      <div className="bg-gray-950 rounded border border-gray-800 h-48 overflow-y-auto font-mono text-[10px] text-gray-300 p-2 flex flex-col gap-1">
        {events.length === 0 ? (
          <span className="text-gray-600 italic">{isActive ? "Waiting for events…" : "Press ▶ Tap to start"}</span>
        ) : (
          events.map(e => (
            <div key={e.id} className="border-b border-gray-800 pb-1 last:border-0">
              <pre className="whitespace-pre-wrap break-all">{JSON.stringify(e.event, null, 2)}</pre>
            </div>
          ))
        )}
      </div>

      {events.length > 0 && (
        <div className="flex justify-between text-[10px] text-gray-600">
          <span>{events.length} events (newest first)</span>
          {events.length === 500 && <span>max 500 — oldest dropped</span>}
        </div>
      )}
    </div>
  );
}
