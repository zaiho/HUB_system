import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, Upload, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface FormData {
  samplingName: string;
  location: {
    room: string;
    position: string;
    coordinates: {
      latitude: string;
      longitude: string;
    }
  };
  date: string;
  time: string;
  weatherConditions: {
    description: string;
    externalTemp: string;
    internalTemp: string;
    pressure: string;
    humidity: string;
    windSpeedDirection: string;
  };
  sampling: {
    type: 'active-pump' | 'active-natural' | 'passive';
    supportCount: string;
    supportType: string;
    installationDescription: string;
    height: string;
    ventilation: boolean;
    recentWork: string;
    heating: string;
    interferingSources: string;
    interferingActivities: string;
  };
  measurements: {
    pid: string;
    o2: string;
    h2s: string;
    ch4: string;
    co: string;
  };
  flow: {
    startTime: string;
    endTime: string;
    duration: string;
    flowRates: {
      start: string;
      intermediate: string;
      end: string;
    };
    averageFlow: string;
    totalVolume: string;
  };
  laboratory: {
    name: string;
    packaging: string;
    transporter: string;
    deliveryDate: string;
    substancesToAnalyze: string;
  };
}

const SAMPLING_TYPES = [
  { value: 'active-pump', label: 'Actif avec pompe' },
  { value: 'active-natural', label: 'Actif naturel' },
  { value: 'passive', label: 'Passif' }
] as const;

