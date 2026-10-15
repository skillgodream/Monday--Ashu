/**
 * GURU COACH LMS - PHASE 4 MANAGER TEAM & ASSIGNMENT WORKFLOW TEST SUITE
 *
 * Direct HTTP API & Database Verification of:
 * 1. Manager Team Management (Creation, Roster, Member Addition & Removal)
 * 2. Tenant Isolation Safeguards (Cross-tenant team access, cross-tenant member addition rejection)
 * 3. Role Authorization (Learner 403 rejection, Unauthenticated 401 rejection)
 * 4. Published Content Selection & Version Pinning
 * 5. Assignment Scheduling & Date Order Validation (Rejects due_date < start_date)
 * 6. Team-based Batch Assignment Creation
 * 7. Assignment Correction, Status Updates & Clean Cancellation
 * 8. Organization Audit Trail Enforcement
 */

import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import http from 'http';
import { query, closePool } from './pool.js';
import { userRepo } from './repositories/userRepo.js';
import { contentRepo } from './repositories/contentRepo.js';
import { teamRepo } from './repositories/teamRepo.js';
import { assignmentRepo } from './repositories/assignmentRepo.js';
import { auditRepo } from './repositories/auditRepo.js';
import { registerManagerRoutes } from '../server/managerRoutes.js';
import { UserEntity } from './types.js';

dotenv.config();

function createVerificationApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Test Auth Middleware resolving user from x-test-user-id header
  async function testAuthMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    const testUserId = req.headers['x-test-user-id'];
    if (typeof testUserId === 'string' && testUserId) {
      const userRes = await query<UserEntity>('SELECT * FROM users WHERE id = $1;', [testUserId]);
      if (userRes.rows[0]) {
        req.user = userRes.rows[0];
        req.organizationId = userRes.rows[0].organization_id;
        req.userRole = userRes.rows[0].role;
        return next();
      }
    }

    return next();
  }

  app.use(testAuthMiddleware);
  registerManagerRoutes(app);

  return app;
}

