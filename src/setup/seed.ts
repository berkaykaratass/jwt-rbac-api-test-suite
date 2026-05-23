/**
 * Database Seed Script
 *
 * Prepares the system before running tests by establishing a known baseline state.
 * This script is idempotent — safe to run multiple times without side effects.
 *
 * Operations:
 * 1. Connects to MongoDB directly
 * 2. Clears existing test data (users, tutorials, refresh tokens)
 * 3. Ensures roles collection has the required roles
 * 4. Creates test users with pre-hashed passwords for each role
 * 5. Seeds sample tutorials for read operation tests
 *
 * Usage:
 *   npx ts-node src/setup/seed.ts
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bezkoder_db';

/**
 * Simple bcrypt-compatible hash function.
 * Uses the same salt rounds (8) as the SUT's auth.controller.js
 */
function hashPassword(password: string): string {
  // We'll use the API to register users instead of direct DB insert
  // to ensure password hashing matches the SUT's bcryptjs implementation
  return password; // Placeholder — actual registration uses API
}

interface RoleDoc {
  _id: ObjectId;
  name: string;
}

async function seed(clearUsers = true): Promise<void> {
  console.log('🌱 Starting database seed...');
  console.log(`📦 MongoDB URI: ${MONGODB_URI}`);

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();
    console.log('✅ Connected to MongoDB');

    // ========================================
    // Step 1: Clear existing test data
    // ========================================
    console.log('\n🧹 Clearing existing data...');
    if (clearUsers) {
      await db.collection('users').deleteMany({});
      await db.collection('refreshtokens').deleteMany({});
      console.log('   ✓ Cleared users and refreshtokens collections');
    }
    await db.collection('tutorials').deleteMany({});
    console.log('   ✓ Cleared tutorials collection');

    // ========================================
    // Step 2: Ensure roles exist
    // ========================================
    console.log('\n🔑 Ensuring roles exist...');
    const rolesCollection = db.collection('roles');
    const existingRoles = await rolesCollection.countDocuments();

    let roles: RoleDoc[];

    if (existingRoles === 0) {
      const roleNames = ['user', 'moderator', 'admin'];
      const insertResult = await rolesCollection.insertMany(
        roleNames.map(name => ({ name }))
      );
      console.log(`   ✓ Created ${insertResult.insertedCount} roles`);
      roles = await rolesCollection.find({}).toArray() as unknown as RoleDoc[];
    } else {
      roles = await rolesCollection.find({}).toArray() as unknown as RoleDoc[];
      console.log(`   ✓ Found ${roles.length} existing roles`);
    }

    // Build role lookup map
    const roleMap = new Map<string, ObjectId>();
    for (const role of roles) {
      roleMap.set(role.name, role._id);
    }
    console.log(`   Roles: ${Array.from(roleMap.keys()).join(', ')}`);

    // ========================================
    // Step 3: Create test users via direct DB insert
    // We use bcryptjs-compatible hashes (pre-computed with salt rounds = 8)
    // ========================================
    console.log('\n👥 Creating test users...');

    // Note: We'll register users via API in global-setup.ts instead
    // This ensures password hashes match exactly what the SUT expects
    // Here we just prepare the tutorials

    // ========================================
    // Step 4: Seed sample tutorials
    // ========================================
    console.log('\n📚 Seeding sample tutorials...');
    const tutorials = [
      {
        title: 'Introduction to Node.js',
        description: 'Learn the basics of Node.js runtime environment',
        published: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: 'Express.js Fundamentals',
        description: 'Build REST APIs with Express.js framework',
        published: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: 'MongoDB CRUD Operations',
        description: 'Master MongoDB database operations with Mongoose',
        published: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: 'JWT Authentication Deep Dive',
        description: 'Implement secure authentication with JSON Web Tokens',
        published: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: 'Docker Containerization',
        description: 'Containerize Node.js applications with Docker',
        published: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const tutorialResult = await db.collection('tutorials').insertMany(tutorials);
    console.log(`   ✓ Seeded ${tutorialResult.insertedCount} tutorials`);

    // ========================================
    // Summary
    // ========================================
    const userCount = await db.collection('users').countDocuments();
    const tutorialCount = await db.collection('tutorials').countDocuments();
    const roleCount = await db.collection('roles').countDocuments();

    console.log('\n📊 Seed Summary:');
    console.log(`   Roles:     ${roleCount}`);
    console.log(`   Users:     ${userCount} (will be created via API in global setup)`);
    console.log(`   Tutorials: ${tutorialCount}`);
    console.log('\n✅ Database seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run directly if executed as a script
if (require.main === module) {
  seed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { seed };
