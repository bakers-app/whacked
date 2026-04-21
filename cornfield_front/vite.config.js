import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'unrestrictedly-unimbued-lucio.ngrok-free.dev',
      'cornfield.work',
      'www.cornfield.work',
    ],
    host: '0.0.0.0',
    port: 8081,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
})
