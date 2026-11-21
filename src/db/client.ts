import pg from "pg";
import { loadConfig } from "../config.ts";

export const DB_TIMEZONE = "America/Sao_Paulo";

let pool: pg.Pool | undefined;

/** Shared connection pool. Every session starts with the clinic time zone. */
export function getPool(): pg.Pool {
  if (!pool) {
    const { DATABASE_URL } = loadConfig();
    pool = new pg.Pool({
      connectionString: DATABASE_URL,
      options: `-c timezone=${DB_TIMEZONE}`,
    });
  }
  return pool;
}

/** Closes the shared pool. A later getPool() call creates a new one. */
export async function closePool(): Promise<void> {
  const current = pool;
  pool = undefined;
  await current?.end();
}
