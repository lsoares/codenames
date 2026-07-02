import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative paths so assets resolve under the GitHub Pages project subpath.
  base: './',
  plugins: [react()],
})
