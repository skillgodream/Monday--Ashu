/**
 * GURU COACH LMS - TEAM REPOSITORY
 * Strictly enforces tenant-scoped operations for teams and memberships.
 */

import { query } from '../pool.js';
import { ITeamRepository, TeamEntity, TeamMemberEntity, UserEntity } from '../types.js';

export class TeamRepository implements ITeamRepository {
  async create(data: {
    organization_id: string;
    name: string;
    department: string;
    manager_id?: string | null;
  }): Promise<TeamEntity> {
    const res = await query<TeamEntity>(
      `INSERT INTO teams (organization_id, name, department, manager_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *;`,
      [data.organization_id, data.name.trim(), data.department.trim(), data.manager_id || null]
    );
    return res.rows[0];
  }

  async findById(organization_id: string, id: string): Promise<TeamEntity | null> {
    const res = await query<TeamEntity>(
      `SELECT * FROM teams
       WHERE id = $1 AND organization_id = $2 AND is_active = true
       LIMIT 1;`,
      [id, organization_id]
    );
    return res.rows[0] || null;
  }

  async listByOrganization(organization_id: string): Promise<TeamEntity[]> {
    const res = await query<TeamEntity>(
      `SELECT t.*, u.full_name AS manager_name,
              (SELECT COUNT(*)::int FROM team_members tm WHERE tm.team_id = t.id AND tm.organization_id = t.organization_id) AS member_count
       FROM teams t
       LEFT JOIN users u ON u.id = t.manager_id AND u.organization_id = t.organization_id
       WHERE t.organization_id = $1 AND t.is_active = true
       ORDER BY t.name ASC;`,
      [organization_id]
    );
    return res.rows;
  }

  async listByManager(organization_id: string, manager_id: string): Promise<TeamEntity[]> {
    const res = await query<TeamEntity>(
      `SELECT t.*, u.full_name AS manager_name,
              (SELECT COUNT(*)::int FROM team_members tm WHERE tm.team_id = t.id AND tm.organization_id = t.organization_id) AS member_count
       FROM teams t
       LEFT JOIN users u ON u.id = t.manager_id AND u.organization_id = t.organization_id
       WHERE t.organization_id = $1 AND t.manager_id = $2 AND t.is_active = true
       ORDER BY t.name ASC;`,
      [organization_id, manager_id]
    );
    return res.rows;
  }

  async update(
    organization_id: string,
    id: string,
    data: Partial<{ name: string; department: string; manager_id: string | null; is_active: boolean }>
  ): Promise<TeamEntity | null> {
    const updates: string[] = [];
    const values: any[] = [id, organization_id];
    let idx = 3;

    if (data.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(data.name.trim());
    }
    if (data.department !== undefined) {
      updates.push(`department = $${idx++}`);
      values.push(data.department.trim());
    }
    if (data.manager_id !== undefined) {
      updates.push(`manager_id = $${idx++}`);
      values.push(data.manager_id || null);
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(data.is_active);
    }

    if (updates.length === 0) {
      return this.findById(organization_id, id);
    }

    updates.push(`updated_at = NOW()`);

    const res = await query<TeamEntity>(
      `UPDATE teams
       SET ${updates.join(', ')}
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      values
    );
    return res.rows[0] || null;
  }

  async addMember(organization_id: string, team_id: string, user_id: string): Promise<TeamMemberEntity> {
    const res = await query<TeamMemberEntity>(
      `INSERT INTO team_members (organization_id, team_id, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (team_id, user_id) DO UPDATE SET joined_at = NOW()
       RETURNING *;`,
      [organization_id, team_id, user_id]
    );
    return res.rows[0];
  }

  async removeMember(organization_id: string, team_id: string, user_id: string): Promise<boolean> {
    const res = await query(
      `DELETE FROM team_members
       WHERE organization_id = $1 AND team_id = $2 AND user_id = $3;`,
      [organization_id, team_id, user_id]
    );
    return (res.rowCount || 0) > 0;
  }

  async getRoster(organization_id: string, team_id: string): Promise<UserEntity[]> {
    const res = await query<UserEntity>(
      `SELECT u.* FROM users u
       JOIN team_members tm ON tm.user_id = u.id AND tm.organization_id = u.organization_id
       WHERE tm.team_id = $1 AND tm.organization_id = $2 AND u.is_active = true
       ORDER BY u.full_name ASC;`,
      [team_id, organization_id]
    );
    return res.rows;
  }
}

export const teamRepo = new TeamRepository();
