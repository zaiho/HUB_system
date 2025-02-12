/*
  # Add surface_water survey type

  1. Changes
    - Add 'surface_water' as an allowed value for the survey type check constraint
*/

ALTER TABLE surveys 
DROP CONSTRAINT IF EXISTS surveys_type_check;

ALTER TABLE surveys 
ADD CONSTRAINT surveys_type_check 
CHECK (type IN ('soil', 'groundwater', 'gas', 'ambient_air', 'pid', 'surface_water'));