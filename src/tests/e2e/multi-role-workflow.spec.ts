/**
 * E2E - Multi-Role Collaboration Workflow
 *
 * Validates cross-role interactions and RBAC enforcement across the API:
 *   - Admin creates and manages content
 *   - Moderator and User can read but have restricted write access
 *   - Admin-only endpoints are properly guarded
 *   - All roles see consistent data after mutations
 *
 * This is a serial (ordered) test — each step depends on prior state.
 */

import { test, expect } from '@playwright/test';
import { ENDPOINTS, MESSAGES } from '../../helpers/test-data';
import { loginAs, getAuthHeaders, UserRole } from '../../helpers/auth-manager';

test.describe.serial('E2E - Multi-Role Collaboration Workflow', () => {
  /** Shared tutorial ID created by admin, used across all steps */
  let sharedTutorialId: string;

  /**
   * Pre-authenticate all three roles before the suite begins.
   * Tokens are cached in the auth-manager for the duration of the suite.
   */
  test.beforeAll(async ({ request }) => {
    await loginAs(request, 'admin');
    await loginAs(request, 'moderator');
    await loginAs(request, 'user');
  });

  // ──────────────────────────────────────────────────
  // Step 1: Admin Creates Content
  // ──────────────────────────────────────────────────

  test('Step 1: Admin creates a tutorial', async ({ request }) => {
    // Arrange
    const payload = {
      title: 'Multi-Role Workflow Tutorial',
      description: 'Created by admin for cross-role testing',
      published: false,
    };

    // Act
    const response = await request.post(ENDPOINTS.tutorials.base, {
      data: payload,
      headers: getAuthHeaders('admin'),
    });

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.title).toBe(payload.title);

    // Store for subsequent steps
    sharedTutorialId = body.id;
  });

  // ──────────────────────────────────────────────────
  // Steps 2–3: Read Access Across Roles
  // ──────────────────────────────────────────────────

  test('Step 2: Moderator can read the tutorial', async ({ request }) => {
    // Act
    const response = await request.get(
      ENDPOINTS.tutorials.byId(sharedTutorialId),
      { headers: getAuthHeaders('moderator') }
    );

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(sharedTutorialId);
    expect(body.title).toBe('Multi-Role Workflow Tutorial');
  });

  test('Step 3: Regular user can read the tutorial', async ({ request }) => {
    // Act
    const response = await request.get(
      ENDPOINTS.tutorials.byId(sharedTutorialId),
      { headers: getAuthHeaders('user') }
    );

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(sharedTutorialId);
    expect(body.title).toBe('Multi-Role Workflow Tutorial');
  });

  // ──────────────────────────────────────────────────
  // Steps 4–5: RBAC Boundary Checks
  // ──────────────────────────────────────────────────

  test('Step 4: Regular user cannot access admin endpoint', async ({ request }) => {
    // Act
    const response = await request.get(ENDPOINTS.test.admin, {
      headers: getAuthHeaders('user'),
    });

    // Assert
    expect(response.status()).toBe(403);
  });

  test('Step 5: Moderator cannot access admin endpoint', async ({ request }) => {
    // Act
    const response = await request.get(ENDPOINTS.test.admin, {
      headers: getAuthHeaders('moderator'),
    });

    // Assert
    expect(response.status()).toBe(403);
  });

  // ──────────────────────────────────────────────────
  // Step 6: Admin Updates Content
  // ──────────────────────────────────────────────────

  test('Step 6: Admin updates the tutorial', async ({ request }) => {
    // Act — admin publishes the tutorial
    const response = await request.put(
      ENDPOINTS.tutorials.byId(sharedTutorialId),
      {
        data: { published: true },
        headers: getAuthHeaders('admin'),
      }
    );

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.tutorials.updateSuccess);
  });

  // ──────────────────────────────────────────────────
  // Step 7: All Roles See Consistent Updated Data
  // ──────────────────────────────────────────────────

  test('Step 7: All roles see the updated version', async ({ request }) => {
    const roles: UserRole[] = ['admin', 'moderator', 'user'];

    for (const role of roles) {
      const response = await request.get(
        ENDPOINTS.tutorials.byId(sharedTutorialId),
        { headers: getAuthHeaders(role) }
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.published).toBe(true);
    }
  });

  // ──────────────────────────────────────────────────
  // Step 8: Non-Admin Cannot Delete All
  // ──────────────────────────────────────────────────

  test('Step 8: Non-admin cannot delete all tutorials', async ({ request }) => {
    // Act — regular user attempts bulk delete
    const response = await request.delete(ENDPOINTS.tutorials.base, {
      headers: getAuthHeaders('user'),
    });

    // Assert
    expect(response.status()).toBe(403);
  });

  // ──────────────────────────────────────────────────
  // Step 9: Admin Deletes the Tutorial
  // ──────────────────────────────────────────────────

  test('Step 9: Admin deletes the tutorial', async ({ request }) => {
    // Act
    const response = await request.delete(
      ENDPOINTS.tutorials.byId(sharedTutorialId),
      { headers: getAuthHeaders('admin') }
    );

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.tutorials.deleteSuccess);
  });

  // ──────────────────────────────────────────────────
  // Step 10: Verify Deletion Across All Roles
  // ──────────────────────────────────────────────────

  test('Step 10: Verify deletion across roles', async ({ request }) => {
    const roles: UserRole[] = ['admin', 'moderator', 'user'];

    for (const role of roles) {
      const response = await request.get(
        ENDPOINTS.tutorials.byId(sharedTutorialId),
        { headers: getAuthHeaders(role) }
      );

      const status = response.status();
      // The API should return 404 or 200 with null/empty body
      expect([404, 200].includes(status)).toBe(true);

      if (status === 200) {
        const body = await response.text();
        expect(['', 'null'].includes(body.trim())).toBe(true);
      }
    }
  });
});
