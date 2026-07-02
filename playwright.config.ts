import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    // Own port so the suite never collides with a running dev server on 5173.
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npx peerjs --port 9000 --key peerjs --path /',
      port: 9000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev -- --port 5174 --strictPort',
      port: 5174,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_PEER_HOST: 'localhost',
        VITE_PEER_PORT: '9000',
        VITE_PEER_PATH: '/',
        VITE_PEER_KEY: 'peerjs',
        VITE_UNSPLASH_ACCESS_KEY: 'test',
      },
    },
  ],
})
