-- Rollback Migration 004: Reverts assignments status check constraint and removes start_date column

ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_status_check;
ALTER TABLE assignments ADD CONSTRAINT assignments_status_check CHECK (
  status IN (
    'assigned',
    'in_progress',
    'remediation_required',
    'ready_for_observation',
    'certified',
    'superseded'
  )
);

ALTER TABLE assignments DROP COLUMN IF EXISTS start_date;
