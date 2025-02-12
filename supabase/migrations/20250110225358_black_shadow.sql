/*
  # Add city column to sites table

  1. Changes
    - Add `city` column to `sites` table
*/

ALTER TABLE sites
ADD COLUMN IF NOT EXISTS city TEXT;