/**
 * Auth - User Login (Signin) Tests
 *
 * Validates the /auth/signin endpoint including:
 * - Successful login returning JWT token and user metadata
 * - Correct role information in the response
 * - JWT format validation (three Base64url segments)
 * - Wrong password, non-existent user, and empty credential rejection
 */

import { test, expect } from '@playwright/test';
import {
  TEST_USERS,
  ENDPOINTS,
  MESSAGES,
} from '../../helpers/test-data';

test.describe.serial('Auth - User Login (Signin)', () => {
  /**
   * Positive: Login with valid admin credentials.
   * Response must include accessToken, id, username, email, and roles.
   */
  test('should login successfully and return JWT token', async ({ request }) => {
    // Arrange
    const credentials = {
      username: TEST_USERS.admin.username,
      password: TEST_USERS.admin.password,
    };

    // Act
    const response = await request.post(ENDPOINTS.auth.signin, {
      data: credentials,
    });

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('username', TEST_USERS.admin.username);
    expect(body).toHaveProperty('email', TEST_USERS.admin.email);
    expect(body).toHaveProperty('roles');
    expect(Array.isArray(body.roles)).toBe(true);
    expect(body.accessToken).toBeTruthy();
  });

  /**
   * Positive: Login as moderator and verify that the roles array
   * contains the expected "ROLE_MODERATOR" value.
   */
  test('should return correct role information', async ({ request }) => {
    // Arrange
    const credentials = {
      username: TEST_USERS.moderator.username,
      password: TEST_USERS.moderator.password,
    };

    // Act
    const response = await request.post(ENDPOINTS.auth.signin, {
      data: credentials,
    });

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.roles).toContain('ROLE_MODERATOR');
  });

  /**
   * Structural: Verify the accessToken is a well-formed JWT
   * (three Base64url-encoded segments separated by dots).
   */
  test('should return a valid JWT format token', async ({ request }) => {
    // Arrange
    const credentials = {
      username: TEST_USERS.admin.username,
      password: TEST_USERS.admin.password,
    };

    // Act
    const response = await request.post(ENDPOINTS.auth.signin, {
      data: credentials,
    });

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    const jwtRegex = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/;
    expect(body.accessToken).toMatch(jwtRegex);
  });

  /**
   * Negative: Correct username but wrong password.
   * API should return 401 with "Invalid Password!".
   */
  test('should reject wrong password', async ({ request }) => {
    // Arrange
    const credentials = {
      username: TEST_USERS.admin.username,
      password: 'WrongPassword@999',
    };

    // Act
    const response = await request.post(ENDPOINTS.auth.signin, {
      data: credentials,
    });

    // Assert
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.auth.invalidPassword);
  });

  /**
   * Negative: Username that does not exist in the system.
   * API should return 404 with "User Not found.".
   */
  test('should reject non-existent user', async ({ request }) => {
    // Arrange
    const credentials = {
      username: 'ghost_user_does_not_exist',
      password: 'AnyPass@123',
    };

    // Act
    const response = await request.post(ENDPOINTS.auth.signin, {
      data: credentials,
    });

    // Assert
    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.auth.userNotFound);
  });

  /**
   * Negative: Completely empty request body.
   * API should fail with a 404 or 500 error status.
   */
  test('should reject empty credentials', async ({ request }) => {
    // Arrange – intentionally empty body
    const credentials = {};

    // Act
    const response = await request.post(ENDPOINTS.auth.signin, {
      data: credentials,
    });

    // Assert – server should not return 200
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect([404, 500]).toContain(response.status());
  });
});
