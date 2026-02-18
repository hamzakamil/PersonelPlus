import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3333',
        changeOrigin: true
      }
    }
  },
  test: {
    // Test ortami
    environment: 'happy-dom',

    // Global API'ler (describe, it, expect, vb.)
    globals: true,

    // Setup dosyasi
    setupFiles: ['./tests/setup.js'],

    // Include patterns
    include: ['tests/**/*.{test,spec}.{js,ts,vue}'],

    // Coverage ayarlari
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts'
      ]
    }
  }
})

