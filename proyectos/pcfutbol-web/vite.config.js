import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function manualChunks(id) {
  if (id.includes('node_modules/three')) return 'three'
  if (id.includes('@react-three') || id.includes('zustand') || id.includes('react-use-measure') || id.includes('maath') || id.includes('meshoptimizer')) {
    return 'react-three'
  }
  if (id.includes('firebase')) return 'firebase'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? '/pcfutbol-web/' : '/',
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
})
