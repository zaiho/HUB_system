/*
  # Add status column to sites table

  1. Changes
    - Add status column to sites table with default value 'active'
    - Add check constraint to ensure valid status values
*/

ALTER TABLE sites
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
CHECK (status IN ('active', 'archived'));