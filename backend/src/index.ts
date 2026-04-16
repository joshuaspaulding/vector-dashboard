import { handleWebSocket } from "./ws-handler";
import { proxyGraphQL } from "./graphql-proxy";

const VECTOR_API = "http://127.0.0.1:8686";
const PORT = 3001;

const server = Bun.serve({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (!upgraded) return new Response("WebSocket upgrade failed", { status: 400 });
      return undefined;
    }

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    // GraphQL proxy
    if (url.pathname === "/graphql" && req.method === "POST") {
      return proxyGraphQL(req, VECTOR_API);
    }

    // Health check
    if (url.pathname === "/health") {
      let vectorReachable = false;
      try {
        const res = await fetch(`${VECTOR_API}/graphql`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: "{ health }" }),
          signal: AbortSignal.timeout(2000),
        });
        vectorReachable = res.ok;
      } catch {
        vectorReachable = false;
      }
      return json({ ok: true, vectorReachable });
    }

    return new Response("Not found", { status: 404 });
  },

  websocket: {
    open(ws) {
      handleWebSocket("open", ws, null);
    },
    message(ws, message) {
      handleWebSocket("message", ws, message);
    },
    close(ws) {
      handleWebSocket("close", ws, null);
    },
  },
});

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "http://localhost:5173",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

console.log(`Vector Dashboard backend running on http://localhost:${PORT}`);
