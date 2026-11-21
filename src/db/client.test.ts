import { afterAll, describe, expect, it } from "vitest";
import { closePool, DB_TIMEZONE, getPool } from "./client.ts";

// Smoke test against the real database: requires `docker compose up -d`.
describe("db client (smoke)", () => {
  afterAll(async () => {
    await closePool();
  });

  it("connects and runs SELECT 1", async () => {
    const { rows } = await getPool().query<{ one: number }>("SELECT 1 AS one");
    expect(rows[0]?.one).toBe(1);
  });

  it("has the vector extension available", async () => {
    const pool = getPool();
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
    const { rows } = await pool.query<{ extname: string }>(
      "SELECT extname FROM pg_extension WHERE extname = 'vector'",
    );
    expect(rows).toHaveLength(1);
  });

  it("sets the session time zone to America/Sao_Paulo", async () => {
    const { rows } = await getPool().query<{ TimeZone: string }>("SHOW timezone");
    expect(rows[0]?.TimeZone).toBe(DB_TIMEZONE);
  });
});
