import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 开发时 API 由 wrangler pages dev 提供（本地模拟 D1/R2）
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8788',
    },
  },
})
