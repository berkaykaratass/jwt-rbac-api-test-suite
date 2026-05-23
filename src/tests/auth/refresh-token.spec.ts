/**
 * Auth - JWT Refresh Token Tests
 *
 * Validates the /auth/refreshtoken endpoint including:
 * - Obtaining a new access token with a valid refresh token
 * - Rejection when the refresh token is missing
 * - Rejection when the refresh token is invalid
 */

import { test, expect } from '@playwright/test';
import {
  TEST_USERS,
  ENDPOINTS,
  MESSAGES,
} from '../../helpers/test-data';
import { loginAs } from '../../helpers/auth-manager';

test.describe.serial('Auth - JWT Refresh Token', () => {
  /** Refresh token obtained from a successful login */
  let validRefreshToken: string;

  /**
   * Authenticate once before all tests in this suite so we have
   * a known-good refresh token to work with.
   */
  test.beforeAll(async ({ request }) => {
    const auth = await loginAs(request, 'admin', true);
    validRefreshToken = auth.refreshToken!;
  });

  /**
   * Positive: Submit a valid refresh token and receive a fresh
   * access token in return.
   */
  test('should return new access token with valid refresh token', async ({
    request,
  }) => {
    // Arrange
    const payload = { refreshToken: validRefreshToken };

    // Act
    const response = await request.post(ENDPOINTS.auth.refreshToken, {
      data: payload,
    });

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('accessToken');
    expect(body.accessToken).toBeTruthy();
    expect(body).toHaveProperty('refreshToken');
  });

  /**
   * Negative: Submit an empty body (no refreshToken field).
   * API should return 403 with a descriptive error.
   */
  test('should reject missing refresh token', async ({ request }) => {
    // Arrange – intentionally empty body
    const payload = {};

    // Act
    const response = await request.post(ENDPOINTS.auth.refreshToken, {
      data: payload,
    });

    // Assert
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.auth.refreshTokenRequired);
  });

  /**
   * Negative: Submit a random string that is not a valid refresh token.
   * API should return 403 because the token is not in the database.
   */
  test('should reject invalid refresh token', async ({ request }) => {
    // Arrange
    const payload = { refreshToken: 'totally-random-invalid-token-string' };

    // Act
    const response = await request.post(ENDPOINTS.auth.refreshToken, {
      data: payload,
    });

    // Assert
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.auth.refreshTokenNotFound);
  });
});
