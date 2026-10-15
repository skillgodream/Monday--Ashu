/**
 * GURU COACH LMS - DATABASE ENTITY TYPES & REPOSITORY INTERFACES
 *
 * Implements strict tenant-isolated types for PostgreSQL persistence.
 * Readiness and capability decisions remain exclusively within DEAN.
 */

export type UserRole = 'admin' | 'manager' | 'learner';
export type LearningAssetStatus =
  | 'draft'
  | 'processing'
  | 'review'
  | 'approved'
  | 'published'
  | 'failed'
  | 'archived';
export type AssignmentStatus =
  | 'assigned'
  | 'pending'
  | 'in_progress'
  | 'remediation_required'
  | 'ready_for_observation'
  | 'certified'
  | 'completed'
  | 'overdue'
  | 'cancelled'
  | 'superseded';

export type AssessmentMode = 'guide_me' | 'test_me';
export type WorkplaceDecision = 'workplace_demonstration_passed' | 'workplace_demonstration_failed';

// ============================================================================
// Database Entities
// ============================================================================

export interface OrganizationEntity {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserEntity {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  job_title: string;
  badge_id: string | null;
  firebase_uid?: string | null;
  auth_provider?: string;
  last_login_at?: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TeamEntity {
  id: string;
  organization_id: string;
  manager_id: string | null;
  name: string;
  department: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TeamMemberEntity {
  id: string;
  organization_id: string;
  team_id: string;
  user_id: string;
  joined_at: Date;
}

export interface SourceDocumentEntity {
  id: string;
  organization_id: string;
  doc_code: string;
  title: string;
  category: string;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SourceVersionEntity {
  id: string;
  organization_id: string;
  source_document_id: string;
  version_number: number;
  version_label: string;
  content_hash: string;
  original_filename: string;
  mime_type: string;
  extracted_text: string;
  word_count: number;
  page_count: number;
  change_summary: string | null;
  diagnostics: Record<string, any>;
  is_active: boolean;
  created_by: string | null;
  created_at: Date;
}

export interface LearningAssetEntity {
  id: string;
  organization_id: string;
  source_version_id: string;
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
  created_at: Date;
  updated_at: Date;
}

export interface AssignmentEntity {
  id: string;
  organization_id: string;
  learning_asset_id: string;
  user_id: string;
  assigned_by: string | null;
  assignment_cycle: number;
  is_active_cycle: boolean;
  status: AssignmentStatus;
  due_date: Date | null;
  start_date?: Date | null;
  progress_pct: number;
  stages_completed: {
    learn: boolean;
    see: boolean;
    guide: boolean;
    prove: boolean;
  };
  assigned_at: Date;
  updated_at: Date;
}

export interface AssessmentAttemptEntity {
  id: string;
  organization_id: string;
  assignment_id: string;
  user_id: string;
  attempt_number: number;
  mode: AssessmentMode;
  score: number;
  passed: boolean;
  critical_controls_passed: boolean;
  missed_requirement_ids: string[];
  recorded_at: Date;
}

export interface SupervisorObservationEntity {
  id: string;
  organization_id: string;
  assignment_id: string;
  supervisor_id: string;
  checklist_results: Record<string, any>;
  decision: WorkplaceDecision;
  overall_notes: string | null;
  observed_at: Date;
}

export interface AuditEventEntity {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, any>;
  created_at: Date;
}

// ============================================================================
// Repository Interfaces (Strictly Tenant-Scoped)
// ============================================================================

export interface IOrganizationRepository {
  create(data: { name: string; slug: string }): Promise<OrganizationEntity>;
  findById(id: string): Promise<OrganizationEntity | null>;
  findBySlug(slug: string): Promise<OrganizationEntity | null>;
  delete(id: string): Promise<boolean>;
}

export interface IUserRepository {
  create(data: {
    organization_id: string;
    email: string;
    full_name: string;
    role: UserRole;
    job_title?: string;
    badge_id?: string;
    firebase_uid?: string;
    auth_provider?: string;
  }): Promise<UserEntity>;
  findById(organization_id: string, id: string): Promise<UserEntity | null>;
  findByEmail(organization_id: string, email: string): Promise<UserEntity | null>;
  listByRole(organization_id: string, role?: UserRole): Promise<UserEntity[]>;
  findByFirebaseUid(firebaseUid: string): Promise<UserEntity | null>;
  linkFirebaseUid(organization_id: string, userId: string, firebaseUid: string, email: string): Promise<UserEntity | null>;
  findActiveByEmailGlobally(email: string): Promise<UserEntity[]>;
  updateLastLogin(userId: string): Promise<void>;
}

export interface ITeamRepository {
  create(data: {
    organization_id: string;
    name: string;
    department: string;
    manager_id?: string | null;
  }): Promise<TeamEntity>;
  findById(organization_id: string, id: string): Promise<TeamEntity | null>;
  listByOrganization(organization_id: string): Promise<TeamEntity[]>;
  listByManager(organization_id: string, manager_id: string): Promise<TeamEntity[]>;
  update(
    organization_id: string,
    id: string,
    data: Partial<{ name: string; department: string; manager_id: string | null; is_active: boolean }>
  ): Promise<TeamEntity | null>;
  addMember(organization_id: string, team_id: string, user_id: string): Promise<TeamMemberEntity>;
  removeMember(organization_id: string, team_id: string, user_id: string): Promise<boolean>;
  getRoster(organization_id: string, team_id: string): Promise<UserEntity[]>;
}

export interface IContentRepository {
  createOrFindSourceDocument(data: {
    organization_id: string;
    doc_code: string;
    title: string;
    category?: string;
    created_by?: string | null;
  }): Promise<SourceDocumentEntity>;

  createSourceVersion(data: {
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
  }): Promise<{ version: SourceVersionEntity; isDuplicate: boolean }>;

  findVersionByHash(organization_id: string, content_hash: string): Promise<SourceVersionEntity | null>;

  createLearningAsset(data: {
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
  }): Promise<LearningAssetEntity>;

  getLearningAsset(organization_id: string, id: string): Promise<LearningAssetEntity | null>;
  listApprovedAssets(organization_id: string): Promise<LearningAssetEntity[]>;

  // Phase 3 Admin Content Management methods
  listSourceDocuments(organization_id: string): Promise<any[]>;
  getSourceDocument(organization_id: string, id: string): Promise<SourceDocumentEntity | null>;
  updateSourceDocument(
    organization_id: string,
    id: string,
    data: { title?: string; category?: string; doc_code?: string }
  ): Promise<SourceDocumentEntity | null>;
  listSourceVersions(organization_id: string, source_document_id: string): Promise<SourceVersionEntity[]>;
  getSourceVersion(organization_id: string, id: string): Promise<SourceVersionEntity | null>;
  updateSourceVersionDiagnostics(
    organization_id: string,
    id: string,
    diagnostics: Record<string, any>
  ): Promise<SourceVersionEntity | null>;
  listLearningAssets(
    organization_id: string,
    filter?: { status?: string; source_document_id?: string; source_version_id?: string }
  ): Promise<LearningAssetEntity[]>;
  updateLearningAsset(
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
  ): Promise<LearningAssetEntity | null>;
  updateLearningAssetStatus(
    organization_id: string,
    id: string,
    status: LearningAssetStatus,
    approved_by?: string | null
  ): Promise<LearningAssetEntity | null>;
}

export interface IAssignmentRepository {
  /**
   * Creates an initial assignment or reassigns an existing assignment in a safe transaction.
   * If an active cycle exists, it is marked superseded and a new cycle is created with incremented assignment_cycle.
   * Guaranteed by database partial unique index on (user_id, learning_asset_id) WHERE is_active_cycle = true.
   */
  assignOrReassign(data: {
    organization_id: string;
    learning_asset_id: string;
    user_id: string;
    assigned_by?: string | null;
    start_date?: Date | null;
    due_date?: Date | null;
  }): Promise<AssignmentEntity>;

  findById(organization_id: string, id: string): Promise<AssignmentEntity | null>;

  findActiveAssignment(
    organization_id: string,
    user_id: string,
    learning_asset_id: string
  ): Promise<AssignmentEntity | null>;

  listByUser(organization_id: string, user_id: string): Promise<AssignmentEntity[]>;

  listByOrganization(
    organization_id: string,
    filter?: { status?: string; team_id?: string; user_id?: string; learning_asset_id?: string }
  ): Promise<any[]>;

  cancelAssignment(
    organization_id: string,
    assignment_id: string,
    cancelled_by?: string | null
  ): Promise<AssignmentEntity | null>;

  updateAssignmentStatus(
    organization_id: string,
    assignment_id: string,
    data: Partial<{ status: AssignmentStatus; due_date: Date | null; start_date: Date | null }>
  ): Promise<AssignmentEntity | null>;

  updateInteractionProgress(
    organization_id: string,
    assignment_id: string,
    data: {
      progress_pct?: number;
      stages_completed?: Partial<{ learn: boolean; see: boolean; guide: boolean; prove: boolean }>;
      status?: AssignmentStatus;
    }
  ): Promise<AssignmentEntity | null>;

  /**
   * Stores raw cognitive assessment evidence. DEAN evaluates readiness; the repository merely persists evidence.
   */
  recordAssessmentAttempt(data: {
    organization_id: string;
    assignment_id: string;
    user_id: string;
    attempt_number: number;
    mode: AssessmentMode;
    score: number;
    passed: boolean;
    critical_controls_passed: boolean;
    missed_requirement_ids: string[];
  }): Promise<AssessmentAttemptEntity>;

  listAttempts(organization_id: string, assignment_id: string): Promise<AssessmentAttemptEntity[]>;

  /**
   * Stores physical workplace observation sign-off evidence.
   */
  recordSupervisorObservation(data: {
    organization_id: string;
    assignment_id: string;
    supervisor_id: string;
    checklist_results: Record<string, any>;
    decision: WorkplaceDecision;
    overall_notes?: string | null;
  }): Promise<SupervisorObservationEntity>;
}

export interface IAuditRepository {
  recordEvent(data: {
    organization_id: string;
    user_id?: string | null;
    action: string;
    target_type: string;
    target_id: string;
    details?: Record<string, any>;
  }): Promise<AuditEventEntity>;
  listEvents(organization_id: string, limit?: number): Promise<AuditEventEntity[]>;
}
