import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base is "./" so the built demo works from any GitHub Pages subpath.
export default defineConfig({
  plugins: [react()],
  base: "./",
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});
