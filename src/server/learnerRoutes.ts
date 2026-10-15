/**
 * GURU COACH LMS - PHASE 5 LEARNER DASHBOARD & LEARNING JOURNEY ROUTES
 *
 * Implements tenant-isolated and identity-verified endpoints for frontline learners:
 * 1. Learner Dashboard & Today's Learning
 * 2. Learner Assignments & Progress Tracking
 * 3. Assessment Attempt Ingestion
 * 4. Evidence-driven progression without competing intelligence logic
 */

import { Express, Request, Response } from 'express';
import { authenticateRequest } from './authMiddleware.js';
import { assignmentRepo } from '../db/repositories/assignmentRepo.js';
import { contentRepo } from '../db/repositories/contentRepo.js';
import { auditRepo } from '../db/repositories/auditRepo.js';
import { AssignmentEntity } from '../db/types.js';

export function registerLearnerRoutes(app: Express) {
  // 1. Learner Dashboard & Today's Learning Summary
  app.get('/api/learner/dashboard', authenticateRequest, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organization_id;
      const userId = req.user!.id;

      // Fetch user's active assignments
      const userAssignments = await assignmentRepo.listByUser(orgId, userId);

      // Filter out draft, failed, or archived learning assets
      const validAssignments: any[] = [];
      for (const assign of userAssignments) {
        const asset = await contentRepo.getLearningAsset(orgId, assign.learning_asset_id);
        if (asset && (asset.status === 'published' || asset.status === 'approved')) {
          validAssignments.push({
            ...assign,
            asset_title: asset.title,
            asset_subtitle: asset.subtitle,
            asset_role_target: asset.role_target,
            asset_status: asset.status,
            operational_blueprint: asset.operational_blueprint,
            simulator_steps: asset.simulator_steps,
          });
        }
      }

      // Compute "Your Next Step" based on actual evidence & stages completed
      let primaryNextStep: any = null;
      if (validAssignments.length > 0) {
        const primary = validAssignments[0];
        const stages = primary.stages_completed || { learn: false, see: false, guide: false, prove: false };

        if (!stages.learn) {
          primaryNextStep = {
            assignment_id: primary.id,
            asset_id: primary.learning_asset_id,
            asset_title: primary.asset_title,
            action_code: 'learn',
            title: '1. Learn Operational Procedure',
            description: 'Understand the procedure, physical dexterity, and compliance reasoning.',
            mode_target: 'learn_with_me',
          };
        } else if (!stages.see) {
          primaryNextStep = {
            assignment_id: primary.id,
            asset_id: primary.learning_asset_id,
            asset_title: primary.asset_title,
            action_code: 'see',
            title: '2. Inspect Video Demonstration',
            description: 'Watch the step-by-step visual demonstration of the standard operating procedure.',
            mode_target: 'show_me',
          };
        } else if (!stages.guide) {
          primaryNextStep = {
            assignment_id: primary.id,
            asset_id: primary.learning_asset_id,
            asset_title: primary.asset_title,
            action_code: 'guide',
            title: '3. Practise Step with Guidance',
            description: 'Execute the interactive workplace simulator with Guruji coaching prompts.',
            mode_target: 'guide_me',
          };
        } else if (!stages.prove) {
          primaryNextStep = {
            assignment_id: primary.id,
            asset_id: primary.learning_asset_id,
            asset_title: primary.asset_title,
            action_code: 'prove',
            title: '4. Attempt Test Me Assessment',
            description: 'Demonstrate operational understanding through critical control assessment.',
            mode_target: 'test_me',
          };
        } else {
          primaryNextStep = {
            assignment_id: primary.id,
            asset_id: primary.learning_asset_id,
            asset_title: primary.asset_title,
            action_code: 'observation_pending',
            title: 'Workplace Observation Sign-off',
            description: 'Cognitive stages complete. Awaiting physical demonstration sign-off by your Manager.',
            mode_target: 'observation',
          };
        }
      }

      // Fetch attempts across user assignments
      const attemptsList: any[] = [];
      for (const assign of validAssignments) {
        const attempts = await assignmentRepo.listAttempts(orgId, assign.id);
        attemptsList.push(...attempts);
      }

      return res.json({
        success: true,
        user: {
          id: req.user!.id,
          full_name: req.user!.full_name,
          email: req.user!.email,
          job_title: req.user!.job_title,
          role: req.user!.role,
        },
        assignments: validAssignments,
        nextStep: primaryNextStep,
        attempts: attemptsList,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to fetch learner dashboard' });
    }
  });

  // 2. List Learner Active Assignments
  app.get('/api/learner/assignments', authenticateRequest, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organization_id;
      const userId = req.user!.id;

      const userAssignments = await assignmentRepo.listByUser(orgId, userId);

      // Filter out draft/archived assets
      const validAssignments = [];
      for (const assign of userAssignments) {
        const asset = await contentRepo.getLearningAsset(orgId, assign.learning_asset_id);
        if (asset && (asset.status === 'published' || asset.status === 'approved')) {
          validAssignments.push({
            ...assign,
            asset_title: asset.title,
            asset_subtitle: asset.subtitle,
            asset_role_target: asset.role_target,
          });
        }
      }

      return res.json({ success: true, assignments: validAssignments });
    } catch (err: any) {
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to list assignments' });
    }
  });

  // 3. Get Single Assignment Detail
  app.get('/api/learner/assignments/:id', authenticateRequest, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organization_id;
      const userId = req.user!.id;

      const assignment = await assignmentRepo.findById(orgId, req.params.id);
      if (!assignment) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Assignment not found' });
      }

      // Security check: ensure assignment belongs to authenticated learner
      if (assignment.user_id !== userId) {
        return res.status(403).json({
          error: 'FORBIDDEN_USER_MISMATCH',
          message: 'Access denied. You can only view your own assigned learning journeys.',
        });
      }

      const asset = await contentRepo.getLearningAsset(orgId, assignment.learning_asset_id);
      if (!asset || (asset.status !== 'published' && asset.status !== 'approved')) {
        return res.status(404).json({ error: 'UNAVAILABLE_CONTENT', message: 'Assigned learning asset is unavailable or unpublished' });
      }

      const attempts = await assignmentRepo.listAttempts(orgId, assignment.id);

      return res.json({
        success: true,
        assignment: {
          ...assignment,
          asset_title: asset.title,
          asset_subtitle: asset.subtitle,
          asset_role_target: asset.role_target,
          operational_blueprint: asset.operational_blueprint,
          canonical_task_model: asset.canonical_task_model,
          know_it_plan: asset.know_it_plan,
          video_demonstration_plan: asset.video_demonstration_plan,
          simulator_steps: asset.simulator_steps,
        },
        attempts,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to get assignment details' });
    }
  });

  // 4. Update Interaction Progress
  app.post('/api/learner/assignments/:id/progress', authenticateRequest, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organization_id;
      const userId = req.user!.id;

      const assignment = await assignmentRepo.findById(orgId, req.params.id);
      if (!assignment) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Assignment not found' });
      }

      if (assignment.user_id !== userId) {
        return res.status(403).json({ error: 'FORBIDDEN_USER_MISMATCH', message: 'Cannot update another user assignment' });
      }

      const { progress_pct, stages_completed, status } = req.body || {};

      const updated = await assignmentRepo.updateInteractionProgress(orgId, assignment.id, {
        progress_pct,
        stages_completed,
        status,
      });

      return res.json({ success: true, assignment: updated });
    } catch (err: any) {
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to update progress' });
    }
  });

  // 5. Record Assessment Attempt Evidence
  app.post('/api/learner/assignments/:id/attempts', authenticateRequest, async (req: Request, res: Response) => {
    try {
      const orgId = req.user!.organization_id;
      const userId = req.user!.id;

      const assignment = await assignmentRepo.findById(orgId, req.params.id);
      if (!assignment) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Assignment not found' });
      }

      if (assignment.user_id !== userId) {
        return res.status(403).json({ error: 'FORBIDDEN_USER_MISMATCH', message: 'Cannot record assessment for another user' });
      }

      const { mode, score, passed, critical_controls_passed, missed_requirement_ids, attempt_number } = req.body || {};

      if (!mode || typeof score !== 'number') {
        return res.status(400).json({ error: 'INVALID_INPUT', message: 'mode and numeric score are required' });
      }

      // Get current attempts count
      const existingAttempts = await assignmentRepo.listAttempts(orgId, assignment.id);
      const nextAttemptNumber = attempt_number || existingAttempts.length + 1;

      const attempt = await assignmentRepo.recordAssessmentAttempt({
        organization_id: orgId,
        assignment_id: assignment.id,
        user_id: userId,
        attempt_number: nextAttemptNumber,
        mode: mode || 'test_me',
        score,
        passed: !!passed,
        critical_controls_passed: !!critical_controls_passed,
        missed_requirement_ids: Array.isArray(missed_requirement_ids) ? missed_requirement_ids : [],
      });

      // Safely update stages_completed & status if passed
      let updatedStages = { ...(assignment.stages_completed || {}) };
      if (mode === 'guide_me') updatedStages.guide = true;
      if (mode === 'test_me' && passed) updatedStages.prove = true;

      let newStatus = assignment.status;
      if (assignment.status === 'assigned') newStatus = 'in_progress';
      if (passed && mode === 'test_me') newStatus = 'ready_for_observation';

      await assignmentRepo.updateInteractionProgress(orgId, assignment.id, {
        stages_completed: updatedStages,
        status: newStatus,
        progress_pct: passed ? Math.max(assignment.progress_pct, 75) : assignment.progress_pct,
      });

      await auditRepo.recordEvent({
        organization_id: orgId,
        user_id: userId,
        action: 'ASSESSMENT_ATTEMPT_RECORDED',
        target_type: 'assessment_attempt',
        target_id: attempt.id,
        details: { assignment_id: assignment.id, mode, score, passed },
      });

      return res.status(201).json({ success: true, attempt });
    } catch (err: any) {
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to record assessment attempt' });
    }
  });
}
