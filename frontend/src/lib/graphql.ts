const BACKEND = "http://localhost:3001";

export async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BACKEND}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json() as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  if (!json.data) {
    throw new Error("No data returned from GraphQL");
  }
  return json.data;
}

export const TOPOLOGY_QUERY = /* GraphQL */ `
  query Topology {
    components {
      id
      kind
      componentType
      inputs { id }
    }
  }
`;

export const METRICS_QUERY = /* GraphQL */ `
  query Metrics {
    components {
      id
      metrics {
        receivedEventsTotal { total }
        sentEventsTotal { total }
        utilization
        errorsTotal { total }
      }
    }
  }
`;

export const HEALTH_QUERY = /* GraphQL */ `
  query Health {
    health
    uptime { seconds }
    version
  }
`;
