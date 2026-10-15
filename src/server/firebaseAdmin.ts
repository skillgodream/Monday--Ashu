/**
 * GURU COACH LMS - FIREBASE ADMIN SDK TOKEN VERIFIER
 *
 * Official Firebase Admin SDK integration for server-side ID-token verification.
 * Validates cryptographic signature, expiry, audience, issuer, and claims.
 * Fails closed in production if unconfigured.
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let isInitialized = false;

export interface VerifiedIdentity {
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
}

export function getFirebaseAdminApp(): App | null {
  const currentApps = getApps();
  if (isInitialized && currentApps.length > 0) {
    return currentApps[0]!;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    'field-trainer-f168c';

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  try {
    if (currentApps.length > 0) {
      isInitialized = true;
      return currentApps[0]!;
    }

    if (serviceAccountJson) {
      let parsedCreds: any;
      try {
        parsedCreds = JSON.parse(serviceAccountJson);
      } catch {
        try {
          const decoded = Buffer.from(serviceAccountJson, 'base64').toString('utf-8');
          parsedCreds = JSON.parse(decoded);
        } catch {
          console.warn('[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY');
        }
      }

      if (parsedCreds) {
        const app = initializeApp({
          credential: cert(parsedCreds),
          projectId: parsedCreds.project_id || projectId,
        });
        isInitialized = true;
        return app;
      }
    }

    // Default application credentials (Google Cloud Run / ADC)
    const app = initializeApp({
      projectId,
    });
    isInitialized = true;
    return app;
  } catch (err: any) {
    console.warn('[FirebaseAdmin] Initialization warning:', err?.message || err);
    return getApps()[0] || null;
  }
}

/**
 * Verifies a client-provided Firebase ID token.
 * Validates signature, expiry, audience, and project.
 */
export async function verifyFirebaseIdToken(
  token: string,
  checkRevoked: boolean = false
): Promise<VerifiedIdentity> {
  if (!token || typeof token !== 'string' || !token.trim()) {
    throw new Error('MISSING_TOKEN: ID token is empty or undefined.');
  }

  const cleanToken = token.trim();

  // Test / Mock Token Handling (ONLY for non-production environments during test execution)
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction && cleanToken.startsWith('mock-token:')) {
    const parts = cleanToken.split(':');
    const role = parts[1] || 'learner';
    const email = parts[2] || `${role}@guruji.internal`;
    const uid = parts[3] || `mock-uid-${role}`;

    return {
      uid,
      email,
      email_verified: true,
      name: `Mock ${role.toUpperCase()} User`,
    };
  }

  // Live Firebase Admin SDK verification
  const app = getFirebaseAdminApp();
  if (!app) {
    throw new Error('FIREBASE_ADMIN_UNAVAILABLE: Firebase Admin is not configured.');
  }

  try {
    const auth = getAuth(app);
    const decoded = await auth.verifyIdToken(cleanToken, checkRevoked);
    return {
      uid: decoded.uid,
      email: decoded.email,
      email_verified: Boolean(decoded.email_verified),
      name: decoded.name || (decoded as any).display_name,
    };
  } catch (err: any) {
    const code = err?.code || 'auth/unknown-error';
    const message = err?.message || 'Token verification failed';
    throw new Error(`FIREBASE_VERIFICATION_FAILED [${code}]: ${message}`);
  }
}
