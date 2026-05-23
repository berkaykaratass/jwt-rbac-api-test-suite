import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Playwright Configuration for JWT & RBAC API Test Suite
 *
 * This configuration is optimized for API integration testing:
 * - No browser is launched (API-only tests)
 * - Global setup seeds the database before tests
 * - Global teardown cleans up after tests
 * - HTML reporter generates beautiful test reports
 */
export default defineConfig({
  testDir: './src/tests',
  testMatch: '**/*.spec.ts',

  /* Maximum time one test can run */
  timeout: 30_000,

  /* Assertion timeout */
  expect: {
    timeout: 10_000,
  },

  /* Run tests in files in parallel */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Parallel workers */
  workers: 1,

  /* Reporter configuration */
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  /* Global setup & teardown */
  globalSetup: require.resolve('./src/setup/global-setup.ts'),
  globalTeardown: require.resolve('./src/setup/global-teardown.ts'),

  /* Shared settings for all projects */
  use: {
    /* Base URL for API requests */
    baseURL: process.env.BASE_URL || 'http://localhost:8080/api',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Custom headers */
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  },

  /* Test projects (API-only, no browsers) */
  projects: [
    {
      name: 'auth',
      testDir: './src/tests/auth',
      testMatch: '**/*.spec.ts',
    },
    {
      name: 'rbac',
      testDir: './src/tests/rbac',
      testMatch: '**/*.spec.ts',
      dependencies: ['auth'],
    },
    {
      name: 'tutorials',
      testDir: './src/tests/tutorials',
      testMatch: '**/*.spec.ts',
      dependencies: ['auth'],
    },
    {
      name: 'security',
      testDir: './src/tests/security',
      testMatch: '**/*.spec.ts',
      dependencies: ['auth'],
    },
    {
      name: 'e2e',
      testDir: './src/tests/e2e',
      testMatch: '**/*.spec.ts',
      dependencies: ['auth', 'rbac', 'tutorials', 'security'],
    },
  ],
});
