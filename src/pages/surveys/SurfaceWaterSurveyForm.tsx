import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Camera, Save, Upload, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ParameterMeasurement {
  start: string;
  intermediate: string;
  end: string;
}

interface FormData {
  name: string;
  generalInfo: {
    time: string;
    date: string;
    airTemperature: string;
    weatherCondition: 'sunny' | 'cloudy' | 'windy' | 'rainy';
  };
  location: {
    x: string;
    y: string;
    z: string;
  };
  photos: File[];
  sampling: {
    type: 'shore' | 'upstream' | 'downstream' | 'other';
    equipment: 'bucket' | 'sampling-rod' | 'pump';
    depth: string;
  };
  stationDescription: {
    description: string;
    waterType: 'river' | 'stream' | 'brook' | 'lake' | 'pond';
    estimatedFlow: 'stagnant' | 'low' | 'high';
    flowType: 'laminar' | 'intermediate' | 'turbulent';
    observations: string;
  };
  fieldObservations: {
    turbidity: 'low' | 'medium' | 'high';
    waterColor: string;
    hasLeavesMoss: boolean;
    hasFloating: boolean;
    waterOdor: string;
    hasShade: boolean;
  };
  parameters: {
    time: ParameterMeasurement;
    temperature: ParameterMeasurement;
    conductivity: ParameterMeasurement;
    ph: ParameterMeasurement;
    redox: ParameterMeasurement;
    remarks: ParameterMeasurement;
  };
  sampleManagement: {
    conditioning: string;
    laboratory: 'agrolab' | 'wessling';
    transporter: string;
    shippingDate: string;
  };
}

const WEATHER_CONDITIONS = [
  { value: 'sunny', label: 'Ensoleillé' },
  { value: 'cloudy', label: 'Nuageux' },
  { value: 'windy', label: 'Venteux' },
  { value: 'rainy', label: 'Pluvieux' }
] as const;

const SAMPLING_TYPES = [
  { value: 'shore', label: 'De la rive' },
  { value: 'upstream', label: 'En amont du site' },
  { value: 'downstream', label: 'En aval du site' },
  { value: 'other', label: 'Autre' }
] as const;

const SAMPLING_EQUIPMENT = [
  { value: 'bucket', label: 'Seau' },
  { value: 'sampling-rod', label: 'Canne de prélèvement' },
  { value: 'pump', label: 'Pompe' }
] as const;

const WATER_TYPES = [
  { value: 'river', label: 'Fleuve' },
  { value: 'stream', label: 'Rivière' },
  { value: 'brook', label: 'Ruisseau' },
  { value: 'lake', label: 'Lac' },
  { value: 'pond', label: 'Étang' }
] as const;

const FLOW_RATES = [
  { value: 'stagnant', label: 'Stagnant' },
  { value: 'low', label: 'Faible' },
  { value: 'high', label: 'Fort' }
] as const;

const FLOW_TYPES = [
  { value: 'laminar', label: 'Laminaire' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'turbulent', label: 'Turbulent' }
] as const;

const TURBIDITY_LEVELS = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Forte' }
] as const;

const LABORATORIES = [
  { value: 'agrolab', label: 'Agrolab' },
  { value: 'wessling', label: 'Wessling' }
] as const;

