import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // antd is most of the bundle; that's expected for a demo.
  build: { chunkSizeWarningLimit: 1000 }
})
