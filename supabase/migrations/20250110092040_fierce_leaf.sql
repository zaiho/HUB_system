/*
  # Initial Schema for Field Survey Application

  1. Tables
    - users (managed by Supabase Auth)
    - sites
      - Basic site information
      - Linked to users
    - surveys
      - Stores all types of surveys
      - Common and specific data stored in JSONB columns
    
  2. Security
    - RLS enabled on all tables
    - Users can only access their own data
*/

-- Sites table
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  project_number TEXT,
  client_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) NOT NULL
);

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sites"
  ON sites
  USING (auth.uid() = user_id);

-- Surveys table
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('soil', 'groundwater', 'gas', 'ambient_air')),
  common_data JSONB NOT NULL,
  specific_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage surveys for their sites"
  ON surveys
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = surveys.site_id
      AND sites.user_id = auth.uid()
    )
  );