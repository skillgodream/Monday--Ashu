-- Rollback Migration 003: Reverts learning_assets status check constraint to initial 4 states.

ALTER TABLE learning_assets DROP CONSTRAINT IF EXISTS learning_assets_status_check;
ALTER TABLE learning_assets ADD CONSTRAINT learning_assets_status_check
  CHECK (status IN ('draft', 'review', 'approved', 'archived'));
