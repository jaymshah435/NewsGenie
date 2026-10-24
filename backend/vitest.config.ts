import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
    // One shared test database, so test files run one after another.
    fileParallelism: false,
  },
});
