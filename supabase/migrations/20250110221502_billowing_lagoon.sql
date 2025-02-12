/*
  # Add coordinates column to sites table

  1. Changes
    - Add JSONB column `coordinates` to store latitude and longitude
*/

ALTER TABLE sites
ADD COLUMN IF NOT EXISTS coordinates JSONB;