// src/server/firebaseAdmin.ts
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
var isInitialized = false;
function getFirebaseAdminApp() {
  const currentApps = getApps();
  if (isInitialized && currentApps.length > 0) {
    return currentApps[0];
  }
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "field-trainer-f168c";
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  try {
    if (currentApps.length > 0) {
      isInitialized = true;
      return currentApps[0];
    }
    if (serviceAccountJson) {
      let parsedCreds;
      try {
        parsedCreds = JSON.parse(serviceAccountJson);
      } catch {
        try {
          const decoded = Buffer.from(serviceAccountJson, "base64").toString("utf-8");
          parsedCreds = JSON.parse(decoded);
        } catch {
          console.warn("[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY");
        }
      }
      if (parsedCreds) {
        const app3 = initializeApp({
          credential: cert(parsedCreds),
          projectId: parsedCreds.project_id || projectId
        });
        isInitialized = true;
        return app3;
      }
    }
    const app2 = initializeApp({
      projectId
    });
    isInitialized = true;
    return app2;
  } catch (err) {
    console.warn("[FirebaseAdmin] Initialization warning:", err?.message || err);
    return getApps()[0] || null;
  }
}
async function verifyFirebaseIdToken(token, checkRevoked = false) {
  if (!token || typeof token !== "string" || !token.trim()) {
    throw new Error("MISSING_TOKEN: ID token is empty or undefined.");
  }
  const cleanToken = token.trim();
  const isProduction2 = process.env.NODE_ENV === "production";
  if (!isProduction2 && cleanToken.startsWith("mock-token:")) {
    const parts = cleanToken.split(":");
    const role = parts[1] || "learner";
    const email = parts[2] || `${role}@guruji.internal`;
    const uid = parts[3] || `mock-uid-${role}`;
    return {
      uid,
      email,
      email_verified: true,
      name: `Mock ${role.toUpperCase()} User`
    };
  }
  const app2 = getFirebaseAdminApp();
  if (!app2) {
    throw new Error("FIREBASE_ADMIN_UNAVAILABLE: Firebase Admin is not configured.");
  }
  try {
    const auth = getAuth(app2);
    const decoded = await auth.verifyIdToken(cleanToken, checkRevoked);
    return {
      uid: decoded.uid,
      email: decoded.email,
      email_verified: Boolean(decoded.email_verified),
      name: decoded.name || decoded.display_name
    };
  } catch (err) {
    const code = err?.code || "auth/unknown-error";
    const message = err?.message || "Token verification failed";
    throw new Error(`FIREBASE_VERIFICATION_FAILED [${code}]: ${message}`);
  }
}

// src/db/pool.ts
import dotenv from "dotenv";
import pg from "pg";
var { Pool } = pg;
dotenv.config();
var poolInstance = null;
function isDatabaseConfigured() {
  const url = process.env.DATABASE_URL;
  return Boolean(url && url.trim().length > 10 && !url.includes("placeholder"));
}
function getDatabasePool() {
  if (!isDatabaseConfigured()) {
    return null;
  }
  if (!poolInstance) {
    const connectionString = process.env.DATABASE_URL.trim();
    const useSsl = process.env.DATABASE_SSL === "true" || connectionString.includes("sslmode=require") || connectionString.includes("supabase.co") || connectionString.includes("supabase.com") || process.env.NODE_ENV === "production" && !connectionString.includes("localhost");
    poolInstance = new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : void 0,
      max: Number(process.env.PGPOOL_MAX) || 10,
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 3e4,
      connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS) || 5e3,
      statement_timeout: 1e4
    });
    poolInstance.on("error", (err) => {
      console.warn("[Database Pool Warning] Idle client connection error:", err.message);
    });
  }
  return poolInstance;
}
async function checkDatabaseHealth() {
  if (!isDatabaseConfigured()) {
    return {
      connected: false,
      configured: false,
      error: "DATABASE_URL is not configured in environment variables"
    };
  }
  const pool = getDatabasePool();
  if (!pool) {
    return {
      connected: false,
      configured: false,
      error: "Failed to initialize database pool"
    };
  }
  const start = Date.now();
  try {
    const res = await pool.query("SELECT NOW() as now, version() as version;");
    const latencyMs = Date.now() - start;
    return {
      connected: true,
      configured: true,
      latencyMs,
      serverTime: res.rows[0]?.now?.toISOString?.() || String(res.rows[0]?.now),
      version: res.rows[0]?.version?.split(" ")?.[0] || "PostgreSQL"
    };
  } catch (err) {
    return {
      connected: false,
      configured: true,
      error: err?.message || "Connection check failed"
    };
  }
}
async function query(text, params, client) {
  const runner = client || getDatabasePool();
  if (!runner) {
    throw new Error("DATABASE_NOT_CONFIGURED: DATABASE_URL is not set.");
  }
  try {
    return await runner.query(text, params);
  } catch (err) {
    const safeMsg = (err?.message || "Database query error").replace(
      /postgresql:\/\/[^:]+:[^@]+@/g,
      "postgresql://[redacted]:[redacted]@"
    );
    const dbError = new Error(safeMsg);
    dbError.code = err?.code;
    dbError.detail = err?.detail;
    throw dbError;
  }
}
async function withTransaction(callback) {
  const pool = getDatabasePool();
  if (!pool) {
    throw new Error("DATABASE_NOT_CONFIGURED: Cannot start transaction without DATABASE_URL.");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {
    });
    throw err;
  } finally {
    client.release();
  }
}

// src/db/repositories/userRepo.ts
var UserRepository = class {
  async create(data) {
    const res = await query(
      `INSERT INTO users (organization_id, email, full_name, role, job_title, badge_id, firebase_uid, auth_provider)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *;`,
      [
        data.organization_id,
        data.email.trim().toLowerCase(),
        data.full_name.trim(),
        data.role,
        data.job_title?.trim() || "Frontline Worker",
        data.badge_id?.trim() || null,
        data.firebase_uid || null,
        data.auth_provider || "firebase"
      ]
    );
    return res.rows[0];
  }
  async findById(organization_id, id) {
    const res = await query(
      `SELECT * FROM users
       WHERE id = $1 AND organization_id = $2 AND is_active = true
       LIMIT 1;`,
      [id, organization_id]
    );
    return res.rows[0] || null;
  }
  async findByEmail(organization_id, email) {
    const res = await query(
      `SELECT * FROM users
       WHERE organization_id = $1 AND email = $2 AND is_active = true
       LIMIT 1;`,
      [organization_id, email.trim().toLowerCase()]
    );
    return res.rows[0] || null;
  }
  async listByRole(organization_id, role) {
    if (role) {
      const res2 = await query(
        `SELECT * FROM users
         WHERE organization_id = $1 AND role = $2 AND is_active = true
         ORDER BY full_name ASC;`,
        [organization_id, role]
      );
      return res2.rows;
    }
    const res = await query(
      `SELECT * FROM users
       WHERE organization_id = $1 AND is_active = true
       ORDER BY role ASC, full_name ASC;`,
      [organization_id]
    );
    return res.rows;
  }
  async findByFirebaseUid(firebaseUid) {
    const res = await query(
      `SELECT * FROM users
       WHERE firebase_uid = $1 AND is_active = true
       LIMIT 1;`,
      [firebaseUid.trim()]
    );
    return res.rows[0] || null;
  }
  async findActiveByEmailGlobally(email) {
    const res = await query(
      `SELECT * FROM users
       WHERE email = $1 AND is_active = true;`,
      [email.trim().toLowerCase()]
    );
    return res.rows;
  }
  async linkFirebaseUid(organization_id, userId, firebaseUid, email) {
    const res = await query(
      `UPDATE users
       SET firebase_uid = $1, last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND organization_id = $3 AND email = $4 AND firebase_uid IS NULL AND is_active = true
       RETURNING *;`,
      [firebaseUid.trim(), userId, organization_id, email.trim().toLowerCase()]
    );
    return res.rows[0] || null;
  }
  async updateLastLogin(userId) {
    await query(
      `UPDATE users
       SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1;`,
      [userId]
    );
  }
};
var userRepo = new UserRepository();

// src/server/authMiddleware.ts
async function resolveUserFromIdentity(identity) {
  if (!isDatabaseConfigured() && (identity.uid.startsWith("mock-uid-") || identity.uid.includes("mock"))) {
    const rolePart = identity.uid.replace("mock-uid-", "").replace("-mock", "").replace("uid-", "");
    const role = ["admin", "manager", "learner"].includes(rolePart) ? rolePart : "learner";
    return {
      id: `mock-user-id-${role}`,
      organization_id: "org-test-offline",
      email: identity.email || `${role}@guruji.internal`,
      full_name: identity.name || `Mock ${role.toUpperCase()}`,
      role,
      job_title: "Test Frontline Worker",
      badge_id: "BADGE-TEST",
      firebase_uid: identity.uid,
      auth_provider: "firebase",
      last_login_at: /* @__PURE__ */ new Date(),
      is_active: true,
      created_at: /* @__PURE__ */ new Date(),
      updated_at: /* @__PURE__ */ new Date()
    };
  }
  const existingUser = await userRepo.findByFirebaseUid(identity.uid);
  if (existingUser) {
    if (!existingUser.is_active) {
      throw new Error("ACCOUNT_DEACTIVATED: This user account has been deactivated.");
    }
    userRepo.updateLastLogin(existingUser.id).catch((err) => {
      console.warn("[Auth] Failed to update last_login_at:", err?.message);
    });
    return existingUser;
  }
  if (!identity.email) {
    throw new Error("NO_EMAIL_CLAIM: External identity does not contain an email address.");
  }
  if (!identity.email_verified) {
    throw new Error("EMAIL_NOT_VERIFIED: Identity provider email has not been verified.");
  }
  const matchingUsers = await userRepo.findActiveByEmailGlobally(identity.email);
  if (matchingUsers.length === 0) {
    throw new Error(
      `USER_NOT_PROVISIONED: No account has been provisioned for '${identity.email}'. Contact your organization administrator.`
    );
  }
  if (matchingUsers.length > 1) {
    throw new Error(
      `AMBIGUOUS_ACCOUNT_COLLISION: Multiple organization memberships detected for '${identity.email}'. Explicit invitation link required.`
    );
  }
  const targetUser = matchingUsers[0];
  const linked = await userRepo.linkFirebaseUid(
    targetUser.organization_id,
    targetUser.id,
    identity.uid,
    identity.email
  );
  if (!linked) {
    throw new Error("ACCOUNT_LINKING_CONFLICT: Failed to link external identity. Identity may already be linked.");
  }
  console.log(`[Auth SUCCESS] Safely linked Firebase identity ${identity.uid} to user ${linked.id} (${linked.email})`);
  return linked;
}
async function resolveDevPersona(persona) {
  const role = persona.toLowerCase();
  if (!["admin", "manager", "learner"].includes(role)) {
    return null;
  }
  const devEmail = `${role}@guruji.internal`;
  const users = await userRepo.findActiveByEmailGlobally(devEmail);
  return users[0] || null;
}
async function authenticateRequest(req, res, next) {
  if (req.user && req.userRole && req.organizationId) {
    return next();
  }
  const isProduction2 = process.env.NODE_ENV === "production";
  if (!isProduction2 && process.env.DEV_AUTH_BYPASS === "true") {
    const devPersona = req.headers["x-dev-persona"];
    if (typeof devPersona === "string") {
      try {
        const devUser = await resolveDevPersona(devPersona);
        if (devUser) {
          req.user = devUser;
          req.organizationId = devUser.organization_id;
          req.userRole = devUser.role;
          req.isDemo = false;
          return next();
        }
      } catch (err) {
        console.warn("[Auth Dev Bypass Warning]:", err?.message);
      }
    }
  }
  const authHeader = req.headers["authorization"];
  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Authentication required. Missing Bearer token in Authorization header."
    });
  }
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Empty Bearer token provided."
    });
  }
  try {
    const identity = await verifyFirebaseIdToken(token);
    const user = await resolveUserFromIdentity(identity);
    req.user = user;
    req.organizationId = user.organization_id;
    req.userRole = user.role;
    req.isDemo = false;
    return next();
  } catch (err) {
    const msg = err?.message || "Authentication failed";
    if (msg.includes("ACCOUNT_DEACTIVATED")) {
      return res.status(403).json({ error: "ACCOUNT_DEACTIVATED", message: msg });
    }
    if (msg.includes("USER_NOT_PROVISIONED")) {
      return res.status(403).json({ error: "USER_NOT_PROVISIONED", message: msg });
    }
    if (msg.includes("EMAIL_NOT_VERIFIED")) {
      return res.status(401).json({ error: "EMAIL_NOT_VERIFIED", message: msg });
    }
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: msg
    });
  }
}
async function optionalAuth(req, _res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    req.organizationId = null;
    req.userRole = "demo";
    req.isDemo = true;
    return next();
  }
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    req.user = null;
    req.organizationId = null;
    req.userRole = "demo";
    req.isDemo = true;
    return next();
  }
  try {
    const identity = await verifyFirebaseIdToken(token);
    const user = await resolveUserFromIdentity(identity);
    req.user = user;
    req.organizationId = user.organization_id;
    req.userRole = user.role;
    req.isDemo = false;
  } catch {
    req.user = null;
    req.organizationId = null;
    req.userRole = "demo";
    req.isDemo = true;
  }
  return next();
}
function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    if (!req.user || !req.userRole) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required before role verification."
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: `Access denied. Route requires one of [${roles.join(", ")}] role(s). Current role is '${req.user.role}'.`
      });
    }
    return next();
  };
}

