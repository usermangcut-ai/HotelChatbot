import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // mã build gắn vào URL ảnh tĩnh (?v=) — build lại là URL đổi, trình duyệt tải ảnh mới
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
  server: {
    proxy: {
      "/api": "http://localhost:8000",
      "/images": "http://localhost:8000",
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
