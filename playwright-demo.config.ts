import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/demo-video.playwright.ts',
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'off',
    screenshot: 'off',
    video: 'on', // Always record video
    viewport: { width: 1920, height: 1080 }, // Full HD for demo
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          slowMo: 100, // Slow down actions for better visibility
        }
      },
    },
  ],

  timeout: 120000, // 2 minutes per test
});
