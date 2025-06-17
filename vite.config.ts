import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // React DevToolsの警告を抑制
      jsxRuntime: 'automatic'
    })
  ],
  base: '/ePartsDB/',
  optimizeDeps: {
    exclude: ['sql.js']
  },
  server: {
    fs: {
      allow: ['..']
    }
  },
  define: {
    global: 'globalThis',
    // React DevToolsの開発者向けメッセージを抑制
    __REACT_DEVTOOLS_GLOBAL_HOOK__: 'undefined'
  },
  worker: {
    format: 'es'
  }
})
