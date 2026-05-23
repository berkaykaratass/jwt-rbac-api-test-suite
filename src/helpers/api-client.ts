/**
 * API Client Helper
 *
 * High-level API client wrapper for tutorial CRUD operations.
 * Encapsulates common request patterns and response handling.
 */

import { APIRequestContext } from '@playwright/test';
import { ENDPOINTS } from './test-data';
import { getAuthHeaders, UserRole } from './auth-manager';

/**
 * Tutorial API client for CRUD operations.
 */
export class TutorialAPI {
  constructor(private request: APIRequestContext) {}

  /** Create a new tutorial (requires auth) */
  async create(
    data: { title?: string; description?: string; published?: boolean },
    role: UserRole
  ) {
    const response = await this.request.post(ENDPOINTS.tutorials.base, {
      data,
      headers: getAuthHeaders(role),
    });
    return {
      status: response.status(),
      body: await response.json().catch(() => null),
    };
  }

  /** Get all tutorials (public) */
  async getAll(titleFilter?: string) {
    const url = titleFilter
      ? `${ENDPOINTS.tutorials.base}?title=${encodeURIComponent(titleFilter)}`
      : ENDPOINTS.tutorials.base;
    const response = await this.request.get(url);
    return {
      status: response.status(),
      body: await response.json().catch(() => null),
    };
  }

  /** Get a single tutorial by ID (public) */
  async getById(id: string) {
    const response = await this.request.get(ENDPOINTS.tutorials.byId(id));
    return {
      status: response.status(),
      body: await response.json().catch(() => null),
    };
  }

  /** Get all published tutorials (public) */
  async getPublished() {
    const response = await this.request.get(ENDPOINTS.tutorials.published);
    return {
      status: response.status(),
      body: await response.json().catch(() => null),
    };
  }

  /** Update a tutorial by ID (requires auth) */
  async update(
    id: string,
    data: { title?: string; description?: string; published?: boolean },
    role: UserRole
  ) {
    const response = await this.request.put(ENDPOINTS.tutorials.byId(id), {
      data,
      headers: getAuthHeaders(role),
    });
    return {
      status: response.status(),
      body: await response.json().catch(() => null),
    };
  }

  /** Delete a single tutorial by ID (requires auth) */
  async delete(id: string, role: UserRole) {
    const response = await this.request.delete(ENDPOINTS.tutorials.byId(id), {
      headers: getAuthHeaders(role),
    });
    return {
      status: response.status(),
      body: await response.json().catch(() => null),
    };
  }

  /** Delete all tutorials (requires admin) */
  async deleteAll(role: UserRole) {
    const response = await this.request.delete(ENDPOINTS.tutorials.base, {
      headers: getAuthHeaders(role),
    });
    return {
      status: response.status(),
      body: await response.json().catch(() => null),
    };
  }
}
