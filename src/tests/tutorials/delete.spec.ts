/**
 * Tutorials - Delete Operations
 *
 * Tests DELETE endpoints for removing tutorials:
 *   - DELETE /tutorials/:id → delete a single tutorial
 *   - DELETE /tutorials     → delete all tutorials (admin only)
 *
 * Includes database verification and RBAC enforcement checks.
 */

import { test, expect } from '@playwright/test';
import { ENDPOINTS, MESSAGES, INVALID_DATA } from '../../helpers/test-data';
import { loginAs, getAuthHeaders } from '../../helpers/auth-manager';
import { findTutorialById, connectDB, disconnectDB } from '../../helpers/db-client';

test.describe('Tutorials - Delete Operations', () => {
  /**
   * Pre-authenticate all required roles before the suite runs.
   */
  test.beforeAll(async ({ request }) => {
    await loginAs(request, 'user');
    await loginAs(request, 'admin');
  });

  // ───────────────────────────────────────────────
  // Single Delete
  // ───────────────────────────────────────────────

  test('should delete a single tutorial by ID', async ({ request }) => {
    // Arrange — create a tutorial specifically for deletion
    const createResponse = await request.post(ENDPOINTS.tutorials.base, {
      data: {
        title: 'Tutorial To Delete',
        description: 'This tutorial will be deleted',
      },
      headers: getAuthHeaders('user'),
    });
    expect(createResponse.status()).toBe(200);
    const created = await createResponse.json();

    // Act
    const response = await request.delete(
      ENDPOINTS.tutorials.byId(created.id),
      { headers: getAuthHeaders('user') }
    );

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.message).toBe(MESSAGES.tutorials.deleteSuccess);
  });

  // ───────────────────────────────────────────────
  // Database Verification
  // ───────────────────────────────────────────────

  test('should verify tutorial is removed from database', async ({ request }) => {
    // Arrange — create and then delete a tutorial
    await connectDB();

    const createResponse = await request.post(ENDPOINTS.tutorials.base, {
      data: {
        title: 'DB Delete Verification',
        description: 'Should not exist in DB after deletion',
      },
      headers: getAuthHeaders('user'),
    });
    expect(createResponse.status()).toBe(200);
    const created = await createResponse.json();
    const deletedId = created.id;

    // Act — delete via API
    const deleteResponse = await request.delete(
      ENDPOINTS.tutorials.byId(deletedId),
      { headers: getAuthHeaders('user') }
    );
    expect(deleteResponse.status()).toBe(200);

    // Assert — confirm removal in MongoDB
    const dbRecord = await findTutorialById(deletedId);
    expect(dbRecord).toBeNull();

    // Cleanup
    await disconnectDB();
  });

  // ───────────────────────────────────────────────
  // Negative Tests
  // ───────────────────────────────────────────────

  test('should return 404 for deleting non-existent tutorial', async ({ request }) => {
    // Act — attempt to delete an ID that does not exist
    const response = await request.delete(
      ENDPOINTS.tutorials.byId(INVALID_DATA.nonExistentId),
      { headers: getAuthHeaders('user') }
    );

    // Assert
    expect(response.status()).toBe(404);
  });

  // ───────────────────────────────────────────────
  // Delete All — RBAC
  // ───────────────────────────────────────────────

  test('should delete all tutorials (admin only)', async ({ request }) => {
    // Arrange — ensure at least one tutorial exists
    await request.post(ENDPOINTS.tutorials.base, {
      data: {
        title: 'Expendable Tutorial 1',
        description: 'Will be deleted by admin delete-all',
      },
      headers: getAuthHeaders('admin'),
    });

    // Act — admin deletes all tutorials
    const response = await request.delete(ENDPOINTS.tutorials.base, {
      headers: getAuthHeaders('admin'),
    });

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    // Response message contains the count, e.g. "X Tutorials were deleted successfully!"
    expect(body.message).toContain('deleted successfully');
  });

  test('should deny delete-all for non-admin users', async ({ request }) => {
    // Act — regular user attempts to delete all tutorials
    const response = await request.delete(ENDPOINTS.tutorials.base, {
      headers: getAuthHeaders('user'),
    });

    // Assert
    expect(response.status()).toBe(403);
  });
});
