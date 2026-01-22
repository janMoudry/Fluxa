import { defineConfig } from '@playwright/test';

const PORT_A = Number(process.env.PORT_A || 4178);

export default defineConfig({
  testDir: 'e2e/tests',
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: `http://localhost:${PORT_A}`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && node e2e/server.mjs',
    port: PORT_A,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});

