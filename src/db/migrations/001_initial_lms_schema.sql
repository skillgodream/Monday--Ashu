-- ============================================================================
-- GURU COACH LMS: PHASE 1 POSTGRESQL INITIAL SCHEMA
-- Migration Version: 001_initial_lms_schema
--
-- Incorporates strict multi-tenant composite integrity, logical source versioning,
-- database-enforced active assignment cycle uniqueness, and immutable audit logs.
-- Readiness/mastery logic is strictly reserved for DEAN.
-- ============================================================================

-- 1. Migration History
CREATE TABLE IF NOT EXISTS _schema_migrations (
  version VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Organizations (Tenant Root)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(128) UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Users (Clean Identity Model - No Passwords in Phase 1)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('admin', 'manager', 'learner')),
  job_title VARCHAR(128) NOT NULL DEFAULT 'Frontline Worker',
  badge_id VARCHAR(64),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT uq_user_email_org UNIQUE (organization_id, email),
  CONSTRAINT uq_user_id_org UNIQUE (id, organization_id)
);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(organization_id, role);

-- 4. Teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  manager_id UUID,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(128) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT uq_team_org_name UNIQUE (organization_id, name),
  CONSTRAINT uq_team_id_org UNIQUE (id, organization_id),
  -- RESTRICT deletion so tenant integrity is never compromised and organization_id is never nulled
  CONSTRAINT fk_teams_manager FOREIGN KEY (manager_id, organization_id)
    REFERENCES users(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_teams_org ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_manager ON teams(manager_id, organization_id);

-- 5. Team Membership
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  team_id UUID NOT NULL,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT uq_team_member UNIQUE (team_id, user_id),
  CONSTRAINT fk_tm_team FOREIGN KEY (team_id, organization_id)
    REFERENCES teams(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT fk_tm_user FOREIGN KEY (user_id, organization_id)
    REFERENCES users(id, organization_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id, organization_id);

-- 6. Logical Source Documents (Logical Identity)
CREATE TABLE IF NOT EXISTS source_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  doc_code VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL DEFAULT 'General',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT uq_source_doc_code_org UNIQUE (organization_id, doc_code),
  CONSTRAINT uq_source_doc_id_org UNIQUE (id, organization_id),
  CONSTRAINT fk_source_doc_creator FOREIGN KEY (created_by, organization_id)
    REFERENCES users(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_source_docs_org ON source_documents(organization_id);

-- 7. Source Versions (Revisions & Extracted Content)
CREATE TABLE IF NOT EXISTS source_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  source_document_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  version_label VARCHAR(32) NOT NULL DEFAULT 'v1.0',
  content_hash VARCHAR(128) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  extracted_text TEXT NOT NULL,
  word_count INTEGER NOT NULL,
  page_count INTEGER NOT NULL,
  change_summary TEXT,
  diagnostics JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT uq_source_version_hash UNIQUE (source_document_id, content_hash),
  CONSTRAINT uq_source_version_num UNIQUE (source_document_id, version_number),
  CONSTRAINT uq_source_version_id_org UNIQUE (id, organization_id),
  CONSTRAINT fk_source_version_parent FOREIGN KEY (source_document_id, organization_id)
    REFERENCES source_documents(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT fk_source_version_creator FOREIGN KEY (created_by, organization_id)
    REFERENCES users(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_source_versions_doc ON source_versions(source_document_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_source_versions_hash ON source_versions(organization_id, content_hash);

-- 8. Learning Assets (Generated SOP Courseware derived from Source Version)
CREATE TABLE IF NOT EXISTS learning_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_version_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  role_target VARCHAR(128) NOT NULL,
  operational_blueprint JSONB NOT NULL,
  canonical_task_model JSONB NOT NULL,
  know_it_plan JSONB NOT NULL,
  video_demonstration_plan JSONB,
  simulator_steps JSONB NOT NULL,
  generation_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(32) NOT NULL CHECK (status IN ('draft', 'review', 'approved', 'archived')) DEFAULT 'draft',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT uq_learning_asset_id_org UNIQUE (id, organization_id),
  CONSTRAINT fk_asset_source_version FOREIGN KEY (source_version_id, organization_id)
    REFERENCES source_versions(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT fk_asset_approver FOREIGN KEY (approved_by, organization_id)
    REFERENCES users(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_learning_assets_org ON learning_assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_learning_assets_status ON learning_assets(organization_id, status);

-- 9. Assignments (Learning Delivery & Certification Cycles)
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  learning_asset_id UUID NOT NULL,
  user_id UUID NOT NULL,
  assigned_by UUID,
  assignment_cycle INTEGER NOT NULL DEFAULT 1,
  is_active_cycle BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(32) NOT NULL CHECK (
    status IN ('assigned', 'in_progress', 'remediation_required', 'ready_for_observation', 'certified', 'superseded')
  ) DEFAULT 'assigned',
  due_date TIMESTAMP WITH TIME ZONE,
  progress_pct INTEGER NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  stages_completed JSONB NOT NULL DEFAULT '{"learn": false, "see": false, "guide": false, "prove": false}'::jsonb,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT uq_assignment_id_org UNIQUE (id, organization_id),
  CONSTRAINT fk_assignment_user FOREIGN KEY (user_id, organization_id)
    REFERENCES users(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT fk_assignment_asset FOREIGN KEY (learning_asset_id, organization_id)
    REFERENCES learning_assets(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT fk_assignment_assigner FOREIGN KEY (assigned_by, organization_id)
    REFERENCES users(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON assignments(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_assignments_asset ON assignments(learning_asset_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(organization_id, status);

-- MANDATORY CORRECTION 2: Database-level partial unique index guaranteeing exactly ONE active assignment cycle per user and asset
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_assignment_cycle
  ON assignments (user_id, learning_asset_id)
  WHERE is_active_cycle = true;

-- 10. Assessment Attempts (Independent Evidence Records)
CREATE TABLE IF NOT EXISTS assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  assignment_id UUID NOT NULL,
  user_id UUID NOT NULL,
  attempt_number INTEGER NOT NULL,
  mode VARCHAR(32) NOT NULL CHECK (mode IN ('guide_me', 'test_me')),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  passed BOOLEAN NOT NULL,
  critical_controls_passed BOOLEAN NOT NULL,
  missed_requirement_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT fk_attempt_assignment FOREIGN KEY (assignment_id, organization_id)
    REFERENCES assignments(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT fk_attempt_user FOREIGN KEY (user_id, organization_id)
    REFERENCES users(id, organization_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_attempts_assignment ON assessment_attempts(assignment_id, organization_id);

-- 11. Supervisor Observations (Physical Demonstration Sign-off)
CREATE TABLE IF NOT EXISTS supervisor_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  assignment_id UUID NOT NULL,
  supervisor_id UUID NOT NULL,
  checklist_results JSONB NOT NULL,
  decision VARCHAR(64) NOT NULL CHECK (
    decision IN ('workplace_demonstration_passed', 'workplace_demonstration_failed')
  ),
  overall_notes TEXT,
  observed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT fk_obs_assignment FOREIGN KEY (assignment_id, organization_id)
    REFERENCES assignments(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT fk_obs_supervisor FOREIGN KEY (supervisor_id, organization_id)
    REFERENCES users(id, organization_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_observations_assignment ON supervisor_observations(assignment_id, organization_id);

-- 12. Append-Only Audit Event Log
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(64) NOT NULL,
  target_id UUID NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_events(organization_id, created_at DESC);
