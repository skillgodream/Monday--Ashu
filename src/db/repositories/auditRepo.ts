/**
 * GURU COACH LMS - AUDIT EVENT REPOSITORY
 * Append-only compliance & security event log.
 */

import { query } from '../pool.js';
import { IAuditRepository, AuditEventEntity } from '../types.js';

export class AuditRepository implements IAuditRepository {
  async recordEvent(data: {
    organization_id: string;
    user_id?: string | null;
    action: string;
    target_type: string;
    target_id: string;
    details?: Record<string, any>;
  }): Promise<AuditEventEntity> {
    const res = await query<AuditEventEntity>(
      `INSERT INTO audit_events (
         organization_id, user_id, action, target_type, target_id, details, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *;`,
      [
        data.organization_id,
        data.user_id || null,
        data.action.trim(),
        data.target_type.trim(),
        data.target_id,
        JSON.stringify(data.details || {}),
      ]
    );
    return res.rows[0];
  }

  async listEvents(organization_id: string, limit: number = 50): Promise<AuditEventEntity[]> {
    const res = await query<AuditEventEntity>(
      `SELECT * FROM audit_events
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT $2;`,
      [organization_id, Math.max(1, Math.min(limit, 200))]
    );
    return res.rows;
  }
}

export const auditRepo = new AuditRepository();
