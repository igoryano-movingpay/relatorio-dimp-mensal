import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/regulatorios': {
        target: 'https://api.regulatorios.io',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/regulatorios/, '')
      },
      '/api': {
        target: 'http://server-2.movingpay.corp:55555',
        changeOrigin: true,
      }
    }
  }
})