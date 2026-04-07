import { cors } from "hono/cors";

/**
 * Origins allowed to call the GuardQuote backend.
 *
 * Production: the main frontend and the SOC dashboard.
 * Local dev: the Vite dev server.
 *
 * Add new entries here, NOT inline at the call site, so both
 * src/index.ts (Bun production) and server-node.ts (Node dev)
 * stay in sync. Closes audit finding #4 (wildcard CORS).
 */
export const ALLOWED_ORIGINS = [
  "https://guardquote.vandine.us",
  "https://soc.vandine.us",
  "http://localhost:5173",
];

/**
 * Hono cors() middleware preconfigured with the GuardQuote allowlist.
 * Returns null for disallowed origins so the browser blocks them
 * without an Access-Control-Allow-Origin header. maxAge is intentionally
 * short during the demo window so a rollback or allowlist edit takes
 * effect on the user's next request; bump after the demo to reduce
 * preflight chatter.
 */
export const corsMiddleware = cors({
  origin: (origin) => (ALLOWED_ORIGINS.includes(origin) ? origin : null),
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  maxAge: 60,
});
