#!/usr/bin/env node
/**
 * Deploy Migration Script
 * Runs migrations and imports on Render environment
 * Usage: node deploy-migrate.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in environment');
  process.exit(1);
}

console.log('🚀 Starting deploy migration...\n');

// Connect to MongoDB
mongoose.connect(DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ Connected to MongoDB');
    runMigrations();
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });

async function runMigrations() {
  try {
    console.log('\n📋 Step 1: Running schema migration...');
    const migrate = require('./migrate-to-new-product-schema.js');
    console.log('✅ Schema migration completed\n');

    console.log('📋 Step 2: Importing seed data...');
    const importSeed = require('./import-seed-data.js');
    console.log('✅ Seed data import completed\n');

    console.log('✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}
