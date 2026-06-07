import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// App build config — produces the standalone demo site
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-app',
  },
})
