-- Migration 003: Admin Content Management Lifecycle & Safe Status Expansion
-- Expands learning_assets status check to allow modern lifecycle states ('processing', 'published', 'failed')
-- while preserving existing ('draft', 'review', 'approved', 'archived') for backwards compatibility.

ALTER TABLE learning_assets DROP CONSTRAINT IF EXISTS learning_assets_status_check;
ALTER TABLE learning_assets ADD CONSTRAINT learning_assets_status_check
  CHECK (status IN ('draft', 'processing', 'review', 'approved', 'published', 'failed', 'archived'));
