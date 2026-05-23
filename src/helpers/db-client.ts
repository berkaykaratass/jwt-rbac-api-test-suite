/**
 * MongoDB Direct Access Client
 *
 * Provides direct database access for state verification in tests.
 * This goes beyond HTTP response validation by confirming actual
 * database state — a key differentiator in professional QA work.
 */

import { MongoClient, Db, ObjectId, Collection } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bezkoder_db';

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Establishes a connection to the MongoDB database.
 * Reuses existing connection if already connected.
 */
export async function connectDB(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db();
  console.log(`[DB Client] Connected to MongoDB: ${MONGODB_URI}`);
  return db;
}

/**
 * Closes the MongoDB connection gracefully.
 */
export async function disconnectDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[DB Client] Disconnected from MongoDB');
  }
}

/**
 * Returns the database instance, connecting if necessary.
 */
export async function getDB(): Promise<Db> {
  if (!db) {
    return connectDB();
  }
  return db;
}

// ============================================
// User Collection Operations
// ============================================

/**
 * Find a user document by username.
 */
export async function findUserByUsername(username: string): Promise<any> {
  const database = await getDB();
  return database.collection('users').findOne({ username });
}

/**
 * Find a user document by email.
 */
export async function findUserByEmail(email: string): Promise<any> {
  const database = await getDB();
  return database.collection('users').findOne({ email });
}

/**
 * Count the number of users in the database.
 */
export async function countUsers(): Promise<number> {
  const database = await getDB();
  return database.collection('users').countDocuments();
}

/**
 * Get all users from the database.
 */
export async function getAllUsers(): Promise<any[]> {
  const database = await getDB();
  return database.collection('users').find({}).toArray();
}

// ============================================
// Tutorial Collection Operations
// ============================================

/**
 * Find a tutorial document by ID.
 */
export async function findTutorialById(id: string): Promise<any> {
  const database = await getDB();
  try {
    return database.collection('tutorials').findOne({ _id: new ObjectId(id) });
  } catch {
    return null;
  }
}

/**
 * Find tutorials by title (partial match, case-insensitive).
 */
export async function findTutorialsByTitle(title: string): Promise<any[]> {
  const database = await getDB();
  return database.collection('tutorials').find({
    title: { $regex: new RegExp(title, 'i') }
  }).toArray();
}

/**
 * Count the total number of tutorials.
 */
export async function countTutorials(): Promise<number> {
  const database = await getDB();
  return database.collection('tutorials').countDocuments();
}

/**
 * Count published tutorials.
 */
export async function countPublishedTutorials(): Promise<number> {
  const database = await getDB();
  return database.collection('tutorials').countDocuments({ published: true });
}

/**
 * Get all tutorials from the database.
 */
export async function getAllTutorials(): Promise<any[]> {
  const database = await getDB();
  return database.collection('tutorials').find({}).toArray();
}

// ============================================
// Role Collection Operations
// ============================================

/**
 * Get all roles from the database.
 */
export async function getAllRoles(): Promise<any[]> {
  const database = await getDB();
  return database.collection('roles').find({}).toArray();
}

/**
 * Find a role by name.
 */
export async function findRoleByName(name: string): Promise<any> {
  const database = await getDB();
  return database.collection('roles').findOne({ name });
}

// ============================================
// Cleanup Operations
// ============================================

/**
 * Drop all data from users collection.
 */
export async function clearUsers(): Promise<void> {
  const database = await getDB();
  await database.collection('users').deleteMany({});
}

/**
 * Drop all data from tutorials collection.
 */
export async function clearTutorials(): Promise<void> {
  const database = await getDB();
  await database.collection('tutorials').deleteMany({});
}

/**
 * Drop all data from refreshtokens collection.
 */
export async function clearRefreshTokens(): Promise<void> {
  const database = await getDB();
  await database.collection('refreshtokens').deleteMany({});
}

/**
 * Reset the entire database to a clean state.
 * Preserves the roles collection.
 */
export async function resetDatabase(): Promise<void> {
  await clearUsers();
  await clearTutorials();
  await clearRefreshTokens();
  console.log('[DB Client] Database reset complete');
}
