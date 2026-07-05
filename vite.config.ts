import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // App lives at the domain root on Cloudflare Pages, so assets resolve from
  // '/' — this stays correct on deep room paths like /serao-de-sexta.
  base: '/',
  plugins: [react()],
})
