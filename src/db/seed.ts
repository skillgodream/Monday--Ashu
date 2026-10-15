/**
 * GURU COACH LMS - DEVELOPMENT DATABASE SEED SCRIPT
 *
 * Populates test organizations, users, teams, and sample content for local development.
 * Strictly forbidden from executing in production environments.
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
import { getDatabasePool, withTransaction, isDatabaseConfigured, closePool } from './pool.js';
import { DEV_FIXTURES } from './fixtures/devFixtures.js';

dotenv.config();

export async function seedDevelopmentDatabase(): Promise<{
  organizationId: string;
  usersSeeded: number;
  teamsSeeded: number;
}> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SECURITY VIOLATION: Database seed script cannot run in production mode.');
  }

  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_NOT_CONFIGURED: Set DATABASE_URL before running seed.');
  }

  const pool = getDatabasePool();
  if (!pool) throw new Error('Database pool could not be initialized.');

  console.log('[Seed] Seeding development database...');

  return await withTransaction(async (client) => {
    // 1. Organization
    const org = DEV_FIXTURES.organization;
    await client.query(
      `INSERT INTO organizations (id, name, slug)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id;`,
      [org.id, org.name, org.slug]
    );

    // 2. Users
    let usersCount = 0;
    for (const u of DEV_FIXTURES.users) {
      await client.query(
        `INSERT INTO users (id, organization_id, email, full_name, role, job_title, badge_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         ON CONFLICT (organization_id, email) DO UPDATE
           SET full_name = EXCLUDED.full_name,
               role = EXCLUDED.role,
               job_title = EXCLUDED.job_title,
               badge_id = EXCLUDED.badge_id;`,
        [u.id, org.id, u.email, u.full_name, u.role, u.job_title, u.badge_id]
      );
      usersCount++;
    }

    // 3. Teams & Memberships
    let teamsCount = 0;
    for (const t of DEV_FIXTURES.teams) {
      await client.query(
        `INSERT INTO teams (id, organization_id, name, department, manager_id, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (organization_id, name) DO UPDATE
           SET department = EXCLUDED.department,
               manager_id = EXCLUDED.manager_id;`,
        [t.id, org.id, t.name, t.department, t.manager_id]
      );
      teamsCount++;

      for (const memberId of t.member_ids) {
        await client.query(
          `INSERT INTO team_members (organization_id, team_id, user_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (team_id, user_id) DO NOTHING;`,
          [org.id, t.id, memberId]
        );
      }
    }

    // 4. Sample Source Document & Version
    const sample = DEV_FIXTURES.sampleSop;
    const docRes = await client.query(
      `INSERT INTO source_documents (organization_id, doc_code, title, category)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id, doc_code) DO UPDATE SET title = EXCLUDED.title
       RETURNING id;`,
      [org.id, sample.doc_code, sample.title, sample.category]
    );
    const docId = docRes.rows[0].id;

    const contentHash = crypto.createHash('sha256').update(sample.raw_text.trim()).digest('hex');

    await client.query(
      `INSERT INTO source_versions (
         organization_id, source_document_id, version_number, version_label,
         content_hash, original_filename, mime_type, extracted_text,
         word_count, page_count, change_summary, is_active
       )
       VALUES ($1, $2, 1, 'v1.0', $3, 'SOP-HSK-501.txt', 'text/plain', $4, 120, 1, 'Initial seed version', true)
       ON CONFLICT (source_document_id, content_hash) DO NOTHING;`,
      [org.id, docId, contentHash, sample.raw_text]
    );

    console.log(`[Seed SUCCESS] Seeded organization "${org.name}", ${usersCount} users, ${teamsCount} teams.`);
    return { organizationId: org.id, usersSeeded: usersCount, teamsSeeded: teamsCount };
  });
}

// CLI execution handling
if (process.argv[1] && (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'))) {
  seedDevelopmentDatabase()
    .then((result) => {
      console.log('✅ Development database seeded successfully:', result);
      return closePool().then(() => process.exit(0));
    })
    .catch((err) => {
      console.error('❌ Seeding failed:', err.message);
      return closePool().then(() => process.exit(1));
    });
}
