import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // tsconfig uses jsx:"preserve" for Next, so esbuild would fall back to the
  // classic runtime and every component test would need React in scope.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
