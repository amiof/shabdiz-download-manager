import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const currentDir = fileURLToPath(new URL(".", import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@components": path.resolve(currentDir, "src/components"),
      "@src": path.resolve(currentDir, "src")
    }
  },
  base: "./",
  build: {
    sourcemap: false,
    outDir: "dist"
  },
  server: {
    port: 3353
  }
})
