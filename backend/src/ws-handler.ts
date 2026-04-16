import type { ServerWebSocket } from "bun";
import { startTap, stopTap, stopAllTaps } from "./tap-manager";

type WsEvent = "open" | "message" | "close";

interface TapStartMessage {
  action: "tap_start";
  componentId: string;
}

interface TapStopMessage {
  action: "tap_stop";
  componentId: string;
}

type ClientMessage = TapStartMessage | TapStopMessage;

export function handleWebSocket(
  event: WsEvent,
  ws: ServerWebSocket<unknown>,
  message: string | Buffer | null
): void {
  switch (event) {
    case "open":
      break;

    case "message": {
      if (!message) return;
      let parsed: ClientMessage;
      try {
        parsed = JSON.parse(message.toString()) as ClientMessage;
      } catch {
        ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
        return;
      }

      if (parsed.action === "tap_start") {
        startTap(parsed.componentId, ws);
      } else if (parsed.action === "tap_stop") {
        stopTap(parsed.componentId);
      }
      break;
    }

    case "close":
      stopAllTaps();
      break;
  }
}
