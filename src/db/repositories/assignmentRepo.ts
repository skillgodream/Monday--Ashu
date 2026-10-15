/**
 * GURU COACH LMS - ASSIGNMENT & EVIDENCE REPOSITORY
 *
 * Implements transactional reassignment cycle tracking with database-enforced
 * single active assignment cycle guarantee.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 * DEAN remains the sole arbiter of cognitive mastery and readiness.
 * This repository strictly stores and retrieves raw assessment evidence and
 * supervisor observations without implementing competing decision rules.
 */

import { query, withTransaction } from '../pool.js';
import {
  IAssignmentRepository,
  AssignmentEntity,
  AssignmentStatus,
  AssessmentAttemptEntity,
  AssessmentMode,
  SupervisorObservationEntity,
  WorkplaceDecision,
} from '../types.js';

export class AssignmentRepository implements IAssignmentRepository {
  /**
   * Transactional reassignment engine:
   * 1. Safely deactivates any existing active cycle (marks is_active_cycle = false, status = 'superseded').
   * 2. Computes the sequential assignment_cycle (1, 2, 3...).
   * 3. Inserts the new active assignment cycle with start_date and optional due_date.
   * Concurrency is safe and backed by database partial unique index uq_active_assignment_cycle.
   */
  async assignOrReassign(data: {
    organization_id: string;
    learning_asset_id: string;
    user_id: string;
    assigned_by?: string | null;
    start_date?: Date | null;
    due_date?: Date | null;
  }): Promise<AssignmentEntity> {
    return await withTransaction(async (client) => {
      // 1. Mark existing active cycle superseded if present
      await client.query(
        `UPDATE assignments
         SET is_active_cycle = false,
             status = 'superseded',
             updated_at = NOW()
         WHERE user_id = $1 AND learning_asset_id = $2 AND is_active_cycle = true;`,
        [data.user_id, data.learning_asset_id]
      );

      // 2. Determine cycle number
      const cycleRes = await client.query<{ next_cycle: number }>(
        `SELECT COALESCE(MAX(assignment_cycle), 0) + 1 AS next_cycle
         FROM assignments
         WHERE user_id = $1 AND learning_asset_id = $2;`,
        [data.user_id, data.learning_asset_id]
      );
      const nextCycle = cycleRes.rows[0]?.next_cycle || 1;

      const startDate = data.start_date || new Date();

      // 3. Insert new active assignment cycle
      const insertRes = await client.query<AssignmentEntity>(
        `INSERT INTO assignments (
           organization_id, learning_asset_id, user_id, assigned_by,
           assignment_cycle, is_active_cycle, status, start_date, due_date,
           progress_pct, stages_completed, assigned_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, true, 'assigned', $6, $7, 0, '{"learn": false, "see": false, "guide": false, "prove": false}'::jsonb, NOW(), NOW())
         RETURNING *;`,
        [
          data.organization_id,
          data.learning_asset_id,
          data.user_id,
          data.assigned_by || null,
          nextCycle,
          startDate,
          data.due_date || null,
        ]
      );

      return insertRes.rows[0];
    });
  }

  async findById(organization_id: string, id: string): Promise<AssignmentEntity | null> {
    const res = await query<AssignmentEntity>(
      `SELECT a.*, u.full_name AS user_name, u.email AS user_email, u.job_title AS user_job_title,
              la.title AS asset_title, la.role_target AS asset_role_target,
              assigner.full_name AS assigner_name
       FROM assignments a
       JOIN users u ON u.id = a.user_id AND u.organization_id = a.organization_id
       JOIN learning_assets la ON la.id = a.learning_asset_id AND la.organization_id = a.organization_id
       LEFT JOIN users assigner ON assigner.id = a.assigned_by AND assigner.organization_id = a.organization_id
       WHERE a.id = $1 AND a.organization_id = $2
       LIMIT 1;`,
      [id, organization_id]
    );
    return res.rows[0] || null;
  }

