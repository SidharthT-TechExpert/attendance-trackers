// vite.config.js
import { resolve } from "path";
import { report } from "process";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./", // important for Vercel static hosting
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        batch: resolve(__dirname, "batch-manager.html"),
        settings: resolve(__dirname, "settings.html"),
        reports: resolve(__dirname, "report-manager.html"),
        admins: resolve(__dirname, "admin-manager.html"),
      },
    },
  },
});
