import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["skills/framework-migration/engine/**/*.test.ts", "evals/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/fixtures/**"],
  },
});
