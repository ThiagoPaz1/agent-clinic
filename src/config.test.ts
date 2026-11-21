import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.ts";

const DATABASE_URL = "postgres://clinica:clinica@localhost:5432/clinica";

describe("loadConfig", () => {
  it("accepts a complete environment and coerces types", () => {
    const config = loadConfig({
      DATABASE_URL,
      ANTHROPIC_API_KEY: "sk-test",
      PATIENT_ID: "2",
      FIXED_NOW: "2026-03-02T09:00:00-03:00",
    });

    expect(config.PATIENT_ID).toBe(2);
    expect(config.FIXED_NOW?.toISOString()).toBe("2026-03-02T12:00:00.000Z");
    expect(config.ANTHROPIC_API_KEY).toBe("sk-test");
  });

  it("treats missing or empty optional variables as undefined", () => {
    const config = loadConfig({ DATABASE_URL, PATIENT_ID: "", FIXED_NOW: "" });

    expect(config.PATIENT_ID).toBeUndefined();
    expect(config.FIXED_NOW).toBeUndefined();
    expect(config.ANTHROPIC_API_KEY).toBeUndefined();
  });

  it("fails with a clear message when DATABASE_URL is missing", () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });

  it("rejects a non-postgres DATABASE_URL", () => {
    expect(() => loadConfig({ DATABASE_URL: "mysql://localhost/x" })).toThrow(/DATABASE_URL/);
  });

  it.each(["0", "-1", "1.5", "abc"])("rejects invalid PATIENT_ID: %s", (value) => {
    expect(() => loadConfig({ DATABASE_URL, PATIENT_ID: value })).toThrow(/PATIENT_ID/);
  });

  it.each(["2026-03-02T09:00:00", "2026-03-02", "tomorrow"])(
    "rejects FIXED_NOW without offset or malformed: %s",
    (value) => {
      expect(() => loadConfig({ DATABASE_URL, FIXED_NOW: value })).toThrow(/FIXED_NOW/);
    },
  );

  it("reports all problems at once", () => {
    expect(() => loadConfig({ PATIENT_ID: "x" })).toThrow(/DATABASE_URL[\s\S]*PATIENT_ID/);
  });
});
