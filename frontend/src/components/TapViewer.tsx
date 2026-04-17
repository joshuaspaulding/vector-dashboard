import { useCallback, useEffect, useRef } from "react";
import clsx from "clsx";

interface Props {
  componentId: string;
  events: { id: number; event: unknown }[];
  isActive: boolean;
  wsConnected: boolean;
  onStart: (componentId: string) => void;
  onStop: () => void;
}

function syntaxHighlight(json: string): string {
  const escaped = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped.replace(
    /"(\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/g,
    match => {
      if (/^"/.test(match)) {
        return /:$/.test(match)
          ? `<span style="color:#9cdcfe">${match}</span>`   // key
          : `<span style="color:#ce9178">${match}</span>`;  // string value
      }
      if (/true|false/.test(match)) return `<span style="color:#569cd6">${match}</span>`;
      if (/null/.test(match)) return `<span style="color:#569cd6">${match}</span>`;
      return `<span style="color:#b5cea8">${match}</span>`; // number
    }
  );
}

export function TapViewer({ componentId, events, isActive, wsConnected, onStart, onStop }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    atBottom.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 16;
  };

  useEffect(() => {
    if (atBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [events]);

  const handleCopy = useCallback(() => {
    const text = events.map(e => JSON.stringify(e.event, null, 2)).join("\n---\n");
    navigator.clipboard.writeText(text);
  }, [events]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-[#666] tracking-widest uppercase">Tap Viewer</span>
        <div className="flex gap-2 items-center">
          {events.length > 0 && (
            <button
              onClick={handleCopy}
              className="text-[10px] text-[#888] hover:text-[#d4d4d4] px-1.5 py-0.5 rounded border border-[#383838] hover:border-[#555] transition-colors"
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
                ? "bg-red-900/80 hover:bg-red-800 text-red-200 border border-red-700"
                : wsConnected
                ? "bg-teal-900/80 hover:bg-teal-800 text-teal-200 border border-teal-700"
                : "bg-[#2a2a2a] text-[#555] cursor-not-allowed border border-[#333]"
            )}
          >
            {isActive ? "■ Stop" : "▶ Tap"}
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="bg-[#111111] rounded border border-[#333] h-80 overflow-y-auto flex flex-col gap-0"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#444 #111" }}
      >
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[#444] italic text-xs">
              {isActive ? "Waiting for events…" : "Press ▶ Tap to start"}
            </span>
          </div>
        ) : (
          <>
            {events.map(e => (
              <div key={e.id} className="border-b border-[#1e1e1e] px-3 py-2 last:border-0">
                <pre
                  className="text-[11px] leading-relaxed whitespace-pre-wrap break-words font-mono"
                  dangerouslySetInnerHTML={{ __html: syntaxHighlight(JSON.stringify(e.event, null, 2)) }}
                />
              </div>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {events.length > 0 && (
        <div className="flex justify-between text-[10px] text-[#555]">
          <span>{events.length} events</span>
          {events.length === 500 && <span>max 500 — oldest dropped</span>}
        </div>
      )}
    </div>
  );
}
