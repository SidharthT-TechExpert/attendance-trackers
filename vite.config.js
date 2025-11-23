// vite.config.js
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: 'views',          // 👈 dev server starts from /views folder
  base: './',             // 👈 for Vercel static hosting
  build: {
    outDir: '../dist',    // 👈 because root is now /views, go up one level
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'views/index.html'),
        batch: resolve(__dirname, 'views/batch-manager.html'),
        settings: resolve(__dirname, 'views/settings.html'),
        admins: resolve(__dirname, 'views/admin-manager.html'),
        reports: resolve(__dirname, 'views/report-manager.html') // stays at root
      },
    },
  },
});


