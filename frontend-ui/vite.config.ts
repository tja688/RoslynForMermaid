import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // 修正：这里应该是 plugin-react
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // 启用 Tailwind CSS v4 插件
    tailwindcss(),
  ],
  server: {
    // 固定端口为 5173
    port: 5173,
    // 若 5173 被占用，直接报错而不是自动切换到 5174
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5157',
        changeOrigin: true,
      },
    },
  },
})
