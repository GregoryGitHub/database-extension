import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../out/webview-ui',
    rollupOptions: {
      input: {
        connectionForm: resolve(__dirname, 'connection-form.html'),
        tableData: resolve(__dirname, 'table-data.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  server: {
    port: 3000,
  },
  css: {
    modules: false,
  },
})