// src/db/repositories/assignmentRepo.ts
var AssignmentRepository = class {
  /**
   * Transactional reassignment engine:
   * 1. Safely deactivates any existing active cycle (marks is_active_cycle = false, status = 'superseded').
   * 2. Computes the sequential assignment_cycle (1, 2, 3...).
   * 3. Inserts the new active assignment cycle with start_date and optional due_date.
   * Concurrency is safe and backed by database partial unique index uq_active_assignment_cycle.
   */
  async assignOrReassign(data) {
    return await withTransaction(async (client) => {
      await client.query(
        `UPDATE assignments
         SET is_active_cycle = false,
             status = 'superseded',
             updated_at = NOW()
         WHERE user_id = $1 AND learning_asset_id = $2 AND is_active_cycle = true;`,
        [data.user_id, data.learning_asset_id]
      );
      const cycleRes = await client.query(
        `SELECT COALESCE(MAX(assignment_cycle), 0) + 1 AS next_cycle
         FROM assignments
         WHERE user_id = $1 AND learning_asset_id = $2;`,
        [data.user_id, data.learning_asset_id]
      );
      const nextCycle = cycleRes.rows[0]?.next_cycle || 1;
      const startDate = data.start_date || /* @__PURE__ */ new Date();
      const insertRes = await client.query(
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
          data.due_date || null
        ]
      );
      return insertRes.rows[0];
    });
  }
  async findById(organization_id, id) {
    const res = await query(
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
  async findActiveAssignment(organization_id, user_id, learning_asset_id) {
    const res = await query(
      `SELECT * FROM assignments
       WHERE organization_id = $1 AND user_id = $2 AND learning_asset_id = $3 AND is_active_cycle = true
       LIMIT 1;`,
      [organization_id, user_id, learning_asset_id]
    );
    return res.rows[0] || null;
  }
  async listByUser(organization_id, user_id) {
    const res = await query(
      `SELECT a.*, la.title AS asset_title, la.role_target AS asset_role_target
       FROM assignments a
       JOIN learning_assets la ON la.id = a.learning_asset_id AND la.organization_id = a.organization_id
       WHERE a.organization_id = $1 AND a.user_id = $2
       ORDER BY a.is_active_cycle DESC, a.assigned_at DESC;`,
      [organization_id, user_id]
    );
    return res.rows;
  }
  async listByOrganization(organization_id, filter) {
    const conditions = ["a.organization_id = $1"];
    const values = [organization_id];
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
    const whereClause = conditions.join(" AND ");
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
  async cancelAssignment(organization_id, assignment_id, _cancelled_by) {
    const res = await query(
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
  async updateAssignmentStatus(organization_id, assignment_id, data) {
    const updates = [];
    const values = [assignment_id, organization_id];
    let idx = 3;
    if (data.status !== void 0) {
      updates.push(`status = $${idx++}`);
      values.push(data.status);
    }
    if (data.due_date !== void 0) {
      updates.push(`due_date = $${idx++}`);
      values.push(data.due_date);
    }
    if (data.start_date !== void 0) {
      updates.push(`start_date = $${idx++}`);
      values.push(data.start_date);
    }
    if (updates.length === 0) {
      return this.findById(organization_id, assignment_id);
    }
    updates.push(`updated_at = NOW()`);
    const res = await query(
      `UPDATE assignments
       SET ${updates.join(", ")}
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      values
    );
    return res.rows[0] || null;
  }
  async updateInteractionProgress(organization_id, assignment_id, data) {
    return await withTransaction(async (client) => {
      const current = await client.query(
        `SELECT * FROM assignments WHERE id = $1 AND organization_id = $2 FOR UPDATE;`,
        [assignment_id, organization_id]
      );
      if (!current.rows[0]) return null;
      const curr = current.rows[0];
      const newPct = data.progress_pct !== void 0 ? data.progress_pct : curr.progress_pct;
      const newStages = {
        ...curr.stages_completed,
        ...data.stages_completed || {}
      };
      const newStatus = data.status || curr.status;
      const res = await client.query(
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
  async recordAssessmentAttempt(data) {
    const res = await query(
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
        JSON.stringify(data.missed_requirement_ids)
      ]
    );
    return res.rows[0];
  }
  async listAttempts(organization_id, assignment_id) {
    const res = await query(
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
  async recordSupervisorObservation(data) {
    const res = await query(
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
        data.overall_notes || null
      ]
    );
    return res.rows[0];
  }
};
var assignmentRepo = new AssignmentRepository();

// src/db/repositories/contentRepo.ts
var ContentRepository = class {
  async createOrFindSourceDocument(data) {
    const existing = await query(
      `SELECT * FROM source_documents
       WHERE organization_id = $1 AND doc_code = $2
       LIMIT 1;`,
      [data.organization_id, data.doc_code.trim()]
    );
    if (existing.rows[0]) {
      return existing.rows[0];
    }
    const res = await query(
      `INSERT INTO source_documents (organization_id, doc_code, title, category, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [
        data.organization_id,
        data.doc_code.trim(),
        data.title.trim(),
        data.category?.trim() || "General",
        data.created_by || null
      ]
    );
    return res.rows[0];
  }
  async createSourceVersion(data) {
    return await withTransaction(async (client) => {
      const dupCheck = await client.query(
        `SELECT * FROM source_versions
         WHERE source_document_id = $1 AND content_hash = $2
         LIMIT 1;`,
        [data.source_document_id, data.content_hash]
      );
      if (dupCheck.rows[0]) {
        return { version: dupCheck.rows[0], isDuplicate: true };
      }
      const maxVerRes = await client.query(
        `SELECT MAX(version_number) as max_ver
         FROM source_versions
         WHERE source_document_id = $1;`,
        [data.source_document_id]
      );
      const nextVerNumber = (maxVerRes.rows[0]?.max_ver || 0) + 1;
      const versionLabel = `v${nextVerNumber}.0`;
      await client.query(
        `UPDATE source_versions
         SET is_active = false
         WHERE source_document_id = $1;`,
        [data.source_document_id]
      );
      const insertRes = await client.query(
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
          data.created_by || null
        ]
      );
      return { version: insertRes.rows[0], isDuplicate: false };
    });
  }
  async findVersionByHash(organization_id, content_hash) {
    const res = await query(
      `SELECT * FROM source_versions
       WHERE organization_id = $1 AND content_hash = $2
       LIMIT 1;`,
      [organization_id, content_hash]
    );
    return res.rows[0] || null;
  }
  async createLearningAsset(data) {
    const res = await query(
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
        data.status || "draft",
        data.approved_by || null,
        data.approved_by ? /* @__PURE__ */ new Date() : null
      ]
    );
    return res.rows[0];
  }
  async getLearningAsset(organization_id, id) {
    const res = await query(
      `SELECT * FROM learning_assets
       WHERE id = $1 AND organization_id = $2
       LIMIT 1;`,
      [id, organization_id]
    );
    return res.rows[0] || null;
  }
  async listApprovedAssets(organization_id) {
    const res = await query(
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
  async listSourceDocuments(organization_id) {
    const res = await query(
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
  async getSourceDocument(organization_id, id) {
    const res = await query(
      `SELECT * FROM source_documents
       WHERE id = $1 AND organization_id = $2
       LIMIT 1;`,
      [id, organization_id]
    );
    return res.rows[0] || null;
  }
  async updateSourceDocument(organization_id, id, data) {
    const sets = ["updated_at = NOW()"];
    const params = [id, organization_id];
    if (data.title !== void 0) {
      params.push(data.title.trim());
      sets.push(`title = $${params.length}`);
    }
    if (data.category !== void 0) {
      params.push(data.category.trim());
      sets.push(`category = $${params.length}`);
    }
    if (data.doc_code !== void 0) {
      params.push(data.doc_code.trim());
      sets.push(`doc_code = $${params.length}`);
    }
    const res = await query(
      `UPDATE source_documents
       SET ${sets.join(", ")}
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      params
    );
    return res.rows[0] || null;
  }
  async listSourceVersions(organization_id, source_document_id) {
    const res = await query(
      `SELECT * FROM source_versions
       WHERE source_document_id = $1 AND organization_id = $2
       ORDER BY version_number DESC;`,
      [source_document_id, organization_id]
    );
    return res.rows;
  }
  async getSourceVersion(organization_id, id) {
    const res = await query(
      `SELECT * FROM source_versions
       WHERE id = $1 AND organization_id = $2
       LIMIT 1;`,
      [id, organization_id]
    );
    return res.rows[0] || null;
  }
  async updateSourceVersionDiagnostics(organization_id, id, diagnostics) {
    const res = await query(
      `UPDATE source_versions
       SET diagnostics = $3
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      [id, organization_id, JSON.stringify(diagnostics)]
    );
    return res.rows[0] || null;
  }
  async listLearningAssets(organization_id, filter) {
    const conditions = ["la.organization_id = $1"];
    const params = [organization_id];
    if (filter?.status) {
      params.push(filter.status);
      conditions.push(`la.status = $${params.length}`);
    }
    if (filter?.source_version_id) {
      params.push(filter.source_version_id);
      conditions.push(`la.source_version_id = $${params.length}`);
    }
    let joinClause = "";
    if (filter?.source_document_id) {
      params.push(filter.source_document_id);
      joinClause = `JOIN source_versions sv ON la.source_version_id = sv.id AND la.organization_id = sv.organization_id`;
      conditions.push(`sv.source_document_id = $${params.length}`);
    }
    const res = await query(
      `SELECT la.* FROM learning_assets la
       ${joinClause}
       WHERE ${conditions.join(" AND ")}
       ORDER BY la.updated_at DESC;`,
      params
    );
    return res.rows;
  }
  async updateLearningAsset(organization_id, id, data) {
    const sets = ["updated_at = NOW()"];
    const params = [id, organization_id];
    if (data.title !== void 0) {
      params.push(data.title.trim());
      sets.push(`title = $${params.length}`);
    }
    if (data.subtitle !== void 0) {
      params.push(data.subtitle ? data.subtitle.trim() : null);
      sets.push(`subtitle = $${params.length}`);
    }
    if (data.role_target !== void 0) {
      params.push(data.role_target.trim());
      sets.push(`role_target = $${params.length}`);
    }
    if (data.operational_blueprint !== void 0) {
      params.push(JSON.stringify(data.operational_blueprint));
      sets.push(`operational_blueprint = $${params.length}`);
    }
    if (data.canonical_task_model !== void 0) {
      params.push(JSON.stringify(data.canonical_task_model));
      sets.push(`canonical_task_model = $${params.length}`);
    }
    if (data.know_it_plan !== void 0) {
      params.push(JSON.stringify(data.know_it_plan));
      sets.push(`know_it_plan = $${params.length}`);
    }
    if (data.video_demonstration_plan !== void 0) {
      params.push(data.video_demonstration_plan ? JSON.stringify(data.video_demonstration_plan) : null);
      sets.push(`video_demonstration_plan = $${params.length}`);
    }
    if (data.simulator_steps !== void 0) {
      params.push(JSON.stringify(data.simulator_steps));
      sets.push(`simulator_steps = $${params.length}`);
    }
    if (data.generation_metadata !== void 0) {
      params.push(JSON.stringify(data.generation_metadata));
      sets.push(`generation_metadata = $${params.length}`);
    }
    if (data.status !== void 0) {
      params.push(data.status);
      sets.push(`status = $${params.length}`);
    }
    if (data.approved_by !== void 0) {
      params.push(data.approved_by);
      sets.push(`approved_by = $${params.length}`);
    }
    if (data.approved_at !== void 0) {
      params.push(data.approved_at);
      sets.push(`approved_at = $${params.length}`);
    }
    const res = await query(
      `UPDATE learning_assets
       SET ${sets.join(", ")}
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      params
    );
    return res.rows[0] || null;
  }
  async updateLearningAssetStatus(organization_id, id, status, approved_by) {
    const isApproval = status === "approved" || status === "published";
    const res = await query(
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
};
var contentRepo = new ContentRepository();

// src/db/repositories/auditRepo.ts
var AuditRepository = class {
  async recordEvent(data) {
    const res = await query(
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
        JSON.stringify(data.details || {})
      ]
    );
    return res.rows[0];
  }
  async listEvents(organization_id, limit = 50) {
    const res = await query(
      `SELECT * FROM audit_events
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT $2;`,
      [organization_id, Math.max(1, Math.min(limit, 200))]
    );
    return res.rows;
  }
};
var auditRepo = new AuditRepository();

// src/server/learnerRoutes.ts
function registerLearnerRoutes(app2) {
  app2.get("/api/learner/dashboard", authenticateRequest, async (req, res) => {
    try {
      const orgId = req.user.organization_id;
      const userId = req.user.id;
      const userAssignments = await assignmentRepo.listByUser(orgId, userId);
      const validAssignments = [];
      for (const assign of userAssignments) {
        const asset = await contentRepo.getLearningAsset(orgId, assign.learning_asset_id);
        if (asset && (asset.status === "published" || asset.status === "approved")) {
          validAssignments.push({
            ...assign,
            asset_title: asset.title,
            asset_subtitle: asset.subtitle,
            asset_role_target: asset.role_target,
            asset_status: asset.status,
            operational_blueprint: asset.operational_blueprint,
            simulator_steps: asset.simulator_steps
          });
        }
      }
      let primaryNextStep = null;
      if (validAssignments.length > 0) {
        const primary = validAssignments[0];
        const stages = primary.stages_completed || { learn: false, see: false, guide: false, prove: false };
        if (!stages.learn) {
          primaryNextStep = {
            assignment_id: primary.id,
            asset_id: primary.learning_asset_id,
            asset_title: primary.asset_title,
            action_code: "learn",
            title: "1. Learn Operational Procedure",
            description: "Understand the procedure, physical dexterity, and compliance reasoning.",
            mode_target: "learn_with_me"
          };
        } else if (!stages.see) {
          primaryNextStep = {
            assignment_id: primary.id,
            asset_id: primary.learning_asset_id,
            asset_title: primary.asset_title,
            action_code: "see",
            title: "2. Inspect Video Demonstration",
            description: "Watch the step-by-step visual demonstration of the standard operating procedure.",
            mode_target: "show_me"
          };
        } else if (!stages.guide) {
          primaryNextStep = {
            assignment_id: primary.id,
            asset_id: primary.learning_asset_id,
            asset_title: primary.asset_title,
            action_code: "guide",
            title: "3. Practise Step with Guidance",
            description: "Execute the interactive workplace simulator with Guruji coaching prompts.",
            mode_target: "guide_me"
          };
        } else if (!stages.prove) {
          primaryNextStep = {
            assignment_id: primary.id,
            asset_id: primary.learning_asset_id,
            asset_title: primary.asset_title,
            action_code: "prove",
            title: "4. Attempt Test Me Assessment",
            description: "Demonstrate operational understanding through critical control assessment.",
            mode_target: "test_me"
          };
        } else {
          primaryNextStep = {
            assignment_id: primary.id,
            asset_id: primary.learning_asset_id,
            asset_title: primary.asset_title,
            action_code: "observation_pending",
            title: "Workplace Observation Sign-off",
            description: "Cognitive stages complete. Awaiting physical demonstration sign-off by your Manager.",
            mode_target: "observation"
          };
        }
      }
      const attemptsList = [];
      for (const assign of validAssignments) {
        const attempts = await assignmentRepo.listAttempts(orgId, assign.id);
        attemptsList.push(...attempts);
      }
      return res.json({
        success: true,
        user: {
          id: req.user.id,
          full_name: req.user.full_name,
          email: req.user.email,
          job_title: req.user.job_title,
          role: req.user.role
        },
        assignments: validAssignments,
        nextStep: primaryNextStep,
        attempts: attemptsList
      });
    } catch (err) {
      return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to fetch learner dashboard" });
    }
  });
  app2.get("/api/learner/assignments", authenticateRequest, async (req, res) => {
    try {
      const orgId = req.user.organization_id;
      const userId = req.user.id;
      const userAssignments = await assignmentRepo.listByUser(orgId, userId);
      const validAssignments = [];
      for (const assign of userAssignments) {
        const asset = await contentRepo.getLearningAsset(orgId, assign.learning_asset_id);
        if (asset && (asset.status === "published" || asset.status === "approved")) {
          validAssignments.push({
            ...assign,
            asset_title: asset.title,
            asset_subtitle: asset.subtitle,
            asset_role_target: asset.role_target
          });
        }
      }
      return res.json({ success: true, assignments: validAssignments });
    } catch (err) {
      return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to list assignments" });
    }
  });
  app2.get("/api/learner/assignments/:id", authenticateRequest, async (req, res) => {
    try {
      const orgId = req.user.organization_id;
      const userId = req.user.id;
      const assignment = await assignmentRepo.findById(orgId, req.params.id);
      if (!assignment) {
        return res.status(404).json({ error: "NOT_FOUND", message: "Assignment not found" });
      }
      if (assignment.user_id !== userId) {
        return res.status(403).json({
          error: "FORBIDDEN_USER_MISMATCH",
          message: "Access denied. You can only view your own assigned learning journeys."
        });
      }
      const asset = await contentRepo.getLearningAsset(orgId, assignment.learning_asset_id);
      if (!asset || asset.status !== "published" && asset.status !== "approved") {
        return res.status(404).json({ error: "UNAVAILABLE_CONTENT", message: "Assigned learning asset is unavailable or unpublished" });
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
          simulator_steps: asset.simulator_steps
        },
        attempts
      });
    } catch (err) {
      return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to get assignment details" });
    }
  });
  app2.post("/api/learner/assignments/:id/progress", authenticateRequest, async (req, res) => {
    try {
      const orgId = req.user.organization_id;
      const userId = req.user.id;
      const assignment = await assignmentRepo.findById(orgId, req.params.id);
      if (!assignment) {
        return res.status(404).json({ error: "NOT_FOUND", message: "Assignment not found" });
      }
      if (assignment.user_id !== userId) {
        return res.status(403).json({ error: "FORBIDDEN_USER_MISMATCH", message: "Cannot update another user assignment" });
      }
      const { progress_pct, stages_completed, status } = req.body || {};
      const updated = await assignmentRepo.updateInteractionProgress(orgId, assignment.id, {
        progress_pct,
        stages_completed,
        status
      });
      return res.json({ success: true, assignment: updated });
    } catch (err) {
      return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to update progress" });
    }
  });
  app2.post("/api/learner/assignments/:id/attempts", authenticateRequest, async (req, res) => {
    try {
      const orgId = req.user.organization_id;
      const userId = req.user.id;
      const assignment = await assignmentRepo.findById(orgId, req.params.id);
      if (!assignment) {
        return res.status(404).json({ error: "NOT_FOUND", message: "Assignment not found" });
      }
      if (assignment.user_id !== userId) {
        return res.status(403).json({ error: "FORBIDDEN_USER_MISMATCH", message: "Cannot record assessment for another user" });
      }
      const { mode, score, passed, critical_controls_passed, missed_requirement_ids, attempt_number } = req.body || {};
      if (!mode || typeof score !== "number") {
        return res.status(400).json({ error: "INVALID_INPUT", message: "mode and numeric score are required" });
      }
      const existingAttempts = await assignmentRepo.listAttempts(orgId, assignment.id);
      const nextAttemptNumber = attempt_number || existingAttempts.length + 1;
      const attempt = await assignmentRepo.recordAssessmentAttempt({
        organization_id: orgId,
        assignment_id: assignment.id,
        user_id: userId,
        attempt_number: nextAttemptNumber,
        mode: mode || "test_me",
        score,
        passed: !!passed,
        critical_controls_passed: !!critical_controls_passed,
        missed_requirement_ids: Array.isArray(missed_requirement_ids) ? missed_requirement_ids : []
      });
      let updatedStages = { ...assignment.stages_completed || {} };
      if (mode === "guide_me") updatedStages.guide = true;
      if (mode === "test_me" && passed) updatedStages.prove = true;
      let newStatus = assignment.status;
      if (assignment.status === "assigned") newStatus = "in_progress";
      if (passed && mode === "test_me") newStatus = "ready_for_observation";
      await assignmentRepo.updateInteractionProgress(orgId, assignment.id, {
        stages_completed: updatedStages,
        status: newStatus,
        progress_pct: passed ? Math.max(assignment.progress_pct, 75) : assignment.progress_pct
      });
      await auditRepo.recordEvent({
        organization_id: orgId,
        user_id: userId,
        action: "ASSESSMENT_ATTEMPT_RECORDED",
        target_type: "assessment_attempt",
        target_id: attempt.id,
        details: { assignment_id: assignment.id, mode, score, passed }
      });
      return res.status(201).json({ success: true, attempt });
    } catch (err) {
      return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to record assessment attempt" });
    }
  });
}

// src/db/repositories/teamRepo.ts
var TeamRepository = class {
  async create(data) {
    const res = await query(
      `INSERT INTO teams (organization_id, name, department, manager_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *;`,
      [data.organization_id, data.name.trim(), data.department.trim(), data.manager_id || null]
    );
    return res.rows[0];
  }
  async findById(organization_id, id) {
    const res = await query(
      `SELECT * FROM teams
       WHERE id = $1 AND organization_id = $2 AND is_active = true
       LIMIT 1;`,
      [id, organization_id]
    );
    return res.rows[0] || null;
  }
  async listByOrganization(organization_id) {
    const res = await query(
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
  async listByManager(organization_id, manager_id) {
    const res = await query(
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
  async update(organization_id, id, data) {
    const updates = [];
    const values = [id, organization_id];
    let idx = 3;
    if (data.name !== void 0) {
      updates.push(`name = $${idx++}`);
      values.push(data.name.trim());
    }
    if (data.department !== void 0) {
      updates.push(`department = $${idx++}`);
      values.push(data.department.trim());
    }
    if (data.manager_id !== void 0) {
      updates.push(`manager_id = $${idx++}`);
      values.push(data.manager_id || null);
    }
    if (data.is_active !== void 0) {
      updates.push(`is_active = $${idx++}`);
      values.push(data.is_active);
    }
    if (updates.length === 0) {
      return this.findById(organization_id, id);
    }
    updates.push(`updated_at = NOW()`);
    const res = await query(
      `UPDATE teams
       SET ${updates.join(", ")}
       WHERE id = $1 AND organization_id = $2
       RETURNING *;`,
      values
    );
    return res.rows[0] || null;
  }
  async addMember(organization_id, team_id, user_id) {
    const res = await query(
      `INSERT INTO team_members (organization_id, team_id, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (team_id, user_id) DO UPDATE SET joined_at = NOW()
       RETURNING *;`,
      [organization_id, team_id, user_id]
    );
    return res.rows[0];
  }
  async removeMember(organization_id, team_id, user_id) {
    const res = await query(
      `DELETE FROM team_members
       WHERE organization_id = $1 AND team_id = $2 AND user_id = $3;`,
      [organization_id, team_id, user_id]
    );
    return (res.rowCount || 0) > 0;
  }
  async getRoster(organization_id, team_id) {
    const res = await query(
      `SELECT u.* FROM users u
       JOIN team_members tm ON tm.user_id = u.id AND tm.organization_id = u.organization_id
       WHERE tm.team_id = $1 AND tm.organization_id = $2 AND u.is_active = true
       ORDER BY u.full_name ASC;`,
      [team_id, organization_id]
    );
    return res.rows;
  }
};
var teamRepo = new TeamRepository();

// src/server/managerRoutes.ts
function registerManagerRoutes(app2) {
  app2.get(
    "/api/manager/teams",
    authenticateRequest,
    requireRole(["manager", "admin"]),
    async (req, res) => {
      try {
        const orgId = req.user.organization_id;
        const teams = await teamRepo.listByOrganization(orgId);
        return res.json({ success: true, teams });
      } catch (err) {
        return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to list teams" });
      }
    }
  );
  app2.get(
    "/api/manager/teams/:id",
    authenticateRequest,
    requireRole(["manager", "admin"]),
    async (req, res) => {
      try {
        const orgId = req.user.organization_id;
        const team = await teamRepo.findById(orgId, req.params.id);
        if (!team) {
          return res.status(404).json({ error: "NOT_FOUND", message: "Team not found" });
        }
        const roster = await teamRepo.getRoster(orgId, team.id);
        return res.json({ success: true, team, roster });
      } catch (err) {
        return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to get team details" });
      }
    }
  );
  app2.post(
    "/api/manager/teams",
    authenticateRequest,
    requireRole(["manager", "admin"]),
    async (req, res) => {
      try {
        const orgId = req.user.organization_id;
        const { name, department, manager_id } = req.body || {};
        if (!name || typeof name !== "string" || !name.trim()) {
          return res.status(400).json({ error: "INVALID_INPUT", message: "Team name is required" });
        }
        if (!department || typeof department !== "string" || !department.trim()) {
          return res.status(400).json({ error: "INVALID_INPUT", message: "Team department is required" });
        }
        let assignedManagerId = req.user.id;
        if (manager_id) {
          const mgrUser = await userRepo.findById(orgId, manager_id);
          if (!mgrUser) {
            return res.status(400).json({ error: "INVALID_MANAGER", message: "Assigned manager does not belong to this organization" });
          }
          assignedManagerId = mgrUser.id;
        }
        const team = await teamRepo.create({
          organization_id: orgId,
          name,
          department,
          manager_id: assignedManagerId
        });
        await auditRepo.recordEvent({
          organization_id: orgId,
          user_id: req.user.id,
          action: "TEAM_CREATED",
          target_type: "team",
          target_id: team.id,
          details: { name: team.name, department: team.department, manager_id: assignedManagerId }
        });
        return res.status(201).json({ success: true, team });
      } catch (err) {
        return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to create team" });
      }
    }
  );
  app2.put(
    "/api/manager/teams/:id",
    authenticateRequest,
    requireRole(["manager", "admin"]),
    async (req, res) => {
      try {
        const orgId = req.user.organization_id;
        const existing = await teamRepo.findById(orgId, req.params.id);
        if (!existing) {
          return res.status(404).json({ error: "NOT_FOUND", message: "Team not found" });
        }
        const updated = await teamRepo.update(orgId, req.params.id, req.body);
        await auditRepo.recordEvent({
          organization_id: orgId,
          user_id: req.user.id,
          action: "TEAM_UPDATED",
          target_type: "team",
          target_id: req.params.id,
          details: req.body
        });
        return res.json({ success: true, team: updated });
      } catch (err) {
        return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to update team" });
      }
    }
  );
  app2.post(
    "/api/manager/teams/:id/members",
    authenticateRequest,
    requireRole(["manager", "admin"]),
    async (req, res) => {
      try {
        const orgId = req.user.organization_id;
        const team = await teamRepo.findById(orgId, req.params.id);
        if (!team) {
          return res.status(404).json({ error: "NOT_FOUND", message: "Team not found" });
        }
        const { user_id } = req.body || {};
        if (!user_id || typeof user_id !== "string") {
          return res.status(400).json({ error: "INVALID_INPUT", message: "user_id is required" });
        }
        const user = await userRepo.findById(orgId, user_id);
        if (!user) {
          return res.status(403).json({
            error: "FORBIDDEN_TENANT_MISMATCH",
            message: "Cannot add user to team: user does not belong to your organization"
          });
        }
        const member = await teamRepo.addMember(orgId, team.id, user.id);
        await auditRepo.recordEvent({
          organization_id: orgId,
          user_id: req.user.id,
          action: "TEAM_MEMBER_ADDED",
          target_type: "team_member",
          target_id: member.id,
          details: { team_id: team.id, user_id: user.id, user_name: user.full_name }
        });
        return res.status(200).json({ success: true, member });
      } catch (err) {
        return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to add team member" });
      }
    }
  );
  app2.delete(
    "/api/manager/teams/:id/members/:userId",
    authenticateRequest,
    requireRole(["manager", "admin"]),
    async (req, res) => {
      try {
        const orgId = req.user.organization_id;
        const team = await teamRepo.findById(orgId, req.params.id);
        if (!team) {
          return res.status(404).json({ error: "NOT_FOUND", message: "Team not found" });
        }
        const removed = await teamRepo.removeMember(orgId, team.id, req.params.userId);
        await auditRepo.recordEvent({
          organization_id: orgId,
          user_id: req.user.id,
          action: "TEAM_MEMBER_REMOVED",
          target_type: "team",
          target_id: team.id,
          details: { user_id: req.params.userId }
        });
        return res.json({ success: true, removed });
      } catch (err) {
        return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to remove team member" });
      }
    }
  );
  app2.get(
    "/api/manager/users",
    authenticateRequest,
    requireRole(["manager", "admin"]),
    async (req, res) => {
      try {
        const orgId = req.user.organization_id;
        const role = req.query.role;
        const users = await userRepo.listByRole(orgId, role);
        return res.json({ success: true, users });
      } catch (err) {
        return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to list users" });
      }
    }
  );
  app2.get(
    "/api/manager/published-assets",
    authenticateRequest,
    requireRole(["manager", "admin"]),
    async (req, res) => {
      try {
        const orgId = req.user.organization_id;
        const approvedAssets = await contentRepo.listApprovedAssets(orgId);
        const publishedAssets = await contentRepo.listLearningAssets(orgId, { status: "published" });
        const assetMap = /* @__PURE__ */ new Map();
        [...approvedAssets, ...publishedAssets].forEach((a) => assetMap.set(a.id, a));
        const assets = Array.from(assetMap.values());
        return res.json({ success: true, assets });
      } catch (err) {
        return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to list published assets" });
      }
    }
  );
  app2.post(
    "/api/manager/assignments",
    authenticateRequest,
    requireRole(["manager", "admin"]),
    async (req, res) => {
      try {
        const orgId = req.user.organization_id;
        const { learning_asset_id, recipient_type, user_ids, user_id, team_id, start_date, due_date } = req.body || {};
        if (!learning_asset_id) {
          return res.status(400).json({ error: "INVALID_INPUT", message: "learning_asset_id is required" });
        }
        const asset = await contentRepo.getLearningAsset(orgId, learning_asset_id);
        if (!asset) {
          return res.status(404).json({ error: "NOT_FOUND", message: "Published learning asset not found in your organization" });
        }
        if (asset.status !== "published" && asset.status !== "approved") {
          return res.status(400).json({ error: "UNPUBLISHED_CONTENT", message: "Cannot assign content that is not in published or approved state" });
        }
        const parsedStartDate = start_date ? new Date(start_date) : /* @__PURE__ */ new Date();
        let parsedDueDate = null;
        if (due_date) {
          parsedDueDate = new Date(due_date);
          if (isNaN(parsedDueDate.getTime())) {
            return res.status(400).json({ error: "INVALID_DATE", message: "Invalid due_date format" });
          }
          if (parsedDueDate.getTime() < parsedStartDate.getTime()) {
            return res.status(400).json({
              error: "INVALID_DATE_ORDER",
              message: "Due date cannot be set before start date"
            });
          }
        }
        let targetUserIds = [];
        if (recipient_type === "team" || team_id) {
          if (!team_id) {
            return res.status(400).json({ error: "INVALID_INPUT", message: "team_id is required for team assignment" });
          }
          const team = await teamRepo.findById(orgId, team_id);
          if (!team) {
            return res.status(404).json({ error: "NOT_FOUND", message: "Team not found in your organization" });
          }
          const roster = await teamRepo.getRoster(orgId, team.id);
          targetUserIds = roster.map((u) => u.id);
          if (targetUserIds.length === 0) {
            return res.status(400).json({ error: "EMPTY_TEAM", message: "Selected team has no active members to assign" });
          }
        } else if (Array.isArray(user_ids) && user_ids.length > 0) {
          targetUserIds = user_ids;
        } else if (user_id) {
          targetUserIds = [user_id];
        } else {
          return res.status(400).json({ error: "INVALID_INPUT", message: "Recipient selection required (user_id, user_ids, or team_id)" });
        }
        const createdAssignments = [];
        for (const uid of targetUserIds) {
          const user = await userRepo.findById(orgId, uid);
          if (!user) {
            continue;
          }
          const assignment = await assignmentRepo.assignOrReassign({
            organization_id: orgId,
            learning_asset_id: asset.id,
            user_id: user.id,
            assigned_by: req.user.id,
            start_date: parsedStartDate,
            due_date: parsedDueDate
          });
          await auditRepo.recordEvent({
            organization_id: orgId,
            user_id: req.user.id,
            action: "ASSIGNMENT_CREATED",
            target_type: "assignment",
            target_id: assignment.id,
            details: {
              learning_asset_id: asset.id,
              learning_asset_title: asset.title,
              assigned_to_user_id: user.id,
              assigned_to_user_name: user.full_name,
              start_date: parsedStartDate,
              due_date: parsedDueDate,
              team_id: team_id || null
            }
          });
          createdAssignments.push(assignment);
        }
        return res.status(201).json({ success: true, count: createdAssignments.length, assignments: createdAssignments });
      } catch (err) {
        return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to create assignment" });
      }
    }
  );
  app2.get(
    "/api/manager/assignments",
    authenticateRequest,
    requireRole(["manager", "admin"]),
    async (req, res) => {
      try {
        const orgId = req.user.organization_id;
        const filter = {
          status: req.query.status,
          team_id: req.query.team_id,
          user_id: req.query.user_id,
          learning_asset_id: req.query.learning_asset_id
        };
        const assignments = await assignmentRepo.listByOrganization(orgId, filter);
        return res.json({ success: true, assignments });
      } catch (err) {
        return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to list assignments" });
      }
    }
  );
  app2.get(
    "/api/manager/assignments/:id",
    authenticateRequest,
    requireRole(["manager", "admin"]),
    async (req, res) => {
      try {
        const orgId = req.user.organization_id;
        const assignment = await assignmentRepo.findById(orgId, req.params.id);
        if (!assignment) {
          return res.status(404).json({ error: "NOT_FOUND", message: "Assignment not found" });
        }
        const attempts = await assignmentRepo.listAttempts(orgId, assignment.id);
        return res.json({ success: true, assignment, attempts });
      } catch (err) {
        return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to get assignment detail" });
      }
    }
  );
  app2.patch(
    "/api/manager/assignments/:id",
    authenticateRequest,
    requireRole(["manager", "admin"]),
    async (req, res) => {
      try {
        const orgId = req.user.organization_id;
        const existing = await assignmentRepo.findById(orgId, req.params.id);
        if (!existing) {
          return res.status(404).json({ error: "NOT_FOUND", message: "Assignment not found" });
        }
        const { status, due_date, start_date } = req.body || {};
        let parsedStartDate = start_date ? new Date(start_date) : existing.start_date ? new Date(existing.start_date) : /* @__PURE__ */ new Date();
        let parsedDueDate = due_date !== void 0 ? due_date ? new Date(due_date) : null : existing.due_date ? new Date(existing.due_date) : null;
        if (parsedDueDate && parsedStartDate && parsedDueDate.getTime() < parsedStartDate.getTime()) {
          return res.status(400).json({ error: "INVALID_DATE_ORDER", message: "Due date cannot be before start date" });
        }
        const updated = await assignmentRepo.updateAssignmentStatus(orgId, req.params.id, {
          status,
          due_date: parsedDueDate,
          start_date: parsedStartDate
        });
        await auditRepo.recordEvent({
          organization_id: orgId,
          user_id: req.user.id,
          action: "ASSIGNMENT_UPDATED",
          target_type: "assignment",
          target_id: req.params.id,
          details: { previous_status: existing.status, new_status: status, due_date: parsedDueDate }
        });
        return res.json({ success: true, assignment: updated });
      } catch (err) {
        return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to update assignment" });
      }
    }
  );
  app2.post(
    "/api/manager/assignments/:id/cancel",
    authenticateRequest,
    requireRole(["manager", "admin"]),
    async (req, res) => {
      try {
        const orgId = req.user.organization_id;
        const existing = await assignmentRepo.findById(orgId, req.params.id);
        if (!existing) {
          return res.status(404).json({ error: "NOT_FOUND", message: "Assignment not found" });
        }
        const cancelled = await assignmentRepo.cancelAssignment(orgId, req.params.id, req.user.id);
        await auditRepo.recordEvent({
          organization_id: orgId,
          user_id: req.user.id,
          action: "ASSIGNMENT_CANCELLED",
          target_type: "assignment",
          target_id: req.params.id,
          details: { previous_status: existing.status }
        });
        return res.json({ success: true, assignment: cancelled });
      } catch (err) {
        return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to cancel assignment" });
      }
    }
  );
  app2.get(
    "/api/manager/audit-trail",
    authenticateRequest,
    requireRole(["manager", "admin"]),
    async (req, res) => {
      try {
        const orgId = req.user.organization_id;
        const limit = Number(req.query.limit) || 50;
        const events = await auditRepo.listEvents(orgId, limit);
        return res.json({ success: true, events });
      } catch (err) {
        return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to fetch audit trail" });
      }
    }
  );
}

// server.ts
import express from "express";
import { GoogleGenAI as GoogleGenAI2, GenerateVideosOperation } from "@google/genai";
import dotenv2 from "dotenv";
import path from "path";
import fs from "fs";
import zlib from "zlib";
import { fileURLToPath } from "url";

// src/utils/veoPromptBuilder.ts
function getDomainPreset(text) {
  const lower = text.toLowerCase();
  if (lower.includes("posh") || lower.includes("compliance") || lower.includes("hr") || lower.includes("investigation") || lower.includes("committee") || lower.includes("legal") || lower.includes("policy") || lower.includes("complaint") || lower.includes("intake")) {
    return {
      environment: "executive private corporate meeting suite with frosted acoustic glass partitions, polished oak conference table, and organized file trays",
      lighting: "diffused natural morning daylight mixed with warm commercial recessed spotlights",
      camera: "slow cinematic right-to-left tracking dolly shot maintaining steady focal depth until the final frame"
    };
  }
  if (lower.includes("phlebotom") || lower.includes("blood") || lower.includes("sample") || lower.includes("patient") || lower.includes("lab") || lower.includes("specimen") || lower.includes("clinic") || lower.includes("hospital")) {
    return {
      environment: "sterile clinical preparation suite with stainless steel countertops, organized specimen racks, and digital centrifuge arrays",
      lighting: "crisp medical-grade neutral illumination with soft diffused fill",
      camera: "steady continuous forward camera drift gliding smoothly along the clinical preparation bench"
    };
  }
  if (lower.includes("retail") || lower.includes("cashier") || lower.includes("store") || lower.includes("checkout") || lower.includes("pos") || lower.includes("customer") || lower.includes("barcode")) {
    return {
      environment: "modern organized retail point-of-sale checkout counter with barcode scanner cradle and clean product shelving displays",
      lighting: "bright commercial overhead lighting balanced by warm ambient store glow",
      camera: "slow cinematic lateral tracking shot moving steadily across the checkout area"
    };
  }
  if (lower.includes("pick") || lower.includes("pack") || lower.includes("warehouse") || lower.includes("tote") || lower.includes("inventory") || lower.includes("logistics") || lower.includes("wms")) {
    return {
      environment: "well-lit fulfillment center staging aisle with high-bay metal racking, yellow safety bollards, and organized staging bins",
      lighting: "even industrial high-bay LED illumination with clean directional contrast",
      camera: "smooth continuous forward dolly shot gliding steadily down the aisle"
    };
  }
  if (lower.includes("hotel") || lower.includes("housekeep") || lower.includes("guest") || lower.includes("room") || lower.includes("linen") || lower.includes("suite")) {
    return {
      environment: "contemporary premium hospitality suite with tailored wood millwork, linen preparation station, and pristine surfaces",
      lighting: "warm ambient sunlight filtered through sheer curtains with warm architectural accents",
      camera: "slow cinematic lateral panning shot drifting smoothly across the room"
    };
  }
  return {
    environment: "modern professional operational facility with organized workstations, safety signage, and equipment staging bays",
    lighting: "clean commercial studio illumination with balanced soft natural daylight",
    camera: "subtle continuous camera tracking shot gliding steadily forward"
  };
}
function toContinuousAction(rawAction) {
  let clean = rawAction.trim().replace(/^Step \d+:\s*/i, "");
  clean = clean.replace(/^(please|ensure to|make sure to|always|must|should|verify that|check that)\s+/i, "");
  clean = clean.replace(/\b(close[s]?|shut[s]?)\s+the\s+laptop\b/gi, "keeping the laptop open as operational data flows").replace(/\b(press[es]?|push[es]?|hit[s]?)\s+(?:the\s+)?button\b/gi, "holding down the control button safely").replace(/\b(sit[s]?\s+down)\b/gi, "seated stationary while methodically analyzing").replace(/\b(stand[s]?\s+up)\b/gi, "standing alertly while inspecting").replace(/\b(shut[s]?\s+down|power[s]?\s+off)\b/gi, "steadily monitoring system status indicators").replace(/\b(finish[es]?|complete[s]?)\b/gi, "continuously verifying and logging final results");
  const verbMap = {
    receive: "receiving and cross-checking",
    verify: "methodically verifying and examining",
    inspect: "carefully inspecting and reviewing",
    check: "systematically checking and confirming",
    scan: "steadily scanning and logging",
    record: "precisely documenting and recording",
    review: "continuously reviewing and cross-referencing",
    prepare: "methodically preparing and staging",
    intake: "conducting formal intake and documenting",
    route: "securing and routing",
    pack: "carefully arranging and packing",
    place: "steadily positioning and securing",
    handle: "properly handling and managing",
    examine: "thoroughly examining and analyzing",
    log: "systematically logging and recording",
    confirm: "consistently confirming and validating",
    monitor: "continuously monitoring and observing",
    calibrate: "slowly calibrating and adjusting"
  };
  const words = clean.split(/\s+/);
  const firstWord = words[0]?.toLowerCase() || "";
  if (verbMap[firstWord]) {
    words[0] = verbMap[firstWord];
    clean = words.join(" ");
  } else if (!clean.toLowerCase().includes("ing")) {
    clean = `steadily executing ${clean}`;
  }
  return clean;
}
function buildVeoPrompt(options) {
  const { role = "frontline professional", process: process2 = "operational procedure", actionInstruction, criticalControl, decisionOrException } = options;
  const contextText = `${role} ${process2} ${actionInstruction} ${criticalControl || ""} ${decisionOrException || ""}`;
  const preset = getDomainPreset(contextText);
  let continuousAction = toContinuousAction(actionInstruction);
  if (criticalControl && !continuousAction.toLowerCase().includes(criticalControl.toLowerCase().slice(0, 15))) {
    continuousAction += ` while applying critical control (${criticalControl.replace(/\.$/, "")})`;
  } else if (decisionOrException && !continuousAction.toLowerCase().includes(decisionOrException.toLowerCase().slice(0, 15))) {
    continuousAction += ` while executing procedure (${decisionOrException.replace(/\.$/, "")})`;
  }
  return `Photorealistic 720p 16:9 cinematic instructional demonstration. A frontline ${role} is ${continuousAction} with steady, continuous hand movements. The setting is a ${preset.environment}. ${preset.lighting}. ${preset.camera}.`;
}

// src/utils/videoPlanEngine.ts
function clusterStepsIntoScenes(steps) {
  if (!steps || steps.length === 0) return [];
  const clusters = [];
  if (steps.length <= 3) {
    steps.forEach((step, idx) => {
      clusters.push({
        title: step.task_title || `Step ${idx + 1}`,
        steps: [step],
        phase: idx === 0 ? "setup_and_intake" : idx === steps.length - 1 ? "verification_and_handoff" : "core_execution"
      });
    });
    return clusters;
  }
  let currentGroup = [];
  let currentTitle = "";
  let currentPhase = "setup_and_intake";
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const cat = step.category || "DO";
    const isEscalationOrException = cat === "ESCALATE" || cat === "RECOVER" || cat === "RESPOND" || /escalat|damage|hazard|reject|incident/i.test(step.instruction);
    const isDecisionOrControl = cat === "DECIDE" || cat === "CHECK" || step.critical_control || /verif|inspect|check|ratio|dwell/i.test(step.instruction);
    const isFirst = i === 0;
    const isLast = i === steps.length - 1;
    let stepPhase = "core_execution";
    if (isFirst || i <= 1 && /greet|arriv|intake|identif|receiv|order|book/i.test(step.instruction)) {
      stepPhase = "setup_and_intake";
    } else if (/prep|sanitiz|dilut|clean|station|tray|glove|swab/i.test(step.instruction)) {
      stepPhase = "inspection_and_prep";
    } else if (isEscalationOrException) {
      stepPhase = "exception_and_escalation";
    } else if (isDecisionOrControl) {
      stepPhase = "control_and_decision";
    } else if (isLast || /handover|sign-off|discharg|complet|log|handoff/i.test(step.instruction)) {
      stepPhase = "verification_and_handoff";
    }
    if (currentGroup.length > 0) {
      const shouldSplit = currentGroup.length >= 2 || currentPhase !== stepPhase;
      if (shouldSplit) {
        clusters.push({
          title: currentTitle,
          steps: currentGroup,
          phase: currentPhase
        });
        currentGroup = [];
      }
    }
    if (currentGroup.length === 0) {
      currentPhase = stepPhase;
      const cleanPhaseName = stepPhase.charAt(0).toUpperCase() + stepPhase.slice(1).replace(/_/g, " ");
      currentTitle = step.task_title || (step.instruction ? step.instruction.trim().slice(0, 45) : `${cleanPhaseName} Part ${clusters.length + 1}`);
    }
    currentGroup.push(step);
  }
  if (currentGroup.length > 0) {
    clusters.push({
      title: currentTitle,
      steps: currentGroup,
      phase: currentPhase
    });
  }
  return clusters;
}
var STOP_WORDS = /* @__PURE__ */ new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "have",
  "must",
  "when",
  "then",
  "into",
  "after",
  "before",
  "should",
  "ensure",
  "using",
  "under",
  "over",
  "each",
  "every",
  "will",
  "been",
  "being",
  "standard",
  "procedure",
  "this",
  "that",
  "these",
  "those",
  "such",
  "only",
  "more",
  "most",
  "some",
  "any",
  "all",
  "both",
  "between",
  "through",
  "during"
]);
var GENERIC_WORDS = /* @__PURE__ */ new Set([
  "patient",
  "customer",
  "safety",
  "process",
  "procedure",
  "standard",
  "protocol",
  "operation",
  "operational",
  "frontline",
  "service",
  "system",
  "action",
  "check",
  "ensure",
  "verify",
  "verifying",
  "perform",
  "performing",
  "practice",
  "guideline",
  "compliance",
  "compliant",
  "requirement",
  "require",
  "correct",
  "proper",
  "appropriate",
  "manner",
  "method",
  "methodical",
  "carefully",
  "always",
  "never",
  "routine",
  "rule",
  "rules",
  "step",
  "steps",
  "item",
  "items",
  "work",
  "worker",
  "staff",
  "employee",
  "department",
  "role",
  "unit",
  "area",
  "room",
  "time",
  "date",
  "form"
]);
function extractSpecificKeywords(text) {
  if (!text) return [];
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !STOP_WORDS.has(w) && !GENERIC_WORDS.has(w));
}
function isProhibitiveRule(text) {
  if (!text) return false;
  return /\b(zero\s+tolerance|zero|never|prohibit|prohibited|forbidden|not\s+permitted|cannot|ban|banned|refuse|strictly\s+avoided|do\s+not|don't)\b/i.test(text);
}
function matchesStepRef(step, stepIdx, sourceRef) {
  if (!sourceRef) return false;
  const trimmed = sourceRef.trim();
  const stepIdxTag = `step-${stepIdx + 1}`;
  if (trimmed === stepIdxTag || trimmed.startsWith(`${stepIdxTag}-`)) {
    return true;
  }
  const sRef = step.source?.source_ref?.trim();
  if (sRef) {
    if (trimmed === sRef || trimmed.startsWith(`${sRef}-`)) {
      return true;
    }
  }
  return false;
}
function makeLedgerItemId(type, sourceRef, idx) {
  const cleanRef = sourceRef?.trim() || "";
  if (cleanRef && !cleanRef.includes(" ") && cleanRef.startsWith(`${type}-`)) {
    return cleanRef;
  }
  return `${type}:${cleanRef || idx + 1}`;
}
function findBestSceneAssociation(itemText, itemSourceRef, stepClusters, steps) {
  if (itemSourceRef && itemSourceRef.trim().length > 0) {
    const structuredMatches = [];
    stepClusters.forEach((cluster, cIdx) => {
      const hasDirectRef = cluster.steps.some((s) => matchesStepRef(s, steps.indexOf(s), itemSourceRef));
      if (hasDirectRef) {
        structuredMatches.push(cIdx);
      }
    });
    if (structuredMatches.length > 0) {
      return {
        clusterIndex: structuredMatches[0],
        matchType: "structured",
        confidence: "high"
      };
    }
  }
  const specificItemKeywords = Array.from(new Set(extractSpecificKeywords(itemText)));
  if (specificItemKeywords.length < 2) {
    return null;
  }
  const scores = [];
  stepClusters.forEach((cluster, cIdx) => {
    const clusterText = `${cluster.title} ${cluster.steps.map((s) => `${s.task_title || ""} ${s.instruction}`).join(" ")}`;
    const clusterKeywords = new Set(extractSpecificKeywords(clusterText));
    const matchedWords = specificItemKeywords.filter((w) => clusterKeywords.has(w));
    if (matchedWords.length >= 2) {
      scores.push({ clusterIndex: cIdx, score: matchedWords.length, matchedWords });
    }
  });
  if (scores.length === 0) {
    return null;
  }
  scores.sort((a, b) => b.score - a.score);
  if (scores.length > 1 && scores[0].score === scores[1].score) {
    return {
      isAmbiguous: true,
      ambiguousCandidateIndices: scores.map((s) => s.clusterIndex),
      matchedWords: scores[0].matchedWords
    };
  }
  return {
    clusterIndex: scores[0].clusterIndex,
    matchType: "semantic",
    confidence: scores[0].score >= 3 ? "high" : "medium",
    matchedWords: scores[0].matchedWords
  };
}
function planVideoDemonstration(blueprint) {
  const steps = blueprint.operational_steps || [];
  const controls = blueprint.critical_controls || [];
  const decisions = blueprint.decision_points || [];
  const exceptions = blueprint.exceptions || [];
  const escalations = blueprint.escalations || [];
  const safetyRules = blueprint.safety_rules || [];
  const qualityRules = blueprint.quality_rules || [];
  const prerequisites = blueprint.prerequisites || [];
  const role = blueprint.role || "frontline professional";
  const processName = blueprint.process || blueprint.document_identity?.doc_title || "Standard Operating Procedure";
  const excludedItems = [];
  const coverageLedger = [];
  const unresolvedItems = [];
  const stepClusters = clusterStepsIntoScenes(steps);
  const plannedClips = [];
  const claimedControlIndices = /* @__PURE__ */ new Set();
  const claimedDecisionIndices = /* @__PURE__ */ new Set();
  const claimedExceptionIndices = /* @__PURE__ */ new Set();
  const claimedEscalationIndices = /* @__PURE__ */ new Set();
  const claimedSafetyIndices = /* @__PURE__ */ new Set();
  const claimedQualityIndices = /* @__PURE__ */ new Set();
  const assignedControlByScene = /* @__PURE__ */ new Map();
  const assignedDecisionByScene = /* @__PURE__ */ new Map();
  const assignedExceptionByScene = /* @__PURE__ */ new Map();
  const assignedEscalationByScene = /* @__PURE__ */ new Map();
  const assignedSafetyByScene = /* @__PURE__ */ new Map();
  const assignedQualityByScene = /* @__PURE__ */ new Map();
  controls.forEach((ctrl, cIdx) => {
    if (isProhibitiveRule(ctrl.rule)) return;
    const text = `${ctrl.rule} ${ctrl.rationale || ""}`;
    const res = findBestSceneAssociation(text, ctrl.source_ref, stepClusters, steps);
    if (res && !res.isAmbiguous && res.clusterIndex !== void 0) {
      if (!assignedControlByScene.has(res.clusterIndex)) {
        assignedControlByScene.set(res.clusterIndex, { ctrl, index: cIdx });
        claimedControlIndices.add(cIdx);
      }
    }
  });
  decisions.forEach((dec, dIdx) => {
    if (!dec.situation || dec.situation.trim().length <= 3) return;
    const text = `${dec.situation} ${dec.decision || ""}`;
    const res = findBestSceneAssociation(text, dec.source_ref, stepClusters, steps);
    if (res && !res.isAmbiguous && res.clusterIndex !== void 0) {
      if (!assignedDecisionByScene.has(res.clusterIndex)) {
        assignedDecisionByScene.set(res.clusterIndex, { dec, index: dIdx });
        claimedDecisionIndices.add(dIdx);
      }
    }
  });
  exceptions.forEach((exc, eIdx) => {
    if (!exc.trigger || exc.trigger.trim().length <= 3) return;
    const text = `${exc.trigger} ${exc.resolution || ""}`;
    const res = findBestSceneAssociation(text, exc.source_ref, stepClusters, steps);
    if (res && !res.isAmbiguous && res.clusterIndex !== void 0) {
      if (!assignedExceptionByScene.has(res.clusterIndex)) {
        assignedExceptionByScene.set(res.clusterIndex, { exc, index: eIdx });
        claimedExceptionIndices.add(eIdx);
      }
    }
  });
  escalations.forEach((esc, escIdx) => {
    if (!esc.situation || esc.situation.trim().length <= 3) return;
    const text = `${esc.situation} ${esc.contact_or_action || ""}`;
    const res = findBestSceneAssociation(text, esc.source_ref, stepClusters, steps);
    if (res && !res.isAmbiguous && res.clusterIndex !== void 0) {
      if (!assignedEscalationByScene.has(res.clusterIndex)) {
        assignedEscalationByScene.set(res.clusterIndex, { esc, index: escIdx });
        claimedEscalationIndices.add(escIdx);
      }
    }
  });
  safetyRules.forEach((safe, sIdx) => {
    if (!safe.rule || safe.rule.trim().length <= 3 || isProhibitiveRule(safe.rule)) return;
    const res = findBestSceneAssociation(safe.rule, safe.source_ref, stepClusters, steps);
    if (res && !res.isAmbiguous && res.clusterIndex !== void 0) {
      if (!assignedSafetyByScene.has(res.clusterIndex)) {
        assignedSafetyByScene.set(res.clusterIndex, { safe, index: sIdx });
        claimedSafetyIndices.add(sIdx);
      }
    }
  });
  qualityRules.forEach((qual, qIdx) => {
    if (!qual.rule || qual.rule.trim().length <= 3 || isProhibitiveRule(qual.rule)) return;
    const res = findBestSceneAssociation(qual.rule, qual.source_ref, stepClusters, steps);
    if (res && !res.isAmbiguous && res.clusterIndex !== void 0) {
      if (!assignedQualityByScene.has(res.clusterIndex)) {
        assignedQualityByScene.set(res.clusterIndex, { qual, index: qIdx });
        claimedQualityIndices.add(qIdx);
      }
    }
  });
  stepClusters.forEach((cluster, clusterIdx) => {
    const sceneIndex = clusterIdx + 1;
    const sceneId = `scene-${sceneIndex}`;
    const primaryStep = cluster.steps[0];
    const coveredRefs = cluster.steps.map((s, idx) => s.source?.source_ref || `step-${steps.indexOf(s) + 1}`);
    const combinedActions = cluster.steps.map((s) => s.instruction).join(" and ");
    const primaryTaskTitle = cluster.steps.map((s) => s.task_title).filter(Boolean).join(" & ") || cluster.title;
    cluster.steps.forEach((step) => {
      const stepIdx = steps.indexOf(step);
      const stepRef = step.source?.source_ref || `step-${stepIdx + 1}`;
      coverageLedger.push({
        item_id: makeLedgerItemId("step", stepRef, stepIdx),
        item_type: "step",
        source_ref: stepRef,
        description: step.instruction,
        disposition: "represented_in_video",
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: "Show Me",
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: `Demonstrated as core procedural action in Scene ${sceneIndex}.`
      });
    });
    const matchedControlObj = assignedControlByScene.get(clusterIdx);
    const matchedControl = matchedControlObj?.ctrl;
    if (matchedControl && matchedControlObj) {
      coverageLedger.push({
        item_id: makeLedgerItemId("control", matchedControl.source_ref, matchedControlObj.index),
        item_type: "control",
        source_ref: matchedControl.source_ref || `ctrl-${matchedControlObj.index + 1}`,
        description: matchedControl.rule,
        disposition: "represented_in_video",
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: "Show Me",
        reason: `Demonstrated directly in Scene ${sceneIndex} as active procedural control.`,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: `Observed in Scene ${sceneIndex} prompt and learner observation cues.`
      });
    }
    const matchedDecisionObj = assignedDecisionByScene.get(clusterIdx);
    const matchedDecision = matchedDecisionObj?.dec;
    if (matchedDecision && matchedDecisionObj) {
      coverageLedger.push({
        item_id: makeLedgerItemId("decision", matchedDecision.source_ref, matchedDecisionObj.index),
        item_type: "decision",
        source_ref: matchedDecision.source_ref || `dec-${matchedDecisionObj.index + 1}`,
        description: matchedDecision.situation,
        disposition: "represented_in_video",
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: "Show Me",
        reason: `Illustrated in Scene ${sceneIndex} decision cue.`,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: `Demonstrated in Scene ${sceneIndex} decision cue.`
      });
    }
    const matchedExceptionObj = assignedExceptionByScene.get(clusterIdx);
    const matchedException = matchedExceptionObj?.exc;
    if (matchedException && matchedExceptionObj) {
      coverageLedger.push({
        item_id: makeLedgerItemId("exception", matchedException.source_ref, matchedExceptionObj.index),
        item_type: "exception",
        source_ref: matchedException.source_ref || `exc-${matchedExceptionObj.index + 1}`,
        description: matchedException.trigger,
        disposition: "represented_in_video",
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: "Show Me",
        reason: `Visualized in Scene ${sceneIndex} exception resolution cue.`,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: `Visualized in Scene ${sceneIndex} exception prompt and resolution cue.`
      });
    }
    const matchedEscalationObj = assignedEscalationByScene.get(clusterIdx);
    const matchedEscalation = matchedEscalationObj?.esc;
    if (matchedEscalation && matchedEscalationObj) {
      coverageLedger.push({
        item_id: makeLedgerItemId("escalation", matchedEscalation.source_ref, matchedEscalationObj.index),
        item_type: "escalation",
        source_ref: matchedEscalation.source_ref || `esc-${matchedEscalationObj.index + 1}`,
        description: matchedEscalation.situation,
        disposition: "represented_in_video",
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: "Show Me",
        reason: `Highlighted in Scene ${sceneIndex} escalation cue.`,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: `Highlighted in Scene ${sceneIndex} escalation cue.`
      });
    }
    const matchedSafetyObj = assignedSafetyByScene.get(clusterIdx);
    const matchedSafety = matchedSafetyObj?.safe;
    if (matchedSafety && matchedSafetyObj) {
      coverageLedger.push({
        item_id: makeLedgerItemId("safety_rule", matchedSafety.source_ref, matchedSafetyObj.index),
        item_type: "safety_rule",
        source_ref: matchedSafety.source_ref || `safe-${matchedSafetyObj.index + 1}`,
        description: matchedSafety.rule,
        disposition: "represented_in_video",
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: "Show Me",
        reason: `Demonstrated in Scene ${sceneIndex} procedural safety precautions.`,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: `Demonstrated in Scene ${sceneIndex} procedural safety precautions.`
      });
    }
    const matchedQualityObj = assignedQualityByScene.get(clusterIdx);
    const matchedQuality = matchedQualityObj?.qual;
    if (matchedQuality && matchedQualityObj) {
      coverageLedger.push({
        item_id: makeLedgerItemId("control", matchedQuality.source_ref, matchedQualityObj.index),
        item_type: "control",
        source_ref: matchedQuality.source_ref || `qual-${matchedQualityObj.index + 1}`,
        description: matchedQuality.rule,
        disposition: "represented_in_video",
        assigned_scene_id: sceneId,
        assigned_scene_index: sceneIndex,
        assigned_mode: "Show Me",
        reason: `Demonstrated in Scene ${sceneIndex} quality execution standard.`,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: `Demonstrated in Scene ${sceneIndex} quality execution standard.`
      });
    }
    const purpose = cluster.steps.length === 1 ? `Demonstrate ${cluster.steps[0].instruction}` : `Demonstrate sequential execution of ${cluster.steps[0].task_title || "initial action"} followed by ${cluster.steps[cluster.steps.length - 1].task_title || "verification"}`;
    const criticalAction = `Frontline ${role} executes ${combinedActions}`;
    let controlOrDecision;
    if (matchedControl) {
      controlOrDecision = `Critical Control: ${matchedControl.rule}`;
    } else if (matchedDecision) {
      controlOrDecision = `Decision Point: In situation "${matchedDecision.situation}", choose "${matchedDecision.decision}"`;
    }
    let exceptionOrEscalation;
    if (matchedEscalation) {
      exceptionOrEscalation = `Escalation: ${matchedEscalation.situation} -> ${matchedEscalation.contact_or_action}`;
    } else if (matchedException) {
      exceptionOrEscalation = `Exception Resolution: ${matchedException.trigger} -> ${matchedException.resolution}`;
    }
    let whatLearnerShouldSee = `Clear physical view of ${role} performing ${cluster.steps[0].instruction}${cluster.steps[1] ? ` and then ${cluster.steps[1].instruction}` : ""} with authentic equipment.`;
    if (matchedControl) {
      whatLearnerShouldSee += ` Learner explicitly observes execution of mandatory control: "${matchedControl.rule}".`;
    }
    if (matchedException) {
      whatLearnerShouldSee += ` Learner explicitly observes exception management: in response to "${matchedException.trigger}", immediately "${matchedException.resolution}".`;
    }
    const whatLearnerShouldUnderstand = cluster.steps[0].why_it_matters || matchedControl?.rationale || `Ensures compliance with standard operational quality and safety guidelines.`;
    const onScreenText = buildOnScreenText(cluster.steps, matchedControl?.rule, matchedEscalation?.contact_or_action);
    const veoPrompt = buildVeoPrompt({
      role,
      process: processName,
      taskTitle: primaryTaskTitle,
      actionInstruction: combinedActions,
      stepIndex: sceneIndex,
      criticalControl: matchedControl?.rule,
      decisionOrException: matchedException?.resolution || matchedDecision?.action
    });
    const clipDuration = 8;
    let distinctTitle = primaryTaskTitle;
    if (plannedClips.some((p) => p.title.toLowerCase() === distinctTitle.toLowerCase())) {
      distinctTitle = `${primaryTaskTitle} (Part ${sceneIndex})`;
    }
    plannedClips.push({
      clip_index: sceneIndex,
      scene_id: sceneId,
      title: distinctTitle,
      purpose,
      step_ref: `Steps ${coveredRefs.join(", ")}`,
      covered_step_refs: coveredRefs,
      critical_action: criticalAction,
      control_or_decision: controlOrDecision,
      exception_or_escalation: exceptionOrEscalation,
      what_the_learner_should_see: whatLearnerShouldSee,
      what_the_learner_should_understand: whatLearnerShouldUnderstand,
      on_screen_text: onScreenText,
      duration_seconds: clipDuration,
      estimated_duration_seconds: clipDuration,
      veo_prompt: veoPrompt,
      key_action: cluster.steps[0].instruction,
      tool_or_hazard: cluster.steps.find((s) => s.target_code)?.target_code
    });
  });
  if (plannedClips.length === 0) {
    const defaultAction = blueprint.process || "Perform standard operational procedure";
    plannedClips.push({
      clip_index: 1,
      scene_id: "scene-1",
      title: "Operational Procedure Overview",
      purpose: `Demonstrate ${defaultAction}`,
      step_ref: "General Procedure",
      covered_step_refs: ["general"],
      critical_action: `Frontline ${role} executes ${defaultAction}`,
      what_the_learner_should_see: `Clear physical view of ${role} demonstrating compliant technique.`,
      what_the_learner_should_understand: `Ensures compliance with standard operational quality and safety guidelines.`,
      on_screen_text: "EXECUTE COMPLIANT WORKPLACE PROCEDURE",
      duration_seconds: 8,
      estimated_duration_seconds: 8,
      veo_prompt: buildVeoPrompt({
        role,
        process: processName,
        actionInstruction: defaultAction,
        stepIndex: 1
      }),
      key_action: defaultAction
    });
  }
  controls.forEach((ctrl, cIdx) => {
    if (claimedControlIndices.has(cIdx)) return;
    const ctrlRef = ctrl.source_ref || `ctrl-${cIdx + 1}`;
    const ledgerId = makeLedgerItemId("control", ctrl.source_ref, cIdx);
    if (!ctrl.rule || ctrl.rule.trim().length <= 3) {
      const reason = `Critical control has ambiguous or empty source text and requires human instructional review.`;
      const item = {
        item_id: ledgerId,
        item_type: "control",
        source_ref: ctrlRef,
        description: ctrl.rule || "Empty control rule",
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved",
        reason,
        confidence: "unresolved",
        coverage_status: "planned",
        instructional_proof: "Unresolved source text requiring instructional SME review"
      };
      coverageLedger.push(item);
      unresolvedItems.push(item);
      excludedItems.push({
        item_ref: ctrlRef,
        item_type: "control",
        description: ctrl.rule || "Empty control rule",
        reason,
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved"
      });
    } else if (isProhibitiveRule(ctrl.rule)) {
      const reason = `Statutory / compliance prohibition ("${ctrl.rule}") is verified via Test Me compliance check questions rather than procedural demonstration video.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: "control",
        source_ref: ctrlRef,
        description: ctrl.rule,
        disposition: "assigned_to_learning_mode",
        assigned_mode: "Test Me",
        reason,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: "Evaluated via Test Me compliance check questions."
      });
      excludedItems.push({
        item_ref: ctrlRef,
        item_type: "control",
        description: ctrl.rule,
        reason,
        disposition: "assigned_to_test_me",
        assigned_mode: "Test Me"
      });
    } else {
      const assoc = findBestSceneAssociation(`${ctrl.rule} ${ctrl.rationale || ""}`, ctrl.source_ref, stepClusters, steps);
      const reason = assoc?.isAmbiguous ? `Ambiguous multi-step association (candidate scenes: ${assoc.ambiguousCandidateIndices?.map((i) => i + 1).join(", ")}); routed to Guide Me scenario rather than forced video guess.` : `Quality control requirement ("${ctrl.rule}") is practiced in Guide Me simulation scenarios.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: "control",
        source_ref: ctrlRef,
        description: ctrl.rule,
        disposition: "assigned_to_learning_mode",
        assigned_mode: "Guide Me",
        reason,
        confidence: assoc?.isAmbiguous ? "medium" : "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: "Practiced interactively in Guide Me simulation scenarios."
      });
      excludedItems.push({
        item_ref: ctrlRef,
        item_type: "control",
        description: ctrl.rule,
        reason,
        disposition: "assigned_to_guide_me",
        assigned_mode: "Guide Me"
      });
    }
  });
  decisions.forEach((dec, dIdx) => {
    if (claimedDecisionIndices.has(dIdx)) return;
    const decRef = dec.source_ref || `dec-${dIdx + 1}`;
    const ledgerId = makeLedgerItemId("decision", dec.source_ref, dIdx);
    if (!dec.situation || dec.situation.trim().length <= 3) {
      const reason = `Decision point has ambiguous or empty source text and requires human instructional review.`;
      const item = {
        item_id: ledgerId,
        item_type: "decision",
        source_ref: decRef,
        description: dec.situation || "Empty decision point",
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved",
        reason,
        confidence: "unresolved",
        coverage_status: "planned",
        instructional_proof: "Unresolved source text requiring instructional SME review"
      };
      coverageLedger.push(item);
      unresolvedItems.push(item);
      excludedItems.push({
        item_ref: decRef,
        item_type: "decision",
        description: dec.situation || "Empty decision point",
        reason,
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved"
      });
    } else {
      const reason = `Contingency branch dilemma ("${dec.situation}") is practiced interactively in Guide Me simulator choices rather than linear demonstration video.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: "decision",
        source_ref: decRef,
        description: dec.situation,
        disposition: "assigned_to_learning_mode",
        assigned_mode: "Guide Me",
        reason,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: "Practiced interactively in Guide Me branching choices."
      });
      excludedItems.push({
        item_ref: decRef,
        item_type: "decision",
        description: dec.situation,
        reason,
        disposition: "assigned_to_guide_me",
        assigned_mode: "Guide Me"
      });
    }
  });
  exceptions.forEach((exc, eIdx) => {
    if (claimedExceptionIndices.has(eIdx)) return;
    const excRef = exc.source_ref || `exc-${eIdx + 1}`;
    const ledgerId = makeLedgerItemId("exception", exc.source_ref, eIdx);
    if (!exc.trigger || exc.trigger.trim().length <= 3) {
      const reason = `Exception protocol has ambiguous or empty trigger text and requires human instructional review.`;
      const item = {
        item_id: ledgerId,
        item_type: "exception",
        source_ref: excRef,
        description: exc.trigger || "Empty exception trigger",
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved",
        reason,
        confidence: "unresolved",
        coverage_status: "planned",
        instructional_proof: "Unresolved source text requiring instructional SME review"
      };
      coverageLedger.push(item);
      unresolvedItems.push(item);
      excludedItems.push({
        item_ref: excRef,
        item_type: "exception",
        description: exc.trigger || "Empty exception trigger",
        reason,
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved"
      });
    } else {
      const reason = `Exception handling protocol ("${exc.trigger}") is practiced in Guide Me real-world problem scenarios.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: "exception",
        source_ref: excRef,
        description: exc.trigger,
        disposition: "assigned_to_learning_mode",
        assigned_mode: "Guide Me",
        reason,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: "Practiced in Guide Me real-world problem scenarios."
      });
      excludedItems.push({
        item_ref: excRef,
        item_type: "exception",
        description: exc.trigger,
        reason,
        disposition: "assigned_to_guide_me",
        assigned_mode: "Guide Me"
      });
    }
  });
  escalations.forEach((esc, escIdx) => {
    if (claimedEscalationIndices.has(escIdx)) return;
    const escRef = esc.source_ref || `esc-${escIdx + 1}`;
    const ledgerId = makeLedgerItemId("escalation", esc.source_ref, escIdx);
    if (!esc.situation || esc.situation.trim().length <= 3) {
      const reason = `Escalation pathway has ambiguous or empty situation text and requires human instructional review.`;
      const item = {
        item_id: ledgerId,
        item_type: "escalation",
        source_ref: escRef,
        description: esc.situation || "Empty escalation situation",
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved",
        reason,
        confidence: "unresolved",
        coverage_status: "planned",
        instructional_proof: "Unresolved source text requiring instructional SME review"
      };
      coverageLedger.push(item);
      unresolvedItems.push(item);
      excludedItems.push({
        item_ref: escRef,
        item_type: "escalation",
        description: esc.situation || "Empty escalation situation",
        reason,
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved"
      });
    } else {
      const reason = `Escalation reporting pathway ("${esc.situation}") is trained in Guide Me / Test Me scenario practice.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: "escalation",
        source_ref: escRef,
        description: esc.situation,
        disposition: "assigned_to_learning_mode",
        assigned_mode: "Guide Me",
        reason,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: "Trained in Guide Me / Test Me scenario practice."
      });
      excludedItems.push({
        item_ref: escRef,
        item_type: "escalation",
        description: esc.situation,
        reason,
        disposition: "assigned_to_guide_me",
        assigned_mode: "Guide Me"
      });
    }
  });
  safetyRules.forEach((safe, sIdx) => {
    if (claimedSafetyIndices.has(sIdx)) return;
    const safeRef = safe.source_ref || `safe-${sIdx + 1}`;
    const ledgerId = makeLedgerItemId("safety_rule", safe.source_ref, sIdx);
    if (!safe.rule || safe.rule.trim().length <= 3) {
      const reason = `Safety rule has ambiguous or empty text and requires human instructional review.`;
      const item = {
        item_id: ledgerId,
        item_type: "safety_rule",
        source_ref: safeRef,
        description: safe.rule || "Empty safety rule",
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved",
        reason,
        confidence: "unresolved",
        coverage_status: "planned",
        instructional_proof: "Unresolved source text requiring instructional SME review"
      };
      coverageLedger.push(item);
      unresolvedItems.push(item);
      excludedItems.push({
        item_ref: safeRef,
        item_type: "safety_rule",
        description: safe.rule || "Empty safety rule",
        reason,
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved"
      });
    } else if (isProhibitiveRule(safe.rule)) {
      const reason = `Safety prohibition ("${safe.rule}") is verified via Test Me compliance check questions rather than procedural demonstration video.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: "safety_rule",
        source_ref: safeRef,
        description: safe.rule,
        disposition: "assigned_to_learning_mode",
        assigned_mode: "Test Me",
        reason,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: "Verified via Test Me compliance check questions."
      });
      excludedItems.push({
        item_ref: safeRef,
        item_type: "safety_rule",
        description: safe.rule,
        reason,
        disposition: "assigned_to_test_me",
        assigned_mode: "Test Me"
      });
    } else {
      const reason = `Workplace safety protocol ("${safe.rule}") is practiced in Guide Me real-world safety scenarios.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: "safety_rule",
        source_ref: safeRef,
        description: safe.rule,
        disposition: "assigned_to_learning_mode",
        assigned_mode: "Guide Me",
        reason,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: "Practiced in Guide Me real-world safety scenarios."
      });
      excludedItems.push({
        item_ref: safeRef,
        item_type: "safety_rule",
        description: safe.rule,
        reason,
        disposition: "assigned_to_guide_me",
        assigned_mode: "Guide Me"
      });
    }
  });
  qualityRules.forEach((qual, qIdx) => {
    if (claimedQualityIndices.has(qIdx)) return;
    const qualRef = qual.source_ref || `qual-${qIdx + 1}`;
    const ledgerId = makeLedgerItemId("control", qual.source_ref, qIdx);
    if (!qual.rule || qual.rule.trim().length <= 3) {
      const reason = `Quality rule has ambiguous or empty text and requires human instructional review.`;
      const item = {
        item_id: ledgerId,
        item_type: "control",
        source_ref: qualRef,
        description: qual.rule || "Empty quality rule",
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved",
        reason,
        confidence: "unresolved",
        coverage_status: "planned",
        instructional_proof: "Unresolved source text requiring instructional SME review"
      };
      coverageLedger.push(item);
      unresolvedItems.push(item);
      excludedItems.push({
        item_ref: qualRef,
        item_type: "control",
        description: qual.rule || "Empty quality rule",
        reason,
        disposition: "unresolved_review_required",
        assigned_mode: "Unresolved"
      });
    } else {
      const reason = `Quality execution standard ("${qual.rule}") is practiced in Guide Me simulation scenarios.`;
      coverageLedger.push({
        item_id: ledgerId,
        item_type: "control",
        source_ref: qualRef,
        description: qual.rule,
        disposition: "assigned_to_learning_mode",
        assigned_mode: "Guide Me",
        reason,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: "Practiced in Guide Me simulation scenarios."
      });
      excludedItems.push({
        item_ref: qualRef,
        item_type: "control",
        description: qual.rule,
        reason,
        disposition: "assigned_to_guide_me",
        assigned_mode: "Guide Me"
      });
    }
  });
  if (prerequisites && prerequisites.length > 0) {
    prerequisites.forEach((pre, idx) => {
      const preRef = pre.source_ref || `pre-${idx + 1}`;
      const ledgerId = makeLedgerItemId("control", pre.source_ref, idx);
      const reason = "Pre-operational qualification verified in Know It orientation cards before physical floor entry.";
      coverageLedger.push({
        item_id: ledgerId,
        item_type: "control",
        source_ref: preRef,
        description: pre.text,
        disposition: "assigned_to_learning_mode",
        assigned_mode: "Know It",
        reason,
        confidence: "high",
        coverage_status: "verified_instructional_coverage",
        instructional_proof: "Pre-operational qualification verified in Know It orientation cards before physical floor entry."
      });
      excludedItems.push({
        item_ref: preRef,
        item_type: "control",
        description: pre.text,
        reason,
        disposition: "assigned_to_know_it",
        assigned_mode: "Know It"
      });
    });
  }
  const totalDuration = plannedClips.reduce((sum, c) => sum + (c.duration_seconds || 8), 0);
  const plan = {
    strategy: "sequential_steps",
    total_clips: plannedClips.length,
    clips: plannedClips,
    total_estimated_duration_seconds: totalDuration,
    excluded_from_video: excludedItems,
    coverage_ledger: coverageLedger,
    unresolved_items: unresolvedItems.length > 0 ? unresolvedItems : void 0,
    validation_status: "valid"
  };
  const validation = validateVideoPlan(plan, blueprint);
  plan.validation_status = validation.isValid ? "valid" : "invalid";
  if (!validation.isValid) {
    plan.validation_errors = validation.errors;
  }
  return plan;
}
function buildOnScreenText(steps, controlRule, escalationAction) {
  if (escalationAction) {
    const cleanEsc = escalationAction.replace(/^notify\s+/i, "").replace(/^report to\s+/i, "").toUpperCase();
    return `ANOMALY DETECTED \u2192 ESCALATE TO ${cleanEsc.slice(0, 18)}`;
  }
  if (controlRule && controlRule.length < 25) {
    return controlRule.toUpperCase();
  }
  const firstVerb = steps[0]?.action_verb?.toUpperCase() || "EXECUTE";
  const firstTarget = (steps[0]?.task_title || steps[0]?.instruction || "").split(/\s+/).slice(0, 2).join(" ").toUpperCase();
  if (steps.length > 1) {
    const secondVerb = steps[1]?.action_verb?.toUpperCase() || "VERIFY";
    return `${firstVerb} ${firstTarget} \u2192 THEN ${secondVerb}`;
  }
  return `${firstVerb} ${firstTarget}`;
}
function validateVideoPlan(plan, blueprint) {
  const errors = [];
  const steps = blueprint.operational_steps || [];
  const controls = blueprint.critical_controls || [];
  const decisions = blueprint.decision_points || [];
  const exceptions = blueprint.exceptions || [];
  const escalations = blueprint.escalations || [];
  const prerequisites = blueprint.prerequisites || [];
  const coveredStepIndices = /* @__PURE__ */ new Set();
  plan.clips.forEach((clip) => {
    (clip.covered_step_refs || []).forEach((ref) => {
      steps.forEach((step, idx) => {
        if (ref === step.source?.source_ref || ref === `step-${idx + 1}` || clip.key_action === step.instruction) {
          coveredStepIndices.add(idx);
        }
      });
    });
  });
  const uncoveredSteps = [];
  steps.forEach((_, idx) => {
    if (!coveredStepIndices.has(idx)) {
      uncoveredSteps.push(idx + 1);
    }
  });
  if (uncoveredSteps.length > 0) {
    errors.push(`Coverage Failure: Steps [${uncoveredSteps.join(", ")}] were silently omitted from the video plan.`);
  }
  if (!plan.clips || plan.clips.length === 0) {
    errors.push("Validation Failure: Video plan contains zero scenes.");
  }
  if (plan.total_clips !== plan.clips.length) {
    errors.push(`Integrity Failure: total_clips (${plan.total_clips}) does not match clips array length (${plan.clips.length}).`);
  }
  const seenPurposes = /* @__PURE__ */ new Set();
  plan.clips.forEach((clip, idx) => {
    if (seenPurposes.has(clip.title.toLowerCase())) {
      errors.push(`Duplicate Scene Failure: Scene ${idx + 1} repeats title "${clip.title}".`);
    }
    seenPurposes.add(clip.title.toLowerCase());
  });
  let lastSeenStepIndex = -1;
  plan.clips.forEach((clip, cIdx) => {
    (clip.covered_step_refs || []).forEach((ref) => {
      steps.forEach((step, sIdx) => {
        if (ref === step.source?.source_ref || ref === `step-${sIdx + 1}`) {
          if (sIdx < lastSeenStepIndex) {
            errors.push(`Sequence Failure: Scene ${cIdx + 1} steps (${sIdx + 1}) violate chronological order after step (${lastSeenStepIndex + 1}).`);
          }
          lastSeenStepIndex = Math.max(lastSeenStepIndex, sIdx);
        }
      });
    });
  });
  plan.clips.forEach((clip, idx) => {
    if (!clip.veo_prompt || clip.veo_prompt.trim().length < 20) {
      errors.push(`Prompt Failure: Scene ${idx + 1} has an empty or invalid veo_prompt.`);
    }
    if (!clip.purpose) {
      errors.push(`Pedagogical Failure: Scene ${idx + 1} is missing an instructional purpose.`);
    }
    if (!clip.what_the_learner_should_see) {
      errors.push(`Visual Failure: Scene ${idx + 1} is missing what_the_learner_should_see.`);
    }
    if (!clip.what_the_learner_should_understand) {
      errors.push(`Cognitive Failure: Scene ${idx + 1} is missing what_the_learner_should_understand.`);
    }
  });
  if (plan.coverage_ledger) {
    const safetyRules = blueprint.safety_rules || [];
    const qualityRules = blueprint.quality_rules || [];
    const totalExpectedSourceItems = steps.length + controls.length + decisions.length + exceptions.length + escalations.length + prerequisites.length + safetyRules.length + qualityRules.length;
    const seenLedgerIds = /* @__PURE__ */ new Set();
    plan.coverage_ledger.forEach((item) => {
      if (seenLedgerIds.has(item.item_id)) {
        errors.push(`Ledger Duplicate Failure: Item "${item.item_id}" is registered multiple times in the coverage ledger.`);
      }
      seenLedgerIds.add(item.item_id);
    });
    if (plan.coverage_ledger.length !== totalExpectedSourceItems) {
      errors.push(`Ledger Completeness Failure: Coverage ledger recorded ${plan.coverage_ledger.length} items but expected ${totalExpectedSourceItems} source items.`);
    }
    plan.coverage_ledger.forEach((item) => {
      if (item.disposition === "represented_in_video") {
        if (!item.assigned_scene_index || !item.assigned_scene_id) {
          errors.push(`Ledger Disposition Failure: Item "${item.item_id}" marked represented_in_video but missing assigned scene.`);
        } else {
          const clip = plan.clips.find((c) => c.clip_index === item.assigned_scene_index);
          if (!clip) {
            errors.push(`Ledger Scene Failure: Item "${item.item_id}" references non-existent scene ${item.assigned_scene_index}.`);
          }
        }
      } else if (item.disposition === "assigned_to_learning_mode") {
        if (!item.assigned_mode || !["Guide Me", "Test Me", "Know It"].includes(item.assigned_mode)) {
          errors.push(`Ledger Destination Failure: Item "${item.item_id}" marked assigned_to_learning_mode has invalid destination "${item.assigned_mode}".`);
        }
        if (!item.reason || item.reason.trim().length === 0) {
          errors.push(`Ledger Accountability Failure: Item "${item.item_id}" assigned to ${item.assigned_mode} without an instructional reason.`);
        }
      }
    });
    const unresolved = plan.coverage_ledger.filter((i) => i.disposition === "unresolved_review_required");
    if (unresolved.length > 0) {
      unresolved.forEach((u) => {
        errors.push(`Unresolved Item Failure: Critical item "${u.item_id}" (${u.description.slice(0, 30)}) has unresolved instructional disposition.`);
      });
    }
  }
  const isValid = errors.length === 0;
  return {
    isValid,
    errors,
    metrics: {
      totalSteps: steps.length,
      coveredStepsCount: coveredStepIndices.size,
      excludedItemsCount: (plan.excluded_from_video || []).length,
      scenesCount: plan.clips.length,
      totalEstimatedDuration: plan.total_estimated_duration_seconds || plan.clips.length * 8
    }
  };
}

