import { z } from "zod";

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const configSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, error: "must be a postgres:// URL" }),
  ANTHROPIC_API_KEY: optional(z.string()),
  PATIENT_ID: optional(z.coerce.number().int().positive({ error: "must be a positive integer" })),
  FIXED_NOW: optional(
    z.iso
      .datetime({ offset: true, error: "must be an ISO date with offset (e.g. 2026-03-02T09:00:00-03:00)" })
      .transform((value) => new Date(value)),
  ),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid configuration (check your .env):\n${problems}`);
  }
  return result.data;
}
