import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { db, users, clients, quotes } from "./db";
import { eq } from "drizzle-orm";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors());

// Health check
app.get("/", (c) => c.json({ status: "ok", service: "GuardQuote API", version: "1.0.0" }));

app.get("/health", (c) => c.json({ status: "healthy", database: "connected" }));
app.get("/api/health", (c) => c.json({ status: "healthy", database: "connected", service: "GuardQuote API" }));

// Users routes
app.get("/api/users", async (c) => {
  const allUsers = await db.select().from(users);
  return c.json(allUsers);
});

app.post("/api/users", async (c) => {
  const body = await c.req.json();
  const result = await db.insert(users).values({
    email: body.email,
    passwordHash: body.password, // TODO: hash properly
    firstName: body.firstName,
    lastName: body.lastName,
    role: body.role || "user",
  });
  return c.json({ success: true, id: result[0].insertId });
});

// Clients routes
app.get("/api/clients", async (c) => {
  const allClients = await db.select().from(clients);
  return c.json(allClients);
});

app.post("/api/clients", async (c) => {
  const body = await c.req.json();
  const result = await db.insert(clients).values(body);
  return c.json({ success: true, id: result[0].insertId });
});

app.get("/api/clients/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const client = await db.select().from(clients).where(eq(clients.id, id));
  return client.length ? c.json(client[0]) : c.json({ error: "Not found" }, 404);
});

// Quotes routes
app.get("/api/quotes", async (c) => {
  const allQuotes = await db.select().from(quotes);
  return c.json(allQuotes);
});

app.post("/api/quotes", async (c) => {
  const body = await c.req.json();
  const result = await db.insert(quotes).values({
    ...body,
    eventDate: new Date(body.eventDate),
  });
  return c.json({ success: true, id: result[0].insertId });
});

app.get("/api/quotes/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const quote = await db.select().from(quotes).where(eq(quotes.id, id));
  return quote.length ? c.json(quote[0]) : c.json({ error: "Not found" }, 404);
});

app.patch("/api/quotes/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();
  await db.update(quotes).set({ ...body, updatedAt: new Date() }).where(eq(quotes.id, id));
  return c.json({ success: true });
});

const port = process.env.PORT || 3000;
console.log(`GuardQuote API running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
