/**
 * GURU COACH LMS - AUTHENTICATION & AUTHORIZATION MIDDLEWARE (EXPRESS)
 *
 * Enforces cryptographic Firebase ID token verification, safe atomic account linking,
 * organization tenant isolation, role-based access control, and anti-tampering guards.
 *
 * Development bypass is strictly disabled in production (fails closed).
 */

import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseIdToken, VerifiedIdentity } from './firebaseAdmin.js';
import { userRepo } from '../db/repositories/userRepo.js';
import { isDatabaseConfigured } from '../db/pool.js';
import { UserEntity, UserRole } from '../db/types.js';

// Extend Express Request type with authenticated context
declare global {
  namespace Express {
    interface Request {
      user?: UserEntity | null;
      organizationId?: string | null;
      userRole?: UserRole | 'demo' | null;
      isDemo?: boolean;
    }
  }
}

/**
 * Resolves a verified external identity to an internal PostgreSQL user.
 * Implements atomic linking and strict pre-provisioning verification.
 */
export async function resolveUserFromIdentity(identity: VerifiedIdentity): Promise<UserEntity> {
  // Support offline / mock testing when DB is not configured and token is an explicit mock identity
  if (!isDatabaseConfigured() && (identity.uid.startsWith('mock-uid-') || identity.uid.includes('mock'))) {
    const rolePart = (identity.uid.replace('mock-uid-', '').replace('-mock', '').replace('uid-', '')) as UserRole;
    const role: UserRole = ['admin', 'manager', 'learner'].includes(rolePart) ? rolePart : 'learner';
    return {
      id: `mock-user-id-${role}`,
      organization_id: 'org-test-offline',
      email: identity.email || `${role}@guruji.internal`,
      full_name: identity.name || `Mock ${role.toUpperCase()}`,
      role,
      job_title: 'Test Frontline Worker',
      badge_id: 'BADGE-TEST',
      firebase_uid: identity.uid,
      auth_provider: 'firebase',
      last_login_at: new Date(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  // 1. Check if user is already linked by unique Firebase UID
  const existingUser = await userRepo.findByFirebaseUid(identity.uid);
  if (existingUser) {
    if (!existingUser.is_active) {
      throw new Error('ACCOUNT_DEACTIVATED: This user account has been deactivated.');
    }
    // Update last login asynchronously
    userRepo.updateLastLogin(existingUser.id).catch((err) => {
      console.warn('[Auth] Failed to update last_login_at:', err?.message);
    });
    return existingUser;
  }

  // 2. If not linked, verify email requirement
  if (!identity.email) {
    throw new Error('NO_EMAIL_CLAIM: External identity does not contain an email address.');
  }

  if (!identity.email_verified) {
    throw new Error('EMAIL_NOT_VERIFIED: Identity provider email has not been verified.');
  }

  // 3. Match against pre-provisioned active user records
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

  // 4. Exactly one pre-provisioned record found: link atomically
  const targetUser = matchingUsers[0];
  const linked = await userRepo.linkFirebaseUid(
    targetUser.organization_id,
    targetUser.id,
    identity.uid,
    identity.email
  );

  if (!linked) {
    throw new Error('ACCOUNT_LINKING_CONFLICT: Failed to link external identity. Identity may already be linked.');
  }

  console.log(`[Auth SUCCESS] Safely linked Firebase identity ${identity.uid} to user ${linked.id} (${linked.email})`);
  return linked;
}

/**
 * Resolves development fixture persona (ONLY in development when DEV_AUTH_BYPASS is active).
 */
async function resolveDevPersona(persona: string): Promise<UserEntity | null> {
  const role = persona.toLowerCase() as UserRole;
  if (!['admin', 'manager', 'learner'].includes(role)) {
    return null;
  }

  const devEmail = `${role}@guruji.internal`;
  const users = await userRepo.findActiveByEmailGlobally(devEmail);
  return users[0] || null;
}

/**
 * Primary Authentication Middleware
 * Validates Bearer token, resolves internal user, and enforces tenant context.
 */
export async function authenticateRequest(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.userRole && req.organizationId) {
    return next();
  }

  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Development Bypass Check: STRICTLY DISABLED IN PRODUCTION
  if (!isProduction && process.env.DEV_AUTH_BYPASS === 'true') {
    const devPersona = req.headers['x-dev-persona'];
    if (typeof devPersona === 'string') {
      try {
        const devUser = await resolveDevPersona(devPersona);
        if (devUser) {
          req.user = devUser;
          req.organizationId = devUser.organization_id;
          req.userRole = devUser.role;
          req.isDemo = false;
          return next();
        }
      } catch (err: any) {
        console.warn('[Auth Dev Bypass Warning]:', err?.message);
      }
    }
  }

  // 2. Extract Bearer Token from Authorization Header
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Missing Bearer token in Authorization header.',
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Empty Bearer token provided.',
    });
  }

  try {
    // 3. Verify cryptographic token via Firebase Admin SDK
    const identity = await verifyFirebaseIdToken(token);

    // 4. Resolve internal user and tenant boundary
    const user = await resolveUserFromIdentity(identity);

    req.user = user;
    req.organizationId = user.organization_id;
    req.userRole = user.role;
    req.isDemo = false;

    return next();
  } catch (err: any) {
    const msg = err?.message || 'Authentication failed';
    if (msg.includes('ACCOUNT_DEACTIVATED')) {
      return res.status(403).json({ error: 'ACCOUNT_DEACTIVATED', message: msg });
    }
    if (msg.includes('USER_NOT_PROVISIONED')) {
      return res.status(403).json({ error: 'USER_NOT_PROVISIONED', message: msg });
    }
    if (msg.includes('EMAIL_NOT_VERIFIED')) {
      return res.status(401).json({ error: 'EMAIL_NOT_VERIFIED', message: msg });
    }
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: msg,
    });
  }
}

/**
 * Optional Authentication Middleware
 * Attaches user context if a valid token is provided; otherwise sets demo context.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    req.organizationId = null;
    req.userRole = 'demo';
    req.isDemo = true;
    return next();
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    req.user = null;
    req.organizationId = null;
    req.userRole = 'demo';
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
    req.userRole = 'demo';
    req.isDemo = true;
  }

  return next();
}

/**
 * Role-Based Access Control Middleware Factory
 */
export function requireRole(allowedRoles: UserRole | UserRole[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.userRole) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required before role verification.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `Access denied. Route requires one of [${roles.join(', ')}] role(s). Current role is '${req.user.role}'.`,
      });
    }

    return next();
  };
}

/**
 * Workplace Observation Anti-Self-Sign-Off Guard
 * Prevents managers/supervisors from signing off their own performance reviews.
 */
export function enforceObservationAntiSelfSignOff(req: Request, learnerId: string): boolean {
  if (req.user && req.user.id === learnerId) {
    return false; // Prohibited
  }
  return true;
}
