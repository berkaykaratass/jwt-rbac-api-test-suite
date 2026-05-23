/**
 * Authentication Manager
 *
 * Manages JWT tokens for different user roles across the test suite.
 * Caches tokens to avoid redundant login calls during test execution.
 */

import { APIRequestContext } from '@playwright/test';
import { TEST_USERS, ENDPOINTS } from './test-data';

export type UserRole = 'admin' | 'moderator' | 'user';

interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  userId: string;
  username: string;
  email: string;
  roles: string[];
}

/** Cached tokens per role */
const tokenCache: Map<UserRole, AuthToken> = new Map();

/**
 * Login as a specific role and cache the resulting token.
 * Returns cached token if already logged in.
 */
export async function loginAs(
  request: APIRequestContext,
  role: UserRole,
  forceRefresh = false
): Promise<AuthToken> {
  // Return cached token unless force refresh
  if (!forceRefresh && tokenCache.has(role)) {
    return tokenCache.get(role)!;
  }

  const user = TEST_USERS[role];
  const response = await request.post(ENDPOINTS.auth.signin, {
    data: {
      username: user.username,
      password: user.password,
    },
  });

  if (response.status() !== 200) {
    throw new Error(
      `Failed to login as ${role}: ${response.status()} ${await response.text()}`
    );
  }

  const body = await response.json();
  const authToken: AuthToken = {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    userId: body.id,
    username: body.username,
    email: body.email,
    roles: body.roles,
  };

  tokenCache.set(role, authToken);
  return authToken;
}

/**
 * Get the cached access token for a role.
 * Throws if not yet authenticated.
 */
export function getToken(role: UserRole): string {
  const cached = tokenCache.get(role);
  if (!cached) {
    throw new Error(`No token cached for role: ${role}. Call loginAs() first.`);
  }
  return cached.accessToken;
}

/**
 * Get auth headers with the token for a specific role.
 */
export function getAuthHeaders(role: UserRole): Record<string, string> {
  return {
    'x-access-token': getToken(role),
  };
}

/**
 * Create auth headers from a raw token string.
 */
export function tokenHeader(token: string): Record<string, string> {
  return {
    'x-access-token': token,
  };
}

/**
 * Clear all cached tokens.
 */
export function clearTokenCache(): void {
  tokenCache.clear();
}

/**
 * Register a new user via the API.
 */
export async function registerUser(
  request: APIRequestContext,
  userData: {
    username: string;
    email: string;
    password: string;
    roles?: string[];
  }
): Promise<{ status: number; body: any }> {
  const response = await request.post(ENDPOINTS.auth.signup, {
    data: userData,
  });

  return {
    status: response.status(),
    body: await response.json().catch(() => response.text()),
  };
}

/**
 * Login all predefined test users and cache their tokens.
 * Useful in global setup or beforeAll hooks.
 */
export async function loginAllRoles(request: APIRequestContext): Promise<void> {
  const roles: UserRole[] = ['admin', 'moderator', 'user'];
  for (const role of roles) {
    await loginAs(request, role);
  }
  console.log('[Auth Manager] All roles authenticated successfully');
}
