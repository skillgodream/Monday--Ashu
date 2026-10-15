/**
 * GURU COACH LMS - PHASE 4 MANAGER TEAM & ASSIGNMENT ROUTES
 *
 * Implements tenant-scoped manager operations for team management,
 * assignment workflows, published content selection, status tracking,
 * and traceable audit logging.
 */

import { Express, Request, Response, NextFunction } from 'express';
import { authenticateRequest, requireRole } from './authMiddleware.js';
import { teamRepo } from '../db/repositories/teamRepo.js';
import { userRepo } from '../db/repositories/userRepo.js';
import { assignmentRepo } from '../db/repositories/assignmentRepo.js';
import { contentRepo } from '../db/repositories/contentRepo.js';
import { auditRepo } from '../db/repositories/auditRepo.js';

export function registerManagerRoutes(app: Express) {
  // 1. List Teams in Organization
  app.get(
    '/api/manager/teams',
    authenticateRequest,
    requireRole(['manager', 'admin']),
    async (req: Request, res: Response) => {
      try {
        const orgId = req.user!.organization_id;
        const teams = await teamRepo.listByOrganization(orgId);
        return res.json({ success: true, teams });
      } catch (err: any) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to list teams' });
      }
    }
  );

  // 2. Get Single Team Details and Roster
  app.get(
    '/api/manager/teams/:id',
    authenticateRequest,
    requireRole(['manager', 'admin']),
    async (req: Request, res: Response) => {
      try {
        const orgId = req.user!.organization_id;
        const team = await teamRepo.findById(orgId, req.params.id);
        if (!team) {
          return res.status(404).json({ error: 'NOT_FOUND', message: 'Team not found' });
        }
        const roster = await teamRepo.getRoster(orgId, team.id);
        return res.json({ success: true, team, roster });
      } catch (err: any) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to get team details' });
      }
    }
  );

  // 3. Create Team
  app.post(
    '/api/manager/teams',
    authenticateRequest,
    requireRole(['manager', 'admin']),
    async (req: Request, res: Response) => {
      try {
        const orgId = req.user!.organization_id;
        const { name, department, manager_id } = req.body || {};

        if (!name || typeof name !== 'string' || !name.trim()) {
          return res.status(400).json({ error: 'INVALID_INPUT', message: 'Team name is required' });
        }
        if (!department || typeof department !== 'string' || !department.trim()) {
          return res.status(400).json({ error: 'INVALID_INPUT', message: 'Team department is required' });
        }

        // If manager_id provided, verify manager belongs to same organization
        let assignedManagerId = req.user!.id;
        if (manager_id) {
          const mgrUser = await userRepo.findById(orgId, manager_id);
          if (!mgrUser) {
            return res.status(400).json({ error: 'INVALID_MANAGER', message: 'Assigned manager does not belong to this organization' });
          }
          assignedManagerId = mgrUser.id;
        }

        const team = await teamRepo.create({
          organization_id: orgId,
          name,
          department,
          manager_id: assignedManagerId,
        });

        await auditRepo.recordEvent({
          organization_id: orgId,
          user_id: req.user!.id,
          action: 'TEAM_CREATED',
          target_type: 'team',
          target_id: team.id,
          details: { name: team.name, department: team.department, manager_id: assignedManagerId },
        });

        return res.status(201).json({ success: true, team });
      } catch (err: any) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to create team' });
      }
    }
  );

  // 4. Update Team
  app.put(
    '/api/manager/teams/:id',
    authenticateRequest,
    requireRole(['manager', 'admin']),
    async (req: Request, res: Response) => {
      try {
        const orgId = req.user!.organization_id;
        const existing = await teamRepo.findById(orgId, req.params.id);
        if (!existing) {
          return res.status(404).json({ error: 'NOT_FOUND', message: 'Team not found' });
        }

        const updated = await teamRepo.update(orgId, req.params.id, req.body);

        await auditRepo.recordEvent({
          organization_id: orgId,
          user_id: req.user!.id,
          action: 'TEAM_UPDATED',
          target_type: 'team',
          target_id: req.params.id,
          details: req.body,
        });

        return res.json({ success: true, team: updated });
      } catch (err: any) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to update team' });
      }
    }
  );

  // 5. Add Member to Team (Tenant Isolation Enforcement)
  app.post(
    '/api/manager/teams/:id/members',
    authenticateRequest,
    requireRole(['manager', 'admin']),
    async (req: Request, res: Response) => {
      try {
        const orgId = req.user!.organization_id;
        const team = await teamRepo.findById(orgId, req.params.id);
        if (!team) {
          return res.status(404).json({ error: 'NOT_FOUND', message: 'Team not found' });
        }

        const { user_id } = req.body || {};
        if (!user_id || typeof user_id !== 'string') {
          return res.status(400).json({ error: 'INVALID_INPUT', message: 'user_id is required' });
        }

        // Verify target user belongs to SAME organization
        const user = await userRepo.findById(orgId, user_id);
        if (!user) {
          return res.status(403).json({
            error: 'FORBIDDEN_TENANT_MISMATCH',
            message: 'Cannot add user to team: user does not belong to your organization',
          });
        }

        const member = await teamRepo.addMember(orgId, team.id, user.id);

        await auditRepo.recordEvent({
          organization_id: orgId,
          user_id: req.user!.id,
          action: 'TEAM_MEMBER_ADDED',
          target_type: 'team_member',
          target_id: member.id,
          details: { team_id: team.id, user_id: user.id, user_name: user.full_name },
        });

        return res.status(200).json({ success: true, member });
      } catch (err: any) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to add team member' });
      }
    }
  );

  // 6. Remove Member from Team
  app.delete(
    '/api/manager/teams/:id/members/:userId',
    authenticateRequest,
    requireRole(['manager', 'admin']),
    async (req: Request, res: Response) => {
      try {
        const orgId = req.user!.organization_id;
        const team = await teamRepo.findById(orgId, req.params.id);
        if (!team) {
          return res.status(404).json({ error: 'NOT_FOUND', message: 'Team not found' });
        }

        const removed = await teamRepo.removeMember(orgId, team.id, req.params.userId);

        await auditRepo.recordEvent({
          organization_id: orgId,
          user_id: req.user!.id,
          action: 'TEAM_MEMBER_REMOVED',
          target_type: 'team',
          target_id: team.id,
          details: { user_id: req.params.userId },
        });

        return res.json({ success: true, removed });
      } catch (err: any) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to remove team member' });
      }
    }
  );

  // 7. List Organization Users/Members
  app.get(
    '/api/manager/users',
    authenticateRequest,
    requireRole(['manager', 'admin']),
    async (req: Request, res: Response) => {
      try {
        const orgId = req.user!.organization_id;
        const role = req.query.role as any;
        const users = await userRepo.listByRole(orgId, role);
        return res.json({ success: true, users });
      } catch (err: any) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to list users' });
      }
    }
  );

  // 8. List Published Learning Assets Available to Organization
  app.get(
    '/api/manager/published-assets',
    authenticateRequest,
    requireRole(['manager', 'admin']),
    async (req: Request, res: Response) => {
      try {
        const orgId = req.user!.organization_id;
        const approvedAssets = await contentRepo.listApprovedAssets(orgId);
        const publishedAssets = await contentRepo.listLearningAssets(orgId, { status: 'published' });

        // Deduplicate assets by ID
        const assetMap = new Map();
        [...approvedAssets, ...publishedAssets].forEach((a) => assetMap.set(a.id, a));
        const assets = Array.from(assetMap.values());

        return res.json({ success: true, assets });
      } catch (err: any) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to list published assets' });
      }
    }
  );

  // 9. Create Learning Assignment (Individual or Team, with Date Order Validation)
  app.post(
    '/api/manager/assignments',
    authenticateRequest,
    requireRole(['manager', 'admin']),
    async (req: Request, res: Response) => {
      try {
        const orgId = req.user!.organization_id;
        const { learning_asset_id, recipient_type, user_ids, user_id, team_id, start_date, due_date } = req.body || {};

        if (!learning_asset_id) {
          return res.status(400).json({ error: 'INVALID_INPUT', message: 'learning_asset_id is required' });
        }

        // Verify learning asset exists, belongs to tenant, and is published/approved
        const asset = await contentRepo.getLearningAsset(orgId, learning_asset_id);
        if (!asset) {
          return res.status(404).json({ error: 'NOT_FOUND', message: 'Published learning asset not found in your organization' });
        }

        if (asset.status !== 'published' && asset.status !== 'approved') {
          return res.status(400).json({ error: 'UNPUBLISHED_CONTENT', message: 'Cannot assign content that is not in published or approved state' });
        }

        // Validate Date Order (due_date cannot be before start_date)
        const parsedStartDate = start_date ? new Date(start_date) : new Date();
        let parsedDueDate: Date | null = null;
        if (due_date) {
          parsedDueDate = new Date(due_date);
          if (isNaN(parsedDueDate.getTime())) {
            return res.status(400).json({ error: 'INVALID_DATE', message: 'Invalid due_date format' });
          }
          if (parsedDueDate.getTime() < parsedStartDate.getTime()) {
            return res.status(400).json({
              error: 'INVALID_DATE_ORDER',
              message: 'Due date cannot be set before start date',
            });
          }
        }

        // Resolve target user IDs
        let targetUserIds: string[] = [];

        if (recipient_type === 'team' || team_id) {
          if (!team_id) {
            return res.status(400).json({ error: 'INVALID_INPUT', message: 'team_id is required for team assignment' });
          }
          const team = await teamRepo.findById(orgId, team_id);
          if (!team) {
            return res.status(404).json({ error: 'NOT_FOUND', message: 'Team not found in your organization' });
          }
          const roster = await teamRepo.getRoster(orgId, team.id);
          targetUserIds = roster.map((u) => u.id);
          if (targetUserIds.length === 0) {
            return res.status(400).json({ error: 'EMPTY_TEAM', message: 'Selected team has no active members to assign' });
          }
        } else if (Array.isArray(user_ids) && user_ids.length > 0) {
          targetUserIds = user_ids;
        } else if (user_id) {
          targetUserIds = [user_id];
        } else {
          return res.status(400).json({ error: 'INVALID_INPUT', message: 'Recipient selection required (user_id, user_ids, or team_id)' });
        }

        // Create assignments with exact version pinning and audit logs
        const createdAssignments = [];
        for (const uid of targetUserIds) {
          const user = await userRepo.findById(orgId, uid);
          if (!user) {
            continue; // Skip users outside tenant
          }

          const assignment = await assignmentRepo.assignOrReassign({
            organization_id: orgId,
            learning_asset_id: asset.id,
            user_id: user.id,
            assigned_by: req.user!.id,
            start_date: parsedStartDate,
            due_date: parsedDueDate,
          });

          await auditRepo.recordEvent({
            organization_id: orgId,
            user_id: req.user!.id,
            action: 'ASSIGNMENT_CREATED',
            target_type: 'assignment',
            target_id: assignment.id,
            details: {
              learning_asset_id: asset.id,
              learning_asset_title: asset.title,
              assigned_to_user_id: user.id,
              assigned_to_user_name: user.full_name,
              start_date: parsedStartDate,
              due_date: parsedDueDate,
              team_id: team_id || null,
            },
          });

          createdAssignments.push(assignment);
        }

        return res.status(201).json({ success: true, count: createdAssignments.length, assignments: createdAssignments });
      } catch (err: any) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to create assignment' });
      }
    }
  );

  // 10. List Organization Assignments
  app.get(
    '/api/manager/assignments',
    authenticateRequest,
    requireRole(['manager', 'admin']),
    async (req: Request, res: Response) => {
      try {
        const orgId = req.user!.organization_id;
        const filter = {
          status: req.query.status as string,
          team_id: req.query.team_id as string,
          user_id: req.query.user_id as string,
          learning_asset_id: req.query.learning_asset_id as string,
        };

        const assignments = await assignmentRepo.listByOrganization(orgId, filter);
        return res.json({ success: true, assignments });
      } catch (err: any) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to list assignments' });
      }
    }
  );

  // 11. Get Single Assignment Detail
  app.get(
    '/api/manager/assignments/:id',
    authenticateRequest,
    requireRole(['manager', 'admin']),
    async (req: Request, res: Response) => {
      try {
        const orgId = req.user!.organization_id;
        const assignment = await assignmentRepo.findById(orgId, req.params.id);
        if (!assignment) {
          return res.status(404).json({ error: 'NOT_FOUND', message: 'Assignment not found' });
        }

        const attempts = await assignmentRepo.listAttempts(orgId, assignment.id);
        return res.json({ success: true, assignment, attempts });
      } catch (err: any) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to get assignment detail' });
      }
    }
  );

  // 12. Update / Correct Assignment
  app.patch(
    '/api/manager/assignments/:id',
    authenticateRequest,
    requireRole(['manager', 'admin']),
    async (req: Request, res: Response) => {
      try {
        const orgId = req.user!.organization_id;
        const existing = await assignmentRepo.findById(orgId, req.params.id);
        if (!existing) {
          return res.status(404).json({ error: 'NOT_FOUND', message: 'Assignment not found' });
        }

        const { status, due_date, start_date } = req.body || {};

        let parsedStartDate = start_date ? new Date(start_date) : existing.start_date ? new Date(existing.start_date) : new Date();
        let parsedDueDate = due_date !== undefined ? (due_date ? new Date(due_date) : null) : existing.due_date ? new Date(existing.due_date) : null;

        if (parsedDueDate && parsedStartDate && parsedDueDate.getTime() < parsedStartDate.getTime()) {
          return res.status(400).json({ error: 'INVALID_DATE_ORDER', message: 'Due date cannot be before start date' });
        }

        const updated = await assignmentRepo.updateAssignmentStatus(orgId, req.params.id, {
          status,
          due_date: parsedDueDate,
          start_date: parsedStartDate,
        });

        await auditRepo.recordEvent({
          organization_id: orgId,
          user_id: req.user!.id,
          action: 'ASSIGNMENT_UPDATED',
          target_type: 'assignment',
          target_id: req.params.id,
          details: { previous_status: existing.status, new_status: status, due_date: parsedDueDate },
        });

        return res.json({ success: true, assignment: updated });
      } catch (err: any) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to update assignment' });
      }
    }
  );

  // 13. Cancel Assignment
  app.post(
    '/api/manager/assignments/:id/cancel',
    authenticateRequest,
    requireRole(['manager', 'admin']),
    async (req: Request, res: Response) => {
      try {
        const orgId = req.user!.organization_id;
        const existing = await assignmentRepo.findById(orgId, req.params.id);
        if (!existing) {
          return res.status(404).json({ error: 'NOT_FOUND', message: 'Assignment not found' });
        }

        const cancelled = await assignmentRepo.cancelAssignment(orgId, req.params.id, req.user!.id);

        await auditRepo.recordEvent({
          organization_id: orgId,
          user_id: req.user!.id,
          action: 'ASSIGNMENT_CANCELLED',
          target_type: 'assignment',
          target_id: req.params.id,
          details: { previous_status: existing.status },
        });

        return res.json({ success: true, assignment: cancelled });
      } catch (err: any) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to cancel assignment' });
      }
    }
  );

  // 14. Manager Audit Trail
  app.get(
    '/api/manager/audit-trail',
    authenticateRequest,
    requireRole(['manager', 'admin']),
    async (req: Request, res: Response) => {
      try {
        const orgId = req.user!.organization_id;
        const limit = Number(req.query.limit) || 50;
        const events = await auditRepo.listEvents(orgId, limit);
        return res.json({ success: true, events });
      } catch (err: any) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to fetch audit trail' });
      }
    }
  );
  // 7. Manager Reporting
  app.get(
    '/api/manager/reports',
    authenticateRequest,
    requireRole(['manager', 'admin']),
    async (req: Request, res: Response) => {
      try {
        const orgId = req.user!.organization_id;
        let assignments: any[] = [];
        
        if (req.userRole === 'admin') {
            assignments = await assignmentRepo.listByOrganization(orgId);
        } else {
            // Manager: only see assignments for teams they manage
            const teams = await teamRepo.listByManager(orgId, req.user!.id);
            assignments = await Promise.all(teams.map(t => assignmentRepo.listByOrganization(orgId, { team_id: t.id })))
                .then(res => res.flat());
        }

        // Enrich assignments with attempts and observations
        const enriched = await Promise.all(assignments.map(async (a) => {
            const attempts = await assignmentRepo.listAttempts(orgId, a.id);
            return { ...a, attempts };
        }));

        return res.json({ success: true, reports: enriched });
      } catch (err: any) {
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: err?.message || 'Failed to fetch manager reports' });
      }
    }
  );
}
