/**
 * Migration Route
 * ONE-TIME USE: Run database migrations on demand
 * 
 * Protected endpoint to trigger migrations safely
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Migration status tracking
let migrationInProgress = false;
let migrationResult = null;

/**
 * POST /api/migration/run-all
 * Runs all migrations: schema update + seed import
 */
router.post('/run-all', async (req, res) => {
  try {
    // Simple auth check - in production use proper middleware
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_MIGRATION_KEY && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (migrationInProgress) {
      return res.status(409).json({ message: 'Migration already in progress' });
    }

    migrationInProgress = true;
    migrationResult = { status: 'running', steps: [] };

    // Step 1: Run schema migration
    console.log('📋 Step 1: Running schema migration...');
    migrationResult.steps.push({ name: 'Schema Migration', status: 'running' });

    try {
      const migrateScript = require('../migrate-to-new-product-schema.js');
      migrationResult.steps[0].status = 'completed';
      console.log('✅ Schema migration completed');
    } catch (error) {
      migrationResult.steps[0].status = 'failed';
      migrationResult.steps[0].error = error.message;
      throw error;
    }

    // Step 2: Import seed data
    console.log('📋 Step 2: Importing seed data...');
    migrationResult.steps.push({ name: 'Seed Import', status: 'running' });

    try {
      const importScript = require('../import-seed-data.js');
      migrationResult.steps[1].status = 'completed';
      console.log('✅ Seed import completed');
    } catch (error) {
      migrationResult.steps[1].status = 'failed';
      migrationResult.steps[1].error = error.message;
      throw error;
    }

    migrationInProgress = false;
    migrationResult.status = 'completed';

    res.json({
      message: 'All migrations completed successfully',
      result: migrationResult
    });
  } catch (error) {
    migrationInProgress = false;
    migrationResult.status = 'failed';
    migrationResult.error = error.message;

    res.status(500).json({
      message: 'Migration failed',
      error: error.message,
      result: migrationResult
    });
  }
});

/**
 * GET /api/migration/status
 * Check migration status
 */
router.get('/status', (req, res) => {
  res.json({
    inProgress: migrationInProgress,
    lastResult: migrationResult
  });
});

module.exports = router;
