import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        batch: resolve(__dirname, "batch-manager.html"),
        settings: resolve(__dirname, "settings.html"),
      },
    },
  },
});
