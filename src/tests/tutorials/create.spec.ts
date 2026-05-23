/**
 * Tutorials - Create Operations
 *
 * Tests the POST /tutorials endpoint for creating new tutorial resources.
 * Covers positive flows (valid creation, published flag), negative flows
 * (missing title, unauthenticated), and database-level verification.
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, TUTORIALS, ENDPOINTS, MESSAGES } from '../../helpers/test-data';
import { loginAs, getAuthHeaders, UserRole } from '../../helpers/auth-manager';
import { findTutorialById, connectDB, disconnectDB } from '../../helpers/db-client';

test.describe('Tutorials - Create Operations', () => {
  /**
   * Authenticate as a regular user before each test.
   * Most create operations require a valid JWT token.
   */
  test.beforeEach(async ({ request }) => {
    await loginAs(request, 'user');
  });

  // ───────────────────────────────────────────────
  // Positive Tests
  // ───────────────────────────────────────────────

  test('should create a tutorial with valid data', async ({ request }) => {
    // Arrange
    const payload = {
      title: TUTORIALS.sample1.title,
      description: TUTORIALS.sample1.description,
    };

    // Act
    const response = await request.post(ENDPOINTS.tutorials.base, {
      data: payload,
      headers: getAuthHeaders('user'),
    });

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.title).toBe(payload.title);
    expect(body.description).toBe(payload.description);
    expect(body.published).toBe(false);
  });

  test('should create a published tutorial', async ({ request }) => {
    // Arrange
    const payload = {
      title: TUTORIALS.sample2.title,
      description: TUTORIALS.sample2.description,
      published: true,
    };

    // Act
    const response = await request.post(ENDPOINTS.tutorials.base, {
      data: payload,
      headers: getAuthHeaders('user'),
    });

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.published).toBe(true);
    expect(body.title).toBe(payload.title);
    expect(body.description).toBe(payload.description);
  });

  // ───────────────────────────────────────────────
  // Negative Tests
  // ───────────────────────────────────────────────

  test('should reject creation without title', async ({ request }) => {
    // Arrange — payload deliberately omits the title field
    const payload = TUTORIALS.noTitle;

    // Act
    const response = await request.post(ENDPOINTS.tutorials.base, {
      data: payload,
      headers: getAuthHeaders('user'),
    });

    // Assert
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.tutorials.contentEmpty);
  });

  test('should reject creation without authentication', async ({ request }) => {
    // Arrange — no x-access-token header attached
    const payload = {
      title: 'Unauthenticated Tutorial',
      description: 'This should be rejected',
    };

    // Act
    const response = await request.post(ENDPOINTS.tutorials.base, {
      data: payload,
    });

    // Assert
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.auth.noToken);
  });

  // ───────────────────────────────────────────────
  // Database Verification
  // ───────────────────────────────────────────────

  test('should verify tutorial exists in database after creation', async ({ request }) => {
    // Arrange — connect to MongoDB for direct verification
    await connectDB();

    const payload = {
      title: 'DB Verification Tutorial',
      description: 'Created to verify database persistence',
    };

    // Act — create via API
    const response = await request.post(ENDPOINTS.tutorials.base, {
      data: payload,
      headers: getAuthHeaders('user'),
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const createdId = body.id;

    // Assert — verify directly in MongoDB
    const dbRecord = await findTutorialById(createdId);
    expect(dbRecord).not.toBeNull();
    expect(dbRecord.title).toBe(payload.title);
    expect(dbRecord.description).toBe(payload.description);
    expect(dbRecord.published).toBe(false);

    // Cleanup
    await disconnectDB();
  });
});
