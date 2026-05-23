/**
 * E2E - Complete User Journey
 *
 * Simulates a realistic user lifecycle through the entire API:
 *   1. Register → 2. Login → 3. Access protected content →
 *   4. Verify RBAC boundaries → 5–9. Full CRUD lifecycle → 10. Verify cleanup
 *
 * This is a serial (ordered) test suite — each step depends on state
 * produced by the previous step. Shared variables carry data between steps.
 */

import { test, expect } from '@playwright/test';
import { ENDPOINTS, MESSAGES } from '../../helpers/test-data';

test.describe.serial('E2E - Complete User Journey', () => {
  /** Shared state across serial steps */
  let accessToken: string;
  let userId: string;
  let tutorialId: string;

  /** Unique user credentials for this journey */
  const journeyUser = {
    username: `journey_user_${Date.now()}`,
    email: `journey_${Date.now()}@test.com`,
    password: 'Journey@12345',
  };

  // ──────────────────────────────────────────────────
  // Step 1: Registration
  // ──────────────────────────────────────────────────

  test('Step 1: Register a new user', async ({ request }) => {
    // Act
    const response = await request.post(ENDPOINTS.auth.signup, {
      data: journeyUser,
    });

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.auth.registerSuccess);
  });

  // ──────────────────────────────────────────────────
  // Step 2: Authentication
  // ──────────────────────────────────────────────────

  test('Step 2: Login with new credentials', async ({ request }) => {
    // Act
    const response = await request.post(ENDPOINTS.auth.signin, {
      data: {
        username: journeyUser.username,
        password: journeyUser.password,
      },
    });

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('id');
    expect(body.username).toBe(journeyUser.username);

    // Store for subsequent steps
    accessToken = body.accessToken;
    userId = body.id;
  });

  // ──────────────────────────────────────────────────
  // Step 3: Access User-Protected Content
  // ──────────────────────────────────────────────────

  test('Step 3: Access user-protected content', async ({ request }) => {
    // Act
    const response = await request.get(ENDPOINTS.test.user, {
      headers: { 'x-access-token': accessToken },
    });

    // Assert
    expect(response.status()).toBe(200);

    const text = await response.text();
    expect(text).toContain(MESSAGES.test.userContent);
  });

  // ──────────────────────────────────────────────────
  // Step 4: RBAC Boundary — Admin Access Denied
  // ──────────────────────────────────────────────────

  test('Step 4: Attempt to access admin content (forbidden)', async ({ request }) => {
    // Act — regular user tries to access admin-only endpoint
    const response = await request.get(ENDPOINTS.test.admin, {
      headers: { 'x-access-token': accessToken },
    });

    // Assert
    expect(response.status()).toBe(403);
  });

  // ──────────────────────────────────────────────────
  // Step 5: Create a Tutorial
  // ──────────────────────────────────────────────────

  test('Step 5: Create a tutorial', async ({ request }) => {
    // Arrange
    const payload = {
      title: 'Journey Tutorial',
      description: 'Created during the E2E user journey',
    };

    // Act
    const response = await request.post(ENDPOINTS.tutorials.base, {
      data: payload,
      headers: { 'x-access-token': accessToken },
    });

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.title).toBe(payload.title);

    // Store for subsequent steps
    tutorialId = body.id;
  });

  // ──────────────────────────────────────────────────
  // Step 6: Retrieve the Created Tutorial
  // ──────────────────────────────────────────────────

  test('Step 6: Retrieve the created tutorial', async ({ request }) => {
    // Act
    const response = await request.get(ENDPOINTS.tutorials.byId(tutorialId));

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(tutorialId);
    expect(body.title).toBe('Journey Tutorial');
    expect(body.description).toBe('Created during the E2E user journey');
  });

  // ──────────────────────────────────────────────────
  // Step 7: Update the Tutorial
  // ──────────────────────────────────────────────────

  test('Step 7: Update the tutorial', async ({ request }) => {
    // Act
    const response = await request.put(ENDPOINTS.tutorials.byId(tutorialId), {
      data: {
        title: 'Updated Journey Tutorial',
        description: 'Modified during E2E journey',
        published: true,
      },
      headers: { 'x-access-token': accessToken },
    });

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.tutorials.updateSuccess);
  });

  // ──────────────────────────────────────────────────
  // Step 8: Verify the Update
  // ──────────────────────────────────────────────────

  test('Step 8: Verify update via retrieval', async ({ request }) => {
    // Act
    const response = await request.get(ENDPOINTS.tutorials.byId(tutorialId));

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.title).toBe('Updated Journey Tutorial');
    expect(body.description).toBe('Modified during E2E journey');
    expect(body.published).toBe(true);
  });

  // ──────────────────────────────────────────────────
  // Step 9: Delete the Tutorial
  // ──────────────────────────────────────────────────

  test('Step 9: Delete the tutorial', async ({ request }) => {
    // Act
    const response = await request.delete(
      ENDPOINTS.tutorials.byId(tutorialId),
      { headers: { 'x-access-token': accessToken } }
    );

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.tutorials.deleteSuccess);
  });

  // ──────────────────────────────────────────────────
  // Step 10: Verify Deletion
  // ──────────────────────────────────────────────────

  test('Step 10: Verify tutorial is deleted', async ({ request }) => {
    // Act — attempt to retrieve the deleted tutorial
    const response = await request.get(ENDPOINTS.tutorials.byId(tutorialId));

    // Assert — should be 404 or return empty/null
    const status = response.status();
    expect([404, 200].includes(status)).toBe(true);

    if (status === 200) {
      // Some APIs return 200 with null body for missing resources
      const body = await response.text();
      expect(['', 'null'].includes(body.trim())).toBe(true);
    }
  });
});
