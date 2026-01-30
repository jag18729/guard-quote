/**
 * PostgreSQL Connection using postgres.js
 * Uses DATABASE_URL env var or falls back to local PostgreSQL
 */
import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgres://${process.env.USER || "postgres"}@localhost/guardquote_local`;

export const sql = postgres(DATABASE_URL, {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
});

export async function testConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT 1 as ok`;
    return result[0].ok === 1;
  } catch (error) {
    console.error("PostgreSQL connection failed:", error);
    return false;
  }
}

export async function closeConnection() {
  await sql.end();
}
