/**
 * GURU COACH LMS - CONTENT & SOURCE REVISION REPOSITORY
 *
 * Enforces logical document identity vs version content identity.
 * Detects duplicate content hashes and preserves complete revision lineage.
 */

import { query, withTransaction } from '../pool.js';
import {
  IContentRepository,
  SourceDocumentEntity,
  SourceVersionEntity,
  LearningAssetEntity,
  LearningAssetStatus,
} from '../types.js';

export class ContentRepository implements IContentRepository {
  async createOrFindSourceDocument(data: {
    organization_id: string;
    doc_code: string;
    title: string;
    category?: string;
    created_by?: string | null;
  }): Promise<SourceDocumentEntity> {
    const existing = await query<SourceDocumentEntity>(
      `SELECT * FROM source_documents
       WHERE organization_id = $1 AND doc_code = $2
       LIMIT 1;`,
      [data.organization_id, data.doc_code.trim()]
    );

    if (existing.rows[0]) {
      return existing.rows[0];
    }

    const res = await query<SourceDocumentEntity>(
      `INSERT INTO source_documents (organization_id, doc_code, title, category, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [
        data.organization_id,
        data.doc_code.trim(),
        data.title.trim(),
        data.category?.trim() || 'General',
        data.created_by || null,
      ]
    );
    return res.rows[0];
  }

  async createSourceVersion(data: {
    organization_id: string;
    source_document_id: string;
    content_hash: string;
    original_filename: string;
    mime_type: string;
    extracted_text: string;
    word_count: number;
    page_count: number;
    change_summary?: string;
    diagnostics?: Record<string, any>;
    created_by?: string | null;
  }): Promise<{ version: SourceVersionEntity; isDuplicate: boolean }> {
    return await withTransaction(async (client) => {
      // 1. Check if an identical version content hash already exists for this document
      const dupCheck = await client.query<SourceVersionEntity>(
        `SELECT * FROM source_versions
         WHERE source_document_id = $1 AND content_hash = $2
         LIMIT 1;`,
        [data.source_document_id, data.content_hash]
      );

      if (dupCheck.rows[0]) {
        return { version: dupCheck.rows[0], isDuplicate: true };
      }

      // 2. Calculate next version number
      const maxVerRes = await client.query<{ max_ver: number | null }>(
        `SELECT MAX(version_number) as max_ver
         FROM source_versions
         WHERE source_document_id = $1;`,
        [data.source_document_id]
      );
      const nextVerNumber = (maxVerRes.rows[0]?.max_ver || 0) + 1;
      const versionLabel = `v${nextVerNumber}.0`;

      // 3. Deactivate older versions as current active
      await client.query(
        `UPDATE source_versions
         SET is_active = false
         WHERE source_document_id = $1;`,
        [data.source_document_id]
      );

      // 4. Insert new source version row
      const insertRes = await client.query<SourceVersionEntity>(
        `INSERT INTO source_versions (
           organization_id, source_document_id, version_number, version_label,
           content_hash, original_filename, mime_type, extracted_text,
           word_count, page_count, change_summary, diagnostics, is_active, created_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13)
         RETURNING *;`,
        [
          data.organization_id,
          data.source_document_id,
          nextVerNumber,
          versionLabel,
          data.content_hash,
          data.original_filename,
          data.mime_type,
          data.extracted_text,
          data.word_count,
          data.page_count,
          data.change_summary || null,
          JSON.stringify(data.diagnostics || {}),
          data.created_by || null,
        ]
      );

      return { version: insertRes.rows[0], isDuplicate: false };
    });
  }

  async findVersionByHash(
    organization_id: string,
    content_hash: string
  ): Promise<SourceVersionEntity | null> {
    const res = await query<SourceVersionEntity>(
      `SELECT * FROM source_versions
       WHERE organization_id = $1 AND content_hash = $2
       LIMIT 1;`,
      [organization_id, content_hash]
    );
    return res.rows[0] || null;
  }

  async createLearningAsset(data: {
    organization_id: string;
    source_version_id: string;
    title: string;
    subtitle?: string;
    role_target: string;
    operational_blueprint: Record<string, any>;
    canonical_task_model: Record<string, any>;
    know_it_plan: Record<string, any>;
    video_demonstration_plan?: Record<string, any> | null;
    simulator_steps: Record<string, any>[];
    generation_metadata?: Record<string, any>;
    status?: LearningAssetStatus;
    approved_by?: string | null;
  }): Promise<LearningAssetEntity> {
    const res = await query<LearningAssetEntity>(
      `INSERT INTO learning_assets (
         organization_id, source_version_id, title, subtitle, role_target,
         operational_blueprint, canonical_task_model, know_it_plan,
         video_demonstration_plan, simulator_steps, generation_metadata,
         status, approved_by, approved_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *;`,
      [
        data.organization_id,
        data.source_version_id,
        data.title.trim(),
        data.subtitle?.trim() || null,
        data.role_target.trim(),
        JSON.stringify(data.operational_blueprint),
        JSON.stringify(data.canonical_task_model),
        JSON.stringify(data.know_it_plan),
        data.video_demonstration_plan ? JSON.stringify(data.video_demonstration_plan) : null,
        JSON.stringify(data.simulator_steps),
        JSON.stringify(data.generation_metadata || {}),
        data.status || 'draft',
        data.approved_by || null,
        data.approved_by ? new Date() : null,
      ]
    );
    return res.rows[0];
  }

  async getLearningAsset(organization_id: string, id: string): Promise<LearningAssetEntity | null> {
    const res = await query<LearningAssetEntity>(
      `SELECT * FROM learning_assets
       WHERE id = $1 AND organization_id = $2
       LIMIT 1;`,
      [id, organization_id]
    );
    return res.rows[0] || null;
  }

  async listApprovedAssets(organization_id: string): Promise<LearningAssetEntity[]> {
    const res = await query<LearningAssetEntity>(
      `SELECT * FROM learning_assets
       WHERE organization_id = $1 AND status IN ('approved', 'published')
       ORDER BY title ASC;`,
      [organization_id]
    );
    return res.rows;
  }

  // =========================================================================
  // PHASE 3: ADMIN CONTENT MANAGEMENT LIFECYCLE METHODS
  // =========================================================================

  async listSourceDocuments(organization_id: string): Promise<any[]> {
    const res = await query<any>(
      `SELECT 
         sd.id,
         sd.organization_id,
         sd.doc_code,
         sd.title,
         sd.category,
         sd.created_by,
         sd.created_at,
         sd.updated_at,
         COUNT(sv.id)::int AS version_count,
         (
           SELECT json_build_object(
             'id', sv2.id,
             'version_number', sv2.version_number,
             'version_label', sv2.version_label,
             'original_filename', sv2.original_filename,
             'content_hash', sv2.content_hash,
             'is_active', sv2.is_active,
             'word_count', sv2.word_count,
             'page_count', sv2.page_count,
             'created_at', sv2.created_at,
             'diagnostics', sv2.diagnostics
           )
           FROM source_versions sv2
           WHERE sv2.source_document_id = sd.id AND sv2.organization_id = sd.organization_id
           ORDER BY sv2.version_number DESC
           LIMIT 1
         ) AS latest_version,
         (
           SELECT json_build_object(
             'id', la.id,
             'title', la.title,
             'subtitle', la.subtitle,
             'role_target', la.role_target,
             'status', la.status,
             'approved_at', la.approved_at,
             'approved_by', la.approved_by,
             'created_at', la.created_at,
             'updated_at', la.updated_at
           )
           FROM learning_assets la
           JOIN source_versions sv3 ON la.source_version_id = sv3.id AND la.organization_id = sv3.organization_id
           WHERE sv3.source_document_id = sd.id AND la.organization_id = sd.organization_id
           ORDER BY la.created_at DESC
           LIMIT 1
         ) AS latest_asset
       FROM source_documents sd
       LEFT JOIN source_versions sv ON sd.id = sv.source_document_id AND sd.organization_id = sv.organization_id
       WHERE sd.organization_id = $1
       GROUP BY sd.id
       ORDER BY sd.updated_at DESC;`,
      [organization_id]
    );
    return res.rows;
  }

  async getSourceDocument(organization_id: string, id: string): Promise<SourceDocumentEntity | null> {
    const res = await query<SourceDocumentEntity>(
      `SELECT * FROM source_documents
       WHERE id = $1 AND organization_id = $2
       LIMIT 1;`,
      [id, organization_id]
    );
    return res.rows[0] || null;
  }

  async updateSourceDocument(
    organization_id: string,
    id: string,
    data: { title?: string; category?: string; doc_code?: string }
  ): Promise<SourceDocumentEntity | null> {
    const sets: string[] = ['updated_at = NOW()'];
    const params: any[] = [id, organization_id];

    if (data.title !== undefined) {
      params.push(data.title.trim());
      sets.push(`title = $${params.length}`);
    }
    if (data.category !== undefined) {
      params.push(data.category.trim());
      sets.push(`category = $${params.length}`);
    }
    if (data.doc_code !== undefined) {
      params.push(data.doc_code.trim());
      sets.push(`doc_code = $${params.length}`);
    }

    const res = await query<SourceDocumentEntity>(
      `UPDATE source_documents
       SET ${sets.join(', ')}
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      params
    );
    return res.rows[0] || null;
  }

  async listSourceVersions(organization_id: string, source_document_id: string): Promise<SourceVersionEntity[]> {
    const res = await query<SourceVersionEntity>(
      `SELECT * FROM source_versions
       WHERE source_document_id = $1 AND organization_id = $2
       ORDER BY version_number DESC;`,
      [source_document_id, organization_id]
    );
    return res.rows;
  }

  async getSourceVersion(organization_id: string, id: string): Promise<SourceVersionEntity | null> {
    const res = await query<SourceVersionEntity>(
      `SELECT * FROM source_versions
       WHERE id = $1 AND organization_id = $2
       LIMIT 1;`,
      [id, organization_id]
    );
    return res.rows[0] || null;
  }

  async updateSourceVersionDiagnostics(
    organization_id: string,
    id: string,
    diagnostics: Record<string, any>
  ): Promise<SourceVersionEntity | null> {
    const res = await query<SourceVersionEntity>(
      `UPDATE source_versions
       SET diagnostics = $3
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      [id, organization_id, JSON.stringify(diagnostics)]
    );
    return res.rows[0] || null;
  }

  async listLearningAssets(
    organization_id: string,
    filter?: { status?: string; source_document_id?: string; source_version_id?: string }
  ): Promise<LearningAssetEntity[]> {
    const conditions: string[] = ['la.organization_id = $1'];
    const params: any[] = [organization_id];

    if (filter?.status) {
      params.push(filter.status);
      conditions.push(`la.status = $${params.length}`);
    }

    if (filter?.source_version_id) {
      params.push(filter.source_version_id);
      conditions.push(`la.source_version_id = $${params.length}`);
    }

    let joinClause = '';
    if (filter?.source_document_id) {
      params.push(filter.source_document_id);
      joinClause = `JOIN source_versions sv ON la.source_version_id = sv.id AND la.organization_id = sv.organization_id`;
      conditions.push(`sv.source_document_id = $${params.length}`);
    }

    const res = await query<LearningAssetEntity>(
      `SELECT la.* FROM learning_assets la
       ${joinClause}
       WHERE ${conditions.join(' AND ')}
       ORDER BY la.updated_at DESC;`,
      params
    );
    return res.rows;
  }

  async updateLearningAsset(
    organization_id: string,
    id: string,
    data: Partial<{
      title: string;
      subtitle: string | null;
      role_target: string;
      operational_blueprint: Record<string, any>;
      canonical_task_model: Record<string, any>;
      know_it_plan: Record<string, any>;
      video_demonstration_plan: Record<string, any> | null;
      simulator_steps: Record<string, any>[];
      generation_metadata: Record<string, any>;
      status: LearningAssetStatus;
      approved_by: string | null;
      approved_at: Date | null;
    }>
  ): Promise<LearningAssetEntity | null> {
    const sets: string[] = ['updated_at = NOW()'];
    const params: any[] = [id, organization_id];

    if (data.title !== undefined) {
      params.push(data.title.trim());
      sets.push(`title = $${params.length}`);
    }
    if (data.subtitle !== undefined) {
      params.push(data.subtitle ? data.subtitle.trim() : null);
      sets.push(`subtitle = $${params.length}`);
    }
    if (data.role_target !== undefined) {
      params.push(data.role_target.trim());
      sets.push(`role_target = $${params.length}`);
    }
    if (data.operational_blueprint !== undefined) {
      params.push(JSON.stringify(data.operational_blueprint));
      sets.push(`operational_blueprint = $${params.length}`);
    }
    if (data.canonical_task_model !== undefined) {
      params.push(JSON.stringify(data.canonical_task_model));
      sets.push(`canonical_task_model = $${params.length}`);
    }
    if (data.know_it_plan !== undefined) {
      params.push(JSON.stringify(data.know_it_plan));
      sets.push(`know_it_plan = $${params.length}`);
    }
    if (data.video_demonstration_plan !== undefined) {
      params.push(data.video_demonstration_plan ? JSON.stringify(data.video_demonstration_plan) : null);
      sets.push(`video_demonstration_plan = $${params.length}`);
    }
    if (data.simulator_steps !== undefined) {
      params.push(JSON.stringify(data.simulator_steps));
      sets.push(`simulator_steps = $${params.length}`);
    }
    if (data.generation_metadata !== undefined) {
      params.push(JSON.stringify(data.generation_metadata));
      sets.push(`generation_metadata = $${params.length}`);
    }
    if (data.status !== undefined) {
      params.push(data.status);
      sets.push(`status = $${params.length}`);
    }
    if (data.approved_by !== undefined) {
      params.push(data.approved_by);
      sets.push(`approved_by = $${params.length}`);
    }
    if (data.approved_at !== undefined) {
      params.push(data.approved_at);
      sets.push(`approved_at = $${params.length}`);
    }

    const res = await query<LearningAssetEntity>(
      `UPDATE learning_assets
       SET ${sets.join(', ')}
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      params
    );
    return res.rows[0] || null;
  }

  async updateLearningAssetStatus(
    organization_id: string,
    id: string,
    status: LearningAssetStatus,
    approved_by?: string | null
  ): Promise<LearningAssetEntity | null> {
    const isApproval = status === 'approved' || status === 'published';
    const res = await query<LearningAssetEntity>(
      `UPDATE learning_assets
       SET status = $3,
           approved_by = CASE WHEN $4::uuid IS NOT NULL THEN $4::uuid ELSE approved_by END,
           approved_at = CASE WHEN $5::boolean THEN NOW() ELSE approved_at END,
           updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      [id, organization_id, status, approved_by || null, isApproval]
    );
    return res.rows[0] || null;
  }
}

export const contentRepo = new ContentRepository();

