/*
  # Correction de la validation des données de sondage
  
  Cette migration :
  1. Corrige la validation des mesures PID
  2. Améliore la gestion des tableaux JSON
  3. Maintient toutes les validations existantes
*/

-- Fonction pour valider les données communes
CREATE OR REPLACE FUNCTION validate_common_data(data jsonb)
RETURNS boolean AS $$
BEGIN
  RETURN (
    data ? 'date' AND
    data ? 'coordinates' AND
    data ? 'sampling_name' AND
    (data->'coordinates' ? 'latitude') AND
    (data->'coordinates' ? 'longitude') AND
    (data->'coordinates'->>'latitude')::decimal BETWEEN -90 AND 90 AND
    (data->'coordinates'->>'longitude')::decimal BETWEEN -180 AND 180
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour valider les données de sondage sol
CREATE OR REPLACE FUNCTION validate_soil_survey(data jsonb)
RETURNS boolean AS $$
DECLARE
  obs jsonb;
BEGIN
  -- Validation de la structure générale
  IF NOT (
    data ? 'name' AND
    data ? 'coordinates' AND
    data ? 'generalInfo' AND
    data ? 'drillingInfo' AND
    data ? 'observations' AND
    data ? 'sampleManagement'
  ) THEN
    RETURN false;
  END IF;

  -- Validation des informations générales
  IF NOT (
    data->'generalInfo' ? 'date' AND
    data->'generalInfo' ? 'time' AND
    data->'generalInfo' ? 'weather' AND
    data->'generalInfo' ? 'temperature'
  ) THEN
    RETURN false;
  END IF;

  -- Validation des informations de forage
  IF NOT (
    data->'drillingInfo' ? 'tool' AND
    data->'drillingInfo' ? 'diameter' AND
    data->'drillingInfo' ? 'depth' AND
    data->'drillingInfo' ? 'refection' AND
    data->'drillingInfo' ? 'cuttingsManagement'
  ) THEN
    RETURN false;
  END IF;

  -- Validation des observations
  IF NOT (
    jsonb_typeof(data->'observations') = 'array' AND
    jsonb_array_length(data->'observations') > 0
  ) THEN
    RETURN false;
  END IF;

  -- Validation de chaque observation
  FOR obs IN SELECT * FROM jsonb_array_elements(data->'observations')
  LOOP
    IF NOT (
      obs ? 'depth' AND
      obs ? 'lithology' AND
      obs ? 'water' AND
      obs ? 'organoleptic' AND
      obs ? 'pid' AND
      obs ? 'samples'
    ) THEN
      RETURN false;
    END IF;
  END LOOP;

  -- Validation de la gestion des échantillons
  RETURN (
    data->'sampleManagement' ? 'conditioning' AND
    data->'sampleManagement' ? 'transporter' AND
    data->'sampleManagement' ? 'laboratory' AND
    data->'sampleManagement' ? 'shippingDate'
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour valider les données de sondage gaz
CREATE OR REPLACE FUNCTION validate_gas_survey(data jsonb)
RETURNS boolean AS $$
BEGIN
  -- Validation de la structure générale
  IF NOT (
    data ? 'name' AND
    data ? 'structureDescription' AND
    data ? 'sampling' AND
    data ? 'purge' AND
    data ? 'laboratory'
  ) THEN
    RETURN false;
  END IF;

  -- Validation de la description de la structure
  IF NOT (
    data->'structureDescription' ? 'type' AND
    data->'structureDescription' ? 'details'
  ) THEN
    RETURN false;
  END IF;

  -- Validation de l'échantillonnage
  IF NOT (
    data->'sampling' ? 'type' AND
    data->'sampling' ? 'supportCount' AND
    data->'sampling' ? 'supportType' AND
    data->'sampling' ? 'depth' AND
    data->'sampling' ? 'sealType'
  ) THEN
    RETURN false;
  END IF;

  -- Validation de la purge
  IF NOT (
    data->'purge' ? 'details' AND
    data->'purge' ? 'measurements' AND
    data->'purge' ? 'flow'
  ) THEN
    RETURN false;
  END IF;

  -- Validation des mesures
  IF NOT (
    data->'purge'->'measurements' ? 'pid' AND
    data->'purge'->'measurements' ? 'o2' AND
    data->'purge'->'measurements' ? 'h2s' AND
    data->'purge'->'measurements' ? 'ch4' AND
    data->'purge'->'measurements' ? 'co'
  ) THEN
    RETURN false;
  END IF;

  -- Validation du flux
  RETURN (
    data->'purge'->'flow' ? 'startTime' AND
    data->'purge'->'flow' ? 'endTime' AND
    data->'purge'->'flow' ? 'duration' AND
    data->'purge'->'flow' ? 'flowRates' AND
    data->'purge'->'flow' ? 'averageFlow' AND
    data->'purge'->'flow' ? 'totalVolume'
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour valider les données de sondage air ambiant
CREATE OR REPLACE FUNCTION validate_ambient_air_survey(data jsonb)
RETURNS boolean AS $$
BEGIN
  -- Validation de la structure générale
  IF NOT (
    data ? 'samplingName' AND
    data ? 'location' AND
    data ? 'weatherConditions' AND
    data ? 'sampling' AND
    data ? 'measurements' AND
    data ? 'flow' AND
    data ? 'laboratory'
  ) THEN
    RETURN false;
  END IF;

  -- Validation de la localisation
  IF NOT (
    data->'location' ? 'room' AND
    data->'location' ? 'position' AND
    data->'location' ? 'coordinates'
  ) THEN
    RETURN false;
  END IF;

  -- Validation des conditions météo
  IF NOT (
    data->'weatherConditions' ? 'description' AND
    data->'weatherConditions' ? 'externalTemp' AND
    data->'weatherConditions' ? 'internalTemp' AND
    data->'weatherConditions' ? 'pressure' AND
    data->'weatherConditions' ? 'humidity' AND
    data->'weatherConditions' ? 'windSpeedDirection'
  ) THEN
    RETURN false;
  END IF;

  -- Validation de l'échantillonnage
  IF NOT (
    data->'sampling' ? 'type' AND
    data->'sampling' ? 'supportCount' AND
    data->'sampling' ? 'supportType' AND
    data->'sampling' ? 'installationDescription' AND
    data->'sampling' ? 'height' AND
    data->'sampling' ? 'ventilation'
  ) THEN
    RETURN false;
  END IF;

  -- Validation des mesures
  RETURN (
    data->'measurements' ? 'pid' AND
    data->'measurements' ? 'o2' AND
    data->'measurements' ? 'h2s' AND
    data->'measurements' ? 'ch4' AND
    data->'measurements' ? 'co'
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour valider les données de sondage eau de surface
CREATE OR REPLACE FUNCTION validate_surface_water_survey(data jsonb)
RETURNS boolean AS $$
BEGIN
  -- Validation de la structure générale
  IF NOT (
    data ? 'name' AND
    data ? 'generalInfo' AND
    data ? 'sampling' AND
    data ? 'stationDescription' AND
    data ? 'fieldObservations' AND
    data ? 'parameters' AND
    data ? 'sampleManagement'
  ) THEN
    RETURN false;
  END IF;

  -- Validation des informations générales
  IF NOT (
    data->'generalInfo' ? 'time' AND
    data->'generalInfo' ? 'date' AND
    data->'generalInfo' ? 'airTemperature' AND
    data->'generalInfo' ? 'weatherCondition'
  ) THEN
    RETURN false;
  END IF;

  -- Validation de l'échantillonnage
  IF NOT (
    data->'sampling' ? 'type' AND
    data->'sampling' ? 'equipment' AND
    data->'sampling' ? 'depth'
  ) THEN
    RETURN false;
  END IF;

  -- Validation de la description de la station
  IF NOT (
    data->'stationDescription' ? 'description' AND
    data->'stationDescription' ? 'waterType' AND
    data->'stationDescription' ? 'estimatedFlow' AND
    data->'stationDescription' ? 'flowType'
  ) THEN
    RETURN false;
  END IF;

  -- Validation des observations de terrain
  IF NOT (
    data->'fieldObservations' ? 'turbidity' AND
    data->'fieldObservations' ? 'waterColor' AND
    data->'fieldObservations' ? 'hasLeavesMoss' AND
    data->'fieldObservations' ? 'hasFloating' AND
    data->'fieldObservations' ? 'waterOdor' AND
    data->'fieldObservations' ? 'hasShade'
  ) THEN
    RETURN false;
  END IF;

  -- Validation des paramètres
  RETURN (
    data->'parameters' ? 'time' AND
    data->'parameters' ? 'temperature' AND
    data->'parameters' ? 'conductivity' AND
    data->'parameters' ? 'ph' AND
    data->'parameters' ? 'redox' AND
    data->'parameters' ? 'remarks'
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour valider les données de sondage PID
CREATE OR REPLACE FUNCTION validate_pid_survey(data jsonb)
RETURNS boolean AS $$
DECLARE
  measurement_valid boolean := true;
  measurements jsonb;
BEGIN
  -- Validation de la structure générale
  IF NOT (
    data ? 'date' AND
    data ? 'coordinates' AND
    data ? 'structureDescription' AND
    data ? 'weatherConditions' AND
    data ? 'measurements'
  ) THEN
    RETURN false;
  END IF;

  -- Validation des conditions météo
  IF NOT (
    data->'weatherConditions' ? 'description' AND
    data->'weatherConditions' ? 'externalTemp' AND
    data->'weatherConditions' ? 'internalTemp' AND
    data->'weatherConditions' ? 'pressure' AND
    data->'weatherConditions' ? 'humidity' AND
    data->'weatherConditions' ? 'windSpeedDirection'
  ) THEN
    RETURN false;
  END IF;

  -- Validation des mesures
  IF jsonb_typeof(data->'measurements') != 'array' THEN
    RETURN false;
  END IF;

  -- Validation de chaque mesure
  measurements := data->'measurements';
  IF jsonb_array_length(measurements) > 0 THEN
    FOR i IN 0..jsonb_array_length(measurements)-1 LOOP
      IF NOT (
        measurements->i ? 'location' AND
        measurements->i ? 'pid' AND
        measurements->i ? 'o2' AND
        measurements->i ? 'h2s' AND
        measurements->i ? 'ch4' AND
        measurements->i ? 'co'
      ) THEN
        measurement_valid := false;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  RETURN measurement_valid;
END;
$$ LANGUAGE plpgsql;

-- Fonction principale de validation
CREATE OR REPLACE FUNCTION validate_survey_data()
RETURNS trigger AS $$
BEGIN
  -- Validation des données communes
  IF NOT validate_common_data(NEW.common_data) THEN
    RAISE EXCEPTION 'Invalid common_data structure';
  END IF;

  -- Validation spécifique selon le type
  CASE NEW.type
    WHEN 'soil' THEN
      IF NOT validate_soil_survey(NEW.specific_data) THEN
        RAISE EXCEPTION 'Invalid soil survey data structure';
      END IF;

    WHEN 'gas' THEN
      IF NOT validate_gas_survey(NEW.specific_data) THEN
        RAISE EXCEPTION 'Invalid gas survey data structure';
      END IF;

    WHEN 'ambient_air' THEN
      IF NOT validate_ambient_air_survey(NEW.specific_data) THEN
        RAISE EXCEPTION 'Invalid ambient air survey data structure';
      END IF;

    WHEN 'surface_water' THEN
      IF NOT validate_surface_water_survey(NEW.specific_data) THEN
        RAISE EXCEPTION 'Invalid surface water survey data structure';
      END IF;

    WHEN 'pid' THEN
      IF NOT validate_pid_survey(NEW.specific_data) THEN
        RAISE EXCEPTION 'Invalid PID survey data structure';
      END IF;

    ELSE
      RAISE EXCEPTION 'Invalid survey type: %', NEW.type;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Création du trigger
DROP TRIGGER IF EXISTS validate_survey_data_trigger ON surveys;
CREATE TRIGGER validate_survey_data_trigger
  BEFORE INSERT OR UPDATE ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION validate_survey_data();

-- Ajout d'index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_surveys_type_date ON surveys((specific_data->>'date'));
CREATE INDEX IF NOT EXISTS idx_surveys_measurements ON surveys USING GIN ((specific_data->'measurements'));

-- Commentaires explicatifs
COMMENT ON FUNCTION validate_survey_data() IS 'Fonction principale de validation des données de sondage';
COMMENT ON FUNCTION validate_common_data(jsonb) IS 'Valide la structure des données communes à tous les sondages';
COMMENT ON FUNCTION validate_soil_survey(jsonb) IS 'Valide la structure des données spécifiques aux sondages de sol';
COMMENT ON FUNCTION validate_gas_survey(jsonb) IS 'Valide la structure des données spécifiques aux sondages de gaz';
COMMENT ON FUNCTION validate_ambient_air_survey(jsonb) IS 'Valide la structure des données spécifiques aux sondages d''air ambiant';
COMMENT ON FUNCTION validate_surface_water_survey(jsonb) IS 'Valide la structure des données spécifiques aux sondages d''eau de surface';
COMMENT ON FUNCTION validate_pid_survey(jsonb) IS 'Valide la structure des données spécifiques aux sondages PID';