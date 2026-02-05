import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["brave-crabs-listen.loca.lt", "bright-results-tell.loca.lt", "all"],
    proxy: {
      '/api': {
        target: 'https://spacescope-1v1p.onrender.com',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
