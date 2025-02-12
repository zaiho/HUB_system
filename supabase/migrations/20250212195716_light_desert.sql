/*
  # Validation complète des données de sondage
  
  Cette migration ajoute :
  1. Des contraintes de validation strictes pour chaque type de sondage
  2. Des fonctions de validation pour chaque champ spécifique
  3. Des triggers pour assurer l'intégrité des données
*/

-- Fonction pour valider les coordonnées
CREATE OR REPLACE FUNCTION validate_coordinates(coords jsonb)
RETURNS boolean AS $$
BEGIN
  RETURN (
    coords IS NOT NULL AND
    coords ? 'latitude' AND
    coords ? 'longitude' AND
    (coords->>'latitude')::decimal BETWEEN -90 AND 90 AND
    (coords->>'longitude')::decimal BETWEEN -180 AND 180
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour valider les dates
CREATE OR REPLACE FUNCTION validate_date_format(date_str text)
RETURNS boolean AS $$
BEGIN
  RETURN (
    date_str IS NOT NULL AND
    date_str ~ '^\d{4}-\d{2}-\d{2}$'
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour valider les heures
CREATE OR REPLACE FUNCTION validate_time_format(time_str text)
RETURNS boolean AS $$
BEGIN
  RETURN (
    time_str IS NOT NULL AND
    time_str ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour valider les mesures PID
CREATE OR REPLACE FUNCTION validate_pid_measurement(value text)
RETURNS boolean AS $$
BEGIN
  RETURN (
    value IS NULL OR
    (value ~ '^\d+(\.\d+)?$' AND value::decimal BETWEEN 0 AND 10000)
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour valider les mesures O2
CREATE OR REPLACE FUNCTION validate_o2_measurement(value text)
RETURNS boolean AS $$
BEGIN
  RETURN (
    value IS NULL OR
    (value ~ '^\d+(\.\d+)?$' AND value::decimal BETWEEN 0 AND 100)
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour valider les mesures pH
CREATE OR REPLACE FUNCTION validate_ph_measurement(value text)
RETURNS boolean AS $$
BEGIN
  RETURN (
    value IS NULL OR
    (value ~ '^\d+(\.\d+)?$' AND value::decimal BETWEEN 0 AND 14)
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction principale de validation des données de sondage
CREATE OR REPLACE FUNCTION validate_survey_data()
RETURNS trigger AS $$
DECLARE
  field_value text;
  measurement record;
BEGIN
  -- Validation du common_data
  IF NOT validate_coordinates(NEW.common_data->'coordinates') THEN
    RAISE EXCEPTION 'Invalid coordinates in common_data';
  END IF;

  IF NOT validate_date_format(NEW.common_data->>'date') THEN
    RAISE EXCEPTION 'Invalid date format in common_data';
  END IF;

  -- Validation spécifique selon le type de sondage
  CASE NEW.type
    WHEN 'soil' THEN
      -- Validation des informations générales
      IF NOT (
        NEW.specific_data ? 'name' AND
        NEW.specific_data ? 'generalInfo' AND
        NEW.specific_data ? 'drillingInfo' AND
        NEW.specific_data ? 'observations' AND
        NEW.specific_data ? 'sampleManagement'
      ) THEN
        RAISE EXCEPTION 'Missing required fields for soil survey';
      END IF;

      -- Validation des observations
      IF jsonb_typeof(NEW.specific_data->'observations') != 'array' THEN
        RAISE EXCEPTION 'Observations must be an array for soil survey';
      END IF;

      -- Validation des mesures PID dans les observations
      FOR measurement IN SELECT * FROM jsonb_array_elements(NEW.specific_data->'observations')
      LOOP
        IF NOT validate_pid_measurement(measurement.value->>'pid') THEN
          RAISE EXCEPTION 'Invalid PID measurement in soil survey observations';
        END IF;
      END LOOP;

    WHEN 'gas' THEN
      -- Validation de la structure
      IF NOT (
        NEW.specific_data ? 'name' AND
        NEW.specific_data ? 'structureDescription' AND
        NEW.specific_data ? 'sampling' AND
        NEW.specific_data ? 'purge' AND
        NEW.specific_data ? 'laboratory'
      ) THEN
        RAISE EXCEPTION 'Missing required fields for gas survey';
      END IF;

      -- Validation des mesures
      IF NOT validate_o2_measurement(NEW.specific_data->'purge'->'measurements'->>'o2') THEN
        RAISE EXCEPTION 'Invalid O2 measurement in gas survey';
      END IF;

    WHEN 'ambient_air' THEN
      -- Validation de la structure
      IF NOT (
        NEW.specific_data ? 'samplingName' AND
        NEW.specific_data ? 'location' AND
        NEW.specific_data ? 'weatherConditions' AND
        NEW.specific_data ? 'sampling' AND
        NEW.specific_data ? 'measurements' AND
        NEW.specific_data ? 'flow'
      ) THEN
        RAISE EXCEPTION 'Missing required fields for ambient air survey';
      END IF;

      -- Validation des mesures
      IF NOT validate_o2_measurement(NEW.specific_data->'measurements'->>'o2') THEN
        RAISE EXCEPTION 'Invalid O2 measurement in ambient air survey';
      END IF;

    WHEN 'surface_water' THEN
      -- Validation de la structure
      IF NOT (
        NEW.specific_data ? 'name' AND
        NEW.specific_data ? 'generalInfo' AND
        NEW.specific_data ? 'sampling' AND
        NEW.specific_data ? 'stationDescription' AND
        NEW.specific_data ? 'fieldObservations' AND
        NEW.specific_data ? 'parameters'
      ) THEN
        RAISE EXCEPTION 'Missing required fields for surface water survey';
      END IF;

      -- Validation du pH
      IF NOT validate_ph_measurement(NEW.specific_data->'parameters'->'ph'->'start'->>'value') THEN
        RAISE EXCEPTION 'Invalid pH measurement in surface water survey';
      END IF;

    WHEN 'pid' THEN
      -- Validation de la structure
      IF NOT (
        NEW.specific_data ? 'date' AND
        NEW.specific_data ? 'coordinates' AND
        NEW.specific_data ? 'structureDescription' AND
        NEW.specific_data ? 'weatherConditions' AND
        NEW.specific_data ? 'measurements'
      ) THEN
        RAISE EXCEPTION 'Missing required fields for PID survey';
      END IF;

      -- Validation des mesures
      IF jsonb_typeof(NEW.specific_data->'measurements') != 'array' THEN
        RAISE EXCEPTION 'Measurements must be an array for PID survey';
      END IF;

      -- Validation de chaque mesure PID
      FOR measurement IN SELECT * FROM jsonb_array_elements(NEW.specific_data->'measurements')
      LOOP
        IF NOT validate_pid_measurement(measurement.value->>'pid') THEN
          RAISE EXCEPTION 'Invalid PID measurement in PID survey';
        END IF;
      END LOOP;

    ELSE
      RAISE EXCEPTION 'Invalid survey type: %', NEW.type;
  END CASE;

  -- Mise à jour automatique de updated_at
  NEW.updated_at := CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Création du trigger de validation
DROP TRIGGER IF EXISTS validate_survey_data_trigger ON surveys;
CREATE TRIGGER validate_survey_data_trigger
  BEFORE INSERT OR UPDATE ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION validate_survey_data();

-- Ajout d'index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_surveys_type_specific_data ON surveys USING GIN (specific_data);
CREATE INDEX IF NOT EXISTS idx_surveys_common_data ON surveys USING GIN (common_data);

-- Ajout de commentaires explicatifs
COMMENT ON FUNCTION validate_survey_data() IS 'Valide la structure et le contenu des données de sondage selon leur type';
COMMENT ON FUNCTION validate_coordinates(jsonb) IS 'Valide le format et les valeurs des coordonnées géographiques';
COMMENT ON FUNCTION validate_date_format(text) IS 'Valide le format des dates (YYYY-MM-DD)';
COMMENT ON FUNCTION validate_time_format(text) IS 'Valide le format des heures (HH:mm)';
COMMENT ON FUNCTION validate_pid_measurement(text) IS 'Valide les mesures PID (0-10000 ppm)';
COMMENT ON FUNCTION validate_o2_measurement(text) IS 'Valide les mesures O2 (0-100%)';
COMMENT ON FUNCTION validate_ph_measurement(text) IS 'Valide les mesures pH (0-14)';