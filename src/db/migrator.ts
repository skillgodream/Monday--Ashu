/**
 * GURU COACH LMS - DATABASE MIGRATION ENGINE
 *
 * Runs SQL migrations sequentially in atomic transactions, recording history
 * in _schema_migrations. Idempotent and safe against re-runs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getDatabasePool, withTransaction, isDatabaseConfigured, closePool } from './pool.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<{ applied: string[]; skipped: string[] }> {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_NOT_CONFIGURED: Cannot run migrations without DATABASE_URL.');
  }

  const pool = getDatabasePool();
  if (!pool) {
    throw new Error('Database pool could not be initialized.');
  }

  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found at: ${migrationsDir}`);
  }

  const sqlFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql') && !file.endsWith('_down.sql') && !file.endsWith('.down.sql'))
    .sort();

  // 1. Ensure migrations table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      version VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  // 2. Fetch already applied versions
  const existingRes = await pool.query('SELECT version FROM _schema_migrations ORDER BY version ASC;');
  const appliedSet = new Set(existingRes.rows.map((r) => r.version));

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const file of sqlFiles) {
    const version = file.replace(/\.sql$/, '');
    if (appliedSet.has(version)) {
      skipped.push(file);
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(filePath, 'utf-8');

    console.log(`[Migrator] Applying migration: ${file}...`);
    await withTransaction(async (client) => {
      await client.query(sqlContent);
      await client.query(
        'INSERT INTO _schema_migrations (version, name, applied_at) VALUES ($1, $2, NOW());',
        [version, file]
      );
    });

    console.log(`[Migrator] Successfully applied: ${file}`);
    applied.push(file);
  }

  return { applied, skipped };
}

export async function rollbackMigration(targetVersion?: string): Promise<{ rolledBack: string }> {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_NOT_CONFIGURED: Cannot run rollback without DATABASE_URL.');
  }

  const pool = getDatabasePool();
  if (!pool) {
    throw new Error('Database pool could not be initialized.');
  }

  const migrationsDir = path.join(__dirname, 'migrations');

  let versionToRollback = targetVersion;
  if (!versionToRollback) {
    const lastRes = await pool.query(
      'SELECT version, name FROM _schema_migrations ORDER BY applied_at DESC, version DESC LIMIT 1;'
    );
    if (!lastRes.rows[0]) {
      throw new Error('No migrations have been applied to rollback.');
    }
    versionToRollback = lastRes.rows[0].version;
  }

  if (!versionToRollback) {
    throw new Error('No valid migration version specified for rollback.');
  }

  const resolvedVersion: string = versionToRollback;
  const downFileName = `${resolvedVersion}_down.sql`;
  const downFilePath = path.join(migrationsDir, downFileName);
  if (!fs.existsSync(downFilePath)) {
    throw new Error(`Rollback script not found for version ${resolvedVersion}: expected ${downFilePath}`);
  }

  const downSql = fs.readFileSync(downFilePath, 'utf-8');
  console.log(`[Migrator] Rolling back migration: ${resolvedVersion}...`);

  await withTransaction(async (client) => {
    await client.query(downSql);
    await client.query('DELETE FROM _schema_migrations WHERE version = $1;', [resolvedVersion]);
  });

  console.log(`[Migrator] Successfully rolled back: ${resolvedVersion}`);
  return { rolledBack: resolvedVersion };
}

// CLI execution handling
if (process.argv[1] && (process.argv[1].endsWith('migrator.ts') || process.argv[1].endsWith('migrator.js'))) {
  const isRollback = process.argv.includes('--rollback');
  const targetVer = process.argv.find((arg) => arg.startsWith('--version='))?.replace('--version=', '');

  if (isRollback) {
    rollbackMigration(targetVer)
      .then(({ rolledBack }) => {
        console.log(`\n↩️ Rollback completed successfully: ${rolledBack}`);
        return closePool().then(() => process.exit(0));
      })
      .catch((err) => {
        console.error('\n❌ Rollback failed:', err.message);
        return closePool().then(() => process.exit(1));
      });
  } else {
    runMigrations()
      .then(({ applied, skipped }) => {
        console.log(`\n✅ Migrations completed: ${applied.length} applied, ${skipped.length} already up-to-date.`);
        return closePool().then(() => process.exit(0));
      })
      .catch((err) => {
        console.error('\n❌ Migration failed:', err.message);
        return closePool().then(() => process.exit(1));
      });
  }
}
