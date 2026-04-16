export interface Config {
  vectorApi: string;
  port: number;
  corsOrigin: string;
}

export function getConfig(): Config {
  return {
    vectorApi: process.env.VECTOR_API || "http://localhost:8686",
    port: parseInt(process.env.PORT || "3001", 10),
    corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  };
}
