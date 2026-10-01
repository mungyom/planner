import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // 첫 실행 시 mongodb-memory-server 가 mongod 바이너리를 내려받는다
    hookTimeout: 600_000,
  },
});