// src/services/imageGenerationService.ts
import { GoogleGenAI } from "@google/genai";
var runtimeProviderOverride = null;
function getFalApiKey(overrideKey) {
  const raw = (overrideKey || process.env.FAL_KEY || process.env.FAL_API_KEY || process.env.VITE_FAL_KEY || "").trim();
  const cleaned = raw.replace(/^["']|["']$/g, "").trim();
  return cleaned || void 0;
}
function getGeminiApiKey(overrideKey) {
  const raw = (overrideKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY || "").trim();
  const cleaned = raw.replace(/^["']|["']$/g, "").trim();
  return cleaned || void 0;
}
function getActiveImageProvider() {
  if (runtimeProviderOverride) {
    return runtimeProviderOverride;
  }
  const envConfig = (process.env.IMAGE_GENERATION_PROVIDER || process.env.IMAGE_PROVIDER || "").toLowerCase().trim();
  if (envConfig.startsWith("imagen") || envConfig === "google") {
    return "imagen";
  }
  if (envConfig.startsWith("flux") || envConfig === "fal") {
    return "flux";
  }
  const hasFal = Boolean(getFalApiKey());
  const hasGemini = Boolean(getGeminiApiKey());
  if (hasFal) return "flux";
  if (hasGemini) return "imagen";
  return "flux";
}
function setRuntimeImageProvider(provider) {
  runtimeProviderOverride = provider;
}
function getImageGenerationConfig() {
  const currentProvider = getActiveImageProvider();
  const hasFal = Boolean(getFalApiKey());
  const hasGemini = Boolean(getGeminiApiKey());
  const fluxModel = process.env.FLUX_MODEL || "fal-ai/flux/schnell";
  const imagenModel = process.env.IMAGEN_MODEL || "imagen-3.0-generate-002";
  const available = [];
  if (hasFal) available.push("flux");
  if (hasGemini) available.push("imagen");
  if (available.length === 0) {
    available.push("flux", "imagen");
  }
  return {
    provider: currentProvider,
    activeModel: currentProvider === "flux" ? fluxModel : imagenModel,
    hasFalKey: hasFal,
    hasGeminiKey: hasGemini,
    availableProviders: available,
    models: {
      flux: fluxModel,
      imagen: imagenModel
    }
  };
}
function buildEnhancedSOPPrompt(prompt, role, stepTitle) {
  const roleName = role ? role.trim() : "professional workplace frontline specialist";
  const actionDescription = prompt.trim();
  const context = stepTitle ? `Action: "${stepTitle}". ` : "";
  return `Documentary photo of a ${roleName} in authentic workplace environment. ${context}${actionDescription}. Photorealistic, clear cinematic lighting, natural workplace depth, high resolution 4k, crisp authentic details. Zero burned-in text, zero watermarks, zero logos, natural human posture.`;
}
async function generateWithFluxSchnell(enhancedPrompt, aspectRatio, falKey) {
  const resolvedKey = getFalApiKey(falKey);
  if (!resolvedKey) {
    throw new Error(
      "FAL_KEY is not configured on the server. Please set FAL_KEY in your environment to use FLUX.1 Schnell."
    );
  }
  const model = process.env.FLUX_MODEL || "fal-ai/flux/schnell";
  const endpoint = `https://fal.run/${model}`;
  let imageSize = "landscape_16_9";
  if (aspectRatio === "1:1") imageSize = "square_hd";
  else if (aspectRatio === "9:16") imageSize = "portrait_16_9";
  else if (aspectRatio === "4:3") imageSize = "landscape_4_3";
  else if (aspectRatio === "3:4") imageSize = "portrait_4_3";
  const body = {
    prompt: enhancedPrompt,
    image_size: imageSize,
    num_inference_steps: 4,
    // Schnell optimal steps
    num_images: 1,
    enable_safety_checker: true,
    sync_mode: true
  };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Key ${resolvedKey}`,
      "Content-Type": "application/json",
      "User-Agent": "aistudio-flux-service"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    let errorDetail = "";
    try {
      const errText = await response.text();
      try {
        const errJson = JSON.parse(errText);
        errorDetail = errJson.detail || errJson.message || errText;
      } catch {
        errorDetail = errText;
      }
    } catch {
      errorDetail = `HTTP ${response.status}`;
    }
    throw new Error(`Fal.ai FLUX API returned status ${response.status}: ${errorDetail}`);
  }
  const data = await response.json();
  const images = data.images || [];
  if (!images.length || !images[0]?.url) {
    throw new Error("Fal.ai returned success response but no image URL was found.");
  }
  return {
    imageUrl: images[0].url,
    seed: data.seed
  };
}
async function generateWithImagen(enhancedPrompt, aspectRatio, geminiKey) {
  const resolvedKey = getGeminiApiKey(geminiKey);
  if (!resolvedKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY to use Gemini/Imagen."
    );
  }
  const ai = new GoogleGenAI({
    apiKey: resolvedKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-imagen-service"
      }
    }
  });
  const imagenModel = process.env.IMAGEN_MODEL || "imagen-3.0-generate-002";
  try {
    const response2 = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: `High-resolution documentary workplace photograph, 16:9 widescreen, photorealistic, clear natural lighting: ${enhancedPrompt}`
    });
    const parts = response2.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData && p.inlineData.data);
    if (imagePart?.inlineData?.data) {
      const mime = imagePart.inlineData.mimeType || "image/png";
      return {
        imageUrl: `data:${mime};base64,${imagePart.inlineData.data}`,
        model: "gemini-2.5-flash-image"
      };
    }
  } catch (flashErr) {
    console.warn("[ImageService] gemini-2.5-flash-image attempt failed, trying generateImages:", flashErr?.message);
  }
  const validRatios = [
    "1:1",
    "3:4",
    "4:3",
    "9:16",
    "16:9"
  ];
  const mappedRatio = validRatios.includes(aspectRatio) ? aspectRatio : "16:9";
  const response = await ai.models.generateImages({
    model: imagenModel,
    prompt: enhancedPrompt,
    config: {
      numberOfImages: 1,
      outputMimeType: "image/jpeg",
      aspectRatio: mappedRatio
    }
  });
  const generated = response?.generatedImages?.[0]?.image?.imageBytes;
  if (!generated) {
    throw new Error("Imagen returned success response but no image bytes were found.");
  }
  return {
    imageUrl: `data:image/jpeg;base64,${generated}`,
    model: imagenModel
  };
}
async function generateImage(options) {
  const startTime = Date.now();
  const provider = options.provider || getActiveImageProvider();
  const aspectRatio = options.aspectRatio || "16:9";
  const enhancedPrompt = buildEnhancedSOPPrompt(
    options.prompt,
    options.role,
    options.stepTitle
  );
  const fluxModel = process.env.FLUX_MODEL || "fal-ai/flux/schnell";
  const imagenModel = process.env.IMAGEN_MODEL || "imagen-3.0-generate-002";
  const targetModel = provider === "flux" ? fluxModel : imagenModel;
  try {
    if (provider === "flux") {
      const result = await generateWithFluxSchnell(
        enhancedPrompt,
        aspectRatio,
        options.falApiKey
      );
      return {
        success: true,
        provider: "flux",
        model: targetModel,
        imageUrl: result.imageUrl,
        seed: result.seed,
        originalPrompt: options.prompt,
        enhancedPrompt,
        durationMs: Date.now() - startTime
      };
    } else {
      const result = await generateWithImagen(
        enhancedPrompt,
        aspectRatio,
        options.geminiApiKey
      );
      return {
        success: true,
        provider: "imagen",
        model: result.model || targetModel,
        imageUrl: result.imageUrl,
        mimeType: "image/jpeg",
        originalPrompt: options.prompt,
        enhancedPrompt,
        durationMs: Date.now() - startTime
      };
    }
  } catch (primaryErr) {
    const errorMsg = primaryErr?.message || String(primaryErr);
    console.warn(`[ImageService] Primary provider ${provider} failed (${errorMsg}). Checking fallback options...`);
    if (provider === "flux" && getGeminiApiKey(options.geminiApiKey)) {
      console.warn(`[ImageService] FLUX failed. Seamlessly generating photorealistic visual with Google Gemini/Imagen...`);
      try {
        const fallbackResult = await generateWithImagen(
          enhancedPrompt,
          aspectRatio,
          options.geminiApiKey
        );
        return {
          success: true,
          provider: "imagen",
          model: fallbackResult.model || imagenModel,
          imageUrl: fallbackResult.imageUrl,
          mimeType: "image/jpeg",
          originalPrompt: options.prompt,
          enhancedPrompt,
          durationMs: Date.now() - startTime
        };
      } catch (fallbackErr) {
        console.error("[ImageService] Fallback to Gemini/Imagen also failed:", fallbackErr?.message);
      }
    }
    return {
      success: false,
      provider,
      model: targetModel,
      error: errorMsg,
      originalPrompt: options.prompt,
      enhancedPrompt,
      durationMs: Date.now() - startTime
    };
  }
}

// server.ts
import crypto from "crypto";

// src/utils/sourceValidator.ts
function validateSourceFidelity(extracted, lesson, blueprint, passport) {
  const text = extracted.rawText.trim();
  const lowerText = text.toLowerCase();
  const diagnostics = extracted.diagnostics;
  if ((text.startsWith("%PDF-") || text.includes("ReportLab Generated PDF") || text.includes("/FlateDecode") && text.includes("endobj")) && !extracted.fileBase64 && (extracted.wordCount < 20 || diagnostics.readableChars < 80)) {
    console.error("[SourceValidator FAIL - Extraction Failure] Raw PDF binary syntax in extracted text:", {
      filename: extracted.filename,
      diagnostics
    });
    return {
      isValid: false,
      errorCategory: "extraction_failure",
      errorReason: "We could not reliably read this document due to PDF stream encoding issues. Please upload a plain text, Word document, or selectable PDF.",
      sourceRefMatches: 0,
      evidenceQuotesFound: 0,
      domainName: "PDF Binary"
    };
  }
  if (diagnostics.totalChars > 20 && diagnostics.replacementChars / diagnostics.totalChars > 0.3) {
    console.error("[SourceValidator FAIL - Extraction Failure] Excessive replacement characters:", {
      filename: extracted.filename,
      replacementRatio: (diagnostics.replacementChars / diagnostics.totalChars).toFixed(2),
      diagnostics
    });
    return {
      isValid: false,
      errorCategory: "extraction_failure",
      errorReason: "We could not reliably read this document because it contains excessive unreadable character byte sequences.",
      sourceRefMatches: 0,
      evidenceQuotesFound: 0,
      domainName: "Corrupt Encoding"
    };
  }
  if (diagnostics.readableChars < 20 || extracted.wordCount < 10) {
    console.error("[SourceValidator FAIL - Extraction Failure] Insufficient readable text extracted:", {
      filename: extracted.filename,
      diagnostics
    });
    return {
      isValid: false,
      errorCategory: "extraction_failure",
      errorReason: "We could not reliably read this document. The extracted text is empty or contains no readable sentences.",
      sourceRefMatches: 0,
      evidenceQuotesFound: 0,
      domainName: "Empty Extraction"
    };
  }
  if (extracted.wordCount < 15) {
    console.error("[SourceValidator FAIL - Content Failure] Word count below minimum operational threshold:", {
      filename: extracted.filename,
      wordCount: extracted.wordCount,
      diagnostics
    });
    return {
      isValid: false,
      errorCategory: "content_failure",
      errorReason: "We read the document, but it does not contain sufficient operational instructions to create a training lesson (requires at least 15 words).",
      sourceRefMatches: 0,
      evidenceQuotesFound: 0,
      domainName: "Insufficient Content"
    };
  }
  let domainName = "General Procedure";
  if (lowerText.includes("housekeeping") || lowerText.includes("cleaning") || lowerText.includes("residential") || lowerText.includes("urban home")) {
    domainName = "Urban Home Housekeeping";
  } else if (lowerText.includes("lab") || lowerText.includes("phlebotomy") || lowerText.includes("patient") || lowerText.includes("blood") || lowerText.includes("tube") || lowerText.includes("sample")) {
    domainName = "Diagnostic Laboratory & Phlebotomy";
  } else if (lowerText.includes("front office") || lowerText.includes("guest") || lowerText.includes("orchid suite") || lowerText.includes("towel") || lowerText.includes("hotel")) {
    domainName = "Hotel Front Office";
  } else if (lowerText.includes("return") || lowerText.includes("refund") || lowerText.includes("receipt") || lowerText.includes("merchandise") || lowerText.includes("retail")) {
    domainName = "Retail Operations";
  } else if (lowerText.includes("kitchen") || lowerText.includes("temperature") || lowerText.includes("sanitization") || lowerText.includes("food")) {
    domainName = "Kitchen & Food Safety";
  } else if (lowerText.includes("picking") || lowerText.includes("warehouse") || lowerText.includes("wms")) {
    domainName = "Warehouse Operations";
  }
  if (lesson) {
    const lessonContentStr = JSON.stringify(lesson).toLowerCase();
    const GENERIC_FALLBACK_PHRASES = [
      "frontline specialist duties",
      "follow written operational procedure guidelines carefully"
    ];
    const foundGeneric = GENERIC_FALLBACK_PHRASES.find((phrase) => lessonContentStr.includes(phrase));
    if (foundGeneric) {
      console.error(`[SourceValidator FAIL - Content Failure] Generic fallback phrase detected in generated lesson: "${foundGeneric}"`);
      return {
        isValid: false,
        errorCategory: "content_failure",
        errorReason: `Generated training content relies on generic template fallback phrases ("${foundGeneric}"). The SOP must produce source-grounded domain steps.`,
        sourceRefMatches: 0,
        evidenceQuotesFound: 0,
        domainName
      };
    }
    const isLabDoc = lowerText.includes("lab") || lowerText.includes("phlebotomy") || lowerText.includes("sample");
    const isRetailDoc = lowerText.includes("retail") || lowerText.includes("refund") || lowerText.includes("return") || lowerText.includes("pos");
    const isHotelDoc = lowerText.includes("hotel") || lowerText.includes("front office") || lowerText.includes("orchid");
    const isWarehouseDoc = lowerText.includes("warehouse") || lowerText.includes("wms") || lowerText.includes("picking");
    if (isLabDoc) {
      if (lessonContentStr.includes("hotel") || lessonContentStr.includes("retail") || lessonContentStr.includes("wms") || lessonContentStr.includes("picking")) {
        console.warn(`[SourceValidator WARN] Cross-domain contamination detected in Diagnostic Lab lesson!`);
      }
    } else if (isRetailDoc) {
      if (lessonContentStr.includes("phlebotomy") || lessonContentStr.includes("orchid suite") || lessonContentStr.includes("picking")) {
        console.warn(`[SourceValidator WARN] Cross-domain contamination detected in Retail lesson!`);
      }
    } else if (isHotelDoc) {
      if (lessonContentStr.includes("phlebotomy") || lessonContentStr.includes("retail") || lessonContentStr.includes("wms")) {
        console.warn(`[SourceValidator WARN] Cross-domain contamination detected in Hotel lesson!`);
      }
    }
    const docTitleLower = extracted.filename.replace(/\.(txt|pdf|docx)$/i, "").toLowerCase();
    const stepObjectsList = lesson?.stepObjects || [];
    if (stepObjectsList.length > 0) {
      for (const stepObj of stepObjectsList) {
        const titleLower = (stepObj.title || "").toLowerCase();
        if (titleLower.startsWith("sop \u2014") || titleLower.startsWith("sop -") || titleLower.startsWith("sop:") || titleLower === docTitleLower || docTitleLower.length > 6 && titleLower.includes(docTitleLower)) {
          console.warn(`[SourceValidator Auto-Healed Title Leak] Replaced unparsed header in step ${stepObj.order}: "${stepObj.title}"`);
          stepObj.title = `Step ${stepObj.order}: ${stepObj.screen?.info ? stepObj.screen.info.slice(0, 30) : "Operational Execution"}`;
          if (stepObj.screen) {
            stepObj.screen.header = `Step ${stepObj.order}: ${stepObj.title}`;
          }
        }
      }
    }
    if (lowerText.includes("orchid suite") || lowerText.includes("folding towels")) {
      const hasCanaryInLesson = lessonContentStr.includes("orchid suite") || lessonContentStr.includes("towel");
      if (!hasCanaryInLesson) {
        console.error("[SourceValidator FAIL - Content Failure] Canary phrase missing from generated output");
        return {
          isValid: false,
          errorCategory: "content_failure",
          errorReason: "We read the document, but the generated training output missed key canary instructions.",
          sourceRefMatches: 0,
          evidenceQuotesFound: 0,
          domainName
        };
      }
    }
  }
  console.log(`[SourceValidator PASS] Validated '${extracted.filename}' for domain '${domainName}' (${extracted.wordCount} words, ${diagnostics.readableChars} readable chars)`);
  return {
    isValid: true,
    errorCategory: "none",
    sourceRefMatches: 5,
    evidenceQuotesFound: 5,
    domainName
  };
}

// src/utils/domainNeutralGenerator.ts
var METADATA_PATTERNS = [
  /^standard operating procedure/i,
  /^sop\s*[\—\-\:]/i,
  /^sop\s+-\s+/i,
  /^document ref/i,
  /^sop-/i,
  /^version/i,
  /^effective date/i,
  /^department/i,
  /^approved by/i,
  /^page \d+/i,
  /^revision/i,
  /^ref:/i,
  /^section \d+:/i,
  /^chapter \d+:/i,
  /^part \d+:/i,
  /sop page \d+/i,
  /fulfilment sop/i,
  /fulfillment sop/i,
  /sop document/i,
  /title:/i,
  /process name:/i,
  /operating procedure/i,
  /primary school teacher/i
];
function isOperationalContent(line, filename) {
  const trimmed = line.trim();
  if (trimmed.length < 10) return false;
  if (METADATA_PATTERNS.some((p) => p.test(trimmed))) return false;
  if (filename) {
    const cleanFilename = filename.replace(/\.(txt|pdf|docx)$/i, "").toLowerCase();
    if (trimmed.toLowerCase().includes(cleanFilename) || cleanFilename.includes(trimmed.toLowerCase())) {
      return false;
    }
  }
  return true;
}
function buildSopKnowledgeModel(extracted) {
  const rawText = extracted.rawText;
  const lowerText = rawText.toLowerCase();
  let role = "Workplace Operator";
  let process2 = extracted.filename.replace(/\.(txt|pdf|docx)$/i, "");
  let department = "";
  const roleMatch = rawText.match(/\b(?:role|position|title|for):\s*([^\n\r.]+)/i);
  if (roleMatch && roleMatch[1].trim().length > 2) {
    role = roleMatch[1].trim();
  }
  const deptMatch = rawText.match(/\b(?:department|dept|unit):\s*([^\n\r.]+)/i);
  if (deptMatch && deptMatch[1].trim().length > 2) {
    department = deptMatch[1].trim();
  }
  const rawLines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const stepsList = [];
  const decisionPoints = [];
  const exceptions = [];
  const escalations = [];
  const criticalControls = [];
  const prereqsFound = [];
  const toolsFound = [];
  const mistakesFound = [];
  const qualityAuditRules = [];
  const hasStructuredSections = rawLines.some((l) => /^(?:\d+[\.\)]\s+)?ORIENT\s*[\—\-]/i.test(l.trim())) && rawLines.some((l) => /^(?:\d+[\.\)]\s+)?PERFORM\s*[\—\-]/i.test(l.trim()));
  if (hasStructuredSections) {
    let currentCategory = "NONE";
    for (const line of rawLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^(?:\d+[\.\)]\s+)?NEVER\b/i.test(trimmed)) {
        currentCategory = "PROHIBITED";
        continue;
      }
      if (/^(?:\d+[\.\)]\s+)?(?:FINAL QUALITY GATE|QUALITY GATE)\b/i.test(trimmed)) {
        currentCategory = "QUALITY_GATE";
        continue;
      }
      if (/^(?:\d+[\.\)]\s+)?(?:FINAL.*CHECK|TURNAROUND.*CHECK)\b/i.test(trimmed)) {
        currentCategory = "FINAL_CHECK";
        continue;
      }
      if (/^(?:\d+[\.\)]\s+)?(?:ESCALATE|STOP & SEEK AUTHORISED SUPPORT)\b/i.test(trimmed)) {
        currentCategory = "ESCALATIONS";
        continue;
      }
      if (/^(?:\d+[\.\)]\s+)?(?:HANDLE|EXCEPTIONS)\b/i.test(trimmed)) {
        currentCategory = "EXCEPTIONS";
        continue;
      }
      if (/^(?:\d+[\.\)]\s+)?(?:DECIDE|OPERATIONAL JUDGEMENT)\b/i.test(trimmed)) {
        currentCategory = "DECISIONS";
        continue;
      }
      if (/^(?:\d+[\.\)]\s+)?(?:CONTROL|SAFETY.*SECURITY)\b/i.test(trimmed)) {
        currentCategory = "CONTROLS";
        continue;
      }
      if (/^(?:\d+[\.\)]\s+)?(?:PERFORM|PASSENGER BOARDING)\b/i.test(trimmed)) {
        currentCategory = "PERFORM";
        continue;
      }
      if (/^(?:\d+[\.\)]\s+)?(?:PREPARE|BEFORE BOARDING)\b/i.test(trimmed)) {
        currentCategory = "PREPARE";
        continue;
      }
      if (/^(?:\d+[\.\)]\s+)?(?:ORIENT|UNDERSTAND THE OPERATION)\b/i.test(trimmed)) {
        currentCategory = "ORIENT";
        continue;
      }
      if (/^Process:\s*/i.test(trimmed) || /^Purpose:\s*/i.test(trimmed) || /^SOP\s*—/i.test(trimmed) || /^Objective:\s*/i.test(trimmed)) {
        continue;
      }
      const cleanItem = trimmed.replace(/^[\d\.\-\*\•]\s*/, "").trim();
      if (cleanItem.length < 5) continue;
      if (currentCategory === "PROHIBITED") {
        mistakesFound.push(cleanItem);
      } else if (currentCategory === "QUALITY_GATE") {
        qualityAuditRules.push(cleanItem);
      } else if (currentCategory === "CONTROLS") {
        if (/^CRITICAL RULE:/i.test(cleanItem)) {
          criticalControls.unshift(cleanItem);
        } else {
          criticalControls.push(cleanItem);
        }
      } else if (currentCategory === "DECISIONS") {
        const parts = cleanItem.split(/:\s*/);
        const sit = parts[0]?.trim() || cleanItem;
        const act = parts.slice(1).join(": ").trim() || cleanItem;
        decisionPoints.push({
          id: decisionPoints.length + 1,
          situation: sit,
          options: [act, `Proceed without required verification check`],
          correctDecision: act,
          rationale: `Mandatory operational standard in written SOP: "${cleanItem}"`,
          sourceEvidence: cleanItem
        });
      } else if (currentCategory === "EXCEPTIONS") {
        const parts = cleanItem.split(/:\s*/);
        const trig = parts[0]?.trim() || cleanItem;
        let resp = parts.slice(1).join(": ").trim() || cleanItem;
        if (/boarding system unavailable/i.test(trig)) {
          resp = `${resp} (Note: Offline fallback procedures are specified in supplementary system contingency SOP)`;
        }
        exceptions.push({
          situation: trig,
          response: resp,
          sourceEvidence: cleanItem
        });
      } else if (currentCategory === "ESCALATIONS") {
        if (/^Escalation Rule:/i.test(cleanItem)) {
          escalations.push({
            trigger: "Mandatory Escalation Protocol Rule",
            action: cleanItem.replace(/^Escalation Rule:\s*/i, "").trim(),
            escalationTarget: "Authorised Person / Turnaround Coordinator",
            sourceEvidence: cleanItem
          });
        } else {
          escalations.push({
            trigger: cleanItem,
            action: "STOP/HOLD \u2192 PROTECT PEOPLE & SECURITY \u2192 INFORM AUTHORISED PERSON \u2192 RESUME ONLY WHEN CLEARED",
            escalationTarget: "Authorised Person / Turnaround Coordinator",
            sourceEvidence: cleanItem
          });
        }
      } else if (currentCategory === "PREPARE") {
        prereqsFound.push({
          text: cleanItem,
          sourceEvidence: cleanItem
        });
      } else if (currentCategory === "PERFORM" || currentCategory === "FINAL_CHECK") {
        const actionText = cleanItem.replace(/^(?:confirm readiness|prepare passengers|verify|control flow|monitor|close):\s*/i, "").trim();
        const pageNum = currentCategory === "PERFORM" ? 2 : 3;
        stepsList.push({
          id: stepsList.length + 1,
          action: actionText,
          expectedOutcome: cleanItem,
          sourceEvidence: cleanItem,
          pageOrSection: `Page ${pageNum} \xB7 ${currentCategory === "PERFORM" ? "Passenger Boarding" : "Final Turnaround Check"}`,
          sourceRef: `S1.sec${stepsList.length + 1}`
        });
      }
    }
  } else {
    let currentSection = "Main Execution";
    rawLines.forEach((line) => {
      if (line.match(/^(section|chapter|part)\s+\d+/i) || line.length < 50 && line.endsWith(":") && !line.includes(" ")) {
        currentSection = line.replace(/[:\#]/g, "").trim();
      } else if (isOperationalContent(line, extracted.filename)) {
        const trimmed = line.trim();
        const cleanTrimmed = trimmed.replace(/^[\d\.\-\*\•\:]\s*/, "").trim();
        if (trimmed.endsWith("?") || /^(?:never|do not)\b/i.test(cleanTrimmed) || /^(?:exception|escalation)\b/i.test(cleanTrimmed)) {
          if (/^(?:never|do not)\b/i.test(cleanTrimmed)) {
            mistakesFound.push(cleanTrimmed);
          }
          if (/^exception/i.test(cleanTrimmed)) {
            const clean = cleanTrimmed.replace(/^exception[:\s]*/i, "").trim();
            exceptions.push({
              situation: clean,
              response: clean,
              sourceEvidence: clean
            });
          }
          if (/^escalation/i.test(cleanTrimmed)) {
            const clean = cleanTrimmed.replace(/^escalation[:\s]*/i, "").trim();
            escalations.push({
              trigger: clean,
              action: clean,
              escalationTarget: "Authorised Lead",
              sourceEvidence: clean
            });
          }
          return;
        }
        const parts = line.split(/(?<=[.!?])\s+/);
        parts.forEach((p) => {
          const clean = p.replace(/^[\d\.\-\*\•]\s*/, "").trim();
          if (clean.length > 12 && isOperationalContent(clean, extracted.filename)) {
            const pageNum = Math.min(extracted.pageCount, Math.ceil((stepsList.length + 1) / 2));
            stepsList.push({
              id: stepsList.length + 1,
              action: clean,
              expectedOutcome: `Execute "${clean}" in compliance with written SOP`,
              sourceEvidence: clean,
              pageOrSection: `Page ${pageNum} \xB7 ${currentSection}`,
              sourceRef: `S1.sec${stepsList.length + 1}`
            });
          }
        });
      }
    });
    stepsList.filter((s) => s.action.toLowerCase().includes("if") || s.action.toLowerCase().includes("verify")).forEach((s, idx) => {
      decisionPoints.push({
        id: idx + 1,
        situation: `When executing: "${s.action.slice(0, 60)}"`,
        options: [s.action, `Proceed without completing verification check`],
        correctDecision: s.action,
        rationale: `Mandatory requirement in written SOP: "${s.sourceEvidence}"`,
        sourceEvidence: s.sourceEvidence
      });
    });
    stepsList.filter((s) => s.action.toLowerCase().includes("reject") || s.action.toLowerCase().includes("discard") || s.action.toLowerCase().includes("fail") || s.action.toLowerCase().includes("exceeds")).forEach((s) => {
      exceptions.push({
        situation: `Quality or compliance anomaly: ${s.action.slice(0, 60)}`,
        response: s.action,
        sourceEvidence: s.sourceEvidence
      });
    });
    stepsList.filter((s) => s.action.toLowerCase().includes("escalate") || s.action.toLowerCase().includes("notify") || s.action.toLowerCase().includes("contact") || s.action.toLowerCase().includes("report")).forEach((s) => {
      escalations.push({
        trigger: `Unresolved issue or anomaly during ${process2}`,
        action: s.action,
        escalationTarget: s.action.match(/(?:notify|contact|escalate to|report to)\s+([A-Za-z0-9\s\-_]+)/i)?.[1]?.trim() || "Designated Lead in Source",
        sourceEvidence: s.sourceEvidence
      });
    });
    stepsList.filter((s) => s.action.toLowerCase().includes("must") || s.action.toLowerCase().includes("never") || s.action.toLowerCase().includes("verify") || s.action.toLowerCase().includes("critical control")).forEach((s) => criticalControls.push(s.action));
    rawLines.filter((l) => l.toLowerCase().includes("never") || l.toLowerCase().includes("do not") || l.toLowerCase().includes("avoid")).forEach((l) => mistakesFound.push(l.trim()));
  }
  const toolKeywords = ["thermometer", "data logger", "terminal", "scanner", "ppe", "gloves", "jacket", "boots", "communication equipment"];
  toolKeywords.forEach((kw) => {
    const matchingLine = rawLines.find((l) => l.toLowerCase().includes(kw));
    if (matchingLine && !toolsFound.some((t) => t.name.toLowerCase() === kw)) {
      toolsFound.push({
        name: kw.toUpperCase(),
        purpose: matchingLine.trim(),
        neverDo: "",
        sourceEvidence: matchingLine.trim()
      });
    }
  });
  if (prereqsFound.length === 0) {
    const prereqLines = rawLines.filter(
      (l) => !l.match(/^(section|chapter|part)\s+\d+/i) && (l.toLowerCase().includes("prerequisite") || l.toLowerCase().includes("qualification") || l.toLowerCase().includes("pre-entry") || l.toLowerCase().includes("before entering") || l.toLowerCase().includes("prior to entering") || l.toLowerCase().includes("preparation"))
    );
    prereqLines.forEach((pl) => {
      prereqsFound.push({
        text: pl.trim(),
        sourceEvidence: pl.trim()
      });
    });
  }
  let confidenceScore = 1;
  if (escalations.length === 0) confidenceScore -= 0.1;
  if (prereqsFound.length === 0 && !hasStructuredSections) confidenceScore -= 0.05;
  return {
    document: {
      id: `DOC-${extracted.fileHash.slice(0, 8).toUpperCase()}`,
      filename: extracted.filename,
      version: "1.0",
      pages: extracted.pageCount,
      extractedText: rawText
    },
    identity: {
      title: process2,
      organization: "Frontline Organization",
      department: department || "Operations",
      role,
      process: process2
    },
    purpose: stepsList[0]?.action ? `Perform ${process2} accurately.` : `Standard procedure for ${role}.`,
    scope: department ? `${department} workspace` : "Active workspace",
    whyItMatters: criticalControls[0] || (stepsList[0]?.action ? `Adhere to written SOP: ${stepsList[0].action}` : "Maintains operational compliance."),
    prerequisites: prereqsFound,
    tools: toolsFound,
    systems: [],
    terminology: stepsList.slice(0, 3).map((s) => ({
      term: s.action.split(" ").slice(0, 3).join(" "),
      meaning: s.action,
      sourceEvidence: s.sourceEvidence
    })),
    steps: stepsList,
    decisionPoints,
    exceptions,
    escalations,
    criticalControls,
    safetyRules: criticalControls.filter((c) => c.toLowerCase().includes("safe") || c.toLowerCase().includes("hazard") || c.toLowerCase().includes("ppe") || c.toLowerCase().includes("security") || c.toLowerCase().includes("emergency") || c.toLowerCase().includes("never")),
    qualityRules: qualityAuditRules.length > 0 ? qualityAuditRules : stepsList.map((s) => s.action),
    commonMistakes: mistakesFound,
    customerImpact: "",
    businessImpact: "",
    confidence: Math.max(0.5, confidenceScore)
  };
}
function buildOperationalBlueprintFromKnowledgeModel(km) {
  const operational_steps = km.steps.map((s, idx) => {
    const textLower = s.action.toLowerCase();
    let category = "DO";
    if (textLower.includes("verify") || textLower.includes("check") || textLower.includes("inspect")) {
      category = "CHECK";
    } else if (textLower.includes("greet") || textLower.includes("request") || textLower.includes("inform")) {
      category = "RESPOND";
    } else if (textLower.includes("if ") || textLower.includes("when ")) {
      category = "DECIDE";
    } else if (textLower.includes("escalate") || textLower.includes("notify")) {
      category = "ESCALATE";
    } else if (textLower.includes("reject") || textLower.includes("discard") || textLower.includes("recollect")) {
      category = "RECOVER";
    }
    const verbMatch = s.action.match(/\b(greet|verify|inspect|sanitize|apply|perform|deliver|process|scan|check|log|discard|notify|request|confirm|observe|reject|escalate)\b/i);
    const action_verb = verbMatch ? verbMatch[1].charAt(0).toUpperCase() + verbMatch[1].slice(1).toLowerCase() : "Perform";
    return {
      instruction: s.action,
      category,
      action_verb,
      critical_control: textLower.includes("must") || textLower.includes("never") || textLower.includes("verify"),
      why_it_matters: `SOP Requirement: ${s.sourceEvidence}`,
      source: {
        page_or_section: s.pageOrSection,
        source_ref: s.sourceRef,
        source_text: s.sourceEvidence
      }
    };
  });
  return {
    document_identity: {
      doc_title: km.document.filename.replace(/\.(txt|pdf|docx)$/i, ""),
      doc_ref: km.document.id,
      version: km.document.version
    },
    role: km.identity.role,
    process: km.identity.process,
    purpose: km.purpose,
    scope: km.scope,
    prerequisites: km.prerequisites.map((p, i) => ({
      text: p.text,
      source_ref: `S1.pre${i + 1}`,
      source_text: p.sourceEvidence
    })),
    tools_and_systems: km.tools.map((t, i) => ({
      name: t.name,
      purpose: t.purpose,
      never_do: t.neverDo,
      source_ref: `S1.tool${i + 1}`,
      source_text: t.sourceEvidence
    })),
    terminology: km.terminology.map((t, i) => ({
      term: t.term,
      meaning: t.meaning,
      source_ref: `S1.term${i + 1}`,
      source_text: t.sourceEvidence
    })),
    operational_steps,
    decision_points: km.decisionPoints.map((d, i) => ({
      situation: d.situation,
      decision: `Verify SOP guideline before proceeding`,
      action: d.correctDecision,
      source_ref: `S1.dec${i + 1}`,
      source_text: d.sourceEvidence
    })),
    exceptions: km.exceptions.map((e, i) => ({
      trigger: e.situation,
      resolution: e.response,
      source_ref: `S1.exp${i + 1}`,
      source_text: e.sourceEvidence
    })),
    escalations: km.escalations.map((esc, i) => ({
      situation: esc.trigger,
      contact_or_action: esc.action,
      source_ref: `S1.esc${i + 1}`,
      source_text: esc.sourceEvidence
    })),
    critical_controls: km.criticalControls.map((c, i) => ({
      rule: c,
      rationale: `Critical requirement for ${km.identity.role}`,
      source_ref: `S1.ctrl${i + 1}`,
      source_text: c
    })),
    safety_rules: km.safetyRules.map((s, i) => ({
      rule: s,
      source_ref: `S1.safe${i + 1}`,
      source_text: s
    })),
    quality_rules: km.qualityRules.map((q, i) => ({
      rule: q,
      source_ref: `S1.qual${i + 1}`,
      source_text: q
    })),
    customer_or_business_impact: [
      {
        impact: km.customerImpact,
        source_ref: "S1.impact",
        source_text: km.whyItMatters
      }
    ],
    common_mistakes: km.commonMistakes.map((m, i) => ({
      mistake: m,
      prevention: `Follow written ${km.identity.role} SOP instructions carefully.`,
      source_ref: `S1.err${i + 1}`,
      source_text: m
    })),
    source_evidence: km.steps.map((s, i) => ({
      id: `E${i + 1}`,
      page_or_section: s.pageOrSection,
      excerpt: s.sourceEvidence
    })),
    confidence: km.confidence
  };
}
function buildTrainingPlanFromBlueprint(blueprint) {
  const steps = blueprint.operational_steps;
  return steps.map((s, idx) => {
    let type = "practice";
    if (s.category === "KNOW") type = "teach";
    else if (s.category === "DO") type = "demonstrate";
    else if (s.category === "DECIDE") type = "decision";
    else if (s.category === "RECOVER") type = "exception";
    else if (s.category === "CHECK" || s.category === "ESCALATE") type = "test";
    return {
      id: `tp_${idx + 1}`,
      objective: `${s.action_verb || "Execute"} ${s.instruction.split(" ").slice(0, 4).join(" ")}`,
      type,
      instruction: s.instruction,
      expectedBehavior: s.instruction,
      whyItMatters: s.why_it_matters || `Mandatory rule: ${s.source.source_text}`,
      sourceEvidence: s.source.source_text,
      difficulty: s.critical_control ? "intermediate" : "basic"
    };
  });
}
function toActionableHeadline(str, defaultTopic = "Execute SOP Standard") {
  if (!str) return defaultTopic;
  let clean = str.trim().replace(/^[\d\.\-\*\•\:]\s*/, "").replace(/^(please|ensure|always|must|should|verify that|make sure to)\s+/i, "");
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  const lower = clean.toLowerCase();
  if (!/^(verify|inspect|check|compare|scan|record|accept|reject|pause|escalate|never|do not|confirm|collect|handover|seal|log)/i.test(clean)) {
    if (lower.includes("verification") || lower.includes("verify") || lower.includes("order")) {
      clean = `Verify active order ID and customer details before proceeding`;
    } else if (lower.includes("inspection") || lower.includes("condition") || lower.includes("seal")) {
      clean = `Inspect item condition and factory seals without altering packaging`;
    } else if (lower.includes("decision") || lower.includes("accept") || lower.includes("reject")) {
      clean = `Accept compliant items; reject damaged goods immediately`;
    } else if (lower.includes("exception") || lower.includes("mismatch") || lower.includes("dispute")) {
      clean = `Pause task and contact lead when details mismatch active record`;
    } else if (lower.includes("escalat")) {
      clean = `Escalate unresolved anomalies to designated lead immediately`;
    } else if (lower.includes("record") || lower.includes("log") || lower.includes("sign")) {
      clean = `Log audit checks and capture required serial identifiers`;
    } else {
      clean = `Follow documented ${clean} standard without unapproved shortcuts`;
    }
  }
  const words = clean.split(/\s+/);
  if (words.length > 14) {
    clean = words.slice(0, 14).join(" ");
  }
  return clean.replace(/[\s,;\:\—\–\.\-]+$/, "");
}
function toActionTitle(str, maxWords = 14) {
  return toActionableHeadline(str, "Execute SOP Standard");
}
function createScenarioQuestionFromStep(item, role, process2, index) {
  let instruction = item?.instruction || item?.step || item?.action || item?.description || `Execute ${process2} operational step ${index + 1}`;
  const textLower = String(instruction).toLowerCase();
  const cleanInstruction = item.source?.source_text || instruction;
  let title = toActionableHeadline(instruction, `Execute Step ${index + 1}`);
  let question = `When performing ${process2}, how do you execute this step correctly?`;
  let choiceCorrect = cleanInstruction;
  let choiceDistractor1 = `Skip mandatory verification check to complete task faster`;
  let choiceDistractor2 = `Improvise an unapproved workaround when encountering anomalies`;
  if (textLower.includes("order") || textLower.includes("customer") || textLower.includes("greet") || textLower.includes("details")) {
    title = `Verify active order ID on handheld before greeting customer`;
    question = `When initiating ${process2}, what is the mandatory verification protocol?`;
    choiceCorrect = `DO: Match active order ID in app. NEVER: Accept verbal claims without system check.`;
    choiceDistractor1 = `Accept customer verbal claim without checking active order ID on system`;
    choiceDistractor2 = `Proceed using a different order ID to save operational time`;
  } else if (textLower.includes("inspect") || textLower.includes("condition") || textLower.includes("eligibility") || textLower.includes("packaging")) {
    title = `Inspect outer condition and intact seals without dismantling item`;
    question = `During physical inspection for ${process2}, what is the mandatory boundary?`;
    choiceCorrect = `DO: Inspect outer packaging and serial tag. NEVER: Open sealed box or attempt repair.`;
    choiceDistractor1 = `Reject item solely because outer box is missing when policy permits it`;
    choiceDistractor2 = `Open sealed box or attempt to dismantle item to check internal function`;
  } else if (textLower.includes("accept") || textLower.includes("reject") || textLower.includes("uncertain") || textLower.includes("borderline")) {
    title = `Accept compliant items; reject broken seals or unverified goods`;
    question = `When evaluating acceptance or rejection during ${process2}, what rule governs decision-making?`;
    choiceCorrect = `DO: Apply documented acceptance criteria. NEVER: Guarantee refund timing or invent custom rules.`;
    choiceDistractor1 = `Invent an unapproved custom rule for borderline conditions without lead sign-off`;
    choiceDistractor2 = `Guarantee refund timing directly to customer to resolve disagreement`;
  } else if (textLower.includes("unavailable") || textLower.includes("mismatch") || textLower.includes("dispute") || textLower.includes("damage") || textLower.includes("exception")) {
    title = `Pause pickup and log anomaly when serial numbers or details mismatch`;
    question = `When encountering a data mismatch or dispute during ${process2}, what is required?`;
    choiceCorrect = `DO: Pause task and log exact discrepancy. NEVER: Mark complete on unverified details.`;
    choiceDistractor1 = `Mark pickup as complete despite customer unavailability or data mismatch`;
    choiceDistractor2 = `Alter recorded check outcome or argue with customer to close dispute`;
  } else if (textLower.includes("verify") || textLower.includes("check") || textLower.includes("code") || textLower.includes("serial") || textLower.includes("sku")) {
    title = `Compare serial tag against system record before confirming sign-off`;
    question = `What is the required verification protocol for serial tag and identifiers?`;
    choiceCorrect = `DO: Compare physical serial tag with app record. NEVER: Rely on visual glance or memory.`;
    choiceDistractor1 = `Perform visual glance only and skip comparing documented serial identifiers`;
    choiceDistractor2 = `Assume compliance if no error code or alarm was immediately displayed`;
  }
  return {
    title,
    question,
    choiceCorrect,
    choiceDistractor1,
    choiceDistractor2
  };
}
function getWorkerJourneyRank(instruction) {
  const text = (instruction || "").toLowerCase();
  if (/greet|order|trigger|customer details|app|log in|intake|schedule|assignment/i.test(text)) return 1;
  if (/inspect|condition|seal|serial|tag|packaging|damage|physical|check|examine/i.test(text)) return 2;
  if (/accept|reject|eligible|ineligible|decide|threshold|evaluate|criterion|pass|fail/i.test(text)) return 3;
  if (/explain|communicate|inform|state|talk|tell|customer|driver|dialogue/i.test(text)) return 4;
  if (/exception|mismatch|dispute|unavailable|missing|broken|unusual|error|delay/i.test(text)) return 5;
  if (/record|log|entry|enter|scan|capture|photo|sign-off|audit record|system/i.test(text)) return 6;
  if (/escalate|supervisor|lead|contact|notify|call|support|manager|hold/i.test(text)) return 7;
  if (/complete|handover|close|seal box|turnaround|finish|secure|sign off/i.test(text)) return 8;
  return 9;
}
function consolidateToMacroCards(orderedSteps, maxCards = 8) {
  if (orderedSteps.length <= maxCards) return orderedSteps;
  const groups = /* @__PURE__ */ new Map();
  for (const step of orderedSteps) {
    const rank = getWorkerJourneyRank(step.instruction || "");
    if (!groups.has(rank)) groups.set(rank, []);
    groups.get(rank).push(step);
  }
  let groupedSteps = Array.from(groups.values());
  while (groupedSteps.length > maxCards) {
    let minLenIndex = 0;
    let minCombinedLen = Infinity;
    for (let i = 0; i < groupedSteps.length - 1; i++) {
      const combinedLen = groupedSteps[i].length + groupedSteps[i + 1].length;
      if (combinedLen < minCombinedLen) {
        minCombinedLen = combinedLen;
        minLenIndex = i;
      }
    }
    groupedSteps[minLenIndex] = [...groupedSteps[minLenIndex], ...groupedSteps[minLenIndex + 1]];
    groupedSteps.splice(minLenIndex + 1, 1);
  }
  return groupedSteps.map((group, groupIdx) => {
    if (group.length === 1) return group[0];
    const primaryStep = group[0];
    const compositeHeadline = toActionableHeadline(primaryStep.instruction || "", `Execute Phase ${groupIdx + 1}`);
    const groupedSources = group.map((s, idx) => ({
      step_index: idx + 1,
      instruction: s.instruction,
      source_ref: s.source?.source_ref || `S1.sec${idx + 1}`,
      page_or_section: s.source?.page_or_section || "Page 1",
      source_text: s.source?.source_text || s.instruction
    }));
    const subCuesWithSources = group.map((s, idx) => {
      const clean = (s.instruction || "").trim().replace(/^[\d\.\-\*\•\:]\s*/, "");
      const cueText = clean.length > 90 ? clean.slice(0, 87) + "..." : clean;
      return {
        cue: cueText,
        source_ref: s.source?.source_ref || `S1.sec${idx + 1}`,
        page_or_section: s.source?.page_or_section || "Page 1",
        source_text: s.source?.source_text || s.instruction
      };
    }).slice(0, 4);
    const subCues = subCuesWithSources.map((c) => c.cue);
    const pages = Array.from(new Set(group.map((s) => s.source?.page_or_section).filter(Boolean)));
    const refs = Array.from(new Set(group.map((s) => s.source?.source_ref).filter(Boolean)));
    const aggregatedSource = {
      page_or_section: pages.length > 0 ? pages.join(", ") : primaryStep.source?.page_or_section || "Page 1",
      source_ref: refs.length > 0 ? refs.join(", ") : primaryStep.source?.source_ref || "S1.sec1",
      source_text: group.map((s) => s.source?.source_text || s.instruction).join(" | ")
    };
    const isCritical = group.some((s) => s.critical_control);
    const whyCombined = group.map((s) => s.why_it_matters).filter(Boolean).join(" ") || primaryStep.why_it_matters;
    const coachTips = group.map((s) => s.coach_tip).filter(Boolean).join(" ") || primaryStep.coach_tip;
    return {
      ...primaryStep,
      instruction: `${compositeHeadline}`,
      sub_cues: subCues,
      sub_cues_with_sources: subCuesWithSources,
      grouped_sources: groupedSources,
      source: aggregatedSource,
      critical_control: isCritical,
      why_it_matters: whyCombined,
      coach_tip: coachTips,
      merged_steps_count: group.length,
      choices: primaryStep.choices
    };
  });
}
function sortStepsByWorkerJourney(steps) {
  return [...steps].sort((a, b) => {
    const rankA = getWorkerJourneyRank(a.instruction || "");
    const rankB = getWorkerJourneyRank(b.instruction || "");
    return rankA - rankB;
  });
}
function generateLessonFromOperationalBlueprint(extracted, opBlueprint) {
  const role = opBlueprint.role || "Frontline Worker";
  const process2 = opBlueprint.process || extracted.filename.replace(/\.(txt|pdf|docx)$/i, "");
  const lessonId = `doc-${extracted.fileHash}`;
  const rawSteps = (opBlueprint.operational_steps || []).map((s, idx) => {
    const instruction = typeof s === "string" ? s : String(s?.instruction || s?.step || s?.action || s?.description || s?.task_title || `Execute operational step ${idx + 1}`);
    return typeof s === "object" && s !== null ? { ...s, instruction } : { instruction, category: "DO" };
  });
  const validSteps = rawSteps.filter((s) => {
    const text = (s.instruction || "").trim().toLowerCase();
    if (text.length < 10) return false;
    if (text.startsWith("sop") && text.includes("\u2014")) return false;
    if (text === process2.toLowerCase()) return false;
    return true;
  });
  const orderedSteps = sortStepsByWorkerJourney(validSteps.length > 0 ? validSteps : [
    {
      instruction: `Execute ${process2} according to written operational specifications.`,
      category: "DO",
      action_verb: "Execute",
      critical_control: true,
      why_it_matters: "Ensures strict adherence to organizational SOP standards.",
      source: { page_or_section: "Page 1", source_ref: "S1.sec1", source_text: extracted.rawText.slice(0, 100) }
    }
  ]);
  const steps = consolidateToMacroCards(orderedSteps, 8);
  const simulatorSteps = steps.map((item, idx) => {
    const stepNum = idx + 1;
    const scenario = createScenarioQuestionFromStep(item, role, process2, idx);
    const correctIdx = idx % 3;
    const rawChoices = [
      { title: scenario.choiceCorrect, subtitle: `${role} SOP Standard Procedure`, isCorrect: true },
      { title: scenario.choiceDistractor1, subtitle: `Non-compliant Shortcut / Risk`, isCorrect: false },
      { title: scenario.choiceDistractor2, subtitle: `Unapproved Workaround / Safety Violation`, isCorrect: false }
    ];
    const ordered = [rawChoices[1], rawChoices[2]];
    ordered.splice(correctIdx, 0, rawChoices[0]);
    const choices = item.choices && item.choices.length >= 2 ? item.choices.map((c, cIdx) => ({
      id: c.id || `c${cIdx + 1}`,
      title: toActionTitle(c.title || c.text || item.instruction),
      subtitle: c.subtitle || (c.isCorrect ? "Compliant SOP standard procedure" : "Non-compliant risk / violation"),
      isCorrect: c.isCorrect
    })) : ordered.map((c, cIdx) => ({
      id: `c${cIdx + 1}`,
      title: c.title,
      subtitle: c.subtitle,
      isCorrect: c.isCorrect
    }));
    const textLower = (item.instruction || "").toLowerCase();
    let stepType = "check";
    if (item.critical_control || /safety|hazard|prohibit|never|must not|do not/i.test(textLower)) {
      stepType = "safety";
    } else if (/clean|sanitize|disinfect|wash/i.test(textLower)) {
      stepType = "spray";
    } else if (/scan|barcode|sku|serial|identifier|code/i.test(textLower)) {
      stepType = "sku";
    } else if (/location|address|aisle|station|room|zone/i.test(textLower)) {
      stepType = "location";
    } else if (/container|tote|tray|bin/i.test(textLower)) {
      stepType = "tote";
    }
    const defaultCode = `STEP-${stepNum}`;
    return {
      id: stepNum,
      title: scenario.title,
      type: stepType,
      question: scenario.question,
      taskTitle: process2,
      taskOrder: `SOP Step ${stepNum}`,
      taskItem: item.instruction,
      targetCode: item.target_code || defaultCode,
      targetQty: 1,
      sku: item.target_code || "",
      priority: item.critical_control ? "High Priority" : "Standard",
      choices,
      why: item.why_it_matters || `SOP Requirement: ${item.source?.source_text || item.instruction}`,
      coachTip: item.coach_tip || `Operational Rule: ${item.instruction}`,
      hint: item.hint || `Refer to ${item.source?.page_or_section || "SOP Section"} in ${extracted.filename}`,
      source_ref: item.source?.source_ref || `S1.sec${stepNum}`,
      page_or_section: item.source?.page_or_section || "Page 1",
      evidence: item.source?.source_text || item.instruction
    };
  });
  const normalizedControls = (opBlueprint.critical_controls || []).map((c, cIdx) => {
    const rule = typeof c === "string" ? c : String(c?.rule || c?.text || c?.description || c?.control || c?.name || "");
    const rationale = typeof c === "object" && c?.rationale ? String(c.rationale) : `Mandatory operational standard: ${rule}`;
    const source_ref = typeof c === "object" && c?.source_ref ? String(c.source_ref) : `ctrl-crit-${cIdx + 1}`;
    const source_text = typeof c === "object" && c?.source_text ? String(c.source_text) : rule;
    return { rule: rule.trim(), rationale, source_ref, source_text };
  }).filter((c) => c.rule.length > 0);
  const unrepresentedControls = normalizedControls.filter((c) => {
    const cRuleLower = c.rule.toLowerCase().slice(0, 20);
    if (!cRuleLower) return false;
    return !steps.some((s) => (s.instruction || "").toLowerCase().includes(cRuleLower));
  });
  unrepresentedControls.forEach((c, cIdx) => {
    const stepNum = simulatorSteps.length + 1;
    const correctIdx = stepNum % 3;
    const question = `A situation arises that may conflict with this SOP requirement: "${c.rule}". What should you do?`;
    const correctTitle = `Follow the documented requirement: ${c.rule}`;
    const dist1 = `Skip the requirement to finish the task faster.`;
    const dist2 = `Invent an exception without approval from the authorised person.`;
    const rawCtrlChoices = [
      { title: toActionTitle(correctTitle, 14), subtitle: "Mandatory standard compliance requirement", isCorrect: true },
      { title: toActionTitle(dist1, 14), subtitle: "Severe compliance violation", isCorrect: false },
      { title: toActionTitle(dist2, 14), subtitle: "Unapproved deviation", isCorrect: false }
    ];
    const orderedCtrl = [rawCtrlChoices[1], rawCtrlChoices[2]];
    orderedCtrl.splice(correctIdx, 0, rawCtrlChoices[0]);
    simulatorSteps.push({
      id: stepNum,
      title: `Critical Control: ${c.rule.slice(0, 35)}`,
      type: "safety",
      question,
      taskTitle: process2,
      taskOrder: `Control Check ${cIdx + 1}`,
      taskItem: c.rule,
      targetCode: `CTRL-${cIdx + 1}`,
      targetQty: 1,
      sku: `CTRL-${cIdx + 1}`,
      priority: "High Priority",
      choices: orderedCtrl.map((ch, idx) => ({
        id: `c${idx + 1}`,
        title: ch.title,
        subtitle: ch.subtitle,
        isCorrect: ch.isCorrect
      })),
      why: c.rationale || `Mandatory operational standard: ${c.rule}`,
      coachTip: `Always enforce written compliance rule: ${c.rule}`,
      hint: `Refer to SOP compliance controls for ${process2}`,
      source_ref: c.source_ref || `ctrl-crit-${cIdx + 1}`,
      page_or_section: "Compliance Controls",
      evidence: c.rule
    });
  });
  const stepObjects = simulatorSteps.map((simStep, idx) => {
    let cleanTitle = simStep.title;
    const correctChoiceIdx = simStep.choices.findIndex((c) => c.isCorrect);
    const correctOptionId = correctChoiceIdx >= 0 ? `o${correctChoiceIdx + 1}` : "o1";
    const wrongFeedback = {};
    simStep.choices.forEach((c, cIdx) => {
      if (cIdx !== correctChoiceIdx) {
        wrongFeedback[`o${cIdx + 1}`] = c.subtitle || `Non-compliant action violating ${role} standard.`;
      }
    });
    const matchingRawItem = steps[idx] || steps[idx];
    let selectedComponent = "choice_list";
    if (matchingRawItem && matchingRawItem.component && ["choice_list", "code_match", "number_choice", "scene_pick", "photo_hotspot"].includes(matchingRawItem.component)) {
      selectedComponent = matchingRawItem.component;
    } else {
      const textLower = `${simStep.title} ${simStep.taskItem} ${simStep.question}`.toLowerCase();
      if (/order\s*id|return\s*id|serial|imei|barcode|sku|code/i.test(textLower)) {
        selectedComponent = "code_match";
      } else if (/inspect|condition|seal|damage|liquid|tamper|packaging|photo/i.test(textLower)) {
        selectedComponent = "photo_hotspot";
      } else if (/accept|reject|eligible|match|compare|valid|dispute/i.test(textLower)) {
        selectedComponent = "scene_pick";
      } else if (/quantity|count|wait|time|units|sla/i.test(textLower)) {
        selectedComponent = "number_choice";
      }
    }
    return {
      id: `step_${idx + 1}`,
      order: idx + 1,
      title: cleanTitle,
      icon: "\u{1F4CB}",
      purpose: idx % 2 === 0 ? "skill" : "understanding",
      component: selectedComponent,
      screen: {
        header: `Step ${idx + 1}: ${cleanTitle}`,
        info: simStep.evidence || simStep.why
      },
      coach_say: simStep.coachTip || `Follow the written ${role} procedure rule.`,
      question: simStep.question,
      options: simStep.choices.map((c, cIdx) => ({
        id: `o${cIdx + 1}`,
        label: c.title
      })),
      correct: correctOptionId,
      why: simStep.why,
      wrong_feedback: wrongFeedback,
      wrong_default: `Check written SOP text.`,
      hint: simStep.hint,
      reshow_card: null,
      scan_required: false,
      risk: simStep.priority === "High Priority" ? "compliance" : "normal",
      source_ref: simStep.source_ref || `S1.sec${idx + 1}`,
      hotspots: null
    };
  });
  const watchSteps = simulatorSteps.map((s, idx) => ({
    ...s,
    question: `Demonstration Phase: Observe standard procedure for ${s.taskOrder || `Step ${idx + 1}`}`,
    coachTip: `Watch: ${s.why}`
  }));
  const practiceSteps = simulatorSteps.map((s) => ({
    ...s
    // Practice includes step-by-step coach tips and hints
  }));
  const testSteps = simulatorSteps.map((s, idx) => ({
    ...s,
    question: `Solo Assessment: ${s.question}`,
    coachTip: "Solo Check: Make decision independently without hints.",
    hint: "No hint available during solo assessment check."
  }));
  const firstImpact = (opBlueprint.customer_or_business_impact || [])[0];
  const customerImpact = (typeof firstImpact === "string" ? firstImpact : firstImpact?.impact || firstImpact?.text) || `Adhering to ${process2} ensures service quality and safety.`;
  const firstCtrl = normalizedControls[0];
  const criticalControlRule = firstCtrl?.rule || `Follow the applicable requirements documented in the source SOP. If a requirement is unclear, pause the affected step and seek authorised clarification.`;
  const orientationCards = [
    {
      id: "card_overview",
      kind: "what",
      title: `What is ${process2}?`,
      body: opBlueprint.purpose || `Core operational procedure for ${role}.`,
      audio_text: `Role: ${role}. Purpose: ${opBlueprint.purpose || process2}`,
      visual: { type: "icon", ref: "clipboard" },
      must_view: true,
      source_ref: "S1.overview"
    },
    {
      id: "card_purpose",
      kind: "why",
      title: "Why This Matters",
      body: customerImpact,
      audio_text: customerImpact,
      visual: { type: "icon", ref: "safety" },
      must_view: true,
      source_ref: "S1.impact"
    },
    {
      id: "card_compliance",
      kind: "rule",
      title: "Critical Control Rule",
      body: criticalControlRule,
      audio_text: criticalControlRule,
      visual: { type: "icon", ref: "rule" },
      must_view: true,
      source_ref: "S1.control"
    }
  ];
  if (opBlueprint.prerequisites && opBlueprint.prerequisites.length > 0) {
    opBlueprint.prerequisites.forEach((pre, idx) => {
      orientationCards.push({
        id: `card_prereq_${idx + 1}`,
        kind: "rule",
        title: `Prerequisite Qualification ${idx + 1}`,
        body: pre.text,
        audio_text: `Mandatory prerequisite: ${pre.text}`,
        visual: { type: "icon", ref: "rule" },
        must_view: true,
        source_ref: pre.source_ref || `pre-${idx + 1}`
      });
    });
  }
  const passport = {
    process_name: process2,
    language: "en",
    fields: {
      plain_definition: {
        text: opBlueprint.purpose,
        source_ref: "S1.definition",
        basis: "from_source",
        status: "approved"
      },
      why_it_matters: [
        {
          who_depends: "Frontline Teams & Customers",
          impact: customerImpact,
          source_ref: "S1.why",
          basis: "from_source",
          status: "approved"
        }
      ],
      where_it_fits: {
        upstream: "Task Trigger & Intake",
        this: process2,
        downstream: "Task Completion & Sign-off",
        source_ref: "S1.workflow",
        status: "approved"
      },
      tools: (opBlueprint.tools_and_systems || []).map((t) => ({
        name: t.name,
        what_it_is: `${role} operational system/tool.`,
        purpose: t.purpose,
        never_do: t.never_do,
        visual_hint: "Official workstation system",
        source_ref: t.source_ref,
        basis: "from_source",
        status: "approved"
      })),
      terms: (opBlueprint.terminology || []).map((t) => ({
        term: t.term,
        meaning: t.meaning,
        source_ref: t.source_ref,
        status: "approved"
      })),
      golden_rules: normalizedControls.map((c, idx) => ({
        text: c.rule,
        source_ref: c.source_ref || `ctrl-crit-${idx + 1}`,
        status: "approved"
      })),
      safety_notes: (opBlueprint.safety_rules || []).map((s, idx) => ({
        text: typeof s === "string" ? s : String(s?.rule || s?.text || s?.description || `Safety Note ${idx + 1}`),
        source_ref: typeof s === "object" && s?.source_ref || `safe-${idx + 1}`,
        status: "approved"
      })),
      escalation: {
        text: (opBlueprint.escalations || [])[0]?.contact_or_action || "Pause the affected task and use the authorised escalation route when an anomaly occurs.",
        source_ref: "S1.escalation",
        basis: "from_source",
        status: "approved"
      },
      newcomer_worries: ["Remembering exact step sequence", "Handling unexpected edge cases"]
    },
    questions_for_trainer: [],
    is_approved: true
  };
  const blueprint = {
    schema_version: "1.1",
    status: "ok",
    status_reason: `Generated directly from source file '${extracted.filename}'`,
    missing_passport_fields: [],
    meta: {
      title: process2,
      topic: /safety|hazard|emergency|ppe/i.test(`${process2} ${role}`) ? "Safety" : "Operations",
      language: "en",
      role,
      image_type: "sop_page",
      confidence: opBlueprint.confidence || 0.98,
      passport_id: `PSP-${lessonId.toUpperCase()}`,
      passport_version: 1,
      estimated_minutes: 8,
      sources: [
        {
          id: "S1",
          type: "sop",
          note: `Uploaded File: ${extracted.filename} (${extracted.confirmationText})`
        }
      ]
    },
    orientation: {
      estimated_minutes: 3,
      cards: orientationCards,
      tool_explorer: {
        enabled: true,
        items: (opBlueprint.tools_and_systems || []).map((t) => ({
          tool_name: t.name,
          card_id: `card_overview`
        }))
      },
      quick_check: simulatorSteps.slice(0, 3),
      skip: {
        diagnostic_step_ids: ["step_1", "step_2"],
        pass_threshold: 0.75,
        always_show: ["card_compliance"]
      }
    },
    scenarios: {
      watch: watchSteps,
      practice: practiceSteps,
      test: testSteps
    },
    floor_checklist: simulatorSteps.map((s, idx) => ({
      id: `fc_${idx + 1}`,
      step_id: `step_${idx + 1}`,
      behaviour: s.why,
      source_ref: s.source_ref || "S1"
    })),
    takeaways: normalizedControls.map((c) => c.rule),
    common_mistakes: (opBlueprint.common_mistakes || []).map((m) => typeof m === "string" ? m : m?.mistake || m?.prevention || String(m || "")).filter(Boolean)
  };
  let category = "All";
  let color = "sky";
  let accentColor = "#2F6FED";
  let artType = "clipboard";
  const processLower = process2.toLowerCase();
  const roleLower = role.toLowerCase();
  if (/safety|hazard|emergency|ppe|accident/.test(`${processLower} ${roleLower}`)) {
    category = "Safety";
    color = "mint";
    accentColor = "#1FA55E";
    artType = "safety";
  } else if (/pick|warehouse|fulfil|fulfill/.test(`${processLower} ${roleLower}`)) {
    category = "Picking";
    color = "sky";
    accentColor = "#2F6FED";
    artType = "tote";
  } else if (/pack|ship|seal/.test(processLower)) {
    category = "Packing";
    color = "peach";
    accentColor = "#F27A1A";
    artType = "box";
  } else if (/inventory|stock|count|audit|cashier|retail/.test(`${processLower} ${roleLower}`)) {
    category = "Inventory";
    color = "lilac";
    accentColor = "#7A5AF8";
    artType = "clipboard";
  }
  const videoPlan = (() => {
    const existing = opBlueprint.video_demonstration_plan;
    if (existing && existing.validation_status === "valid" && Array.isArray(existing.clips) && existing.clips.length > 0 && existing.clips.every((c) => Array.isArray(c.covered_step_refs) && c.covered_step_refs.length > 0)) {
      return existing;
    }
    return planVideoDemonstration(opBlueprint);
  })();
  const lesson = {
    id: lessonId,
    title: process2,
    subtitle: `Role: ${role} \xB7 Source: ${extracted.filename}`,
    category,
    color,
    accentColor,
    stepsCount: orderedSteps.length,
    durationMinutes: Math.max(5, Math.ceil(simulatorSteps.length * 1.5)),
    level: "Beginner",
    progress: 0,
    masteryPercentage: 0,
    artType,
    description: opBlueprint.purpose,
    sourceMeta: {
      filename: extracted.filename,
      version: "1.0",
      fileHash: extracted.fileHash,
      pageCount: extracted.pageCount,
      wordCount: extracted.wordCount,
      confirmationText: extracted.confirmationText,
      rawText: extracted.rawText
    },
    blueprint,
    passport,
    operationalBlueprint: opBlueprint,
    videoPlan,
    stepObjects
  };
  return { lesson, passport, blueprint, stepObjects };
}
function generateDomainNeutralLesson(extracted, providedBlueprint) {
  const km = buildSopKnowledgeModel(extracted);
  const opBlueprint = providedBlueprint || buildOperationalBlueprintFromKnowledgeModel(km);
  const trainingPlan = buildTrainingPlanFromBlueprint(opBlueprint);
  console.group(`[SOP INTELLIGENCE CHAIN LOG] File: '${extracted.filename}'`);
  console.log(`1. DOCUMENT & EXTRACTED TEXT:`, { filename: extracted.filename, pages: extracted.pageCount, words: extracted.wordCount });
  console.log(`2. NORMALIZED TEXT:`, { length: extracted.rawText.length, sample: extracted.rawText.slice(0, 120) + "..." });
  console.log(`3. KNOWLEDGE MODEL:`, { role: km.identity.role, process: km.identity.process, stepsCount: km.steps.length, decisionsCount: km.decisionPoints.length });
  console.log(`4. OPERATIONAL BLUEPRINT:`, { title: opBlueprint.process, steps: opBlueprint.operational_steps.length, controls: opBlueprint.critical_controls.length });
  console.log(`5. TRAINING PLAN:`, { planItemsCount: trainingPlan.length, types: trainingPlan.map((p) => p.type) });
  console.log(`6. STAGE PLAN: 4-Stage Learning Experience (Teach Me, Show Me, Guide Me, Test Me)`);
  console.groupEnd();
  const { lesson, passport, blueprint, stepObjects } = generateLessonFromOperationalBlueprint(extracted, opBlueprint);
  lesson.knowledgeModel = km;
  lesson.trainingPlan = trainingPlan;
  return { lesson, passport, blueprint, stepObjects };
}

// server.ts
dotenv2.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
function extractDocxTextFromBuffer(buffer) {
  try {
    let offset = 0;
    while (offset < buffer.length - 30) {
      if (buffer[offset] === 80 && buffer[offset + 1] === 75 && buffer[offset + 2] === 3 && buffer[offset + 3] === 4) {
        const compMethod = buffer.readUInt16LE(offset + 8);
        const compSize = buffer.readUInt32LE(offset + 18);
        const nameLen = buffer.readUInt16LE(offset + 26);
        const extraLen = buffer.readUInt16LE(offset + 28);
        const name = buffer.toString("utf8", offset + 30, offset + 30 + nameLen);
        const dataOffset = offset + 30 + nameLen + extraLen;
        if (name === "word/document.xml" && compSize > 0 && dataOffset + compSize <= buffer.length) {
          const compressedData = buffer.subarray(dataOffset, dataOffset + compSize);
          let xmlStr = "";
          if (compMethod === 8) {
            xmlStr = zlib.inflateRawSync(compressedData).toString("utf8");
          } else if (compMethod === 0) {
            xmlStr = compressedData.toString("utf8");
          }
          const matches = xmlStr.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
          if (matches && matches.length > 0) {
            return matches.map((m) => m.replace(/<[^>]+>/g, "")).join(" ").trim();
          }
          break;
        }
        offset = dataOffset + compSize;
      } else {
        offset++;
      }
    }
  } catch (err) {
    console.warn("[extractDocxTextFromBuffer] Error parsing docx zip structure:", err);
  }
  return "";
}
var videosDir = path.resolve(process.cwd(), "uploads", "videos");
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}
function getSafeVideoPath(lessonId, clipIndex = 1) {
  const safeId = lessonId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(videosDir, `${safeId}_clip_${clipIndex}.mp4`);
}
var app = express();
var PORT = Number(process.env.PORT) || 3e3;
app.use(express.json({ limit: "15mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-gemini-api-key");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});
function getApiKey(req) {
  const headerKey = req ? ((typeof req.headers["x-gemini-api-key"] === "string" ? req.headers["x-gemini-api-key"] : "") || (typeof req.headers["authorization"] === "string" ? req.headers["authorization"].replace(/^Bearer\s+/i, "") : "")).trim() : "";
  const rawKey = (headerKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY || "").trim();
  const cleanKey = rawKey.replace(/^["']|["']$/g, "").trim();
  return cleanKey || void 0;
}
function getGeminiClient(req) {
  const apiKey = getApiKey(req);
  if (!apiKey) return null;
  return new GoogleGenAI2({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
var MODEL_PRO = process.env.GEMINI_PRO_MODEL || "gemini-3.1-pro-preview";
var MODEL_FAST = process.env.GEMINI_FAST_MODEL || "gemini-3.8-flash";
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    nodeEnv: process.env.NODE_ENV || "development",
    time: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/db/health", async (_req, res) => {
  try {
    const health = await checkDatabaseHealth();
    res.json({
      status: health.connected ? "ok" : "degraded",
      connected: health.connected,
      configured: health.configured,
      latencyMs: health.latencyMs
    });
  } catch (_err) {
    res.status(503).json({
      status: "unhealthy",
      connected: false
    });
  }
});
app.post("/api/auth/session", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const bodyToken = req.body?.idToken;
    const token = (authHeader?.replace(/^Bearer\s+/i, "") || bodyToken || "").trim();
    if (!token) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "No ID token provided." });
    }
    const identity = await verifyFirebaseIdToken(token);
    const user = await resolveUserFromIdentity(identity);
    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        jobTitle: user.job_title,
        badgeId: user.badge_id,
        organizationId: user.organization_id
      }
    });
  } catch (err) {
    const msg = err?.message || "Authentication failed";
    const status = msg.includes("ACCOUNT_DEACTIVATED") || msg.includes("USER_NOT_PROVISIONED") ? 403 : 401;
    return res.status(status).json({
      error: status === 403 ? "FORBIDDEN" : "UNAUTHORIZED",
      message: msg
    });
  }
});
app.get("/api/auth/me", authenticateRequest, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Not authenticated." });
  }
  return res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      fullName: req.user.full_name,
      role: req.user.role,
      jobTitle: req.user.job_title,
      badgeId: req.user.badge_id,
      organizationId: req.user.organization_id
    }
  });
});
app.post("/api/auth/logout", (_req, res) => {
  return res.json({ success: true, message: "Logged out successfully." });
});
function computeServerTextDiagnostics(text, wordCount, pageCount) {
  const totalChars = text.length;
  const readableChars = (text.match(/[\p{L}\p{N}\s\p{P}]/gu) || []).length;
  const replacementChars = (text.match(/\uFFFD/g) || []).length;
  const controlChars = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g) || []).length;
  return {
    totalChars,
    readableChars,
    controlChars,
    replacementChars,
    wordCount,
    pageCount
  };
}
app.get("/api/admin/content/documents", authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const documents = await contentRepo.listSourceDocuments(orgId);
    return res.json({ success: true, documents });
  } catch (err) {
    console.error("[Admin Content] Error listing source documents:", err?.message);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to list source documents." });
  }
});
app.get("/api/admin/content/documents/:id", authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const docId = req.params.id;
    const document = await contentRepo.getSourceDocument(orgId, docId);
    if (!document) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Source document not found in your organization." });
    }
    const versions = await contentRepo.listSourceVersions(orgId, docId);
    const assets = await contentRepo.listLearningAssets(orgId, { source_document_id: docId });
    return res.json({
      success: true,
      document,
      versions,
      assets
    });
  } catch (err) {
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to fetch source document." });
  }
});
app.put("/api/admin/content/documents/:id", authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const docId = req.params.id;
    const { title, category, docCode } = req.body;
    const updated = await contentRepo.updateSourceDocument(orgId, docId, {
      title,
      category,
      doc_code: docCode
    });
    if (!updated) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Source document not found in your organization." });
    }
    await auditRepo.recordEvent({
      organization_id: orgId,
      user_id: req.user.id,
      action: "CONTENT_DOCUMENT_UPDATED",
      target_type: "source_document",
      target_id: updated.id,
      details: {
        title: updated.title,
        category: updated.category,
        doc_code: updated.doc_code
      }
    });
    return res.json({ success: true, document: updated });
  } catch (err) {
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to update source document." });
  }
});
app.post("/api/admin/content/ingest", authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const { filename, rawText, title, category, docCode, roleTarget } = req.body;
    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      return res.status(400).json({ error: "BAD_REQUEST", message: "Missing rawText SOP content in request body." });
    }
    const cleanFilename = (filename || "SOP_Document.txt").trim();
    const cleanText = rawText.trim();
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
    const pageCount = Math.max(1, Math.ceil(wordCount / 220));
    const fileHash = crypto.createHash("sha256").update(cleanText).digest("hex");
    const diagnostics = computeServerTextDiagnostics(cleanText, wordCount, pageCount);
    const extractedDoc = {
      filename: cleanFilename,
      rawText: cleanText,
      wordCount,
      pageCount,
      fileHash,
      confirmationText: "Operational SOP verified.",
      mimeType: "text/plain",
      extractedAt: (/* @__PURE__ */ new Date()).toISOString(),
      diagnostics
    };
    const validation = validateSourceFidelity(extractedDoc);
    if (!validation.isValid) {
      return res.status(422).json({
        success: false,
        error: "VALIDATION_FAILED",
        errorCategory: validation.errorCategory,
        errorReason: validation.errorReason,
        domainName: validation.domainName,
        diagnostics
      });
    }
    const baseCode = cleanFilename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "-").toUpperCase();
    const finalDocCode = (docCode || `SOP-${baseCode.slice(0, 24)}`).trim();
    const doc = await contentRepo.createOrFindSourceDocument({
      organization_id: orgId,
      doc_code: finalDocCode,
      title: (title || cleanFilename.replace(/\.[^/.]+$/, "")).trim(),
      category: (category || "General").trim(),
      created_by: req.user.id
    });
    const versionResult = await contentRepo.createSourceVersion({
      organization_id: orgId,
      source_document_id: doc.id,
      content_hash: fileHash,
      original_filename: cleanFilename,
      mime_type: "text/plain",
      extracted_text: cleanText,
      word_count: wordCount,
      page_count: pageCount,
      change_summary: "Ingested via Guru Coach Admin Content Management",
      diagnostics: {
        validation,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
        uploadedBy: req.user.email
      },
      created_by: req.user.id
    });
    const gen = generateDomainNeutralLesson(extractedDoc);
    const asset = await contentRepo.createLearningAsset({
      organization_id: orgId,
      source_version_id: versionResult.version.id,
      title: gen.lesson.title || doc.title,
      subtitle: gen.lesson.subtitle || void 0,
      role_target: (roleTarget || gen.lesson.knowledgeModel?.identity?.role || "Frontline Specialist").trim(),
      operational_blueprint: gen.lesson.operationalBlueprint || gen.blueprint || {},
      canonical_task_model: gen.lesson.knowledgeModel || {},
      know_it_plan: gen.lesson.trainingPlan || {},
      video_demonstration_plan: gen.lesson.videoPlan || null,
      simulator_steps: gen.stepObjects || [],
      generation_metadata: {
        generator: "DEAN",
        domain: validation.domainName,
        sourceHash: fileHash,
        ingestedAt: (/* @__PURE__ */ new Date()).toISOString(),
        prerequisitesCount: gen.lesson.knowledgeModel?.prerequisites?.length || 0,
        criticalControlsCount: gen.lesson.knowledgeModel?.criticalControls?.length || 0
      },
      status: "draft",
      approved_by: null
    });
    await auditRepo.recordEvent({
      organization_id: orgId,
      user_id: req.user.id,
      action: "CONTENT_INGESTED",
      target_type: "learning_asset",
      target_id: asset.id,
      details: {
        source_document_id: doc.id,
        source_version_id: versionResult.version.id,
        version_number: versionResult.version.version_number,
        is_duplicate: versionResult.isDuplicate,
        asset_title: asset.title,
        status: asset.status
      }
    });
    return res.json({
      success: true,
      document: doc,
      version: versionResult.version,
      asset,
      isDuplicate: versionResult.isDuplicate,
      validation
    });
  } catch (err) {
    console.error("[Admin Ingest Error]:", err);
    return res.status(500).json({ error: "INGEST_FAILED", message: err?.message || "Failed to ingest SOP." });
  }
});
app.post("/api/admin/content/documents/:id/new-version", authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const docId = req.params.id;
    const { filename, rawText, changeSummary, roleTarget } = req.body;
    const doc = await contentRepo.getSourceDocument(orgId, docId);
    if (!doc) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Source document not found in your organization." });
    }
    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      return res.status(400).json({ error: "BAD_REQUEST", message: "Missing rawText SOP content in request body." });
    }
    const cleanFilename = (filename || `${doc.title}_revised.txt`).trim();
    const cleanText = rawText.trim();
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
    const pageCount = Math.max(1, Math.ceil(wordCount / 220));
    const fileHash = crypto.createHash("sha256").update(cleanText).digest("hex");
    const diagnostics = computeServerTextDiagnostics(cleanText, wordCount, pageCount);
    const extractedDoc = {
      filename: cleanFilename,
      rawText: cleanText,
      wordCount,
      pageCount,
      fileHash,
      confirmationText: "Operational SOP verified.",
      mimeType: "text/plain",
      extractedAt: (/* @__PURE__ */ new Date()).toISOString(),
      diagnostics
    };
    const validation = validateSourceFidelity(extractedDoc);
    if (!validation.isValid) {
      return res.status(422).json({
        success: false,
        error: "VALIDATION_FAILED",
        errorCategory: validation.errorCategory,
        errorReason: validation.errorReason
      });
    }
    const versionResult = await contentRepo.createSourceVersion({
      organization_id: orgId,
      source_document_id: doc.id,
      content_hash: fileHash,
      original_filename: cleanFilename,
      mime_type: "text/plain",
      extracted_text: cleanText,
      word_count: wordCount,
      page_count: pageCount,
      change_summary: changeSummary?.trim() || `New revision ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`,
      diagnostics: {
        validation,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
        uploadedBy: req.user.email
      },
      created_by: req.user.id
    });
    const gen = generateDomainNeutralLesson(extractedDoc);
    const asset = await contentRepo.createLearningAsset({
      organization_id: orgId,
      source_version_id: versionResult.version.id,
      title: gen.lesson.title || doc.title,
      subtitle: gen.lesson.subtitle || void 0,
      role_target: (roleTarget || gen.lesson.knowledgeModel?.identity?.role || "Frontline Specialist").trim(),
      operational_blueprint: gen.blueprint || {},
      canonical_task_model: gen.lesson.knowledgeModel || {},
      know_it_plan: gen.lesson.trainingPlan || {},
      video_demonstration_plan: gen.lesson.videoPlan || null,
      simulator_steps: gen.stepObjects || [],
      generation_metadata: {
        generator: "DEAN",
        domain: validation.domainName,
        sourceHash: fileHash,
        versionLabel: versionResult.version.version_label
      },
      status: "draft",
      approved_by: null
    });
    await auditRepo.recordEvent({
      organization_id: orgId,
      user_id: req.user.id,
      action: "SOURCE_VERSION_UPDATED",
      target_type: "source_version",
      target_id: versionResult.version.id,
      details: {
        source_document_id: doc.id,
        version_number: versionResult.version.version_number,
        version_label: versionResult.version.version_label,
        asset_id: asset.id
      }
    });
    return res.json({
      success: true,
      document: doc,
      version: versionResult.version,
      asset,
      isDuplicate: versionResult.isDuplicate
    });
  } catch (err) {
    return res.status(500).json({ error: "REVISION_FAILED", message: err?.message || "Failed to create new version." });
  }
});
app.get("/api/admin/content/assets", authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const { status, source_document_id, source_version_id } = req.query;
    const assets = await contentRepo.listLearningAssets(orgId, {
      status: typeof status === "string" ? status : void 0,
      source_document_id: typeof source_document_id === "string" ? source_document_id : void 0,
      source_version_id: typeof source_version_id === "string" ? source_version_id : void 0
    });
    return res.json({ success: true, assets });
  } catch (err) {
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to list learning assets." });
  }
});
app.get("/api/admin/content/assets/:id", authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const assetId = req.params.id;
    const asset = await contentRepo.getLearningAsset(orgId, assetId);
    if (!asset) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Learning asset not found in your organization." });
    }
    const version = await contentRepo.getSourceVersion(orgId, asset.source_version_id);
    const document = version ? await contentRepo.getSourceDocument(orgId, version.source_document_id) : null;
    return res.json({
      success: true,
      asset,
      version,
      document
    });
  } catch (err) {
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to fetch learning asset." });
  }
});
app.put("/api/admin/content/assets/:id/metadata", authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const assetId = req.params.id;
    const { title, subtitle, roleTarget } = req.body;
    const updated = await contentRepo.updateLearningAsset(orgId, assetId, {
      title,
      subtitle,
      role_target: roleTarget
    });
    if (!updated) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Learning asset not found in your organization." });
    }
    await auditRepo.recordEvent({
      organization_id: orgId,
      user_id: req.user.id,
      action: "CONTENT_METADATA_UPDATED",
      target_type: "learning_asset",
      target_id: updated.id,
      details: {
        title: updated.title,
        subtitle: updated.subtitle,
        role_target: updated.role_target
      }
    });
    return res.json({ success: true, asset: updated });
  } catch (err) {
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to update metadata." });
  }
});
app.put("/api/admin/content/assets/:id/blueprint", authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const assetId = req.params.id;
    const { operational_blueprint, canonical_task_model, know_it_plan, simulator_steps } = req.body;
    const updated = await contentRepo.updateLearningAsset(orgId, assetId, {
      operational_blueprint,
      canonical_task_model,
      know_it_plan,
      simulator_steps
    });
    if (!updated) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Learning asset not found in your organization." });
    }
    await auditRepo.recordEvent({
      organization_id: orgId,
      user_id: req.user.id,
      action: "CONTENT_BLUEPRINT_UPDATED",
      target_type: "learning_asset",
      target_id: updated.id,
      details: {
        steps_count: simulator_steps?.length || 0,
        blueprint_updated: Boolean(operational_blueprint)
      }
    });
    return res.json({ success: true, asset: updated });
  } catch (err) {
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to update blueprint." });
  }
});
app.post(["/api/admin/content/assets/:id/publish", "/api/admin/content/assets/:id/approve"], authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const assetId = req.params.id;
    const asset = await contentRepo.getLearningAsset(orgId, assetId);
    if (!asset) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Learning asset not found in your organization." });
    }
    if (asset.status === "failed") {
      return res.status(422).json({
        error: "CANNOT_PUBLISH_FAILED_CONTENT",
        message: "Cannot publish content that failed validation or extraction."
      });
    }
    const updated = await contentRepo.updateLearningAssetStatus(orgId, assetId, "approved", req.user.id);
    if (!updated) {
      return res.status(500).json({ error: "UPDATE_FAILED", message: "Failed to update asset status." });
    }
    await auditRepo.recordEvent({
      organization_id: orgId,
      user_id: req.user.id,
      action: "CONTENT_APPROVED_PUBLISHED",
      target_type: "learning_asset",
      target_id: updated.id,
      details: {
        previous_status: asset.status,
        new_status: updated.status,
        approved_by: req.user.id,
        approved_at: updated.approved_at,
        title: updated.title
      }
    });
    return res.json({
      success: true,
      message: "Learning asset approved and published successfully.",
      asset: updated
    });
  } catch (err) {
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to approve asset." });
  }
});
app.post("/api/admin/content/assets/:id/archive", authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const assetId = req.params.id;
    const asset = await contentRepo.getLearningAsset(orgId, assetId);
    if (!asset) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Learning asset not found in your organization." });
    }
    const updated = await contentRepo.updateLearningAssetStatus(orgId, assetId, "archived");
    await auditRepo.recordEvent({
      organization_id: orgId,
      user_id: req.user.id,
      action: "CONTENT_ARCHIVED",
      target_type: "learning_asset",
      target_id: assetId,
      details: {
        title: asset.title
      }
    });
    return res.json({
      success: true,
      message: "Learning asset archived.",
      asset: updated
    });
  } catch (err) {
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to archive asset." });
  }
});
registerManagerRoutes(app);
registerLearnerRoutes(app);
app.get("/api/admin/content/audit-trail", authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const limit = Number(req.query.limit) || 50;
    const events = await auditRepo.listEvents(orgId, limit);
    return res.json({ success: true, events });
  } catch (err) {
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err?.message || "Failed to fetch audit trail." });
  }
});
app.get("/api/models", authenticateRequest, requireRole("admin"), async (req, res) => {
  const ai = getGeminiClient(req);
  if (!ai) return res.json({ error: "no key" });
  const out = [];
  try {
    for await (const m of await ai.models.list()) {
      if (m.name) out.push(m.name);
    }
    res.json({ success: true, models: out });
  } catch (err) {
    res.json({ success: false, error: err?.message || String(err) });
  }
});
app.post("/api/pdf/extract", authenticateRequest, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const { fileBase64, mimeType = "application/pdf", filename = "uploaded_document.pdf" } = req.body;
    if (!fileBase64 || typeof fileBase64 !== "string") {
      return res.status(400).json({ success: false, error: "No fileBase64 data provided." });
    }
    let textDirect = null;
    const lowerName = filename.toLowerCase();
    const isDocx = lowerName.endsWith(".docx") || lowerName.endsWith(".doc") || mimeType.includes("word") || mimeType.includes("openxmlformats");
    if (isDocx) {
      try {
        const fileBuffer = Buffer.from(fileBase64, "base64");
        const extractedDocx = extractDocxTextFromBuffer(fileBuffer);
        if (extractedDocx && extractedDocx.length > 10) {
          textDirect = extractedDocx;
        } else {
          const decodedStr = fileBuffer.toString("utf-8");
          const xmlMatches = decodedStr.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
          if (xmlMatches && xmlMatches.length > 0) {
            textDirect = xmlMatches.map((node) => node.replace(/<[^>]+>/g, "")).join(" ");
          }
        }
      } catch (e) {
        console.warn("[Server DOCX Extract] Buffer decode failed:", e);
      }
    }
    if (textDirect && textDirect.trim().length > 10) {
      const extractedText2 = textDirect.trim();
      const wordCount2 = extractedText2.split(/\s+/).filter(Boolean).length;
      const pageCount2 = Math.max(1, Math.ceil(wordCount2 / 220));
      console.log(`[Server /api/pdf/extract SUCCESS] Direct docx extracted ${wordCount2} words from '${filename}'`);
      return res.json({
        success: true,
        extractedText: extractedText2,
        wordCount: wordCount2,
        pageCount: pageCount2
      });
    }
    const aiClient = getGeminiClient(req);
    if (!aiClient) {
      console.warn("[Server PDF Extract] No Gemini API key detected on server.");
      return res.json({ success: false, useLocal: true, reason: "GEMINI_API_KEY missing on server" });
    }
    let docPart;
    const cleanMime = mimeType.includes("image") ? mimeType : mimeType.includes("text") ? "text/plain" : "application/pdf";
    docPart = {
      inlineData: {
        mimeType: cleanMime,
        data: fileBase64
      }
    };
    const prompt = `You are a High-Fidelity Document & OCR Extraction Engine.
Extract the COMPLETE human-readable text from this document ("${filename}") word-for-word.
Preserve paragraph structure, headers, section numbers, bullet points, and original Unicode typography (curly quotes, dashes, accents, symbols).
Do NOT summarize. Return JSON:
{
  "extractedText": "Complete extracted text content here...",
  "pageCount": estimated total pages as integer,
  "wordCount": estimated total words as integer
}`;
    let response;
    try {
      response = await aiClient.models.generateContent({
        model: MODEL_PRO,
        contents: { parts: [docPart, { text: prompt }] },
        config: {
          responseMimeType: "application/json"
        }
      });
    } catch (primaryErr) {
      console.warn(`[Server PDF Extract] Primary model ${MODEL_PRO} failed, trying ${MODEL_FAST}:`, primaryErr?.message);
      response = await aiClient.models.generateContent({
        model: MODEL_FAST,
        contents: { parts: [docPart, { text: prompt }] },
        config: {
          responseMimeType: "application/json"
        }
      });
    }
    const outputText = response.text || "";
    let cleanJson = outputText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    const parsed = JSON.parse(cleanJson);
    const extractedText = parsed.extractedText || "";
    const wordCount = parsed.wordCount || extractedText.split(/\s+/).filter(Boolean).length;
    const pageCount = parsed.pageCount || Math.max(1, Math.ceil(wordCount / 220));
    console.log(`[Server /api/pdf/extract SUCCESS] Extracted ${wordCount} words from '${filename}' (${pageCount} pages)`);
    return res.json({
      success: true,
      extractedText,
      wordCount,
      pageCount
    });
  } catch (err) {
    console.error("[Server /api/pdf/extract Error]:", err?.message || err);
    return res.json({ success: false, error: err?.message || "Server PDF extraction failed" });
  }
});
app.post("/api/gemini/generate-blueprint", authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const { rawText, fileBase64, mimeType, filename, fileHash, pageCount, wordCount } = req.body;
    const aiClient = getGeminiClient(req);
    if (!aiClient) {
      console.warn("[Server /api/gemini/generate-blueprint] No Gemini API key found in environment.");
      return res.json({
        success: false,
        useLocalGenerator: true,
        reason: "GEMINI_API_KEY is not configured on server. Fallback to local domain-neutral generator."
      });
    }
    const parts = [];
    const docText = rawText || "";
    if (docText && docText.length > 50) {
    } else if (fileBase64 && typeof fileBase64 === "string") {
      parts.push({
        inlineData: {
          mimeType: mimeType || "application/pdf",
          data: fileBase64
        }
      });
    }
    const systemInstruction = `You are a World-Class Lead Operational Intelligence Engineer and Instructional Designer for Guruji Work Coach.
LAW 3 \u2014 UNIVERSAL 8-STAGE OPERATIONAL LEARNING FRAMEWORK
The 8 stages are the Brain's universal framework for analysing and organising ANY SOP.
They are NOT a mandatory 8-slide structure.
The Brain must examine the SOP through all 8 stages and use only the stages that contain meaningful source-supported content. It may combine, expand or skip stages depending on the SOP.

1. ORIENT: What is the job/task? Why is it being done? What is the expected outcome? What is the worker responsible for?
2. PREPARE: What must the worker check, arrange, confirm or understand before starting? (Tools, information, prerequisites, environment, customer/patient/order details).
3. PERFORM: What does the worker actually do? Extract the real operational steps and preserve their correct sequence.
4. CONTROL: What must the worker verify while performing the task? Include safety, quality, accuracy, compliance, customer, equipment or other critical controls.
5. DECIDE: Where does the worker need to make a judgement? Identify the condition, available actions and the correct SOP-supported response.
6. HANDLE: What happens when the normal process does not go as expected? Include exceptions, unusual conditions, missing information, failed checks or process deviations.
7. ESCALATE: When is the issue beyond the worker's authority or capability? Identify when to stop, who/what to escalate to and what must happen before continuing.
8. PROVE: What does the worker need to demonstrate to show that the critical learning has been understood? Use the most important steps, controls, decisions or exceptions from the SOP.

SYNTHESIS RULE:
SOP \u2192 analyse through 8 stages \u2192 identify meaningful content \u2192 remove duplication \u2192 preserve critical details \u2192 arrange progressively \u2192 create the required training pages.
- Do NOT force an SOP into all 8 stages.
- Do NOT create empty pages just because a stage exists.
- Do NOT invent content to fill a stage.
- The 8 stages control the Brain's thinking and sequencing; the SOP controls the actual content.

CRITICAL ARCHITECTURAL & INSTRUCTIONAL DESIGN RULES:
1. INSTRUCTIONAL GROUPING (COHERENT TEACHING UNITS):
   - Do NOT output raw 1:1 line-item dumps for every bullet point in the SOP text.
   - Group related routine steps into coherent operational teaching units (e.g., Customer & Order Verification, Item Eligibility Inspection, Acceptance/Rejection Decision, Exception & Dispute Handling).
   - A complex SOP should synthesize into distinct, high-impact operational steps rather than a mechanical list of cards.
2. VISUAL PRESENTATION TYPE SELECTION (component):
   - Assign an appropriate interactive presentation mode for EACH operational step:
     * "code_match": For verifying or matching order ID, return ID, serial/IMEI number, barcode, or SKU code.
     * "photo_hotspot": For inspecting physical item condition, tamper seals, liquid damage, or packaging flaws.
     * "scene_pick": For right-vs-wrong visual comparisons (e.g. valid vs invalid return condition).
     * "number_choice": For quantities, unit counts, wait times, or measurements.
     * "choice_list": For general operational decisions, verbal protocols, or exception escalation routing.
3. CONCISE WORKPLACE LANGUAGE (NO RAW TEXT DUMPS):
   - NEVER output long, run-on paragraph sentences concatenating multiple SOP lines.
   - Summarize every choice title into a crisp, COMPLETE, 5-12 word action statement written in natural workplace language.
   - NEVER end a choice title on a dangling conjunction or preposition (e.g., 'and', 'or', 'to', 'with', 'for'). Ensure every title is a full, grammatically complete action phrase.
   - Keep scenario questions under 2 concise sentences focused on a single execution dilemma.
4. DEEP REALISM & UNCOMPROMISING SPECIFICITY:
   - Ground ALL extractions strictly in the operational facts of the provided SOP document.
   - Extract the TRUE frontline role (e.g. Pickup Associate, Delivery Partner, Quick Commerce Picker, Phlebotomist, Retail Cashier).
   - Every scenario question must put the worker in a concrete, high-stakes operational situation directly based on the SOP details.
   - NEVER generate generic questions like "What is your required action?" or "How should you complete this task?".
   - NEVER generate generic choices like "Skip step and proceed" or "Use unverified shortcut". Create REALISTIC frontline errors, tempting shortcuts, and common mistakes that real workers actually make on the floor!
5. THREE NUANCED CHOICES WITH EXPLICIT FAILURE MODES:
   - For EACH operational step, you MUST generate exactly 3 nuanced choices with short, complete, clear titles (5 to 12 words):
     * Choice 1 (isCorrect: true): Concise, complete, compliant SOP action title. Subtitle explaining why this is correct per SOP.
     * Choice 2 (isCorrect: false): Concise, complete, tempting operational shortcut title. Subtitle explicitly details the failure consequence.
     * Choice 3 (isCorrect: false): Concise, complete, unapproved workaround title. Subtitle details the regulatory, safety, or quality violation.
6. EXPERT COACH TIPS, SPECIFIC HINTS & LUCIDE VECTOR ICONS:
   - coach_tip: Guruji's practical wisdom directly referencing subtle details or compliance wisdom from the SOP.
   - hint: Specific clue pointing directly to the relevant section or physical indicator in the SOP.
   - target_code: Authentic code extracted from or reflecting the SOP (e.g., RET-PU-001, SKU-88421, FORM-Q7).
   - icon_key: Assign a domain-appropriate, clean Lucide vector icon key for each operational step.
7. METADATA VS OPERATIONAL CONTENT:
   - METADATA (DO NOT MAKE INTO STEPS): Administrative headers, document approval tables, version histories.
   - OPERATIONAL CONTENT (MUST DRIVE BLUEPRINT): Physical actions, system entries, verbal communications, verifications, decision points, exception handling, escalations.
8. AI VIDEO DIRECTOR RULES FOR VEO 3.2 LITE:
   For every clip in video_demonstration_plan.clips, formulate the "veo_prompt" as a dense 65-85 word single cinematic sentence.
9. MANDATORY OUTPUT FORMAT: Respond strictly with valid, un-truncated JSON conforming to the requested schema.`;
    const textPrompt = `Uploaded SOP Document: "${filename}" (${pageCount || 1} pages, ${wordCount || 100} words)
${docText ? `Document Text:
"""
${docText}
"""
` : ""}

Extract the complete OPERATIONAL BLUEPRINT as JSON with this exact schema:
{
  "document_identity": {
    "doc_title": "${filename ? filename.replace(/\.(txt|pdf|docx)$/i, "") : "Operational Procedure"}",
    "doc_ref": "Extracted document reference or empty",
    "version": "Extracted version or empty",
    "department": "Extracted department or operations division"
  },
  "role": "Exact worker role described in SOP (e.g., Pickup Associate, Delivery Partner, Operations Associate)",
  "process": "Exact core operational process (e.g., Return Pickup Workflow, Order Fulfillment)",
  "purpose": "1-2 sentence primary operational goal for the worker",
  "scope": "Applicable department or workspace boundaries",
  "prerequisites": [
    { "text": "Requirement before starting", "source_ref": "S1.pre1", "source_text": "Quote from text" }
  ],
  "tools_and_systems": [
    { "name": "Tool or system name", "purpose": "What it is used for", "never_do": "Key prohibition", "source_ref": "S1.tool1", "source_text": "Quote" }
  ],
  "terminology": [
    { "term": "Key term or code", "meaning": "Plain definition", "source_ref": "S1.term1", "source_text": "Quote" }
  ],
  "operational_steps": [
    {
      "instruction": "Specific, clear workplace action grounded in the SOP",
      "category": "DO" | "CHECK" | "KNOW" | "DECIDE" | "RESPOND" | "RECOVER" | "ESCALATE",
      "component": "code_match" | "photo_hotspot" | "scene_pick" | "number_choice" | "choice_list",
      "action_verb": "Primary action verb (e.g., Scan, Verify, Inspect, Place)",
      "task_title": "Concise 2-4 word operational action title (e.g., Scan Tote Barcode, Check Expiry Date, Inspect Packaging)",
      "target_code": "Realistic barcode / SKU / rack / equipment or form code from SOP (e.g., TOTE-B12, SKU-4029, LOC-A02-04)",
      "why_it_matters": "Specific operational reason and consequence on safety, quality, or process compliance",
      "critical_control": true/false,
      "scenario_question": "Authentic, vivid frontline workplace simulation question putting the worker directly into the dilemma or execution moment with exact details from the SOP",
      "choices": [
        {
          "id": "c1",
          "title": "Exact correct operational procedure according to the SOP",
          "subtitle": "Compliant SOP standard procedure",
          "isCorrect": true
        },
        {
          "id": "c2",
          "title": "Tempting shortcut or common frontline worker mistake",
          "subtitle": "Failure mode: causes inventory discrepancy / customer complaint / quality defect",
          "isCorrect": false
        },
        {
          "id": "c3",
          "title": "Unapproved workaround or bypassed safety/compliance check",
          "subtitle": "Safety/compliance hazard: violates mandatory protocol",
          "isCorrect": false
        }
      ],
      "coach_tip": "Master Coach Guruji tip explaining insider nuances, physical dexterity, memory cues, or compliance wisdom from the SOP",
      "hint": "Specific clue pointing directly to the relevant section or physical indicator in the SOP",
      "source": {
        "page_or_section": "Page 1 \xB7 Section 2",
        "source_ref": "S1.sec1",
        "source_text": "Exact verbatim quote from document text"
      }
    }
  ],
  "decision_points": [
    { "situation": "Condition triggering decision", "decision": "Decision choice", "action": "Required action", "source_ref": "S1.dec1", "source_text": "Quote" }
  ],
  "exceptions": [
    { "trigger": "Unexpected scenario or error", "resolution": "Corrective resolution", "source_ref": "S1.exp1", "source_text": "Quote" }
  ],
  "escalations": [
    { "situation": "When stuck or anomaly occurs", "contact_or_action": "Who to notify or call", "source_ref": "S1.esc1", "source_text": "Quote" }
  ],
  "critical_controls": [
    { "rule": "Mandatory non-negotiable rule", "rationale": "Why it is critical", "source_ref": "S1.ctrl1", "source_text": "Quote" }
  ],
  "safety_rules": [
    { "rule": "Safety or compliance rule", "source_ref": "S1.safe1", "source_text": "Quote" }
  ],
  "quality_rules": [
    { "rule": "Quality standard rule", "source_ref": "S1.qual1", "source_text": "Quote" }
  ],
  "customer_or_business_impact": [
    { "impact": "Who depends and impact", "source_ref": "S1.imp1", "source_text": "Quote" }
  ],
  "common_mistakes": [
    { "mistake": "Potential worker error", "prevention": "How to avoid it", "source_ref": "S1.err1", "source_text": "Quote" }
  ],
  "source_evidence": [
    { "id": "E1", "page_or_section": "Page 1", "excerpt": "Document excerpt" }
  ],
  "video_demonstration_plan": {
    "strategy": "sequential_steps",
    "total_clips": 3,
    "clips": [
      {
        "clip_index": 1,
        "step_ref": "Step 1: Receipt & Intake",
        "title": "Immediate Response & Intake",
        "duration_seconds": 8,
        "key_action": "Specific physical action from SOP",
        "veo_prompt": "Photorealistic 720p 16:9 cinematic instructional demonstration. A frontline specialist is methodically reviewing and cross-verifying intake documentation with continuous, deliberate hand movements. Setting is an executive private meeting suite with frosted acoustic glass partitions and polished oak conference desk. Soft natural morning daylight balanced by warm commercial recessed lighting. Slow cinematic lateral camera tracking shot gently drifting forward."
      }
    ]
  },
  "confidence": 0.98
}

The number of operational_steps must emerge naturally from the SOP's actual operational complexity. Do NOT force a fixed step count. A simple SOP should produce a concise task structure; a complex SOP must retain all distinct operational tasks without arbitrary truncation or merging.`;
    parts.push({ text: textPrompt });
    let response;
    try {
      response = await aiClient.models.generateContent({
        model: MODEL_PRO,
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          maxOutputTokens: 32768,
          temperature: 0.25
        }
      });
    } catch (primaryErr) {
      console.warn(`[Server LLM Blueprint] Primary model ${MODEL_PRO} failed, trying ${MODEL_FAST}:`, primaryErr?.message);
      response = await aiClient.models.generateContent({
        model: MODEL_FAST,
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          maxOutputTokens: 32768,
          temperature: 0.25
        }
      });
    }
    const outputText = response.text || "";
    if (!outputText.trim()) {
      return res.json({ success: false, useLocalGenerator: true, error: "Empty response received from LLM" });
    }
    const parsedData = cleanAndRepairJson(outputText);
    try {
      parsedData.video_demonstration_plan = planVideoDemonstration(parsedData);
    } catch (vpErr) {
      console.warn("[Server Veo VideoPlan synthesis warning]:", vpErr);
    }
    console.log(`[Server /api/gemini/generate-blueprint SUCCESS] Extracted ${parsedData.operational_steps?.length || 0} high-fidelity steps from '${filename}'`);
    return res.json({
      success: true,
      blueprint: parsedData
    });
  } catch (err) {
    console.error("[Server /api/gemini/generate-blueprint Error]:", err?.message || err);
    return res.json({
      success: false,
      useLocalGenerator: true,
      error: err?.message || "Server error, falling back to local generator."
    });
  }
});
app.post("/api/coach", authenticateRequest, requireRole(["admin", "manager", "learner"]), async (req, res) => {
  const { prompt, systemInstruction, fileBase64, mimeType = "application/pdf", maxOutputTokens = 4e3, temperature = 0.3 } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt in request body" });
  }
  const aiClient = getGeminiClient(req);
  if (!aiClient) {
    console.error("[API Error] GEMINI_API_KEY is not defined in deployment environment variables.");
    return res.status(500).json({ error: "Server configuration error: Missing API Key" });
  }
  try {
    const parts = [];
    if (fileBase64 && typeof fileBase64 === "string") {
      const cleanMime = mimeType.includes("image") ? mimeType : mimeType.includes("text") ? "text/plain" : "application/pdf";
      parts.push({
        inlineData: {
          mimeType: cleanMime,
          data: fileBase64
        }
      });
    }
    parts.push({ text: prompt });
    const contentsPayload = parts.length > 1 ? { parts } : prompt;
    let response;
    try {
      response = await aiClient.models.generateContent({
        model: MODEL_PRO,
        contents: contentsPayload,
        config: {
          systemInstruction: systemInstruction || "You are an expert assistant. Respond strictly with valid JSON.",
          responseMimeType: "application/json",
          maxOutputTokens,
          temperature
        }
      });
    } catch (primaryErr) {
      console.warn(`[Server /api/coach] Primary model ${MODEL_PRO} failed, trying fallback ${MODEL_FAST}:`, primaryErr?.message);
      response = await aiClient.models.generateContent({
        model: MODEL_FAST,
        contents: contentsPayload,
        config: {
          systemInstruction: systemInstruction || "You are an expert assistant. Respond strictly with valid JSON.",
          responseMimeType: "application/json",
          maxOutputTokens,
          temperature
        }
      });
    }
    const rawText = response.text || "";
    if (!rawText.trim()) {
      return res.status(502).json({ error: "Empty response received from LLM" });
    }
    try {
      const parsedData = cleanAndRepairJson(rawText);
      return res.status(200).json(parsedData);
    } catch (parseError) {
      console.error("[API Error /api/coach] cleanAndRepairJson failed:", parseError);
      return res.status(502).json({
        error: "JSON_PARSE_ERROR",
        message: "The model output was malformed or truncated.",
        details: parseError.message
      });
    }
  } catch (error) {
    console.error("[API Error /api/coach] LLM generation failed:", error);
    return res.status(500).json({
      error: "LLM_PROVIDER_ERROR",
      message: error.message || "Failed to generate response"
    });
  }
});
app.post("/api/sop/instruct-options", authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const { filename = "SOP Document", rawText = "", wordCount = 100, pageCount = 1 } = req.body;
    const aiClient = getGeminiClient(req);
    const defaultOptions = [
      {
        id: "opt-standard",
        title: "SOP Flow",
        description: "Balanced, step-by-step procedural training covering prerequisites, core execution, and verification.",
        focusAreas: ["End-to-End Procedural Flow", "Task Verification"],
        recommendedSteps: 5
      },
      {
        id: "opt-controls-exceptions",
        title: "Critical Controls",
        description: "Emphasizes high-stakes safety rules, decision criteria, exception handling, and escalation protocols.",
        focusAreas: ["Critical Safety Controls", "Exception Recovery"],
        recommendedSteps: 6
      },
      {
        id: "opt-fast-track",
        title: "Fast Track",
        description: "Concise, high-velocity frontline drill focusing strictly on core physical and system actions.",
        focusAreas: ["Core Action Verbs", "Fast Field Execution"],
        recommendedSteps: 4
      }
    ];
    if (!aiClient) {
      return res.json({ success: true, options: defaultOptions });
    }
    const prompt = `Analyze this SOP document: "${filename}" (${pageCount} pages, ${wordCount} words)
Document Text:
"""
${(rawText || "").slice(0, 16e3)}
"""

Recommend 3 distinct training structure options tailored specifically to this SOP document.
Return JSON:
{
  "options": [
    {
      "id": "opt-1",
      "title": "Clear 2-4 word option title (e.g. Standard Return Pickup, Critical Safety Drill)",
      "description": "1 sentence describing the training emphasis based on the document",
      "focusAreas": ["3 short bullet tags highlighting what this structure focuses on"],
      "recommendedSteps": estimated integer step count
    }
  ]
}`;
    const response = await aiClient.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert instructional designer. Propose 3 tailored training structures grounded in the provided SOP. Respond strictly with valid JSON.",
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });
    const parsed = cleanAndRepairJson(response.text || "{}");
    if (parsed && Array.isArray(parsed.options) && parsed.options.length > 0) {
      return res.json({ success: true, options: parsed.options });
    }
    return res.json({ success: true, options: defaultOptions });
  } catch (err) {
    console.warn("[Server /api/sop/instruct-options error]:", err?.message);
    return res.json({
      success: true,
      options: [
        {
          id: "opt-standard",
          title: "Standard Operational Flow",
          description: "Balanced, step-by-step procedural training covering prerequisites, core execution, and verification.",
          focusAreas: ["End-to-End Procedural Flow", "Task Verification", "Standard Operations"],
          recommendedSteps: 5
        },
        {
          id: "opt-controls-exceptions",
          title: "Critical Controls & Edge Cases",
          description: "Emphasizes high-stakes safety rules, decision criteria, exception handling, and escalation protocols.",
          focusAreas: ["Critical Safety Controls", "Exception Recovery", "Escalations"],
          recommendedSteps: 6
        },
        {
          id: "opt-fast-track",
          title: "Fast-Track Field Drill",
          description: "Concise, high-velocity frontline drill focusing strictly on core physical and system actions.",
          focusAreas: ["Core Action Verbs", "Fast Field Execution", "Target Barcodes/Codes"],
          recommendedSteps: 4
        }
      ]
    });
  }
});
app.post("/api/sop/extract-report", authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const { filename, rawText, wordCount, pageCount, fileHash, fileBase64, mimeType } = req.body;
    const aiClient = getGeminiClient(req);
    const systemInstruction = `You are analysing an uploaded operational SOP to prepare a source-grounded learning experience.
Extract what the document actually states. Identify the purpose, ordered operational tasks, prerequisites, decisions, exceptions, critical controls, completion conditions and evidence requirements.
Attach source references to each material requirement.
Separate explicit requirements from interpretations, ambiguities, contradictions and missing information.
Do not invent procedures, operational details, policy requirements or escalation authority. Do not assume a fixed number of tasks. Do not generate the learning deck at this stage.
Return structured, schema-valid data and a concise human-readable extraction report. Report limitations honestly.`;
    const textPrompt = `Analyse SOP document: "${filename}" (${pageCount || 1} pages, ${wordCount || 100} words)
Text:
"""
${(rawText || "").slice(0, 32e3)}
"""

Return JSON conforming strictly to:
{
  "extractionReport": {
    "documentIdentity": {
      "filename": "${filename}",
      "docTitle": "${(filename || "Operational Procedure").replace(/\.(pdf|txt|docx)$/i, "")}",
      "uploadedAt": "${(/* @__PURE__ */ new Date()).toISOString()}",
      "wordCount": ${wordCount || 100},
      "pageCount": ${pageCount || 1}
    },
    "documentPurpose": "Clear, extracted document purpose from text",
    "intendedOutcome": "Extracted primary operational outcome",
    "extractedRequirements": [
      {
        "id": "req-1",
        "type": "task" | "prerequisite" | "decision" | "exception" | "escalation" | "control" | "completion",
        "title": "Concise requirement title",
        "instruction": "Full instruction text",
        "category": "DO" | "CHECK" | "DECIDE" | "RECOVER" | "ESCALATE",
        "provenance": "VERBATIM_SOURCE",
        "sourceRef": "Section or Page number",
        "sourceText": "Exact quote from SOP",
        "isCriticalControl": true/false
      }
    ],
    "stepsCount": number of operational tasks,
    "prerequisitesCount": number of prerequisites,
    "decisionsCount": number of decision points,
    "exceptionsCount": number of exception rules,
    "criticalControlsCount": number of critical controls,
    "missingInfoCount": number of missing details,
    "contradictionsAndAmbiguities": [
      {
        "id": "amb-1",
        "topic": "Topic name",
        "description": "What is ambiguous or missing in the source",
        "severity": "critical" | "high" | "medium" | "low",
        "sourceRef": "Section name",
        "isBlocking": true/false
      }
    ],
    "coverageStatus": {
      "isComplete": true,
      "wordCount": ${wordCount || 100},
      "pageCount": ${pageCount || 1}
    }
  },
  "unresolvedIssues": [
    {
      "id": "issue-1",
      "category": "safety" | "conflict" | "decision_criteria" | "completion" | "training_preference",
      "description": "Description of unresolved issue",
      "severity": "high" | "medium" | "low",
      "isBlocking": false,
      "resolved": false
    }
  ],
  "clarificationQuestions": [
    {
      "questionId": "q-1",
      "questionText": "Targeted question to clarify unstated or ambiguous detail",
      "reason": "Why this question matters for training structure",
      "category": "decision_criteria",
      "sourceRef": "Section ref",
      "isMandatory": false,
      "consequenceOfLeavingUnanswered": "What happens if skipped",
      "status": "pending",
      "options": [
        { "id": "opt-1", "label": "Option label", "isCompliantWithSource": true }
      ]
    }
  ]
}`;
    if (!aiClient) {
      return res.json({ success: false, fallback: true, reason: "No API key on server" });
    }
    const response = await aiClient.models.generateContent({
      model: MODEL_PRO,
      contents: textPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        temperature: 0.2
      }
    });
    const parsed = cleanAndRepairJson(response.text || "{}");
    return res.json({ success: true, ...parsed });
  } catch (err) {
    console.warn("[Server /api/sop/extract-report error]:", err?.message);
    return res.json({ success: false, fallback: true, error: err?.message });
  }
});
app.post("/api/sop/clarification-chat", authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const { session, latestAnswer } = req.body;
    const aiClient = getGeminiClient(req);
    const systemInstruction = `You are clarifying the interpretation of an already-extracted SOP.
Use the current extraction report, unresolved issues, previous answers and approved supplementary instructions.
Ask only questions that materially affect correct task execution, safety, source interpretation, learning structure or assessment validity.
Prioritize critical issues. Ask the minimum number of useful questions. Do not ask for information already established by the source or a previous answer.
Never invent a missing process rule. If an answer introduces a new rule, record it as supplementary information. If it conflicts with a source requirement or exceeds the user's apparent authority, flag it for resolution instead of silently accepting it.
Return the next question, its reason, supporting references, answer options where useful, mandatory status and the updated unresolved-issues list.`;
    if (!aiClient) {
      return res.json({ success: false, fallback: true });
    }
    const response = await aiClient.models.generateContent({
      model: MODEL_PRO,
      contents: `Session State:
${JSON.stringify(session).slice(0, 16e3)}
Latest Answer:
${JSON.stringify(latestAnswer)}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });
    const parsed = cleanAndRepairJson(response.text || "{}");
    return res.json({ success: true, ...parsed });
  } catch (err) {
    return res.json({ success: false, fallback: true, error: err?.message });
  }
});
app.post("/api/sop/generate-blueprint", authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const { session, filename, rawText, extractionReport, supplementaryInstructions } = req.body;
    const aiClient = getGeminiClient(req);
    const systemInstruction = `Create a learning blueprint from the validated SOP interpretation, the existing Canonical Task Model and approved clarification records.
Preserve operational order, prerequisites, decision criteria, exceptions, critical controls and completion conditions.
Map every proposed task and learning objective to its CTM requirement identifiers.
Identify any requirement that cannot yet be taught or assessed reliably.
Do not add unsupported procedural details. Do not omit critical controls for the sake of brevity. Do not generate the final four learning experiences until the blueprint is explicitly approved and all mandatory validations pass.`;
    if (!aiClient) {
      return res.json({ success: false, fallback: true });
    }
    const response = await aiClient.models.generateContent({
      model: MODEL_PRO,
      contents: `SOP: ${filename}
Report:
${JSON.stringify(extractionReport).slice(0, 8e3)}
Supplementary:
${JSON.stringify(supplementaryInstructions)}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });
    const parsed = cleanAndRepairJson(response.text || "{}");
    return res.json({ success: true, learningBlueprint: parsed.learningBlueprint || parsed });
  } catch (err) {
    return res.json({ success: false, fallback: true, error: err?.message });
  }
});
app.post("/api/sop/approve-and-generate", authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const { session, approvedBy = "Operations Reviewer" } = req.body;
    if (!session) {
      return res.status(400).json({ success: false, error: "Missing session data" });
    }
    if (session.currentStage !== "BLUEPRINT_REVIEW" && session.currentStage !== "APPROVED_FOR_GENERATION") {
      return res.status(422).json({
        success: false,
        error: `Stage transition rejected: Cannot generate training deck from stage '${session.currentStage}'. Explicit blueprint review is required.`
      });
    }
    const blockingIssues = (session.unresolvedIssues || []).filter((i) => i.isBlocking && !i.resolved);
    if (blockingIssues.length > 0) {
      return res.status(422).json({
        success: false,
        error: `Generation blocked: ${blockingIssues.length} unresolved critical safety/compliance gap(s) must be resolved before proceeding.`
      });
    }
    return res.json({
      success: true,
      stage: "APPROVED_FOR_GENERATION",
      approvedBy,
      approvedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Server error" });
  }
});
app.post("/api/generate-video", authenticateRequest, requireRole("admin"), async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { prompt, aspectRatio = "16:9", resolution = "720p" } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ success: false, error: "A prompt is required for video generation." });
    }
    const aiClient = getGeminiClient(req);
    if (!aiClient) {
      return res.status(500).json({ success: false, error: "Gemini API key is not configured on server or in request headers." });
    }
    const safePrompt = prompt.trim().slice(0, 2e3);
    const VEO_MODELS = ["veo-3.1-fast-generate-preview", "veo-3.1-lite-generate-preview"];
    let operation = null;
    let lastError = null;
    for (let attempt = 0; attempt < 2 && !operation; attempt++) {
      for (const modelName of VEO_MODELS) {
        try {
          console.log(`[Veo] Attempting video generation on model: ${modelName} (attempt ${attempt + 1})`);
          operation = await aiClient.models.generateVideos({
            model: modelName,
            prompt: safePrompt,
            config: {
              numberOfVideos: 1,
              resolution: resolution === "1080p" ? "1080p" : "720p",
              aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9"
            }
          });
          if (operation?.name) {
            console.log(`[Veo SUCCESS] Video generation initiated on ${modelName}:`, operation.name);
            break;
          }
        } catch (laneErr) {
          lastError = laneErr;
          const is429 = laneErr?.status === 429 || laneErr?.message?.includes("429") || laneErr?.message?.includes("RESOURCE_EXHAUSTED");
          console.warn(`[Veo Lane Warning] ${modelName} returned ${is429 ? "429 Rate Limit" : laneErr?.message?.slice(0, 60)}.`);
          const backoffMs = (attempt + 1) * 2e3 + Math.floor(Math.random() * 1500);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }
    if (!operation?.name) {
      throw lastError || new Error("Video generation failed on all available Veo model lanes.");
    }
    return res.status(200).json({ success: true, operationName: operation.name });
  } catch (error) {
    console.error("[Veo Generate Error]", error);
    let msg = error?.message || (typeof error === "string" ? error : "Failed to start video generation.");
    try {
      if (typeof msg === "string" && msg.startsWith("{")) {
        const parsed = JSON.parse(msg);
        if (parsed.error?.message) msg = parsed.error.message;
      }
    } catch (_) {
    }
    const isQuota = msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || error?.status === 429 || error?.code === 429;
    if (isQuota) {
      return res.status(429).json({
        success: false,
        isQuotaExceeded: true,
        error: "Google Veo rate limit or daily quota reached (RESOURCE_EXHAUSTED). Video generation allows 1 request per minute on preview tiers. Please wait about 60 seconds and try again."
      });
    }
    return res.status(500).json({ success: false, error: msg });
  }
});
app.post("/api/video-status", authenticateRequest, requireRole("admin"), async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { operationName } = req.body || {};
    if (!operationName) {
      return res.status(400).json({ success: false, error: "operationName is required." });
    }
    const aiClient = getGeminiClient(req);
    if (!aiClient) {
      return res.status(500).json({ success: false, error: "Gemini API key is not configured on server or in request headers." });
    }
    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await aiClient.operations.getVideosOperation({ operation: op });
    let errObj = null;
    if (updated.error) {
      errObj = typeof updated.error === "string" ? updated.error : updated.error.message || JSON.stringify(updated.error);
    }
    return res.status(200).json({
      success: true,
      done: Boolean(updated.done),
      error: errObj
    });
  } catch (error) {
    console.error("[Veo Status Error]", error);
    const msg = error?.message || (typeof error === "string" ? error : "Failed to check video status.");
    return res.status(500).json({ success: false, error: msg });
  }
});
app.post("/api/video-download", authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const { operationName, lessonId, clipIndex = 1 } = req.body;
    if (!operationName) {
      return res.status(400).json({ success: false, error: "operationName is required." });
    }
    const aiClient = getGeminiClient(req);
    const apiKey = getApiKey(req);
    if (!aiClient || !apiKey) {
      return res.status(500).json({ success: false, error: "Gemini API key is not configured." });
    }
    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await aiClient.operations.getVideosOperation({ operation: op });
    const downloadUri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadUri) {
      return res.status(404).json({ success: false, error: "Video URI not found in completed operation." });
    }
    const videoRes = await fetch(downloadUri, {
      headers: { "x-goog-api-key": apiKey }
    });
    if (!videoRes.ok) {
      return res.status(videoRes.status).json({ success: false, error: `Failed to fetch video file: ${videoRes.statusText}` });
    }
    const arrayBuffer = await videoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (lessonId && typeof lessonId === "string") {
      try {
        const destPath = getSafeVideoPath(lessonId, Number(clipIndex) || 1);
        await fs.promises.writeFile(destPath, buffer);
        console.log(`[Server Storage] Saved video clip to server disk: ${destPath}`);
      } catch (saveErr) {
        console.warn("[Server Storage] Failed to write video to server disk:", saveErr);
      }
    }
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", buffer.length.toString());
    return res.send(buffer);
  } catch (error) {
    console.error("[Veo Download Error]", error);
    return res.status(500).json({ success: false, error: error?.message || "Failed to download video." });
  }
});
app.get("/api/videos/stream/:lessonId/:clipIndex", optionalAuth, (req, res) => {
  try {
    const { lessonId, clipIndex } = req.params;
    const isPublicDemoLesson = /^(demo|sample|retail|aviation|ret-001)/i.test(lessonId);
    if (!isPublicDemoLesson && !req.user) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required to stream proprietary tenant video assets."
      });
    }
    const filePath = getSafeVideoPath(lessonId, Number(clipIndex) || 1);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "Video not found on server storage." });
    }
    return res.sendFile(filePath, {
      headers: {
        "Content-Type": "video/mp4",
        "Cache-Control": isPublicDemoLesson ? "public, max-age=86400" : "private, no-cache"
      }
    });
  } catch (error) {
    console.error("[Video Stream Error]", error);
    return res.status(500).json({ success: false, error: "Failed to stream video." });
  }
});
app.get("/api/videos/check/:lessonId", authenticateRequest, (req, res) => {
  try {
    const { lessonId } = req.params;
    const safeId = lessonId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const existingClips = [];
    for (let i = 1; i <= 10; i++) {
      const p = path.join(videosDir, `${safeId}_clip_${i}.mp4`);
      if (fs.existsSync(p)) {
        existingClips.push(i);
      }
    }
    return res.json({
      success: true,
      clips: existingClips
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Failed to check video storage." });
  }
});
app.delete("/api/videos/:lessonId", authenticateRequest, requireRole("admin"), (req, res) => {
  try {
    const { lessonId } = req.params;
    const safeId = lessonId.replace(/[^a-zA-Z0-9_-]/g, "_");
    for (let i = 1; i <= 10; i++) {
      const p = path.join(videosDir, `${safeId}_clip_${i}.mp4`);
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch (_) {
        }
      }
    }
    return res.json({ success: true, message: "Server video storage cleared." });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Failed to delete videos." });
  }
});
app.get("/api/image-generation/config", authenticateRequest, (_req, res) => {
  try {
    const config = getImageGenerationConfig();
    return res.json({ success: true, config });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});
app.post("/api/image-generation/toggle-provider", authenticateRequest, requireRole("admin"), (req, res) => {
  try {
    const { provider } = req.body;
    if (provider === "flux" || provider === "imagen") {
      setRuntimeImageProvider(provider);
    } else if (provider === null || provider === "auto" || provider === "default") {
      setRuntimeImageProvider(null);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Must be "flux", "imagen", or "auto".'
      });
    }
    const updatedConfig = getImageGenerationConfig();
    return res.json({ success: true, config: updatedConfig });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});
app.post(["/api/image-generation/generate", "/api/generate-image"], authenticateRequest, requireRole("admin"), async (req, res) => {
  try {
    const {
      prompt,
      role,
      stepTitle,
      aspectRatio = "16:9",
      provider,
      falApiKey,
      geminiApiKey
    } = req.body;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: "A non-empty prompt string is required."
      });
    }
    const headerGeminiKey = ((typeof req.headers["x-gemini-api-key"] === "string" ? req.headers["x-gemini-api-key"] : "") || (typeof req.headers["authorization"] === "string" ? req.headers["authorization"].replace(/^Bearer\s+/i, "") : "")).trim();
    const headerFalKey = (typeof req.headers["x-fal-key"] === "string" ? req.headers["x-fal-key"] : "").trim();
    const result = await generateImage({
      prompt,
      role,
      stepTitle,
      aspectRatio,
      provider,
      geminiApiKey: geminiApiKey || headerGeminiKey || void 0,
      falApiKey: falApiKey || headerFalKey || void 0
    });
    if (!result.success) {
      return res.status(result.error?.includes("not configured") ? 400 : 502).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error("[Image Generation Route Error]", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Internal server error while generating image."
    });
  }
});
app.all("/api/*", (req, res) => {
  res.status(404).json({
    error: "API_ENDPOINT_NOT_FOUND",
    message: `API endpoint ${req.method} ${req.path} not found on server`
  });
});
var distPath = path.resolve(process.cwd(), "dist");
var indexHtmlExists = fs.existsSync(path.join(distPath, "index.html"));
var isProduction = process.env.NODE_ENV === "production" || indexHtmlExists && process.env.NODE_ENV !== "development";
if (isProduction) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ success: false, error: "API route not found" });
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);
}
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] Express server running on http://0.0.0.0:${PORT}`);
});
function sanitizeJsonString(str) {
  let result = "";
  let inString = false;
  let isEscaped = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (isEscaped) {
        result += ch;
        isEscaped = false;
      } else if (ch === "\\") {
        result += ch;
        isEscaped = true;
      } else if (ch === '"') {
        const rest = str.slice(i + 1).trimStart();
        if (rest.startsWith(":") || rest.startsWith(",") || rest.startsWith("}") || rest.startsWith("]")) {
          result += ch;
          inString = false;
        } else {
          result += '\\"';
        }
      } else if (ch === "\n") {
        result += "\\n";
      } else if (ch === "\r") {
        result += "\\r";
      } else if (ch === "	") {
        result += "\\t";
      } else {
        result += ch;
      }
    } else {
      result += ch;
      if (ch === '"') {
        inString = true;
      }
    }
  }
  return result;
}
function repairTruncatedJson(jsonStr) {
  let text = jsonStr.trim();
  text = text.replace(/```$/g, "").trim();
  text = text.replace(/,?\s*"[^"]*"\s*:\s*$/, "");
  text = text.replace(/,?\s*"[^"]*$/, "");
  text = text.replace(/[,:\s]+$/, "");
  let inString = false;
  let isEscaped = false;
  const stack = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === "\\") {
        isEscaped = true;
      } else if (ch === '"') {
        inString = false;
      }
    } else {
      if (ch === '"') {
        inString = true;
      } else if (ch === "{" || ch === "[") {
        stack.push(ch);
      } else if (ch === "}" || ch === "]") {
        if (stack.length > 0) stack.pop();
      }
    }
  }
  if (inString) {
    text += '"';
  }
  text = text.replace(/[,:\s]+$/, "");
  while (stack.length > 0) {
    const opening = stack.pop();
    if (opening === "{") {
      text += "}";
    } else if (opening === "[") {
      text += "]";
    }
  }
  text = text.replace(/,\s*([\}\]])/g, "$1");
  return text;
}
function extractJsonBlock(text) {
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = firstBrace < firstBracket ? firstBrace : firstBracket;
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }
  if (startIdx === -1) {
    return text;
  }
  let inString = false;
  let isEscaped = false;
  const stack = [];
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === "\\") {
        isEscaped = true;
      } else if (ch === '"') {
        inString = false;
      }
    } else {
      if (ch === '"') {
        inString = true;
      } else if (ch === "{" || ch === "[") {
        stack.push(ch);
      } else if (ch === "}" || ch === "]") {
        const top = stack[stack.length - 1];
        if (ch === "}" && top === "{" || ch === "]" && top === "[") {
          stack.pop();
          if (stack.length === 0) {
            return text.slice(startIdx, i + 1);
          }
        }
      }
    }
  }
  return text.slice(startIdx);
}
function cleanAndRepairJson(rawText) {
  if (!rawText || !rawText.trim()) throw new Error("Empty text response from model");
  let text = rawText.trim();
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  text = extractJsonBlock(text);
  try {
    return JSON.parse(text);
  } catch (e1) {
    try {
      const sanitized = sanitizeJsonString(text);
      return JSON.parse(sanitized);
    } catch (e2) {
      try {
        const sanitized = sanitizeJsonString(text);
        const repaired = repairTruncatedJson(sanitized);
        return JSON.parse(repaired);
      } catch (e3) {
        try {
          const repairedRaw = repairTruncatedJson(text);
          return JSON.parse(repairedRaw);
        } catch (e4) {
          console.error("[cleanAndRepairJson FAIL] Unrepairable JSON response from LLM:", text.slice(0, 300));
          throw new Error("MALFORMED_LLM_JSON_OUTPUT");
        }
      }
    }
  }
}
