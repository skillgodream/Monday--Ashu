-- ============================================================================
-- GURU COACH LMS: PHASE 2 AUTHENTICATION & IDENTITY SCHEMA
-- Migration Version: 002_user_auth_identity
--
-- Adds external identity mapping (Firebase UID), provider tracking,
-- and last login timestamp to the tenant-isolated users table.
-- Ensures 1:1 mapping between external identity and internal user record.
-- ============================================================================

-- 1. Add authentication identity columns to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128),
  ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(32) NOT NULL DEFAULT 'firebase',
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- 2. Partial unique index to enforce that an external Firebase identity
-- can NEVER be linked to multiple user accounts across the platform.
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_firebase_uid 
  ON users(firebase_uid) 
  WHERE firebase_uid IS NOT NULL;

-- 3. Fast lookup index for pre-provisioned user invitations during initial sign-in
CREATE INDEX IF NOT EXISTS idx_users_email_unlinked 
  ON users(email) 
  WHERE firebase_uid IS NULL AND is_active = true;
