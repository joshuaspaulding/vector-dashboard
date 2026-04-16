import type { ServerWebSocket } from "bun";

interface TapSession {
  proc: ReturnType<typeof Bun.spawn>;
  componentId: string;
}

const MAX_SIMULTANEOUS_TAPS = 5;
const activeTaps = new Map<string, TapSession>();

export function startTap(componentId: string, ws: ServerWebSocket<unknown>): void {
  if (activeTaps.has(componentId)) {
    ws.send(JSON.stringify({ type: "tap_error", componentId, message: "Tap already active for this component" }));
    return;
  }

  if (activeTaps.size >= MAX_SIMULTANEOUS_TAPS) {
    ws.send(JSON.stringify({ type: "tap_error", componentId, message: "Maximum simultaneous taps reached" }));
    return;
  }

  let proc: ReturnType<typeof Bun.spawn>;
  try {
    proc = Bun.spawn(["vector", "tap", "--component-id", componentId, "--format", "json"], {
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to spawn vector tap";
    ws.send(JSON.stringify({ type: "tap_error", componentId, message }));
    return;
  }

  activeTaps.set(componentId, { proc, componentId });

  // Stream stdout line by line
  (async () => {
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const event = JSON.parse(trimmed);
            ws.send(JSON.stringify({ type: "tap_event", componentId, event }));
          } catch {
            // Skip non-JSON lines (e.g. Vector startup messages)
          }
        }
      }
    } catch {
      // WebSocket likely closed
    } finally {
      activeTaps.delete(componentId);
      try {
        ws.send(JSON.stringify({ type: "tap_end", componentId }));
      } catch {
        // WebSocket already closed
      }
    }
  })();
}

export function stopTap(componentId: string): void {
  const session = activeTaps.get(componentId);
  if (session) {
    session.proc.kill();
    activeTaps.delete(componentId);
  }
}

export function stopAllTaps(): void {
  for (const [id] of activeTaps) {
    stopTap(id);
  }
}
