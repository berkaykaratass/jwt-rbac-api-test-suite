/**
 * Tutorials - Update Operations
 *
 * Tests the PUT /tutorials/:id endpoint for modifying existing tutorials.
 * Covers field updates, published status changes, database verification,
 * non-existent resource handling, and authentication enforcement.
 */

import { test, expect } from '@playwright/test';
import { TUTORIALS, ENDPOINTS, MESSAGES, INVALID_DATA } from '../../helpers/test-data';
import { loginAs, getAuthHeaders } from '../../helpers/auth-manager';
import { findTutorialById, connectDB, disconnectDB } from '../../helpers/db-client';

test.describe('Tutorials - Update Operations', () => {
  /**
   * Authenticate as a regular user before running the suite.
   */
  test.beforeAll(async ({ request }) => {
    await loginAs(request, 'user');
  });

  // ───────────────────────────────────────────────
  // Positive Tests
  // ───────────────────────────────────────────────

  test('should update tutorial title and description', async ({ request }) => {
    // Arrange — create a tutorial first
    const createResponse = await request.post(ENDPOINTS.tutorials.base, {
      data: TUTORIALS.forUpdate,
      headers: getAuthHeaders('user'),
    });
    expect(createResponse.status()).toBe(200);
    const created = await createResponse.json();

    // Act — update title and description
    const updatePayload = {
      title: TUTORIALS.updatedFields.title,
      description: TUTORIALS.updatedFields.description,
    };
    const response = await request.put(ENDPOINTS.tutorials.byId(created.id), {
      data: updatePayload,
      headers: getAuthHeaders('user'),
    });

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.tutorials.updateSuccess);
  });

  test('should update tutorial published status', async ({ request }) => {
    // Arrange — create an unpublished tutorial
    const createResponse = await request.post(ENDPOINTS.tutorials.base, {
      data: {
        title: 'Publish Status Test',
        description: 'This will be published via update',
        published: false,
      },
      headers: getAuthHeaders('user'),
    });
    expect(createResponse.status()).toBe(200);
    const created = await createResponse.json();

    // Act — toggle published to true
    const response = await request.put(ENDPOINTS.tutorials.byId(created.id), {
      data: { published: true },
      headers: getAuthHeaders('user'),
    });

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.tutorials.updateSuccess);
  });

  // ───────────────────────────────────────────────
  // Database Verification
  // ───────────────────────────────────────────────

  test('should verify updated data in database', async ({ request }) => {
    // Arrange — connect to MongoDB and create a tutorial
    await connectDB();

    const createResponse = await request.post(ENDPOINTS.tutorials.base, {
      data: {
        title: 'Before DB Update',
        description: 'Original value',
        published: false,
      },
      headers: getAuthHeaders('user'),
    });
    expect(createResponse.status()).toBe(200);
    const created = await createResponse.json();

    // Act — update via API
    const updatedTitle = 'After DB Update';
    const updatedDescription = 'Modified value';
    await request.put(ENDPOINTS.tutorials.byId(created.id), {
      data: {
        title: updatedTitle,
        description: updatedDescription,
        published: true,
      },
      headers: getAuthHeaders('user'),
    });

    // Assert — verify directly in MongoDB
    const dbRecord = await findTutorialById(created.id);
    expect(dbRecord).not.toBeNull();
    expect(dbRecord.title).toBe(updatedTitle);
    expect(dbRecord.description).toBe(updatedDescription);
    expect(dbRecord.published).toBe(true);

    // Cleanup
    await disconnectDB();
  });

  // ───────────────────────────────────────────────
  // Negative Tests
  // ───────────────────────────────────────────────

  test('should return 404 for non-existent tutorial ID', async ({ request }) => {
    // Act — attempt to update a tutorial that does not exist
    const response = await request.put(
      ENDPOINTS.tutorials.byId(INVALID_DATA.nonExistentId),
      {
        data: { title: 'Ghost Tutorial' },
        headers: getAuthHeaders('user'),
      }
    );

    // Assert
    expect(response.status()).toBe(404);
  });

  test('should reject update without authentication', async ({ request }) => {
    // Arrange — get a valid tutorial ID
    const listResponse = await request.get(ENDPOINTS.tutorials.base);
    const tutorials = await listResponse.json();
    const targetId = tutorials[0].id;

    // Act — PUT without x-access-token header
    const response = await request.put(ENDPOINTS.tutorials.byId(targetId), {
      data: { title: 'Unauthorized Update' },
    });

    // Assert
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.auth.noToken);
  });
});
