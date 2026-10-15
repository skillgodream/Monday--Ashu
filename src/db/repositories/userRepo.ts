/**
 * GURU COACH LMS - USER REPOSITORY
 * Strictly enforces tenant-scoped queries by organization_id.
 */

import { query } from '../pool.js';
import { IUserRepository, UserEntity, UserRole } from '../types.js';

export class UserRepository implements IUserRepository {
  async create(data: {
    organization_id: string;
    email: string;
    full_name: string;
    role: UserRole;
    job_title?: string;
    badge_id?: string;
    firebase_uid?: string;
    auth_provider?: string;
  }): Promise<UserEntity> {
    const res = await query<UserEntity>(
      `INSERT INTO users (organization_id, email, full_name, role, job_title, badge_id, firebase_uid, auth_provider)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *;`,
      [
        data.organization_id,
        data.email.trim().toLowerCase(),
        data.full_name.trim(),
        data.role,
        data.job_title?.trim() || 'Frontline Worker',
        data.badge_id?.trim() || null,
        data.firebase_uid || null,
        data.auth_provider || 'firebase',
      ]
    );
    return res.rows[0];
  }

  async findById(organization_id: string, id: string): Promise<UserEntity | null> {
    const res = await query<UserEntity>(
      `SELECT * FROM users
       WHERE id = $1 AND organization_id = $2 AND is_active = true
       LIMIT 1;`,
      [id, organization_id]
    );
    return res.rows[0] || null;
  }

  async findByEmail(organization_id: string, email: string): Promise<UserEntity | null> {
    const res = await query<UserEntity>(
      `SELECT * FROM users
       WHERE organization_id = $1 AND email = $2 AND is_active = true
       LIMIT 1;`,
      [organization_id, email.trim().toLowerCase()]
    );
    return res.rows[0] || null;
  }

  async listByRole(organization_id: string, role?: UserRole): Promise<UserEntity[]> {
    if (role) {
      const res = await query<UserEntity>(
        `SELECT * FROM users
         WHERE organization_id = $1 AND role = $2 AND is_active = true
         ORDER BY full_name ASC;`,
        [organization_id, role]
      );
      return res.rows;
    }

    const res = await query<UserEntity>(
      `SELECT * FROM users
       WHERE organization_id = $1 AND is_active = true
       ORDER BY role ASC, full_name ASC;`,
      [organization_id]
    );
    return res.rows;
  }

  async findByFirebaseUid(firebaseUid: string): Promise<UserEntity | null> {
    const res = await query<UserEntity>(
      `SELECT * FROM users
       WHERE firebase_uid = $1 AND is_active = true
       LIMIT 1;`,
      [firebaseUid.trim()]
    );
    return res.rows[0] || null;
  }

  async findActiveByEmailGlobally(email: string): Promise<UserEntity[]> {
    const res = await query<UserEntity>(
      `SELECT * FROM users
       WHERE email = $1 AND is_active = true;`,
      [email.trim().toLowerCase()]
    );
    return res.rows;
  }

  async linkFirebaseUid(
    organization_id: string,
    userId: string,
    firebaseUid: string,
    email: string
  ): Promise<UserEntity | null> {
    const res = await query<UserEntity>(
      `UPDATE users
       SET firebase_uid = $1, last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND organization_id = $3 AND email = $4 AND firebase_uid IS NULL AND is_active = true
       RETURNING *;`,
      [firebaseUid.trim(), userId, organization_id, email.trim().toLowerCase()]
    );
    return res.rows[0] || null;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await query(
      `UPDATE users
       SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1;`,
      [userId]
    );
  }
}

export const userRepo = new UserRepository();
