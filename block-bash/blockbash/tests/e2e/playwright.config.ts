import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ui',
  retries: 0,
  timeout: 30000,
  use: {
    // Server serves pages at root (/index.html, /editor) so baseURL should be root
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'node ./bin/www',
    port: 3000,
    reuseExistingServer: true,
    timeout: 20000,
  }
});
