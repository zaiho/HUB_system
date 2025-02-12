/*
  # Update survey schema and linking

  1. Changes
    - Add indexes for better query performance
    - Add RLS policies for survey access
*/

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_surveys_site_id ON surveys(site_id);
CREATE INDEX IF NOT EXISTS idx_surveys_created_by ON surveys(created_by);
CREATE INDEX IF NOT EXISTS idx_surveys_type ON surveys(type);

-- Add RLS policies for surveys if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'surveys' 
    AND policyname = 'Users can view surveys for their sites'
  ) THEN
    CREATE POLICY "Users can view surveys for their sites" 
    ON surveys FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM sites 
        WHERE sites.id = surveys.site_id 
        AND (sites.user_id = auth.uid() OR auth.role() = 'service_role')
      )
    );
  END IF;
END $$;