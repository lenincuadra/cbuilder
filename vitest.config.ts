import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // core/ es lógica pura (sin React): corre en Node, sin jsdom.
    environment: "node",
    include: ["core/**/*.test.ts", "lib/**/*.test.ts"],
  },
});
