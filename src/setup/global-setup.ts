/**
 * Playwright Global Setup
 *
 * Runs before ALL test suites. Responsible for:
 * 1. Seeding the database to a known state
 * 2. Registering test users via the API
 * 3. Verifying the API is healthy
 */

import { FullConfig, request } from '@playwright/test';
import { seed } from './seed';
import { TEST_USERS, ENDPOINTS } from '../helpers/test-data';

async function globalSetup(config: FullConfig): Promise<void> {
  console.log('\n🚀 ========== GLOBAL SETUP ==========\n');

  const baseURL = config.projects[0]?.use?.baseURL || process.env.BASE_URL || 'http://localhost:8080/api';

  // Step 1: Wait for API to be healthy
  console.log('⏳ Waiting for API to be healthy...');
  const maxRetries = 30;
  let apiReady = false;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const context = await request.newContext({ baseURL });
      const response = await context.get('/api/test/all');
      if (response.ok()) {
        apiReady = true;
        await context.dispose();
        break;
      }
      await context.dispose();
    } catch (e) {
      // API not ready yet
    }
    console.log(`   Retry ${i + 1}/${maxRetries}...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  if (!apiReady) {
    throw new Error('❌ API did not become healthy within timeout. Is Docker running?');
  }
  console.log('✅ API is healthy\n');

  // Step 2: Seed the database
  console.log('🌱 Seeding database...');
  await seed();
  console.log('');

  // Step 3: Register test users via API
  console.log('👥 Registering test users via API...');
  const apiContext = await request.newContext({
    baseURL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });

  const users = [
    { ...TEST_USERS.admin, roles: ['admin'] },
    { ...TEST_USERS.moderator, roles: ['moderator'] },
    { ...TEST_USERS.user, roles: ['user'] },
  ];

  for (const user of users) {
    try {
      const response = await apiContext.post(ENDPOINTS.auth.signup, {
        data: {
          username: user.username,
          email: user.email,
          password: user.password,
          roles: user.roles,
        },
      });

      const status = response.status();
      const body = await response.text();

      if (status === 200) {
        console.log(`   ✅ Registered: ${user.username} (${user.roles.join(', ')})`);
      } else if (status === 400 && body.includes('already in use')) {
        console.log(`   ⏭️  Already exists: ${user.username}`);
      } else {
        console.log(`   ⚠️  Unexpected response for ${user.username}: ${status} — ${body}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed to register ${user.username}:`, error);
    }
  }

  // Step 4: Verify login works
  console.log('\n🔐 Verifying authentication...');
  for (const [role, user] of Object.entries(TEST_USERS)) {
    const response = await apiContext.post(ENDPOINTS.auth.signin, {
      data: {
        username: user.username,
        password: user.password,
      },
    });

    if (response.ok()) {
      const body = await response.json();
      console.log(`   ✅ Login verified: ${user.username} → ${body.roles?.join(', ')}`);
    } else {
      console.log(`   ❌ Login failed: ${user.username} → ${response.status()}`);
    }
  }

  await apiContext.dispose();
  console.log('\n🚀 ========== SETUP COMPLETE ==========\n');
}

export default globalSetup;
