/**
 * GURU COACH LMS - PHASE 6 REPORTING ACCEPTANCE TEST SUITE
 */
import express from 'express';
import dotenv from 'dotenv';
import { query, closePool } from './pool.js';
import { userRepo } from './repositories/userRepo.js';
import { teamRepo } from './repositories/teamRepo.js';
import { assignmentRepo } from './repositories/assignmentRepo.js';
import { contentRepo } from './repositories/contentRepo.js';
import { registerManagerRoutes } from '../server/managerRoutes.js';
import { UserEntity } from './types.js';

dotenv.config();

function createVerificationApp() {
  const app = express();
  app.use(express.json());

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

async function runPhase6Tests() {
  const orgAId = crypto.randomUUID();
  await query('INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3)', [orgAId, 'Org A', `org-a-${Date.now()}`]);
  
  // Setup data
  const mgrA = await userRepo.create({ organization_id: orgAId, email: 'mgrA@test.com', full_name: 'Mgr A', role: 'manager' });
  const team1 = await teamRepo.create({ organization_id: orgAId, name: 'Team 1', department: 'Dep 1', manager_id: mgrA.id });
  const team2 = await teamRepo.create({ organization_id: orgAId, name: 'Team 2', department: 'Dep 2', manager_id: null });
  
  const learner1 = await userRepo.create({ organization_id: orgAId, email: 'l1@test.com', full_name: 'L1', role: 'learner' });
  const learner2 = await userRepo.create({ organization_id: orgAId, email: 'l2@test.com', full_name: 'L2', role: 'learner' });
  
  await teamRepo.addMember(orgAId, team1.id, learner1.id);
  await teamRepo.addMember(orgAId, team2.id, learner2.id);
  
  // Create an asset and assignments
  const doc = await contentRepo.createOrFindSourceDocument({ organization_id: orgAId, doc_code: 'SOP1', title: 'SOP1' });
  const { version: ver } = await contentRepo.createSourceVersion({ organization_id: orgAId, source_document_id: doc.id, content_hash: 'h1', original_filename: 'f1', mime_type: 'text', extracted_text: 't1', word_count: 1, page_count: 1 });
  const asset = await contentRepo.createLearningAsset({ organization_id: orgAId, source_version_id: ver.id, title: 'Asset1', role_target: 'Operator', operational_blueprint: {}, canonical_task_model: {}, know_it_plan: {}, simulator_steps: [] });
  
  await assignmentRepo.assignOrReassign({ organization_id: orgAId, learning_asset_id: asset.id, user_id: learner1.id });
  await assignmentRepo.assignOrReassign({ organization_id: orgAId, learning_asset_id: asset.id, user_id: learner2.id });

  // Test manager report scope
  const app = createVerificationApp();
  const server = app.listen(3001);
  
  try {
      const response = await fetch('http://localhost:3001/api/manager/reports', {
          headers: { 'x-test-user-id': mgrA.id }
      });
      const data = await response.json();
      
      const reportUserIds = data.reports.map((r: any) => r.user_id);
      
      if (reportUserIds.includes(learner1.id) && !reportUserIds.includes(learner2.id)) {
          console.log('PASS: Manager report scoped correctly to managed team.');
      } else {
          console.error('FAIL: Manager report scope incorrect.');
          process.exit(1);
      }

      // Test admin reporting scope
      const responseAdmin = await fetch('http://localhost:3001/api/admin/reports', {
          headers: { 'x-test-user-id': (await userRepo.create({ organization_id: orgAId, email: 'admin@test.com', full_name: 'Admin', role: 'admin' })).id }
      });
      const dataAdmin = await responseAdmin.json();
      if (dataAdmin.reports.length >= 2) {
          console.log('PASS: Admin report sees all org assignments.');
      } else {
          console.error('FAIL: Admin report scope incorrect.');
          process.exit(1);
      }

      // Test unauthorized
      const responseUnauth = await fetch('http://localhost:3001/api/manager/reports');
      if (responseUnauth.status === 401) {
          console.log('PASS: Unauthenticated request rejected.');
      } else {
          console.error('FAIL: Unauthenticated request allowed.');
          process.exit(1);
      }
  } finally {
      server.close();
      await closePool();
  }
}

runPhase6Tests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