export function SurfaceWaterSurveyForm() {
  const navigate = useNavigate();
  const { siteId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    generalInfo: {
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split('T')[0],
      airTemperature: '',
      weatherCondition: 'sunny'
    },
    location: {
      x: '',
      y: '',
      z: ''
    },
    photos: [],
    sampling: {
      type: 'shore',
      equipment: 'bucket',
      depth: ''
    },
    stationDescription: {
      description: '',
      waterType: 'river',
      estimatedFlow: 'low',
      flowType: 'laminar',
      observations: ''
    },
    fieldObservations: {
      turbidity: 'low',
      waterColor: '',
      hasLeavesMoss: false,
      hasFloating: false,
      waterOdor: '',
      hasShade: false
    },
    parameters: {
      time: { start: '', intermediate: '', end: '' },
      temperature: { start: '', intermediate: '', end: '' },
      conductivity: { start: '', intermediate: '', end: '' },
      ph: { start: '', intermediate: '', end: '' },
      redox: { start: '', intermediate: '', end: '' },
      remarks: { start: '', intermediate: '', end: '' }
    },
    sampleManagement: {
      conditioning: '',
      laboratory: 'agrolab',
      transporter: '',
      shippingDate: new Date().toISOString().split('T')[0]
    }
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            location: {
              x: position.coords.longitude.toString(),
              y: position.coords.latitude.toString(),
              z: ''
            }
          }));
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  }, []);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newPhotos = Array.from(files);
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...newPhotos]
      }));
      
      // Create preview URLs
      const newUrls = newPhotos.map(photo => URL.createObjectURL(photo));
      setPhotoUrls(prev => [...prev, ...newUrls]);
    }
  };

  const handleDeletePhoto = (index: number) => {
    const newPhotos = [...formData.photos];
    const newUrls = [...photoUrls];
    
    URL.revokeObjectURL(newUrls[index]);
    
    newPhotos.splice(index, 1);
    newUrls.splice(index, 1);
    
    setFormData(prev => ({
      ...prev,
      photos: newPhotos
    }));
    setPhotoUrls(newUrls);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Upload photos first
      const uploadedPhotoUrls = [];
      for (const photo of formData.photos) {
        const fileName = `${siteId}/${Date.now()}-${photo.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from('survey-photos')
          .upload(fileName, photo);
          
        if (uploadError) throw uploadError;
        if (data) {
          uploadedPhotoUrls.push(data.path);
        }
      }

      // Create the survey record
      const { data, error: surveyError } = await supabase
        .from('surveys')
        .insert([{
          site_id: siteId,
          type: 'surface_water',
          common_data: {
            date: `${formData.generalInfo.date}T${formData.generalInfo.time}`,
            sampling_name: formData.name,
            coordinates: formData.location
          },
          specific_data: {
            general_info: formData.generalInfo,
            sampling: formData.sampling,
            station_description: formData.stationDescription,
            field_observations: formData.fieldObservations,
            parameters: formData.parameters,
            sample_management: formData.sampleManagement,
            photos: uploadedPhotoUrls
          },
          created_by: user?.id
        }])
        .select()
        .single();

      if (surveyError) throw surveyError;

      navigate(`/sites/${siteId}`);
    } catch (err) {
      console.error('Error saving survey:', err);
      setError('Une erreur est survenue lors de l\'enregistrement de la fiche');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex items-center mb-6">
        <Link
          to={`/sites/${siteId}`}
          className="mr-4 p-2 rounded-full text-gray-600 hover:text-[#34519e] hover:bg-[#34519e]/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e]"
          aria-label="Retour"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Fiche prélèvement Eaux Superficielles</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nom du prélèvement */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nom du prélèvement
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
            />
          </div>
        </div>

        {/* Informations générales */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Informations générales</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Heure
              </label>
              <input
                type="time"
                value={formData.generalInfo.time}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  generalInfo: { ...prev.generalInfo, time: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                value={formData.generalInfo.date}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  generalInfo: { ...prev.generalInfo, date: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Température de l'air (T° air)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.generalInfo.airTemperature}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  generalInfo: { ...prev.generalInfo, airTemperature: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Condition météo
              </label>
              <select
                value={formData.generalInfo.weatherCondition}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  generalInfo: {
                    ...prev.generalInfo,
                    weatherCondition: e.target.value as typeof formData.generalInfo.weatherCondition
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              >
                {WEATHER_CONDITIONS.map(condition => (
                  <option key={condition.value} value={condition.value}>
                    {condition.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Localisation du prélèvement */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Localisation du prélèvement</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">X</label>
              <input
                type="text"
                value={formData.location.x}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  location: { ...prev.location, x: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Y</label>
              <input
                type="text"
                value={formData.location.y}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  location: { ...prev.location, y: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Z (m)</label>
              <input
                type="text"
                value={formData.location.z}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  location: { ...prev.location, z: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Point de prélèvement */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Point de prélèvement</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <label className="relative cursor-pointer bg-[#34519e]/10 hover:bg-[#34519e]/20 rounded-md px-4 py-2">
                <Camera className="h-5 w-5 text-[#34519e] inline mr-2" />
                <span className="text-sm font-medium text-[#34519e]">Ajouter des photos</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </label>
            </div>
            
            {photoUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                {photoUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`Photo ${index + 1}`}
                      className="h-24 w-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(index)}
                      className="absolute top-1 right-1 bg-red-100 rounded-full p-1 hover:bg-red-200"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Condition de prélèvement - Échantillonnage */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Condition de prélèvement - Échantillonnage</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type de prélèvement
              </label>
              <select
                value={formData.sampling.type}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampling: {
                    ...prev.sampling,
                    type: e.target.value as typeof formData.sampling.type
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              >
                {SAMPLING_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Matériel de prélèvement
              </label>
              <select
                value={formData.sampling.equipment}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampling: {
                    ...prev.sampling,
                    equipment: e.target.value as typeof formData.sampling.equipment
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              >
                {SAMPLING_EQUIPMENT.map(equipment => (
                  <option key={equipment.value} value={equipment.value}>
                    {equipment.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Niveau ou profondeur de prélèvement (m)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.sampling.depth}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampling: { ...prev.sampling, depth: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Description de la station de prélèvement */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Description de la station de prélèvement</h2>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description du point d'échantillonnage
              </label>
              <textarea
                value={formData.stationDescription.description}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  stationDescription: {
                    ...prev.stationDescription,
                    description: e.target.value
                  }
                }))}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type d'eau superficielle
                </label>
                <select
                  value={formData.stationDescription.waterType}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    stationDescription: {
                      ...prev.stationDescription,
                      waterType: e.target.value as typeof formData.stationDescription.waterType
                    }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                >
                  {WATER_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Débit estimé
                </label>
                <select
                  value={formData.stationDescription.estimatedFlow}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    stationDescription: {
                      ...prev.stationDescription,
                      estimatedFlow: e.target.value as typeof formData.stationDescription.estimatedFlow
                    }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                >
                  {FLOW_RATES.map(rate => (
                    <option key={rate.value} value={rate.value}>
                      {rate.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type d'écoulement
                </label>
                <select
                  value={formData.stationDescription.flowType}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    stationDescription: {
                      ...prev.stationDescription,
                      flowType: e.target.value as typeof formData.stationDescription.flowType
                    }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                >
                  {FLOW_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Observations
                </label>
                <textarea
                  value={formData.stationDescription.observations}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    stationDescription: {
                      ...prev.stationDescription,
                      observations: e.target.value
                    }
                  }))}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Observation de terrain */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Observation de terrain</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Turbidité
              </label>
              <select
                value={formData.fieldObservations.turbidity}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  fieldObservations: {
                    ...prev.fieldObservations,
                    turbidity: e.target.value as typeof formData.fieldObservations.turbidity
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              >
                {TURBIDITY_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Couleur de l'eau
              </label>
              <input
                type="text"
                value={formData.fieldObservations.waterColor}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  fieldObservations: {
                    ...prev.fieldObservations,
                    waterColor: e.target.value
                  }
                }))}
                placeholder="Ex: Clair avec une légère teinte verdâtre"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Odeur de l'eau
              </label>
              <input
                type="text"
                value={formData.fieldObservations.waterOdor}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  fieldObservations: {
                    ...prev.fieldObservations,
                    waterOdor: e.target.value
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.fieldObservations.hasLeavesMoss}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    fieldObservations: {
                      ...prev.fieldObservations,
                      hasLeavesMoss: e.target.checked
                    }
                  }))}
                  className="h-4 w-4 text-[#34519e] focus:ring-[#34519e] border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Présence de feuilles, mousses
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.fieldObservations.hasFloating}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    fieldObservations: {
                      ...prev.fieldObservations,
                      hasFloating: e.target.checked
                    }
                  }))}
                  className="h-4 w-4 text-[#34519e] focus:ring-[#34519e] border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Présence de flottants
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.fieldObservations. hasShade}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    fieldObservations: {
                      ...prev.fieldObservations,
                      hasShade: e.target.checked
                    }
                  }))}
                  className="h-4 w-4 text-[#34519e] focus:ring-[#34519e] border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Ombrage
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Paramètres à contrôler */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Paramètres à contrôler</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paramètre
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Début
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Intermédiaire
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fin
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Heure
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="time"
                      value={formData.parameters.time.start}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          time: { ...prev.parameters.time, start: e.target.value }
                        }
                      }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="time"
                      value={formData.parameters.time.intermediate}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          time: { ...prev.parameters.time, intermediate: e.target.value }
                        }
                      }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="time"
                      value={formData.parameters.time.end}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          time: { ...prev.parameters.time, end: e.target.value }
                        }
                      }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    T°C (Température)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.parameters.temperature.start}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          temperature: { ...prev.parameters.temperature, start: e.target.value }
                        }
                      }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.parameters.temperature.intermediate}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          temperature: { ...prev.parameters.temperature, intermediate: e.target.value }
                        }
                      }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.parameters.temperature.end}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          temperature: { ...prev.parameters.temperature, end: e.target.value }
                        }
                      }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Conductivité
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.parameters.conductivity.start}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          conductivity: { ...prev.parameters.conductivity, start: e.target.value }
                        }
                      }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.parameters.conductivity.intermediate}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          conductivity: { ...prev.parameters.conductivity, intermediate: e.target.value }
                        }
                      }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.parameters.conductivity.end}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          conductivity: { ...prev.parameters.conductivity, end: e.target.value }
                        }
                      }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    pH
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.parameters.ph.start}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          ph: { ...prev.parameters.ph, start: e.target.value }
                        }
                      }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.parameters.ph.intermediate}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          ph: { ...prev.parameters.ph, intermediate: e.target.value }
                        }
                      }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.parameters.ph.end}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          ph: { ...prev.parameters.ph, end: e.target.value }
                        }
                      }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Redox (mV)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={formData.parameters.redox.start}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          redox: { ...prev.parameters.redox, start: e.target.value }
                        }
                      }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={formData.parameters.redox.intermediate}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          redox: { ...prev.parameters.redox, intermediate: e.target.value }
                        }
                      }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={formData.parameters.redox.end}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          redox: { ...prev.parameters.redox, end: e.target.value }
                        }
                      }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Remarque
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={formData.parameters.remarks.start}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          remarks: { ...prev.parameters.remarks, start: e.target.value }
                        }
                      }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={formData.parameters.remarks.intermediate}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          remarks: { ...prev.parameters.remarks, intermediate: e.target.value }
                        }
                      }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={formData.parameters.remarks.end}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          remarks: { ...prev.parameters.remarks, end: e.target.value }
                        }
                      }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Gestion des échantillons */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Gestion des échantillons</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Conditionnement/T°C
              </label>
              <input
                type="text"
                value={formData.sampleManagement.conditioning}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampleManagement: {
                    ...prev.sampleManagement,
                    conditioning: e.target.value
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nom du laboratoire
              </label>
              <select
                value={formData.sampleManagement.laboratory}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampleManagement: {
                    ...prev.sampleManagement,
                    laboratory: e.target.value as typeof formData.sampleManagement.laboratory
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              >
                {LABORATORIES.map(lab => (
                  <option key={lab.value} value={lab.value}>
                    {lab.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Transporteur
              </label>
              <input
                type="text"
                value={formData.sampleManagement.transporter}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampleManagement: {
                    ...prev.sampleManagement,
                    transporter: e.target.value
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date d'envoi au laboratoire
              </label>
              <input
                type="date"
                value={formData.sampleManagement.shippingDate}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampleManagement: {
                    ...prev.sampleManagement,
                    shippingDate: e.target.value
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#34519e] hover:bg-[#34519e]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}