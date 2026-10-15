/**
 * GURU COACH LMS - ORGANIZATION REPOSITORY
 */

import { query } from '../pool.js';
import { IOrganizationRepository, OrganizationEntity } from '../types.js';

export class OrganizationRepository implements IOrganizationRepository {
  async create(data: { name: string; slug: string }): Promise<OrganizationEntity> {
    const res = await query<OrganizationEntity>(
      `INSERT INTO organizations (name, slug)
       VALUES ($1, $2)
       RETURNING *;`,
      [data.name.trim(), data.slug.trim().toLowerCase()]
    );
    return res.rows[0];
  }

  async findById(id: string): Promise<OrganizationEntity | null> {
    const res = await query<OrganizationEntity>(
      `SELECT * FROM organizations WHERE id = $1 AND is_active = true LIMIT 1;`,
      [id]
    );
    return res.rows[0] || null;
  }

  async findBySlug(slug: string): Promise<OrganizationEntity | null> {
    const res = await query<OrganizationEntity>(
      `SELECT * FROM organizations WHERE slug = $1 AND is_active = true LIMIT 1;`,
      [slug.trim().toLowerCase()]
    );
    return res.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await query('DELETE FROM organizations WHERE id = $1;', [id]);
    return (res.rowCount ?? 0) > 0;
  }
}

export const organizationRepo = new OrganizationRepository();
