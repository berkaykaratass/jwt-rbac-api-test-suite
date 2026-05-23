/**
 * Tutorials - Read Operations
 *
 * Tests GET endpoints for retrieving tutorials:
 *   - GET /tutorials         → all tutorials (with optional title filter)
 *   - GET /tutorials/:id     → single tutorial by ID
 *   - GET /tutorials/published → only published tutorials
 *
 * Includes database cross-verification for published counts.
 */

import { test, expect } from '@playwright/test';
import { ENDPOINTS, TUTORIALS } from '../../helpers/test-data';
import { loginAs } from '../../helpers/auth-manager';
import { seed } from '../../setup/seed';
import {
  countPublishedTutorials,
  connectDB,
  disconnectDB,
} from '../../helpers/db-client';

test.describe('Tutorials - Read Operations', () => {
  /**
   * Pre-authenticate so the token cache is warm.
   * Read endpoints are public, but login is needed for other setup actions.
   */
  test.beforeAll(async ({ request }) => {
    await seed(false);
    await loginAs(request, 'user');
  });

  // ───────────────────────────────────────────────
  // List / Get All
  // ───────────────────────────────────────────────

  test('should retrieve all tutorials', async ({ request }) => {
    // Act
    const response = await request.get(ENDPOINTS.tutorials.base);

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    // The seed inserts 5 tutorials; additional ones may exist from prior tests
    expect(body.length).toBeGreaterThanOrEqual(5);
  });

  // ───────────────────────────────────────────────
  // Get by ID
  // ───────────────────────────────────────────────

  test('should retrieve a single tutorial by ID', async ({ request }) => {
    // Arrange — fetch the full list to obtain a valid ID
    const listResponse = await request.get(ENDPOINTS.tutorials.base);
    expect(listResponse.status()).toBe(200);

    const tutorials = await listResponse.json();
    expect(tutorials.length).toBeGreaterThan(0);

    const targetId = tutorials[0].id;
    const expectedTitle = tutorials[0].title;

    // Act
    const response = await request.get(ENDPOINTS.tutorials.byId(targetId));

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.title).toBe(expectedTitle);
    expect(body.id).toBe(targetId);
  });

  test('should return 500 for invalid tutorial ID format', async ({ request }) => {
    // Act — send a non-ObjectId string as the ID
    const response = await request.get(ENDPOINTS.tutorials.byId('invalid-id'));

    // Assert — Mongoose casts fail with a 500 server error
    expect(response.status()).toBe(500);
  });

  // ───────────────────────────────────────────────
  // Title Filter
  // ───────────────────────────────────────────────

  test('should filter tutorials by title keyword', async ({ request }) => {
    // Act — filter by "Node" (matches seeded "Introduction to Node.js")
    const response = await request.get(
      `${ENDPOINTS.tutorials.base}?title=Node`
    );

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.length).toBeGreaterThan(0);

    for (const tutorial of body) {
      expect(tutorial.title.toLowerCase()).toContain('node');
    }
  });

  // ───────────────────────────────────────────────
  // Published Tutorials
  // ───────────────────────────────────────────────

  test('should retrieve only published tutorials', async ({ request }) => {
    // Act
    const response = await request.get(ENDPOINTS.tutorials.published);

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);

    for (const tutorial of body) {
      expect(tutorial.published).toBe(true);
    }
  });

  // ───────────────────────────────────────────────
  // Database Cross-Verification
  // ───────────────────────────────────────────────

  test('should verify published count matches database', async ({ request }) => {
    // Arrange — connect to MongoDB for direct count
    await connectDB();

    const dbPublishedCount = await countPublishedTutorials();

    // Act — fetch published tutorials via API
    const response = await request.get(ENDPOINTS.tutorials.published);
    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert — API count must match direct DB count
    expect(body.length).toBe(dbPublishedCount);

    // Cleanup
    await disconnectDB();
  });
});
