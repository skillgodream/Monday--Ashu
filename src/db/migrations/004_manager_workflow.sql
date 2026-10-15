-- Migration 004: Manager Team & Assignment Workflow
-- Adds start_date to assignments and expands assignment status check constraint

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Expand assignments_status_check constraint safely
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_status_check;
ALTER TABLE assignments ADD CONSTRAINT assignments_status_check CHECK (
  status IN (
    'assigned',
    'pending',
    'in_progress',
    'remediation_required',
    'ready_for_observation',
    'certified',
    'completed',
    'overdue',
    'cancelled',
    'superseded'
  )
);
