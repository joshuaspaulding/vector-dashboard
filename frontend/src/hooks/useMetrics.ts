import { useState, useEffect, useRef, useCallback } from "react";
import { gql, METRICS_QUERY } from "../lib/graphql";
import type { ComponentMetrics } from "../lib/types";

interface RawComponentMetrics {
  id: string;
  metrics: {
    receivedEventsTotal: { total: number };
    sentEventsTotal: { total: number };
    utilization: number | null;
    errorsTotal: { total: number };
  };
}

interface MetricsData {
  components: RawComponentMetrics[];
}

// Rolling 60-sample history per component
const HISTORY_SIZE = 60;

export interface MetricsHistory {
  receivedPerSecond: number[];
  sentPerSecond: number[];
  utilization: (number | null)[];
}

export function useMetrics(intervalMs = 1000) {
  const [metrics, setMetrics] = useState<Map<string, ComponentMetrics>>(new Map());
  const [history, setHistory] = useState<Map<string, MetricsHistory>>(new Map());
  const prevTotals = useRef<Map<string, { received: number; sent: number }>>(new Map());

  const fetch = useCallback(async () => {
    try {
      const data = await gql<MetricsData>(METRICS_QUERY);
      const now = new Map<string, ComponentMetrics>();
      const newHistory = new Map<string, MetricsHistory>();

      for (const c of data.components) {
        const received = c.metrics.receivedEventsTotal?.total ?? 0;
        const sent = c.metrics.sentEventsTotal?.total ?? 0;
        const prev = prevTotals.current.get(c.id);

        const receivedPerSecond = prev ? Math.max(0, received - prev.received) / (intervalMs / 1000) : 0;
        const sentPerSecond = prev ? Math.max(0, sent - prev.sent) / (intervalMs / 1000) : 0;

        prevTotals.current.set(c.id, { received, sent });

        now.set(c.id, {
          componentId: c.id,
          receivedEventsTotal: received,
          sentEventsTotal: sent,
          utilization: c.metrics.utilization ?? null,
          errorsTotal: c.metrics.errorsTotal?.total ?? 0,
          receivedPerSecond,
          sentPerSecond,
        });

        // Append to history
        setHistory(prev => {
          const h = prev.get(c.id) ?? { receivedPerSecond: [], sentPerSecond: [], utilization: [] };
          return new Map(prev).set(c.id, {
            receivedPerSecond: [...h.receivedPerSecond, receivedPerSecond].slice(-HISTORY_SIZE),
            sentPerSecond: [...h.sentPerSecond, sentPerSecond].slice(-HISTORY_SIZE),
            utilization: [...h.utilization, c.metrics.utilization ?? null].slice(-HISTORY_SIZE),
          });
        });
      }

      setMetrics(now);
    } catch {
      // Silently ignore — error shown via topology hook
    }
  }, [intervalMs]);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, intervalMs);
    return () => clearInterval(id);
  }, [fetch, intervalMs]);

  return { metrics, history };
}
