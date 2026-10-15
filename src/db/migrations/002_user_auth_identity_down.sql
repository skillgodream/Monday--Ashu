-- ============================================================================
-- GURU COACH LMS: PHASE 2 AUTHENTICATION SCHEMA ROLLBACK
-- Migration Version: 002_user_auth_identity (DOWN)
-- ============================================================================

DROP INDEX IF EXISTS idx_users_email_unlinked;
DROP INDEX IF EXISTS uq_users_firebase_uid;

ALTER TABLE users 
  DROP COLUMN IF EXISTS last_login_at,
  DROP COLUMN IF EXISTS auth_provider,
  DROP COLUMN IF EXISTS firebase_uid;
