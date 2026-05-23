/**
 * Auth - User Registration (Signup) Tests
 *
 * Validates the /auth/signup endpoint including:
 * - Successful registration with default and specific roles
 * - Duplicate username / email rejection
 * - Invalid role rejection
 * - Direct MongoDB verification of persisted user data
 */

import { test, expect } from '@playwright/test';
import {
  TEST_USERS,
  SIGNUP_DATA,
  ENDPOINTS,
  MESSAGES,
} from '../../helpers/test-data';
import { registerUser } from '../../helpers/auth-manager';
import {
  findUserByUsername,
  findUserByEmail,
  connectDB,
  disconnectDB,
} from '../../helpers/db-client';

test.describe.serial('Auth - User Registration (Signup)', () => {
  /**
   * Positive: Register a brand-new user without specifying roles.
   * The API should default to the "user" role.
   */
  test('should register a new user with default role', async ({ request }) => {
    // Arrange
    const userData = SIGNUP_DATA.valid;

    // Act
    const response = await request.post(ENDPOINTS.auth.signup, {
      data: userData,
    });

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.auth.registerSuccess);
  });

  /**
   * Positive: Register a user with an explicit roles array.
   * Verifies that the API accepts and processes custom role assignments.
   */
  test('should register a user with specific roles', async ({ request }) => {
    // Arrange
    const userData = {
      username: 'modrole_user',
      email: 'modrole_user@test.com',
      password: 'ModRole@123',
      roles: ['moderator'],
    };

    // Act
    const response = await request.post(ENDPOINTS.auth.signup, {
      data: userData,
    });

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.auth.registerSuccess);
  });

  /**
   * Negative: Attempt to register with a username that already exists.
   * The pre-seeded "testuser" account should trigger a duplicate error.
   */
  test('should reject duplicate username', async ({ request }) => {
    // Arrange – uses the pre-seeded testuser username
    const userData = SIGNUP_DATA.duplicate;

    // Act
    const response = await request.post(ENDPOINTS.auth.signup, {
      data: userData,
    });

    // Assert
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.auth.duplicateUsername);
  });

  /**
   * Negative: Attempt to register with an email that already exists.
   * The pre-seeded "testuser@test.com" email should trigger a duplicate error.
   */
  test('should reject duplicate email', async ({ request }) => {
    // Arrange – uses the pre-seeded testuser email
    const userData = SIGNUP_DATA.duplicateEmail;

    // Act
    const response = await request.post(ENDPOINTS.auth.signup, {
      data: userData,
    });

    // Assert
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.auth.duplicateEmail);
  });

  /**
   * Negative: Attempt to register with a role that does not exist
   * in the roles collection (e.g. "superadmin").
   */
  test('should reject invalid/non-existent role', async ({ request }) => {
    // Arrange
    const userData = SIGNUP_DATA.invalidRole;

    // Act
    const response = await request.post(ENDPOINTS.auth.signup, {
      data: userData,
    });

    // Assert
    expect(response.status()).toBe(400);
  });

  /**
   * Database Verification: Register a user via the API, then query
   * MongoDB directly to confirm the document was persisted with the
   * correct username and email.
   */
  test('should verify user exists in database after registration', async ({
    request,
  }) => {
    // Arrange
    const userData = {
      username: 'dbcheck_user',
      email: 'dbcheck_user@test.com',
      password: 'DbCheck@123',
    };

    // Act – register via API
    const response = await request.post(ENDPOINTS.auth.signup, {
      data: userData,
    });
    expect(response.status()).toBe(200);

    // Assert – verify directly in MongoDB
    await connectDB();
    try {
      const userDoc = await findUserByUsername(userData.username);
      expect(userDoc).not.toBeNull();
      expect(userDoc.username).toBe(userData.username);
      expect(userDoc.email).toBe(userData.email);

      // Cross-check via email lookup
      const userByEmail = await findUserByEmail(userData.email);
      expect(userByEmail).not.toBeNull();
      expect(userByEmail.username).toBe(userData.username);
    } finally {
      await disconnectDB();
    }
  });
});
