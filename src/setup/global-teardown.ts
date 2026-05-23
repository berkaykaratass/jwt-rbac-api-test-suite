/**
 * Playwright Global Teardown
 *
 * Runs after ALL test suites complete. Responsible for:
 * 1. Cleaning up test data created during test runs
 * 2. Disconnecting from database
 * 3. Printing final summary
 */

import { FullConfig } from '@playwright/test';
import { disconnectDB } from '../helpers/db-client';

async function globalTeardown(config: FullConfig): Promise<void> {
  console.log('\n🧹 ========== GLOBAL TEARDOWN ==========\n');

  try {
    // Disconnect any open DB connections
    await disconnectDB();
    console.log('   ✅ Database connections closed');
  } catch (error) {
    console.log('   ⚠️  Error during teardown:', error);
  }

  console.log('\n🏁 ========== TEARDOWN COMPLETE ==========\n');
}

export default globalTeardown;
