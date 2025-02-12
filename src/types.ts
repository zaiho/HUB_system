export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
}

export interface Site {
  id: string;
  name: string;
  location: string;
  visit_date: string;
  description: string;
  project_number: string;
  created_at: string;
  user_id: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface CommonSurveyData {
  site_id: string;
  date: string;
  weather_conditions: string;
  field_team: string[];
  equipment_used: string[];
}

export type SurveyType = 'soil' | 'groundwater' | 'gas' | 'ambient_air';

interface BaseSurveyData {
  gps_coordinates: {
    latitude: number;
    longitude: number;
  };
  photos: string[];
  notes: string;
}

export interface SoilSurveyData extends BaseSurveyData {
  stratigraphy: Array<{
    depth_from: number;
    depth_to: number;
    description: string;
    pid_value: number;
    soil_type: string;
    color: string;
    moisture: string;
    observations: string;
  }>;
  samples: Array<{
    name: string;
    depth: number;
    laboratory_ref: string;
    analyses_requested: string[];
  }>;
  water_level?: number;
}

export interface GroundwaterSurveyData extends BaseSurveyData {
  well_depth: number;
  water_level: number;
  samples: Array<{
    name: string;
    depth: number;
    laboratory_ref: string;
    analyses_requested: string[];
  }>;
  purge_data: {
    volume_purged: number;
    ph: number;
    conductivity: number;
    temperature: number;
    dissolved_oxygen: number;
  };
}

export interface GasSurveyData extends BaseSurveyData {
  depth: number;
  flow_rate: number;
  pressure: number;
  temperature: number;
  humidity: number;
  measurements: Array<{
    parameter: string;
    value: number;
    unit: string;
    time: string;
  }>;
}

export interface AmbientAirSurveyData extends BaseSurveyData {
  height: number;
  wind_speed: number;
  wind_direction: string;
  measurements: Array<{
    parameter: string;
    value: number;
    unit: string;
    time: string;
  }>;
}

export interface Survey {
  id: string;
  site_id: string;
  type: SurveyType;
  common_data: CommonSurveyData;
  specific_data: SoilSurveyData | GroundwaterSurveyData | GasSurveyData | AmbientAirSurveyData;
  created_at: string;
  updated_at: string;
  created_by: string;
}