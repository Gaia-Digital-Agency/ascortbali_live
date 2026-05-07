import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8002,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Function form so all React packages (incl. react/jsx-runtime,
        // react-dom/client, scheduler) land in react-vendor.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/')
            ) {
              return 'react-vendor'
            }
            if (id.includes('/react-router') || id.includes('/@remix-run/router')) {
              return 'router'
            }
          }
        },
      },
    },
  },
})
