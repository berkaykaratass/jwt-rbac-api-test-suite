/**
 * RBAC - Role-Based Access Control Tests
 *
 * Validates the /test/* endpoints that enforce role-based access:
 * - Public endpoint accessible without authentication
 * - User, Moderator, Admin endpoints gated by the corresponding role
 * - Cross-role access denial (user → mod, user → admin, mod → admin)
 * - Missing token, malformed token, and expired token rejection
 */

import { test, expect } from '@playwright/test';
import {
  ENDPOINTS,
  MESSAGES,
  INVALID_DATA,
} from '../../helpers/test-data';
import {
  loginAs,
  getAuthHeaders,
  tokenHeader,
} from '../../helpers/auth-manager';

test.describe.serial('RBAC - Role-Based Access Control', () => {
  /**
   * Authenticate all three roles before the suite runs.
   * Tokens are cached by the auth manager for subsequent tests.
   */
  test.beforeAll(async ({ request }) => {
    await loginAs(request, 'admin', true);
    await loginAs(request, 'moderator', true);
    await loginAs(request, 'user', true);
  });

  // ============================================
  // Positive Access Tests
  // ============================================

  /**
   * Public: The /test/all endpoint should be accessible
   * without any authentication header.
   */
  test('should allow public access to /api/test/all without authentication', async ({
    request,
  }) => {
    // Act
    const response = await request.get(ENDPOINTS.test.all);

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain(MESSAGES.test.publicContent);
  });

  /**
   * User: An authenticated user should access the user-level endpoint.
   */
  test('should allow authenticated user to access /api/test/user', async ({
    request,
  }) => {
    // Act
    const response = await request.get(ENDPOINTS.test.user, {
      headers: getAuthHeaders('user'),
    });

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain(MESSAGES.test.userContent);
  });

  /**
   * Moderator: A moderator should access the mod-level endpoint.
   */
  test('should allow moderator to access /api/test/mod', async ({
    request,
  }) => {
    // Act
    const response = await request.get(ENDPOINTS.test.mod, {
      headers: getAuthHeaders('moderator'),
    });

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain(MESSAGES.test.modContent);
  });

  /**
   * Admin: An admin should access the admin-level endpoint.
   */
  test('should allow admin to access /api/test/admin', async ({ request }) => {
    // Act
    const response = await request.get(ENDPOINTS.test.admin, {
      headers: getAuthHeaders('admin'),
    });

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain(MESSAGES.test.adminContent);
  });

  // ============================================
  // Cross-Role Denial Tests
  // ============================================

  /**
   * Denial: A basic user must NOT access the moderator endpoint.
   */
  test('should deny user access to moderator endpoint', async ({ request }) => {
    // Act
    const response = await request.get(ENDPOINTS.test.mod, {
      headers: getAuthHeaders('user'),
    });

    // Assert
    expect(response.status()).toBe(403);
  });

  /**
   * Denial: A basic user must NOT access the admin endpoint.
   */
  test('should deny user access to admin endpoint', async ({ request }) => {
    // Act
    const response = await request.get(ENDPOINTS.test.admin, {
      headers: getAuthHeaders('user'),
    });

    // Assert
    expect(response.status()).toBe(403);
  });

  /**
   * Denial: A moderator must NOT access the admin endpoint.
   */
  test('should deny moderator access to admin endpoint', async ({
    request,
  }) => {
    // Act
    const response = await request.get(ENDPOINTS.test.admin, {
      headers: getAuthHeaders('moderator'),
    });

    // Assert
    expect(response.status()).toBe(403);
  });

  // ============================================
  // Token Error Tests
  // ============================================

  /**
   * Missing Token: Request a protected endpoint without sending
   * the x-access-token header at all.
   */
  test('should deny access without token', async ({ request }) => {
    // Act – no headers supplied
    const response = await request.get(ENDPOINTS.test.user);

    // Assert
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.auth.noToken);
  });

  /**
   * Invalid Token: Send a clearly malformed token string.
   * The server should reject it as unauthorized.
   */
  test('should deny access with invalid token', async ({ request }) => {
    // Act
    const response = await request.get(ENDPOINTS.test.user, {
      headers: tokenHeader(INVALID_DATA.malformedToken),
    });

    // Assert
    expect(response.status()).toBe(401);

    const body = await response.text();
    expect(body).toBe('Unauthorized');
  });

  /**
   * Expired Token: Send a JWT whose exp claim is in the past.
   * The server should treat it as unauthorized.
   */
  test('should deny access with expired token', async ({ request }) => {
    // Act
    const response = await request.get(ENDPOINTS.test.user, {
      headers: tokenHeader(INVALID_DATA.expiredToken),
    });

    // Assert
    expect(response.status()).toBe(401);

    const body = await response.text();
    expect(body).toBe('Unauthorized');
  });
});
