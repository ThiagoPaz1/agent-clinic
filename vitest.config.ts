import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  test: {
    // Load every variable from .env (empty prefix), not only VITE_*.
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
