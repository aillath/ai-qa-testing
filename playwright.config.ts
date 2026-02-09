import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: {
    // visual diff tolerance (adjust later)
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 }
  },
  retries: 1,
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list']
  ],
  use: {
    baseURL: process.env.BASE_URL || undefined,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'Desktop Chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'Mobile iPhone 13',
      use: { ...devices['iPhone 13'] }
    },
    {
      name: 'Mobile Pixel 5',
      use: { ...devices['Pixel 5'] }
    }
    // later you can add Firefox/WebKit
  ]
});
