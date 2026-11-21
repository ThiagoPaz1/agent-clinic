import type pg from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closePool, getPool } from "./client.ts";
import { applySchema } from "./schema.ts";

// Integration test against the real database: requires `docker compose up -d`.
// Every constraint test runs inside a transaction that is rolled back, so no rows are left behind.

const STARTS_AT = "2026-03-03T09:00:00-03:00";

function vectorLiteral(dimensions: number): string {
  return `[${Array.from({ length: dimensions }, () => 0.1).join(",")}]`;
}

describe("db schema", () => {
  afterAll(async () => {
    await closePool();
  });

  it("can be applied twice in a row", async () => {
    await applySchema(getPool());
    await expect(applySchema(getPool())).resolves.toBeUndefined();
  });

  it("creates the tables and the HNSW index", async () => {
    const pool = getPool();
    const tables = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`,
    );
    expect(tables.rows.map((r) => r.table_name)).toEqual(
      expect.arrayContaining(["appointments", "chunks", "patients", "professionals"]),
    );

    const index = await pool.query<{ indexdef: string }>(
      "SELECT indexdef FROM pg_indexes WHERE indexname = 'chunks_embedding_hnsw_idx'",
    );
    expect(index.rows[0]?.indexdef).toMatch(/USING hnsw \(embedding vector_cosine_ops\)/);
  });

  it("has a required created_at timestamptz with a default on every table", async () => {
    const { rows } = await getPool().query<{
      table_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>(
      `SELECT table_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND column_name = 'created_at'
       ORDER BY table_name`,
    );
    expect(rows).toEqual(
      ["appointments", "chunks", "patients", "professionals"].map((table_name) => ({
        table_name,
        data_type: "timestamp with time zone",
        is_nullable: "NO",
        column_default: "now()",
      })),
    );
  });

  describe("constraints", () => {
    let client: pg.PoolClient;
    let patientA: number;
    let patientB: number;
    let professionalA: number;
    let professionalB: number;

    async function insertId(sql: string, params: unknown[]): Promise<number> {
      const { rows } = await client.query<{ id: number }>(sql, params);
      const id = rows[0]?.id;
      if (id === undefined) throw new Error("insert returned no id");
      return id;
    }

    function insertAppointment(
      patientId: number,
      professionalId: number,
      overrides: { type?: string; status?: string } = {},
    ): Promise<pg.QueryResult> {
      return client.query(
        `INSERT INTO appointments (patient_id, professional_id, type, starts_at, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [patientId, professionalId, overrides.type ?? "cleaning", STARTS_AT, overrides.status ?? "scheduled"],
      );
    }

    function insertChunk(source: string, embedding: string): Promise<pg.QueryResult> {
      return client.query(
        `INSERT INTO chunks (doc_id, title, section, content, source, embedding)
         VALUES ('doc', 'Title', 'Section', 'Content', $1, $2)`,
        [source, embedding],
      );
    }

    beforeAll(async () => {
      await applySchema(getPool());
    });

    beforeEach(async () => {
      client = await getPool().connect();
      await client.query("BEGIN");
      const patientSql = "INSERT INTO patients (name) VALUES ($1) RETURNING id";
      const professionalSql =
        "INSERT INTO professionals (name, specialty) VALUES ($1, $2) RETURNING id";
      patientA = await insertId(patientSql, ["Patient A"]);
      patientB = await insertId(patientSql, ["Patient B"]);
      professionalA = await insertId(professionalSql, ["Professional A", "general"]);
      professionalB = await insertId(professionalSql, ["Professional B", "orthodontics"]);
    });

    afterEach(async () => {
      await client.query("ROLLBACK");
      client.release();
    });

    it("accepts a valid appointment with status scheduled by default", async () => {
      await insertAppointment(patientA, professionalA);
      const { rows } = await client.query<{ status: string }>(
        "SELECT status FROM appointments WHERE patient_id = $1",
        [patientA],
      );
      expect(rows).toEqual([{ status: "scheduled" }]);
    });

    it("rejects two appointments with the same professional and starts_at", async () => {
      await insertAppointment(patientA, professionalA);
      await expect(insertAppointment(patientB, professionalA)).rejects.toMatchObject({
        code: "23505",
        constraint: "appointments_professional_starts_at_key",
      });
    });

    it("rejects two appointments of the same patient at the same starts_at", async () => {
      await insertAppointment(patientA, professionalA);
      await expect(insertAppointment(patientA, professionalB)).rejects.toMatchObject({
        code: "23505",
        constraint: "appointments_patient_starts_at_key",
      });
    });

    it("rejects an unknown appointment type", async () => {
      await expect(
        insertAppointment(patientA, professionalA, { type: "surgery" }),
      ).rejects.toMatchObject({ code: "23514", constraint: "appointments_type_check" });
    });

    it("rejects an unknown appointment status", async () => {
      await expect(
        insertAppointment(patientA, professionalA, { status: "cancelled" }),
      ).rejects.toMatchObject({ code: "23514", constraint: "appointments_status_check" });
    });

    it("rejects an appointment for a patient that does not exist", async () => {
      await expect(insertAppointment(-1, professionalA)).rejects.toMatchObject({
        code: "23503",
      });
    });

    it("accepts a chunk with a 384-dimension embedding", async () => {
      await expect(insertChunk("clinic", vectorLiteral(384))).resolves.toMatchObject({
        rowCount: 1,
      });
    });

    it("rejects a chunk with an unknown source", async () => {
      await expect(insertChunk("web", vectorLiteral(384))).rejects.toMatchObject({
        code: "23514",
        constraint: "chunks_source_check",
      });
    });

    it("rejects an embedding that does not have 384 dimensions", async () => {
      await expect(insertChunk("clinic", vectorLiteral(3))).rejects.toThrow(
        /expected 384 dimensions/,
      );
    });
  });
});