  async findActiveAssignment(
    organization_id: string,
    user_id: string,
    learning_asset_id: string
  ): Promise<AssignmentEntity | null> {
    const res = await query<AssignmentEntity>(
      `SELECT * FROM assignments
       WHERE organization_id = $1 AND user_id = $2 AND learning_asset_id = $3 AND is_active_cycle = true
       LIMIT 1;`,
      [organization_id, user_id, learning_asset_id]
    );
    return res.rows[0] || null;
  }

  async listByUser(organization_id: string, user_id: string): Promise<AssignmentEntity[]> {
    const res = await query<AssignmentEntity>(
      `SELECT a.*, la.title AS asset_title, la.role_target AS asset_role_target
       FROM assignments a
       JOIN learning_assets la ON la.id = a.learning_asset_id AND la.organization_id = a.organization_id
       WHERE a.organization_id = $1 AND a.user_id = $2
       ORDER BY a.is_active_cycle DESC, a.assigned_at DESC;`,
      [organization_id, user_id]
    );
    return res.rows;
  }

  async listByOrganization(
    organization_id: string,
    filter?: { status?: string; team_id?: string; user_id?: string; learning_asset_id?: string }
  ): Promise<any[]> {
    const conditions: string[] = ['a.organization_id = $1'];
    const values: any[] = [organization_id];
    let idx = 2;

    if (filter?.status) {
      conditions.push(`a.status = $${idx++}`);
      values.push(filter.status);
    }
    if (filter?.user_id) {
      conditions.push(`a.user_id = $${idx++}`);
      values.push(filter.user_id);
    }
    if (filter?.learning_asset_id) {
      conditions.push(`a.learning_asset_id = $${idx++}`);
      values.push(filter.learning_asset_id);
    }
    if (filter?.team_id) {
      conditions.push(`EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.user_id = a.user_id AND tm.team_id = $${idx++} AND tm.organization_id = a.organization_id
      )`);
      values.push(filter.team_id);
    }

    const whereClause = conditions.join(' AND ');

    const res = await query(
      `SELECT a.*,
              u.full_name AS user_name, u.email AS user_email, u.job_title AS user_job_title,
              la.title AS asset_title, la.role_target AS asset_role_target, la.status AS asset_status,
              assigner.full_name AS assigner_name,
              COALESCE(
                (SELECT t.name FROM team_members tm
                 JOIN teams t ON t.id = tm.team_id AND t.organization_id = tm.organization_id
                 WHERE tm.user_id = u.id AND tm.organization_id = a.organization_id LIMIT 1),
                'Unassigned'
              ) AS team_name
       FROM assignments a
       JOIN users u ON u.id = a.user_id AND u.organization_id = a.organization_id
       JOIN learning_assets la ON la.id = a.learning_asset_id AND la.organization_id = a.organization_id
       LEFT JOIN users assigner ON assigner.id = a.assigned_by AND assigner.organization_id = a.organization_id
       WHERE ${whereClause}
       ORDER BY a.assigned_at DESC;`,
      values
    );
    return res.rows;
  }

  async cancelAssignment(
    organization_id: string,
    assignment_id: string,
    _cancelled_by?: string | null
  ): Promise<AssignmentEntity | null> {
    const res = await query<AssignmentEntity>(
      `UPDATE assignments
       SET status = 'cancelled',
           is_active_cycle = false,
           updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      [assignment_id, organization_id]
    );
    return res.rows[0] || null;
  }

  async updateAssignmentStatus(
    organization_id: string,
    assignment_id: string,
    data: Partial<{ status: AssignmentStatus; due_date: Date | null; start_date: Date | null }>
  ): Promise<AssignmentEntity | null> {
    const updates: string[] = [];
    const values: any[] = [assignment_id, organization_id];
    let idx = 3;

    if (data.status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(data.status);
    }
    if (data.due_date !== undefined) {
      updates.push(`due_date = $${idx++}`);
      values.push(data.due_date);
    }
    if (data.start_date !== undefined) {
      updates.push(`start_date = $${idx++}`);
      values.push(data.start_date);
    }

    if (updates.length === 0) {
      return this.findById(organization_id, assignment_id);
    }

    updates.push(`updated_at = NOW()`);

    const res = await query<AssignmentEntity>(
      `UPDATE assignments
       SET ${updates.join(', ')}
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      values
    );
    return res.rows[0] || null;
  }

