/*
  # Définition des structures de données pour chaque type de formulaire
  
  Cette migration définit les structures JSON attendues pour chaque type de formulaire
  de sondage, avec des commentaires détaillés et des exemples.
*/

-- Commentaires détaillés pour chaque type de formulaire
COMMENT ON COLUMN surveys.specific_data IS '
Les structures spécifiques selon le type de sondage :

1. Sondage de Sol (type="soil")
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
}

2. Sondage de Gaz (type="gas")
{
  "name": "string",
  "structureDescription": {
    "type": "temporary" | "permanent",
    "details": "string"
  },
  "sampling": {
    "type": "active-pump" | "active-natural" | "passive",
    "supportCount": integer,
    "supportType": "string",
    "depth": float,
    "sealType": "string",
    "soilDescription": "string"
  },
  "purge": {
    "details": "string",
    "measurements": {
      "pid": float,
      "o2": float,
      "h2s": float,
      "ch4": float,
      "co": float
    },
    "flow": {
      "startTime": "HH:mm",
      "endTime": "HH:mm",
      "duration": "string",
      "flowRates": {
        "start": float,
        "intermediate": float,
        "end": float
      },
      "averageFlow": float,
      "totalVolume": float
    }
  },
  "laboratory": {
    "name": "string",
    "packaging": "string",
    "transporter": "string",
    "deliveryDate": "YYYY-MM-DD",
    "substancesToAnalyze": "string"
  }
}

3. Sondage Air Ambiant (type="ambient_air")
{
  "samplingName": "string",
  "location": {
    "room": "string",
    "position": "string",
    "coordinates": {
      "latitude": float,
      "longitude": float
    }
  },
  "weatherConditions": {
    "description": "string",
    "externalTemp": float,
    "internalTemp": float,
    "pressure": float,
    "humidity": float,
    "windSpeedDirection": "string"
  },
  "sampling": {
    "type": "active-pump" | "active-natural" | "passive",
    "supportCount": integer,
    "supportType": "string",
    "installationDescription": "string",
    "height": float,
    "ventilation": boolean,
    "recentWork": "string",
    "heating": "string",
    "interferingSources": "string",
    "interferingActivities": "string"
  },
  "measurements": {
    "pid": float,
    "o2": float,
    "h2s": float,
    "ch4": float,
    "co": float
  },
  "flow": {
    "startTime": "HH:mm",
    "endTime": "HH:mm",
    "duration": "string",
    "flowRates": {
      "start": float,
      "intermediate": float,
      "end": float
    },
    "averageFlow": float,
    "totalVolume": float
  },
  "laboratory": {
    "name": "string",
    "packaging": "string",
    "transporter": "string",
    "deliveryDate": "YYYY-MM-DD",
    "substancesToAnalyze": "string"
  }
}

4. Sondage Eau de Surface (type="surface_water")
{
  "name": "string",
  "generalInfo": {
    "time": "HH:mm",
    "date": "YYYY-MM-DD",
    "airTemperature": float,
    "weatherCondition": "sunny" | "cloudy" | "windy" | "rainy"
  },
  "sampling": {
    "type": "shore" | "upstream" | "downstream" | "other",
    "equipment": "bucket" | "sampling-rod" | "pump",
    "depth": float
  },
  "stationDescription": {
    "description": "string",
    "waterType": "river" | "stream" | "brook" | "lake" | "pond",
    "estimatedFlow": "stagnant" | "low" | "high",
    "flowType": "laminar" | "intermediate" | "turbulent",
    "observations": "string"
  },
  "fieldObservations": {
    "turbidity": "low" | "medium" | "high",
    "waterColor": "string",
    "hasLeavesMoss": boolean,
    "hasFloating": boolean,
    "waterOdor": "string",
    "hasShade": boolean
  },
  "parameters": {
    "time": {
      "start": "HH:mm",
      "intermediate": "HH:mm",
      "end": "HH:mm"
    },
    "temperature": {
      "start": float,
      "intermediate": float,
      "end": float
    },
    "conductivity": {
      "start": float,
      "intermediate": float,
      "end": float
    },
    "ph": {
      "start": float,
      "intermediate": float,
      "end": float
    },
    "redox": {
      "start": float,
      "intermediate": float,
      "end": float
    },
    "remarks": {
      "start": "string",
      "intermediate": "string",
      "end": "string"
    }
  },
  "sampleManagement": {
    "conditioning": "string",
    "laboratory": "agrolab" | "wessling",
    "transporter": "string",
    "shippingDate": "YYYY-MM-DD"
  }
}

5. Sondage PID (type="pid")
{
  "date": "YYYY-MM-DD",
  "coordinates": {
    "longitude": float,
    "latitude": float,
    "altitude": float
  },
  "structureDescription": {
    "type": "temporary" | "permanent",
    "details": "string"
  },
  "weatherConditions": {
    "description": "string",
    "externalTemp": float,
    "internalTemp": float,
    "pressure": float,
    "humidity": float,
    "windSpeedDirection": "string"
  },
  "measurements": [{
    "location": "string",
    "pid": float,
    "o2": float,
    "h2s": float,
    "ch4": float,
    "co": float
  }]
}';

-- Ajout d'une fonction de validation des valeurs numériques
CREATE OR REPLACE FUNCTION validate_numeric_range(
  value float,
  min_value float,
  max_value float,
  field_name text
) RETURNS boolean AS $$
BEGIN
  IF value IS NOT NULL AND (value < min_value OR value > max_value) THEN
    RAISE EXCEPTION 'Value for % must be between % and %', field_name, min_value, max_value;
  END IF;
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Mise à jour de la fonction de validation des données
CREATE OR REPLACE FUNCTION validate_survey_measurements()
RETURNS trigger AS $$
BEGIN
  -- Validation des mesures selon le type
  CASE NEW.type
    WHEN 'soil', 'gas', 'pid' THEN
      -- Validation PID (0-10000 ppm)
      PERFORM validate_numeric_range(
        (NEW.specific_data->'measurements'->>'pid')::float,
        0, 10000, 'PID'
      );
      
    WHEN 'ambient_air', 'gas' THEN
      -- Validation O2 (0-100%)
      PERFORM validate_numeric_range(
        (NEW.specific_data->'measurements'->>'o2')::float,
        0, 100, 'O2'
      );
      
    WHEN 'surface_water' THEN
      -- Validation pH (0-14)
      PERFORM validate_numeric_range(
        (NEW.specific_data->'parameters'->'ph'->>'start')::float,
        0, 14, 'pH'
      );
      
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Création du trigger pour la validation des mesures
DROP TRIGGER IF EXISTS validate_survey_measurements_trigger ON surveys;
CREATE TRIGGER validate_survey_measurements_trigger
  BEFORE INSERT OR UPDATE ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION validate_survey_measurements();

-- Ajout d'index pour optimiser les requêtes courantes
CREATE INDEX IF NOT EXISTS idx_surveys_type_date ON surveys((specific_data->>'date'));
CREATE INDEX IF NOT EXISTS idx_surveys_measurements ON surveys USING GIN ((specific_data->'measurements'));

-- Ajout de commentaires sur les contraintes de validation
COMMENT ON FUNCTION validate_survey_measurements() IS 'Valide les plages de valeurs des mesures selon le type de sondage';
COMMENT ON FUNCTION validate_numeric_range(float, float, float, text) IS 'Vérifie qu''une valeur numérique est dans une plage acceptable';