import path from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";

export default defineConfig({
  base: "/",
  css: {
    postcss: {
      plugins: [tailwind(), autoprefixer()],
    },
  },
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 6102,
    proxy: {
      "/api": {
        target: "http://localhost:6002",
        changeOrigin: true,
      },
    },
  },
  esbuild: {
    drop: ["console", "debugger"],
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name].[hash][extname]",
        chunkFileNames: "assets/[name].[hash].js",
        entryFileNames: "assets/[name].[hash].js",
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("vue") || id.includes("vue-router")) {
              return "vendor";
            }
            if (id.includes("radix-vue") || id.includes("lucide-vue-next")) {
              return "ui";
            }
            return "libs";
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