export function AmbientAirSurveyForm() {
  const navigate = useNavigate();
  const { siteId } = useParams<{ siteId: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [geoError, setGeoError] = useState('');

  const [formData, setFormData] = useState<FormData>({
    samplingName: '',
    location: {
      room: '',
      position: '',
      coordinates: {
        latitude: '',
        longitude: ''
      }
    },
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    weatherConditions: {
      description: '',
      externalTemp: '',
      internalTemp: '',
      pressure: '',
      humidity: '',
      windSpeedDirection: ''
    },
    sampling: {
      type: 'active-pump',
      supportCount: '1',
      supportType: '',
      installationDescription: '',
      height: '',
      ventilation: false,
      recentWork: '',
      heating: '',
      interferingSources: '',
      interferingActivities: ''
    },
    measurements: {
      pid: '',
      o2: '',
      h2s: '',
      ch4: '',
      co: ''
    },
    flow: {
      startTime: '',
      endTime: '',
      duration: '',
      flowRates: {
        start: '',
        intermediate: '',
        end: ''
      },
      averageFlow: '',
      totalVolume: ''
    },
    laboratory: {
      name: '',
      packaging: '',
      transporter: '',
      deliveryDate: '',
      substancesToAnalyze: ''
    }
  });

  useEffect(() => {
    if (!siteId) {
      navigate('/');
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            location: {
              ...prev.location,
              coordinates: {
                latitude: position.coords.latitude.toString(),
                longitude: position.coords.longitude.toString()
              }
            }
          }));
          setGeoError('');
        },
        (error) => {
          let errorMessage = '';
          switch (error.code) {
            case 1:
              errorMessage = 'La localisation a été refusée';
              break;
            case 2:
              errorMessage = 'Position non disponible';
              break;
            case 3:
              errorMessage = 'Délai d\'attente dépassé';
              break;
            default:
              errorMessage = 'Erreur de localisation';
          }
          setGeoError(errorMessage);
        }
      );
    }
  }, [siteId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId) return;
    
    setLoading(true);
    setError('');

    try {
      const { data, error: surveyError } = await supabase
        .from('surveys')
        .insert([{
          site_id: siteId,
          type: 'ambient_air',
          common_data: {
            date: `${formData.date}T${formData.time}`,
            sampling_name: formData.samplingName,
            location: formData.location
          },
          specific_data: {
            weather_conditions: formData.weatherConditions,
            sampling: formData.sampling,
            measurements: formData.measurements,
            flow: formData.flow,
            laboratory: formData.laboratory
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
        <h1 className="text-2xl font-bold text-gray-900">Fiche prélèvement d'Air Ambiant</h1>
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

        {/* Informations générales */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Informations générales</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nom du prélèvement
              </label>
              <input
                type="text"
                value={formData.samplingName}
                onChange={(e) => setFormData(prev => ({ ...prev, samplingName: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Heure
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Localisation */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Localisation</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Pièce
              </label>
              <input
                type="text"
                value={formData.location.room}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  location: { ...prev.location, room: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Position dans la pièce
              </label>
              <input
                type="text"
                value={formData.location.position}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  location: { ...prev.location, position: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Coordonnées GPS
              </label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Latitude"
                  value={formData.location.coordinates.latitude}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    location: {
                      ...prev.location,
                      coordinates: { ...prev.location.coordinates, latitude: e.target.value }
                    }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                />
                <input
                  type="text"
                  placeholder="Longitude"
                  value={formData.location.coordinates.longitude}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    location: {
                      ...prev.location,
                      coordinates: { ...prev.location.coordinates, longitude: e.target.value }
                    }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Conditions météorologiques */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Conditions météorologiques</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <input
                type="text"
                placeholder="Ensoleillé, pluvieux..."
                value={formData.weatherConditions.description}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  weatherConditions: { ...prev.weatherConditions, description: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                T°C ext
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weatherConditions.externalTemp}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  weatherConditions: { ...prev.weatherConditions, externalTemp: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                T°C int
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weatherConditions.internalTemp}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  weatherConditions: { ...prev.weatherConditions, internalTemp: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Pression (Pa)
              </label>
              <input
                type="number"
                value={formData.weatherConditions.pressure}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  weatherConditions: { ...prev.weatherConditions, pressure: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Taux d'humidité dans l'air (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.weatherConditions.humidity}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  weatherConditions: { ...prev.weatherConditions, humidity: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Vitesse et sens du vent
              </label>
              <input
                type="text"
                value={formData.weatherConditions.windSpeedDirection}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  weatherConditions: { ...prev.weatherConditions, windSpeedDirection: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Description du prélèvement */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Description du prélèvement</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type d'échantillonnage
              </label>
              <select
                value={formData.sampling.type}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampling: { ...prev.sampling, type: e.target.value as 'active-pump' | 'active-natural' | 'passive' }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              >
                {SAMPLING_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nombre de support
              </label>
              <input
                type="number"
                min="1"
                value={formData.sampling.supportCount}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampling: { ...prev.sampling, supportCount: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nature des supports
              </label>
              <select
                value={formData.sampling.supportType}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampling: { ...prev.sampling, supportType: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              >
                <option value="">Sélectionner...</option>
                <option value="xad2">XAD-2</option>
                <option value="charbon-actif">Charbon actif</option>
                <option value="hopkalite">Hopkalite</option>
                <option value="fluorisil">Fluorisil</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description de l'installation
              </label>
              <textarea
                value={formData.sampling.installationDescription}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampling: { ...prev.sampling, installationDescription: e.target.value }
                }))}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Hauteur de l'ouvrage (m)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.sampling.height}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampling: { ...prev.sampling, height: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Présence d'aération / Ventilation
              </label>
              <div className="mt-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.sampling.ventilation}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      sampling: { ...prev.sampling, ventilation: e.target.checked }
                    }))}
                    className="form-checkbox h-4 w-4 text-[#34519e]"
                  />
                  <span className="ml-2">Oui</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Travaux récents
              </label>
              <textarea
                value={formData.sampling.recentWork}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampling: { ...prev.sampling, recentWork: e.target.value }
                }))}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Chauffage
              </label>
              <input
                type="text"
                value={formData.sampling.heating}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampling: { ...prev.sampling, heating: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Présence de sources d'interférences
              </label>
              <textarea
                value={formData.sampling.interferingSources}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampling: { ...prev.sampling, interferingSources: e.target.value }
                }))}
                placeholder="Stockage de produits, de matériel, produits de nettoyage..."
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Activités susceptibles d'interférer avec les prélèvements
              </label>
              <textarea
                value={formData.sampling.interferingActivities}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampling: { ...prev.sampling, interferingActivities: e.target.value }
                }))}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Mesures semi-quantitatives */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Mesures semi-quantitatives pour l'air intérieur avant prélèvement
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-5">
            <div>
              <label className="block text-sm font-medium text-gray-700">PID (ppmV)</label>
              <input
                type="number"
                value={formData.measurements.pid}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  measurements: { ...prev.measurements, pid: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">O2 (%)</label>
              <input
                type="number"
                value={formData.measurements.o2}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  measurements: { ...prev.measurements, o2: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">H2S (ppmV)</label>
              <input
                type="number"
                value={formData.measurements.h2s}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  measurements: { ...prev.measurements, h2s: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">CH4 (%)</label>
              <input
                type="number"
                value={formData.measurements.ch4}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  measurements: { ...prev.measurements, ch4: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">CO (ppmV)</label>
              <input
                type="number"
                value={formData.measurements.co}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  measurements: { ...prev.measurements, co: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Contrôle de débit */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Contrôle de débit</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Heure début
                </label>
                <input
                  type="time"
                  value={formData.flow.startTime}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    flow: { ...prev.flow, startTime: e.target.value }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Heure fin
                </label>
                <input
                  type="time"
                  value={formData.flow.endTime}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    flow: { ...prev.flow, endTime: e.target.value }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Durée prélèvement
                </label>
                <input
                  type="text"
                  value={formData.flow.duration}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    flow: { ...prev.flow, duration: e.target.value }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Débit T0 (début)
                </label>
                <input
                  type="text"
                  value={formData.flow.flowRates.start}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    flow: {
                      ...prev.flow,
                      flowRates: { ...prev.flow.flowRates, start: e.target.value }
                    }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                 />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Débit T1 (intermédiaire)
                </label>
                <input
                  type="text"
                  value={formData.flow.flowRates.intermediate}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    flow: {
                      ...prev.flow,
                      flowRates: { ...prev.flow.flowRates, intermediate: e.target.value }
                    }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Débit T2 (fin)
                </label>
                <input
                  type="text"
                  value={formData.flow.flowRates.end}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    flow: {
                      ...prev.flow,
                      flowRates: { ...prev.flow.flowRates, end: e.target.value }
                    }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Débit moyen retenu (l/min)
                </label>
                <input
                  type="text"
                  value={formData.flow.averageFlow}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    flow: { ...prev.flow, averageFlow: e.target.value }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Volume total prélevé (l)
                </label>
                <input
                  type="text"
                  value={formData.flow.totalVolume}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    flow: { ...prev.flow, totalVolume: e.target.value }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Conditionnement et transport */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Conditionnement et transport</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Laboratoire de destination
              </label>
              <input
                type="text"
                value={formData.laboratory.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  laboratory: { ...prev.laboratory, name: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type de conditionnement
              </label>
              <input
                type="text"
                value={formData.laboratory.packaging}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  laboratory: { ...prev.laboratory, packaging: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Transporteur
              </label>
              <input
                type="text"
                value={formData.laboratory.transporter}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  laboratory: { ...prev.laboratory, transporter: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date et heure de remise au transporteur
              </label>
              <input
                type="datetime-local"
                value={formData.laboratory.deliveryDate}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  laboratory: { ...prev.laboratory, deliveryDate: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Substances recherchées */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Substances recherchées</h2>
          <div>
            <textarea
              value={formData.laboratory.substancesToAnalyze}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                laboratory: { ...prev.laboratory, substancesToAnalyze: e.target.value }
              }))}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              placeholder="Liste des substances à analyser..."
            />
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