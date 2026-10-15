/**
 * GURU COACH LMS - VERCEL SERVERLESS AUTHENTICATION GUARD
 *
 * Provides identical cryptographic verification, role checks, and tenant
 * boundary enforcement for independent /api/* serverless handlers.
 */

import { verifyFirebaseIdToken } from './firebaseAdmin.js';
import { resolveUserFromIdentity } from './authMiddleware.js';
import { userRepo } from '../db/repositories/userRepo.js';
import { UserEntity, UserRole } from '../db/types.js';

export interface ServerlessAuthResult {
  success: boolean;
  user?: UserEntity;
  organizationId?: string;
  role?: UserRole | 'demo';
  isDemo?: boolean;
}

export interface ServerlessAuthOptions {
  allowedRoles?: UserRole[];
  allowDemo?: boolean;
}

export async function authenticateServerless(
  req: any,
  res: any,
  options: ServerlessAuthOptions = {}
): Promise<ServerlessAuthResult> {
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Dev Bypass: STRICTLY FORBIDDEN IN PRODUCTION
  if (!isProduction && process.env.DEV_AUTH_BYPASS === 'true') {
    const devPersona = req.headers?.['x-dev-persona'];
    if (typeof devPersona === 'string') {
      const devEmail = `${devPersona.toLowerCase()}@guruji.internal`;
      const users = await userRepo.findActiveByEmailGlobally(devEmail);
      if (users[0]) {
        const user = users[0];
        if (options.allowedRoles && !options.allowedRoles.includes(user.role)) {
          res.status(403).json({
            error: 'FORBIDDEN',
            message: `Role '${user.role}' not permitted on this route.`,
          });
          return { success: false };
        }
        return {
          success: true,
          user,
          organizationId: user.organization_id,
          role: user.role,
          isDemo: false,
        };
      }
    }
  }

  // 2. Extract Bearer Token
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    if (options.allowDemo) {
      return {
        success: true,
        role: 'demo',
        isDemo: true,
      };
    }

    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Missing Bearer token.',
    });
    return { success: false };
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Empty Bearer token provided.',
    });
    return { success: false };
  }

  try {
    const identity = await verifyFirebaseIdToken(token);
    const user = await resolveUserFromIdentity(identity);

    if (options.allowedRoles && !options.allowedRoles.includes(user.role)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Role '${user.role}' not permitted. Requires [${options.allowedRoles.join(', ')}].`,
      });
      return { success: false };
    }

    return {
      success: true,
      user,
      organizationId: user.organization_id,
      role: user.role,
      isDemo: false,
    };
  } catch (err: any) {
    const msg = err?.message || 'Authentication failed';
    const status = msg.includes('ACCOUNT_DEACTIVATED') || msg.includes('USER_NOT_PROVISIONED') ? 403 : 401;
    res.status(status).json({
      error: status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
      message: msg,
    });
    return { success: false };
  }
}
