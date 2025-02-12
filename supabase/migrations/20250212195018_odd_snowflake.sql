/*
  # Amélioration de la structure des données des sondages

  1. Structure commune
    - Ajout de validation pour common_data
    - Standardisation des coordonnées et dates
    - Ajout des informations d'équipe

  2. Structures spécifiques par type
    - Sol (soil)
    - Gaz (gas)
    - Air ambiant (ambient_air)
    - Eau de surface (surface_water)
    - PID (pid)

  3. Validation
    - Contraintes sur les types de données
    - Validation des structures JSON
    - Vérification des valeurs obligatoires
*/

-- Fonction de validation pour common_data
CREATE OR REPLACE FUNCTION validate_common_data(data jsonb)
RETURNS boolean AS $$
BEGIN
  RETURN (
    data ? 'date' AND
    data ? 'coordinates' AND
    data ? 'sampling_name' AND
    (data->'coordinates' ? 'latitude') AND
    (data->'coordinates' ? 'longitude')
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction de validation pour specific_data selon le type
CREATE OR REPLACE FUNCTION validate_specific_data(survey_type text, data jsonb)
RETURNS boolean AS $$
BEGIN
  CASE survey_type
    -- Validation des sondages de sol
    WHEN 'soil' THEN
      RETURN (
        data ? 'name' AND
        data ? 'coordinates' AND
        data ? 'generalInfo' AND
        data ? 'drillingInfo' AND
        data ? 'observations' AND
        data ? 'sampleManagement' AND
        
        -- Validation de generalInfo
        (data->'generalInfo' ? 'date') AND
        (data->'generalInfo' ? 'time') AND
        (data->'generalInfo' ? 'weather') AND
        (data->'generalInfo' ? 'temperature') AND
        
        -- Validation de drillingInfo
        (data->'drillingInfo' ? 'tool') AND
        (data->'drillingInfo' ? 'diameter') AND
        (data->'drillingInfo' ? 'depth') AND
        (data->'drillingInfo' ? 'refection') AND
        (data->'drillingInfo' ? 'cuttingsManagement') AND
        
        -- Validation de sampleManagement
        (data->'sampleManagement' ? 'conditioning') AND
        (data->'sampleManagement' ? 'transporter') AND
        (data->'sampleManagement' ? 'laboratory') AND
        (data->'sampleManagement' ? 'shippingDate')
      );

    -- Validation des sondages de gaz
    WHEN 'gas' THEN
      RETURN (
        data ? 'name' AND
        data ? 'structureDescription' AND
        data ? 'sampling' AND
        data ? 'purge' AND
        data ? 'laboratory' AND
        
        -- Validation de sampling
        (data->'sampling' ? 'type') AND
        (data->'sampling' ? 'supportCount') AND
        (data->'sampling' ? 'depth') AND
        
        -- Validation de purge
        (data->'purge' ? 'measurements') AND
        (data->'purge' ? 'flow')
      );

    -- Validation des sondages d'air ambiant
    WHEN 'ambient_air' THEN
      RETURN (
        data ? 'weatherConditions' AND
        data ? 'sampling' AND
        data ? 'measurements' AND
        data ? 'flow' AND
        data ? 'laboratory' AND
        
        -- Validation de sampling
        (data->'sampling' ? 'type') AND
        (data->'sampling' ? 'supportCount') AND
        (data->'sampling' ? 'height')
      );

    -- Validation des sondages d'eau de surface
    WHEN 'surface_water' THEN
      RETURN (
        data ? 'generalInfo' AND
        data ? 'sampling' AND
        data ? 'stationDescription' AND
        data ? 'fieldObservations' AND
        data ? 'parameters' AND
        data ? 'sampleManagement' AND
        
        -- Validation de sampling
        (data->'sampling' ? 'type') AND
        (data->'sampling' ? 'equipment') AND
        (data->'sampling' ? 'depth')
      );

    -- Validation des sondages PID
    WHEN 'pid' THEN
      RETURN (
        data ? 'structureDescription' AND
        data ? 'weatherConditions' AND
        data ? 'measurements' AND
        jsonb_array_length(data->'measurements') >= 0
      );

    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Mise à jour du trigger de validation
CREATE OR REPLACE FUNCTION validate_survey_data()
RETURNS trigger AS $$
BEGIN
  -- Validation de common_data
  IF NOT validate_common_data(NEW.common_data) THEN
    RAISE EXCEPTION 'Invalid common_data structure for survey';
  END IF;

  -- Validation de specific_data selon le type
  IF NOT validate_specific_data(NEW.type, NEW.specific_data) THEN
    RAISE EXCEPTION 'Invalid specific_data structure for survey type: %', NEW.type;
  END IF;

  -- Mise à jour automatique de updated_at
  NEW.updated_at := CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ajout d'index pour améliorer les performances des requêtes courantes
CREATE INDEX IF NOT EXISTS idx_surveys_site_type ON surveys(site_id, type);
CREATE INDEX IF NOT EXISTS idx_surveys_created_by_date ON surveys(created_by, created_at);

-- Ajout de commentaires explicatifs sur la structure des données
COMMENT ON COLUMN surveys.common_data IS 'Structure JSON contenant les données communes:
{
  "date": "YYYY-MM-DD",
  "coordinates": {
    "latitude": float,
    "longitude": float
  },
  "sampling_name": "string",
  "field_team": ["string"],
  "weather_conditions": "string"
}';

COMMENT ON COLUMN surveys.specific_data IS 'Structure JSON spécifique au type de sondage.
Pour les sondages de sol (type="soil"):
{
  "name": "string",
  "coordinates": {
    "x": float,
    "y": float,
    "z": float
  },
  "generalInfo": {
    "date": "YYYY-MM-DD",
    "time": "HH:mm",
    "weather": "string",
    "temperature": float
  },
  "drillingInfo": {
    "tool": "string",
    "diameter": float,
    "depth": float,
    "refection": "string",
    "cuttingsManagement": "string",
    "remarks": "string"
  },
  "observations": [{
    "depth": float,
    "lithology": "string",
    "water": "string",
    "organoleptic": "string",
    "pid": float,
    "samples": "string",
    "photos": ["string"]
  }],
  "sampleManagement": {
    "conditioning": "string",
    "transporter": "string",
    "laboratory": "string",
    "shippingDate": "YYYY-MM-DD"
  }
}';