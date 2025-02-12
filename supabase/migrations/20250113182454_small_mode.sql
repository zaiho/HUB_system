/*
  # Add Survey Photos Storage Bucket

  1. New Storage Bucket
    - Creates a new storage bucket for survey photos
    - Enables RLS policies for secure access
  
  2. Security
    - Allows authenticated users to upload photos
    - Allows authenticated users to view photos
*/

-- Create the survey-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('survey-photos', 'survey-photos')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to upload photos
CREATE POLICY "Allow authenticated users to upload photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'survey-photos');

-- Create policy to allow authenticated users to view photos
CREATE POLICY "Allow authenticated users to view photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'survey-photos');

-- Create policy to allow authenticated users to delete their own photos
CREATE POLICY "Allow authenticated users to delete their own photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'survey-photos' AND (storage.foldername(name))[1] = auth.uid()::text);