/*
  # Add project managers fields

  1. Changes
    - Add project_manager column to sites table
    - Add engineer_in_charge column to sites table
*/

ALTER TABLE sites
ADD COLUMN IF NOT EXISTS project_manager TEXT,
ADD COLUMN IF NOT EXISTS engineer_in_charge TEXT;