import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    // the Go API (server/) runs on :8080 during development
    proxy: { '/api': 'http://localhost:8080' },
  },
})
