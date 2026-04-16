import { useState, useEffect, useCallback } from "react";
import { gql, TOPOLOGY_QUERY } from "../lib/graphql";
import type { VectorComponent } from "../lib/types";

interface TopologyData {
  components: VectorComponent[];
}

export function useTopology(intervalMs = 5000) {
  const [components, setComponents] = useState<VectorComponent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const data = await gql<TopologyData>(TOPOLOGY_QUERY);
      setComponents(data.components);
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
