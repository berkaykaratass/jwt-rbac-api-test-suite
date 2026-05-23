/**
 * Custom Playwright Fixture for MongoDB Direct Access
 *
 * Implements the Dependency Injection (IoC) pattern by injecting an
 * active, connected MongoDB Db client instance directly into test fixtures.
 *
 * This removes boilerplate connectDB / disconnectDB calls from individual
 * test cases, guaranteeing connection cleanup on test completion.
 */

import { test as baseTest } from '@playwright/test';
import { Db } from 'mongodb';
import { connectDB, disconnectDB } from './db-client';

// Define the fixture type contract
type DatabaseFixture = {
  db: Db;
};

// Extend base Playwright test fixture
export const test = baseTest.extend<DatabaseFixture>({
  db: async ({}, use: (value: Db) => Promise<void>) => {
    // 1. Establish database connection before the test executes
    const database = await connectDB();

    // 2. Pass the database client object to the test case
    await use(database);

    // 3. Automatically disconnect after test completes (teardown phase)
    await disconnectDB();
  },
});

// Re-export Playwright's expect assertion utility
export { expect } from '@playwright/test';
