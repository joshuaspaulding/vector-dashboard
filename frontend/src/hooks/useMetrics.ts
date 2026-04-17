import { useState, useEffect, useRef, useCallback } from "react";
import { gql, METRICS_QUERY } from "../lib/graphql";
import type { ComponentMetrics } from "../lib/types";

interface RawNode {
  componentId: string;
  metrics: {
    receivedEventsTotal: { receivedEventsTotal: number };
    sentEventsTotal: { sentEventsTotal: number };
  };
}

interface MetricsData {
  sources: { edges: { node: RawNode }[] };
  transforms: { edges: { node: RawNode }[] };
  sinks: { edges: { node: RawNode }[] };
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

      const allNodes = [...data.sources.edges, ...data.transforms.edges, ...data.sinks.edges];
      for (const { node: c } of allNodes) {
        const received = c.metrics.receivedEventsTotal?.receivedEventsTotal ?? 0;
        const sent = c.metrics.sentEventsTotal?.sentEventsTotal ?? 0;
        const id = c.componentId;
        const prev = prevTotals.current.get(id);

        const receivedPerSecond = prev ? Math.max(0, received - prev.received) / (intervalMs / 1000) : 0;
        const sentPerSecond = prev ? Math.max(0, sent - prev.sent) / (intervalMs / 1000) : 0;

        prevTotals.current.set(id, { received, sent });

        now.set(id, {
          componentId: id,
          receivedEventsTotal: received,
          sentEventsTotal: sent,
          utilization: null,
          errorsTotal: 0,
          receivedPerSecond,
          sentPerSecond,
        });

        setHistory(prev => {
          const h = prev.get(id) ?? { receivedPerSecond: [], sentPerSecond: [], utilization: [] };
          return new Map(prev).set(id, {
            receivedPerSecond: [...h.receivedPerSecond, receivedPerSecond].slice(-HISTORY_SIZE),
            sentPerSecond: [...h.sentPerSecond, sentPerSecond].slice(-HISTORY_SIZE),
            utilization: [...h.utilization, null].slice(-HISTORY_SIZE),
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