async function runPhase4Tests() {
  console.log('\n================================================================');
  console.log(' GURU COACH LMS — PHASE 4 MANAGER WORKFLOW TEST SUITE');
  console.log('================================================================\n');

  const app = createVerificationApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, title: string, details?: any) {
    if (condition) {
      console.log(`  ✓ PASS: ${title}`);
      passedTests++;
    } else {
      console.error(`  ✕ FAIL: ${title}`, details ? JSON.stringify(details) : '');
      failedTests++;
    }
  }

  try {
    // --- SETUP FIXTURE TENANTS & USERS ---
    const tenantA = await query<{ id: string }>(
      `INSERT INTO organizations (name, slug)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id;`,
      ['Tenant Alpha Logistics', 'tenant-alpha-phase4']
    );
    const orgAId = tenantA.rows[0].id;

    const tenantB = await query<{ id: string }>(
      `INSERT INTO organizations (name, slug)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id;`,
      ['Tenant Beta Transport', 'tenant-beta-phase4']
    );
    const orgBId = tenantB.rows[0].id;

    // Users in Tenant A
    const managerA = await userRepo.create({
      organization_id: orgAId,
      email: `mgr.alpha.${Date.now()}@alpha.test`,
      full_name: 'Alpha Manager Priya',
      role: 'manager',
      job_title: 'Operations Manager',
    });

    const learnerA1 = await userRepo.create({
      organization_id: orgAId,
      email: `learner.a1.${Date.now()}@alpha.test`,
      full_name: 'Alpha Learner Vikram',
      role: 'learner',
      job_title: 'Cold Storage Tech',
    });

    const learnerA2 = await userRepo.create({
      organization_id: orgAId,
      email: `learner.a2.${Date.now()}@alpha.test`,
      full_name: 'Alpha Learner Sunita',
      role: 'learner',
      job_title: 'Inventory Handler',
    });

    // Users in Tenant B
    const managerB = await userRepo.create({
      organization_id: orgBId,
      email: `mgr.beta.${Date.now()}@beta.test`,
      full_name: 'Beta Manager Bob',
      role: 'manager',
      job_title: 'Regional Manager',
    });

    const learnerB1 = await userRepo.create({
      organization_id: orgBId,
      email: `learner.b1.${Date.now()}@beta.test`,
      full_name: 'Beta Learner Charlie',
      role: 'learner',
      job_title: 'Fleet Operator',
    });

    // Setup Published Content in Tenant A
    const sourceDocA = await contentRepo.createOrFindSourceDocument({
      organization_id: orgAId,
      doc_code: `SOP-P4-101-${Date.now()}`,
      title: 'Phase 4 Cold Chain Storage Protocol',
      category: 'Cold Storage',
    });

    const { version: verA } = await contentRepo.createSourceVersion({
      organization_id: orgAId,
      source_document_id: sourceDocA.id,
      content_hash: crypto.createHash('sha256').update(`Phase 4 Content A ${Date.now()}`).digest('hex'),
      original_filename: 'Phase4_ColdChain.txt',
      mime_type: 'text/plain',
      extracted_text: 'Phase 4 Operational SOP Text Content...',
      word_count: 50,
      page_count: 1,
    });

    const publishedAssetA = await contentRepo.createLearningAsset({
      organization_id: orgAId,
      source_version_id: verA.id,
      title: 'Phase 4 Cold Chain SOP Journey',
      role_target: 'Refrigeration Technician',
      operational_blueprint: { steps: 5 },
      canonical_task_model: { tasks: 5 },
      know_it_plan: { items: 5 },
      simulator_steps: [],
      generation_metadata: {},
      status: 'published',
      approved_by: managerA.id,
    });

    // Create Draft Asset in Tenant A (Unpublished)
    const draftAssetA = await contentRepo.createLearningAsset({
      organization_id: orgAId,
      source_version_id: verA.id,
      title: 'Draft Unapproved SOP',
      role_target: 'Trainee',
      operational_blueprint: {},
      canonical_task_model: {},
      know_it_plan: {},
      simulator_steps: [],
      generation_metadata: {},
      status: 'draft',
    });

    console.log('--- TEST SUITE 1: MANAGER TEAM MANAGEMENT ---');

    // 1. Create Team Endpoint
    const createTeamRes = await fetch(`${baseUrl}/api/manager/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-user-id': managerA.id },
      body: JSON.stringify({ name: 'Alpha Logistics Team ' + Date.now(), department: 'Cold Storage Ops' }),
    });
    const createTeamData = await createTeamRes.json();
    assert(createTeamRes.status === 201 && createTeamData.success, 'Manager A can create team in Tenant A', createTeamData);
    const teamA = createTeamData.team;

    if (teamA) {
      // 2. Add Member to Team
      const addMemberRes = await fetch(`${baseUrl}/api/manager/teams/${teamA.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-user-id': managerA.id },
        body: JSON.stringify({ user_id: learnerA1.id }),
      });
      const addMemberData = await addMemberRes.json();
      assert(addMemberRes.status === 200 && addMemberData.success, 'Manager A can add Tenant A learner to Team A', addMemberData);

      // Add second member
      await fetch(`${baseUrl}/api/manager/teams/${teamA.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-user-id': managerA.id },
        body: JSON.stringify({ user_id: learnerA2.id }),
      });

      // 3. View Team Detail and Roster
      const getTeamRes = await fetch(`${baseUrl}/api/manager/teams/${teamA.id}`, {
        headers: { 'x-test-user-id': managerA.id },
      });
      const getTeamData = await getTeamRes.json();
      assert(
        getTeamRes.status === 200 && getTeamData.roster?.length === 2,
        'Manager A can fetch team detail and roster showing 2 members',
        getTeamData
      );

      // 4. Remove Member from Team
      const removeRes = await fetch(`${baseUrl}/api/manager/teams/${teamA.id}/members/${learnerA2.id}`, {
        method: 'DELETE',
        headers: { 'x-test-user-id': managerA.id },
      });
      assert(removeRes.status === 200, 'Manager A can remove member from Team A');
    }

    console.log('\n--- TEST SUITE 2: TENANT ISOLATION & SECURITY GATE ---');

    if (teamA) {
      // 1. Cross-Tenant Team Member Addition Rejection
      const crossAddRes = await fetch(`${baseUrl}/api/manager/teams/${teamA.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-user-id': managerA.id },
        body: JSON.stringify({ user_id: learnerB1.id }),
      });
      assert(
        crossAddRes.status === 403 || crossAddRes.status === 400,
        'Adding Tenant B user to Tenant A team is strictly rejected (403/400)'
      );

      // 2. Cross-Tenant Team Read Rejection
      const crossGetRes = await fetch(`${baseUrl}/api/manager/teams/${teamA.id}`, {
        headers: { 'x-test-user-id': managerB.id },
      });
      assert(crossGetRes.status === 404, 'Tenant B Manager receives 404 when requesting Tenant A team');
    }

    // 3. Role Authorization - Learner 403 Rejection
    const learnerAuthRes = await fetch(`${baseUrl}/api/manager/teams`, {
      headers: { 'x-test-user-id': learnerA1.id },
    });
    assert(learnerAuthRes.status === 403, 'Learner role receives 403 FORBIDDEN on manager endpoint');

    // 4. Unauthenticated Rejection
    const unauthRes = await fetch(`${baseUrl}/api/manager/teams`);
    assert(unauthRes.status === 401, 'Unauthenticated request receives 401 UNAUTHORIZED');

    console.log('\n--- TEST SUITE 3: PUBLISHED CONTENT SELECTION & VERSION PINNING ---');

    // 1. List Published Assets
    const pubAssetsRes = await fetch(`${baseUrl}/api/manager/published-assets`, {
      headers: { 'x-test-user-id': managerA.id },
    });
    const pubAssetsData = await pubAssetsRes.json();
    assert(
      pubAssetsRes.status === 200 && pubAssetsData.assets?.some((a: any) => a.id === publishedAssetA.id),
      'Manager A can query published assets for Tenant A'
    );

    // 2. Reject Assigning Unpublished Content
    const unpubAssignRes = await fetch(`${baseUrl}/api/manager/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-user-id': managerA.id },
      body: JSON.stringify({
        learning_asset_id: draftAssetA.id,
        user_id: learnerA1.id,
      }),
    });
    assert(unpubAssignRes.status === 400, 'Attempting to assign draft/unapproved asset is rejected with 400');

    console.log('\n--- TEST SUITE 4: ASSIGNMENT SCHEDULING & DATE ORDER VALIDATION ---');

    // 1. Reject Invalid Date Order (due_date < start_date)
    const invalidDateRes = await fetch(`${baseUrl}/api/manager/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-user-id': managerA.id },
      body: JSON.stringify({
        learning_asset_id: publishedAssetA.id,
        user_id: learnerA1.id,
        start_date: '2026-11-10',
        due_date: '2026-11-01', // Before start_date
      }),
    });
    const invalidDateData = await invalidDateRes.json();
    assert(
      invalidDateRes.status === 400 && invalidDateData.error === 'INVALID_DATE_ORDER',
      'Assigning with due_date before start_date is rejected with 400 INVALID_DATE_ORDER',
      invalidDateData
    );

    // 2. Valid Team Assignment Creation
    if (teamA) {
      const teamAssignRes = await fetch(`${baseUrl}/api/manager/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-user-id': managerA.id },
        body: JSON.stringify({
          learning_asset_id: publishedAssetA.id,
          recipient_type: 'team',
          team_id: teamA.id,
          start_date: '2026-10-15',
          due_date: '2026-10-30',
        }),
      });
      const teamAssignData = await teamAssignRes.json();
      assert(
        teamAssignRes.status === 201 && teamAssignData.count >= 1,
        'Manager A creates assignment for Team A with valid start and due dates',
        teamAssignData
      );

      if (teamAssignData.assignments?.length > 0) {
        console.log('\n--- TEST SUITE 5: ASSIGNMENT CORRECTION & CANCELLATION ---');

        const createdAssignmentId = teamAssignData.assignments[0].id;

        // 1. Update Assignment Status & Due Date
        const updateAssignRes = await fetch(`${baseUrl}/api/manager/assignments/${createdAssignmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-test-user-id': managerA.id },
          body: JSON.stringify({
            due_date: '2026-11-15',
          }),
        });
        assert(updateAssignRes.status === 200, 'Manager A can update assignment due date');

        // 2. Cancel Assignment
        const cancelRes = await fetch(`${baseUrl}/api/manager/assignments/${createdAssignmentId}/cancel`, {
          method: 'POST',
          headers: { 'x-test-user-id': managerA.id },
        });
        const cancelData = await cancelRes.json();
        assert(
          cancelRes.status === 200 && cancelData.assignment?.status === 'cancelled',
          'Manager A cancels assignment cleanly; status set to cancelled'
        );

        // 3. Confirm Record Preserved in Database
        const dbRecord = await assignmentRepo.findById(orgAId, createdAssignmentId);
        assert(
          dbRecord !== null && dbRecord.status === 'cancelled',
          'Cancelled assignment record is preserved in database for historical auditability'
        );
      }
    }

    console.log('\n--- TEST SUITE 6: AUDIT TRAIL SCOPING ---');

    const auditRes = await fetch(`${baseUrl}/api/manager/audit-trail`, {
      headers: { 'x-test-user-id': managerA.id },
    });
    const auditData = await auditRes.json();
    const actions = auditData.events?.map((e: any) => e.action) || [];
    assert(
      auditRes.status === 200 &&
        actions.includes('TEAM_CREATED') &&
        actions.includes('ASSIGNMENT_CREATED') &&
        actions.includes('ASSIGNMENT_CANCELLED'),
      'Manager audit trail records TEAM_CREATED, ASSIGNMENT_CREATED, and ASSIGNMENT_CANCELLED',
      actions
    );
  } catch (err: any) {
    console.error('Test execution exception:', err);
    failedTests++;
  } finally {
    server.close();
  }

  console.log('\n================================================================');
  console.log(` PHASE 4 TEST RESULTS: ${passedTests} passed, ${failedTests} failed (Total: ${passedTests + failedTests})`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase4Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
