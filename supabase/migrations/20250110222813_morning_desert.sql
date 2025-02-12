/*
  # Add drilling company field to sites table

  1. Changes
    - Add `drilling_company` column to `sites` table
*/

ALTER TABLE sites
ADD COLUMN IF NOT EXISTS drilling_company TEXT;