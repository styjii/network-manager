/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Le navigateur ne parle qu'à l'origine du frontend : /api est relayé vers Django.
// Même origine = cookie de session et jeton CSRF sans CORS ni réglage supplémentaire.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_PROXY || 'http://127.0.0.1:8100'
  return {
    plugins: [react()],
    server: {
      port: Number(env.VITE_DEV_PORT) || 5173,
      proxy: { '/api': { target, changeOrigin: false, xfwd: true } },
    },
    preview: {
      port: Number(env.VITE_PREVIEW_PORT) || 8090,
      proxy: { '/api': { target, changeOrigin: false, xfwd: true } },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
