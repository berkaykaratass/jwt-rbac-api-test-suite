/**
 * Test Data Constants
 *
 * Centralized test data for deterministic, repeatable test execution.
 * All credentials and sample data used across the test suite are defined here.
 */

/** Pre-seeded user credentials for each role */
export const TEST_USERS = {
  admin: {
    username: 'testadmin',
    email: 'testadmin@test.com',
    password: 'Admin@123456',
    roles: ['admin'],
  },
  moderator: {
    username: 'testmod',
    email: 'testmod@test.com',
    password: 'Mod@123456',
    roles: ['moderator'],
  },
  user: {
    username: 'testuser',
    email: 'testuser@test.com',
    password: 'User@123456',
    roles: ['user'],
  },
} as const;

/** User data for dynamic registration tests */
export const SIGNUP_DATA = {
  valid: {
    username: 'newuser_dynamic',
    email: 'newuser_dynamic@test.com',
    password: 'NewUser@123',
  },
  withRoles: {
    username: 'newmod_dynamic',
    email: 'newmod_dynamic@test.com',
    password: 'NewMod@123',
    roles: ['user', 'moderator'],
  },
  duplicate: {
    username: 'testuser',
    email: 'duplicate@test.com',
    password: 'Dup@123456',
  },
  duplicateEmail: {
    username: 'unique_username',
    email: 'testuser@test.com',
    password: 'Dup@123456',
  },
  invalidRole: {
    username: 'invalid_role_user',
    email: 'invalidrole@test.com',
    password: 'Invalid@123',
    roles: ['superadmin'],
  },
  missingUsername: {
    email: 'nouser@test.com',
    password: 'NoUser@123',
  },
  missingEmail: {
    username: 'noemail_user',
    password: 'NoEmail@123',
  },
  missingPassword: {
    username: 'nopass_user',
    email: 'nopass@test.com',
  },
} as const;

/** Sample tutorial data */
export const TUTORIALS = {
  sample1: {
    title: 'Introduction to Node.js',
    description: 'Learn the basics of Node.js runtime environment',
    published: false,
  },
  sample2: {
    title: 'Express.js Fundamentals',
    description: 'Build REST APIs with Express.js framework',
    published: true,
  },
  sample3: {
    title: 'MongoDB CRUD Operations',
    description: 'Master MongoDB database operations with Mongoose',
    published: true,
  },
  sample4: {
    title: 'JWT Authentication Deep Dive',
    description: 'Implement secure authentication with JSON Web Tokens',
    published: false,
  },
  sample5: {
    title: 'Docker Containerization',
    description: 'Containerize Node.js applications with Docker',
    published: true,
  },
  forUpdate: {
    title: 'Original Title',
    description: 'Original description for update test',
    published: false,
  },
  forDelete: {
    title: 'Tutorial To Delete',
    description: 'This tutorial will be deleted during testing',
    published: false,
  },
  noTitle: {
    description: 'Tutorial without a title',
    published: false,
  },
  updatedFields: {
    title: 'Updated Title',
    description: 'Updated description after modification',
    published: true,
  },
} as const;

/** API endpoint paths */
export const ENDPOINTS = {
  auth: {
    signup: '/api/auth/signup',
    signin: '/api/auth/signin', // Wait, let's fix signin as well to be /api/auth/signin
    refreshToken: '/api/auth/refreshtoken',
  },
  test: {
    all: '/api/test/all',
    user: '/api/test/user',
    mod: '/api/test/mod',
    admin: '/api/test/admin',
  },
  tutorials: {
    base: '/api/tutorials',
    published: '/api/tutorials/published',
    byId: (id: string) => `/api/tutorials/${id}`,
  },
} as const;

/** Expected response messages */
export const MESSAGES = {
  auth: {
    registerSuccess: 'User was registered successfully!',
    duplicateUsername: 'Failed! Username is already in use!',
    duplicateEmail: 'Failed! Email is already in use!',
    userNotFound: 'User Not found.',
    invalidPassword: 'Invalid Password!',
    noToken: 'No token provided!',
    unauthorized: 'Unauthorized!',
    requireAdmin: 'Require Admin Role!',
    requireModerator: 'Require Moderator Role!',
    refreshTokenRequired: 'Refresh Token is required!',
    refreshTokenNotFound: 'Refresh token is not in database!',
    refreshTokenExpired: 'Refresh token was expired. Please make a new signin request',
  },
  tutorials: {
    contentEmpty: 'Content can not be empty!',
    deleteSuccess: 'Tutorial was deleted successfully!',
    updateSuccess: 'Tutorial was updated successfully.',
  },
  test: {
    publicContent: 'Public Content.',
    userContent: 'User Content.',
    modContent: 'Moderator Content.',
    adminContent: 'Admin Content.',
  },
} as const;

/** Invalid/malformed data for negative testing */
export const INVALID_DATA = {
  malformedToken: 'not.a.valid.jwt.token',
  expiredToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwZDVlYzQ5NTQwMGI5MjVhYzQ4ZTFmNSIsImlhdCI6MTYyNDY0NjcyOSwiZXhwIjoxNjI0NjUwMzI5fQ.invalid_signature',
  nonExistentId: '000000000000000000000000',
  invalidObjectId: 'not-a-valid-object-id',
} as const;
