import { useState, useEffect, useRef, useCallback } from "react";
import type { TapEvent } from "../lib/types";

const MAX_EVENTS = 500;
const WS_URL = "ws://localhost:3001/ws";

export function useTap() {
  const [events, setEvents] = useState<{ id: number; componentId: string; event: unknown }[]>([]);
  const [activeComponentId, setActiveComponentId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const eventCounter = useRef(0);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    ws.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => {
      setConnected(false);
      setActiveComponentId(null);
    };

    socket.onmessage = (e) => {
      const msg = JSON.parse(e.data as string) as TapEvent;
      if (msg.type === "tap_event") {
        setEvents(prev => {
          const next = [{ id: ++eventCounter.current, componentId: msg.componentId, event: msg.event }, ...prev];
          return next.slice(0, MAX_EVENTS);
        });
      } else if (msg.type === "tap_end") {
        setActiveComponentId(null);
      }
    };

    return () => socket.close();
  }, []);

  const start = useCallback((componentId: string) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    if (activeComponentId) {
      ws.current.send(JSON.stringify({ action: "tap_stop", componentId: activeComponentId }));
    }
    setEvents([]);
    setActiveComponentId(componentId);
    ws.current.send(JSON.stringify({ action: "tap_start", componentId }));
  }, [activeComponentId]);

  const stop = useCallback(() => {
    if (!ws.current || !activeComponentId) return;
    ws.current.send(JSON.stringify({ action: "tap_stop", componentId: activeComponentId }));
    setActiveComponentId(null);
  }, [activeComponentId]);

  return { events, activeComponentId, connected, start, stop };
}
