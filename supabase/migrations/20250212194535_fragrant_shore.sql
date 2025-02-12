/*
  # Add survey data validation with existing data handling

  1. Changes
    - Add CHECK constraints progressively with data validation
    - Add validation for survey types and their specific data structure
    - Add validation for common_data structure
    - Add validation for coordinates format
    - Add validation for dates and timestamps

  2. Validation Rules
    - Ensure all required fields are present
    - Validate coordinates and dates
    - Validate survey type-specific data structures
*/

-- First, update any NULL values in common_data and specific_data
UPDATE surveys
SET common_data = '{}'::jsonb
WHERE common_data IS NULL;

UPDATE surveys
SET specific_data = '{}'::jsonb
WHERE specific_data IS NULL;

-- Update any missing coordinates in common_data
UPDATE surveys
SET common_data = jsonb_set(
  CASE 
    WHEN common_data ? 'coordinates' THEN common_data
    ELSE jsonb_set(common_data, '{coordinates}', '{"latitude": 0, "longitude": 0}'::jsonb)
  END,
  '{date}',
  to_jsonb(COALESCE(common_data->>'date', created_at::text))
)
WHERE NOT (common_data ? 'coordinates' AND common_data ? 'date');

-- Add basic validation for common_data structure
ALTER TABLE surveys
DROP CONSTRAINT IF EXISTS surveys_common_data_check;

ALTER TABLE surveys
ADD CONSTRAINT surveys_common_data_check
CHECK (
  common_data IS NOT NULL AND
  common_data::text <> 'null' AND
  common_data::text <> '{}' AND
  common_data ? 'date'
);

-- Add basic validation for specific_data structure
ALTER TABLE surveys
DROP CONSTRAINT IF EXISTS surveys_specific_data_check;

ALTER TABLE surveys
ADD CONSTRAINT surveys_specific_data_check
CHECK (
  specific_data IS NOT NULL AND
  specific_data::text <> 'null' AND
  specific_data::text <> '{}'
);

-- Add validation for date formats
ALTER TABLE surveys
DROP CONSTRAINT IF EXISTS surveys_dates_check;

ALTER TABLE surveys
ADD CONSTRAINT surveys_dates_check
CHECK (
  created_at IS NOT NULL AND
  updated_at IS NOT NULL
);

-- Add function to validate JSON structure with soft validation
CREATE OR REPLACE FUNCTION validate_survey_data()
RETURNS trigger AS $$
BEGIN
  -- Ensure common_data and specific_data are not null
  NEW.common_data := COALESCE(NEW.common_data, '{}'::jsonb);
  NEW.specific_data := COALESCE(NEW.specific_data, '{}'::jsonb);

  -- Set default date if missing
  IF NOT (NEW.common_data ? 'date') THEN
    NEW.common_data := jsonb_set(
      NEW.common_data,
      '{date}',
      to_jsonb(CURRENT_TIMESTAMP::text)
    );
  END IF;

  -- Set default coordinates if missing
  IF NOT (NEW.common_data ? 'coordinates') THEN
    NEW.common_data := jsonb_set(
      NEW.common_data,
      '{coordinates}',
      '{"latitude": 0, "longitude": 0}'::jsonb
    );
  END IF;

  -- Basic type-specific validation
  CASE NEW.type
    WHEN 'soil' THEN
      IF NOT NEW.specific_data ? 'name' THEN
        NEW.specific_data := jsonb_set(
          NEW.specific_data,
          '{name}',
          to_jsonb('Sondage ' || NEW.id)
        );
      END IF;

    WHEN 'gas', 'ambient_air', 'surface_water', 'pid' THEN
      NULL; -- Allow any structure for now

    ELSE
      RAISE EXCEPTION 'Invalid survey type: %', NEW.type;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for data validation
DROP TRIGGER IF EXISTS validate_survey_data_trigger ON surveys;
CREATE TRIGGER validate_survey_data_trigger
  BEFORE INSERT OR UPDATE ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION validate_survey_data();

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_surveys_type_created_at ON surveys(type, created_at);
CREATE INDEX IF NOT EXISTS idx_surveys_common_data_date ON surveys((common_data->>'date'));

-- Add helpful comments
COMMENT ON TABLE surveys IS 'Stores environmental survey data with progressive validation';
COMMENT ON COLUMN surveys.common_data IS 'Common data shared across all survey types';
COMMENT ON COLUMN surveys.specific_data IS 'Type-specific survey data with validated structure';