  async updateInteractionProgress(
    organization_id: string,
    assignment_id: string,
    data: {
      progress_pct?: number;
      stages_completed?: Partial<{ learn: boolean; see: boolean; guide: boolean; prove: boolean }>;
      status?: AssignmentStatus;
    }
  ): Promise<AssignmentEntity | null> {
    return await withTransaction(async (client) => {
      const current = await client.query<AssignmentEntity>(
        `SELECT * FROM assignments WHERE id = $1 AND organization_id = $2 FOR UPDATE;`,
        [assignment_id, organization_id]
      );
      if (!current.rows[0]) return null;

      const curr = current.rows[0];
      const newPct = data.progress_pct !== undefined ? data.progress_pct : curr.progress_pct;
      const newStages = {
        ...curr.stages_completed,
        ...(data.stages_completed || {}),
      };
      const newStatus = data.status || curr.status;

      const res = await client.query<AssignmentEntity>(
        `UPDATE assignments
         SET progress_pct = $1,
             stages_completed = $2,
             status = $3,
             updated_at = NOW()
         WHERE id = $4 AND organization_id = $5
         RETURNING *;`,
        [newPct, JSON.stringify(newStages), newStatus, assignment_id, organization_id]
      );

      return res.rows[0] || null;
    });
  }

  /**
   * Pure evidence ingestion: Records raw scores and missed requirement IDs.
   * Does NOT calculate mastery or override DEAN.
   */
  async recordAssessmentAttempt(data: {
    organization_id: string;
    assignment_id: string;
    user_id: string;
    attempt_number: number;
    mode: AssessmentMode;
    score: number;
    passed: boolean;
    critical_controls_passed: boolean;
    missed_requirement_ids: string[];
  }): Promise<AssessmentAttemptEntity> {
    const res = await query<AssessmentAttemptEntity>(
      `INSERT INTO assessment_attempts (
         organization_id, assignment_id, user_id, attempt_number,
         mode, score, passed, critical_controls_passed, missed_requirement_ids, recorded_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *;`,
      [
        data.organization_id,
        data.assignment_id,
        data.user_id,
        data.attempt_number,
        data.mode,
        data.score,
        data.passed,
        data.critical_controls_passed,
        JSON.stringify(data.missed_requirement_ids),
      ]
    );
    return res.rows[0];
  }

  async listAttempts(
    organization_id: string,
    assignment_id: string
  ): Promise<AssessmentAttemptEntity[]> {
    const res = await query<AssessmentAttemptEntity>(
      `SELECT * FROM assessment_attempts
       WHERE organization_id = $1 AND assignment_id = $2
       ORDER BY attempt_number ASC, recorded_at ASC;`,
      [organization_id, assignment_id]
    );
    return res.rows;
  }

  /**
   * Pure evidence ingestion: Records supervisor observation sign-off and checklist.
   */
  async recordSupervisorObservation(data: {
    organization_id: string;
    assignment_id: string;
    supervisor_id: string;
    checklist_results: Record<string, any>;
    decision: WorkplaceDecision;
    overall_notes?: string | null;
  }): Promise<SupervisorObservationEntity> {
    const res = await query<SupervisorObservationEntity>(
      `INSERT INTO supervisor_observations (
         organization_id, assignment_id, supervisor_id,
         checklist_results, decision, overall_notes, observed_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *;`,
      [
        data.organization_id,
        data.assignment_id,
        data.supervisor_id,
        JSON.stringify(data.checklist_results),
        data.decision,
        data.overall_notes || null,
      ]
    );
    return res.rows[0];
  }
}

export const assignmentRepo = new AssignmentRepository();
