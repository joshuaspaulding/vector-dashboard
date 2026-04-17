import type { ServerWebSocket } from "bun";
import { getConfig } from "./config";

const MAX_SIMULTANEOUS_TAPS = 5;

interface TapSession {
  ws: WebSocket;
  componentId: string;
}

const activeTaps = new Map<string, TapSession>();

// outputEventsByComponentIdPatterns returns Log | Metric | Trace | EventNotification
// Log/Trace: use string(encoding: JSON) for full event. Metric: name+value fields.
const TAP_SUBSCRIPTION = `
  subscription Tap($patterns: [String!]!, $interval: Int!) {
    outputEventsByComponentIdPatterns(outputsPatterns: $patterns, interval: $interval) {
      __typename
      ... on Log {
        componentId
        string(encoding: JSON)
      }
      ... on Metric {
        componentId
        name
        valueType
        value
      }
      ... on Trace {
        componentId
        string(encoding: JSON)
      }
      ... on EventNotification {
        notification {
          __typename
          ... on Matched { pattern }
          ... on NotMatched { pattern }
          ... on InvalidMatch { pattern invalidMatches }
        }
        message
      }
    }
  }
`;

export function startTap(componentId: string, clientWs: ServerWebSocket<unknown>): void {
  if (activeTaps.has(componentId)) {
    clientWs.send(JSON.stringify({ type: "tap_error", componentId, message: "Tap already active for this component" }));
    return;
  }

  if (activeTaps.size >= MAX_SIMULTANEOUS_TAPS) {
    clientWs.send(JSON.stringify({ type: "tap_error", componentId, message: "Maximum simultaneous taps reached" }));
    return;
  }

  const config = getConfig();
  const vectorWsUrl = config.vectorApi.replace(/^http/, "ws") + "/graphql";

  // graphql-transport-ws is the protocol async-graphql (Vector) uses
  const vectorWs = new WebSocket(vectorWsUrl, "graphql-transport-ws");

  vectorWs.onopen = () => {
    vectorWs.send(JSON.stringify({ type: "connection_init" }));
  };

  vectorWs.onmessage = (evt) => {
    let msg: { type: string; id?: string; payload?: unknown };
    try {
      msg = JSON.parse(evt.data as string);
    } catch {
      return;
    }

    if (msg.type === "connection_ack") {
      vectorWs.send(JSON.stringify({
        id: "1",
        type: "subscribe",
        payload: {
          query: TAP_SUBSCRIPTION,
          variables: { patterns: [componentId], interval: 500 },
        },
      }));
    } else if (msg.type === "next") {
      const payload = msg.payload as { data?: { outputEventsByComponentIdPatterns?: unknown[] } };
      const items = payload?.data?.outputEventsByComponentIdPatterns;
      if (!Array.isArray(items)) return;

      for (const item of items) {
        const ev = item as Record<string, unknown>;
        const typename = ev.__typename as string | undefined;

        if (typename === "EventNotification") {
          const notif = ev.notification as Record<string, unknown> | undefined;
          // Only surface non-match notifications as errors; Matched is informational
          if (notif?.__typename !== "Matched") {
            clientWs.send(JSON.stringify({ type: "tap_error", componentId, message: ev.message }));
          }
        } else if (typename === "Log" || typename === "Trace") {
          // string(encoding: JSON) returns the full event as a JSON string
          const raw = ev.string as string | undefined;
          const event = raw ? JSON.parse(raw) : ev;
          clientWs.send(JSON.stringify({ type: "tap_event", componentId, event }));
        } else if (typename === "Metric") {
          clientWs.send(JSON.stringify({ type: "tap_event", componentId, event: ev }));
        }
      }
    } else if (msg.type === "error") {
      const errs = msg.payload as { message: string }[];
      const message = Array.isArray(errs) ? errs[0]?.message : "Tap subscription error";
      clientWs.send(JSON.stringify({ type: "tap_error", componentId, message }));
      cleanup(componentId);
    } else if (msg.type === "complete") {
      clientWs.send(JSON.stringify({ type: "tap_end", componentId }));
      cleanup(componentId);
    }
  };

  vectorWs.onerror = () => {
    clientWs.send(JSON.stringify({ type: "tap_error", componentId, message: "Lost connection to Vector API" }));
    cleanup(componentId);
  };

  vectorWs.onclose = () => {
    if (activeTaps.has(componentId)) {
      clientWs.send(JSON.stringify({ type: "tap_end", componentId }));
      cleanup(componentId);
    }
  };

  activeTaps.set(componentId, { ws: vectorWs, componentId });
}

function cleanup(componentId: string): void {
  const session = activeTaps.get(componentId);
  if (session) {
    // Send complete to gracefully unsubscribe before closing
    try { session.ws.send(JSON.stringify({ id: "1", type: "complete" })); } catch { /* ignore */ }
    try { session.ws.close(); } catch { /* already closed */ }
    activeTaps.delete(componentId);
  }
}

export function stopTap(componentId: string): void {
  cleanup(componentId);
}

export function stopAllTaps(): void {
  for (const [id] of activeTaps) {
    cleanup(id);
  }
}
