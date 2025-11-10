import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // 允许外部访问
    allowedHosts: [
      'sooty-melda-unplumbed.ngrok-free.dev',
      'localhost',
      '.ngrok.io',
      '.ngrok-free.dev'
    ],
    open: true
  }
})

