import { useState, useEffect, useCallback } from "react";
import { gql, TOPOLOGY_QUERY } from "../lib/graphql";
import type { VectorComponent } from "../lib/types";

interface NodeBase { componentId: string; componentType: string; }
interface NodeWithInputs extends NodeBase {
  sources: { componentId: string }[];
  transforms: { componentId: string }[];
}
interface TopologyData {
  sources: { edges: { node: NodeBase }[] };
  transforms: { edges: { node: NodeWithInputs }[] };
  sinks: { edges: { node: NodeWithInputs }[] };
}

export function useTopology(intervalMs = 5000) {
  const [components, setComponents] = useState<VectorComponent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const data = await gql<TopologyData>(TOPOLOGY_QUERY);

      // For Transform nodes: .sources = upstream sources (inputs), .transforms = downstream transforms (outputs)
      // For Sink nodes: .sources + .transforms = upstream inputs
      // Build a map of transform → [upstream transform IDs] from the output lists
      const transformInputsFromOutputs = new Map<string, string[]>();
      for (const { node: e } of data.transforms.edges) {
        for (const t of e.transforms) {
          const list = transformInputsFromOutputs.get(t.componentId) ?? [];
          list.push(e.componentId);
          transformInputsFromOutputs.set(t.componentId, list);
        }
      }

      const mapped: VectorComponent[] = [
        ...data.sources.edges.map(e => ({
          id: e.node.componentId,
          kind: "source" as const,
          componentType: e.node.componentType,
          inputs: [],
        })),
        ...data.transforms.edges.map(e => ({
          id: e.node.componentId,
          kind: "transform" as const,
          componentType: e.node.componentType,
          inputs: [
            // Upstream sources
            ...e.node.sources.map(s => ({ id: s.componentId })),
            // Upstream transforms (inferred from other transforms' output lists)
            ...(transformInputsFromOutputs.get(e.node.componentId) ?? []).map(id => ({ id })),
          ],
        })),
        ...data.sinks.edges.map(e => ({
          id: e.node.componentId,
          kind: "sink" as const,
          componentType: e.node.componentType,
          inputs: [...e.node.sources, ...e.node.transforms].map(i => ({ id: i.componentId })),
        })),
      ];

      setComponents(mapped);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch topology");
    }
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, intervalMs);
    return () => clearInterval(id);
  }, [fetch, intervalMs]);

  return { components, error };
}
