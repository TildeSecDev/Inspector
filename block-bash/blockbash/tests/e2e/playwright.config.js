// Playwright configuration for BlockBash UI tests
// Assumptions:
//  - App runs with `node app.js` on port 3000
//  - Tests will start server externally (we can add a helper later if desired)
//  - No auth required besides setting username cookie
// If port busy, ensure server started before running `npm run test:ui`.

const { defineConfig } = require('@playwright/test');

// NOTE:
//  UI specs currently live under misc/tests_extra/ui to keep legacy separation while
//  we stabilize the new tests/e2e structure. This config points there explicitly.
//  Once migrated, move specs into tests/e2e/ui and switch testDir to './ui'.
//  We use a custom globalSetup (tests/e2e/global-setup.js) that starts/reuses the
//  server via bin/www (new modular entry) instead of the legacy root app.js.

module.exports = defineConfig({
  // Aggregate both legacy misc tests and new e2e specs
  testDir: '.',
  testMatch: [ '**/tests/e2e/**/*.spec.{js,ts}' ], // exclude legacy selenium under misc/
  timeout: 30_000,
  expect: { timeout: 5000 },
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    // Run browsers in headed mode by default so tests visibly open windows.
    // Override with HEADLESS=1 for CI or silent runs.
    headless: process.env.HEADLESS === '1',
    trace: 'on-first-retry',
    acceptDownloads: true,
    // Helpful for observing UI race conditions when running locally.
    // Enable slowMo only if SLOWMO ms provided.
    ...(process.env.SLOWMO ? { launchOptions: { slowMo: parseInt(process.env.SLOWMO, 10) || 0 } } : {})
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } }
  ],
  globalSetup: require.resolve('./global-setup.js'),
  reporter: [ ['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }] ]
});
