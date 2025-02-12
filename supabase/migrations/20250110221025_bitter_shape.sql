/*
  # Update surveys table foreign key constraint
  
  1. Changes
    - Add ON DELETE CASCADE to the site_id foreign key constraint in surveys table
    
  2. Security
    - No changes to existing RLS policies
*/

-- Drop the existing foreign key constraint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'surveys_site_id_fkey'
    AND table_name = 'surveys'
  ) THEN
    ALTER TABLE surveys DROP CONSTRAINT surveys_site_id_fkey;
  END IF;
END $$;

-- Add the new foreign key constraint with CASCADE DELETE
ALTER TABLE surveys 
  ADD CONSTRAINT surveys_site_id_fkey 
  FOREIGN KEY (site_id) 
  REFERENCES sites(id) 
  ON DELETE CASCADE;