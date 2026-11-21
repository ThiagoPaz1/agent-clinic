import { readFile } from "node:fs/promises";
import type pg from "pg";

const SCHEMA_PATH = new URL("./schema.sql", import.meta.url);

/** Applies src/db/schema.sql. Idempotent: safe to call many times. */
export async function applySchema(db: pg.Pool | pg.PoolClient): Promise<void> {
  const sql = await readFile(SCHEMA_PATH, "utf8");
  await db.query(sql);
}
