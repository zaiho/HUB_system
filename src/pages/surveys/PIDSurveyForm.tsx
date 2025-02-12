import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, Upload, AlertCircle, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Measurement {
  location: string;
  pid: string;
  o2: string;
  h2s: string;
  ch4: string;
  co: string;
}

interface FormData {
  date: string;
  coordinates: {
    longitude: string;
    latitude: string;
    altitude: string;
  };
  structureDescription: {
    type: 'temporary' | 'permanent';
    details: string;
  };
  weatherConditions: {
    description: string;
    externalTemp: string;
    internalTemp: string;
    pressure: string;
    humidity: string;
    windSpeedDirection: string;
  };
  measurements: Measurement[];
}

export function PIDSurveyForm() {
  const navigate = useNavigate();
  const { siteId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [geoError, setGeoError] = useState('');

  const [formData, setFormData] = useState<FormData>({
    date: new Date().toISOString().split('T')[0],
    coordinates: {
      longitude: '',
      latitude: '',
      altitude: ''
    },
    structureDescription: {
      type: 'temporary',
      details: 'Micro-sondages'
    },
    weatherConditions: {
      description: '',
      externalTemp: '',
      internalTemp: '',
      pressure: '',
      humidity: '',
      windSpeedDirection: ''
    },
    measurements: [
      {
        location: '',
        pid: '',
        o2: '',
        h2s: '',
        ch4: '',
        co: ''
      }
    ]
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            coordinates: {
              longitude: position.coords.longitude.toString(),
              latitude: position.coords.latitude.toString(),
              altitude: position.coords.altitude?.toString() || ''
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
  }, []);

  const addMeasurement = () => {
    setFormData(prev => ({
      ...prev,
      measurements: [
        ...prev.measurements,
        {
          location: '',
          pid: '',
          o2: '',
          h2s: '',
          ch4: '',
          co: ''
        }
      ]
    }));
  };

  const updateMeasurement = (index: number, field: keyof Measurement, value: string) => {
    setFormData(prev => ({
      ...prev,
      measurements: prev.measurements.map((m, i) => 
        i === index ? { ...m, [field]: value } : m
      )
    }));
  };

  const deleteMeasurement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      measurements: prev.measurements.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: surveyError } = await supabase
        .from('surveys')
        .insert([{
          site_id: siteId,
          type: 'pid',
          common_data: {
            date: formData.date,
            coordinates: formData.coordinates
          },
          specific_data: {
            structure_description: formData.structureDescription,
            weather_conditions: formData.weatherConditions,
            measurements: formData.measurements
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
        <h1 className="text-2xl font-bold text-gray-900">Fiche de Campagne PID</h1>
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                id="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">
                Longitude
              </label>
              <input
                type="text"
                id="longitude"
                value={formData.coordinates.longitude}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  coordinates: { ...prev.coordinates, longitude: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">
                Latitude
              </label>
              <input
                type="text"
                id="latitude"
                value={formData.coordinates.latitude}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  coordinates: { ...prev.coordinates, latitude: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="altitude" className="block text-sm font-medium text-gray-700">
                Altitude
              </label>
              <input
                type="text"
                id="altitude"
                value={formData.coordinates.altitude}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  coordinates: { ...prev.coordinates, altitude: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Description de l'ouvrage */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Description de l'ouvrage</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Ouvrage temporaire ou permanent
              </label>
              <select
                value={formData.structureDescription.type}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  structureDescription: {
                    ...prev.structureDescription,
                    type: e.target.value as 'temporary' | 'permanent'
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              >
                <option value="temporary">Temporaires</option>
                <option value="permanent">Permanents</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type d'ouvrage
              </label>
              <input
                type="text"
                value={formData.structureDescription.details}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  structureDescription: {
                    ...prev.structureDescription,
                    details: e.target.value
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
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
                value={formData.weatherConditions.description}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  weatherConditions: {
                    ...prev.weatherConditions,
                    description: e.target.value
                  }
                }))}
                placeholder="Ensoleillé, pluvieux..."
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
                  weatherConditions: {
                    ...prev.weatherConditions,
                    externalTemp: e.target.value
                  }
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
                  weatherConditions: {
                    ...prev.weatherConditions,
                    internalTemp: e.target.value
                  }
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
                  weatherConditions: {
                    ...prev.weatherConditions,
                    pressure: e.target.value
                  }
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
                  weatherConditions: {
                    ...prev.weatherConditions,
                    humidity: e.target.value
                  }
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
                  weatherConditions: {
                    ...prev.weatherConditions,
                    windSpeedDirection: e.target.value
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Mesures semi-quantitatives */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Mesures semi-quantitatives des gaz du sol</h2>
            <button
              type="button"
              onClick={addMeasurement}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-[#34519e] bg-[#34519e]/10 hover:bg-[#34519e]/20"
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter une mesure
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ouvrage/Maille
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PID (ppmV)
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    O2 (%)
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    H2S (ppmV)
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CH4 (%)
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CO (ppmV)
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.measurements.map((measurement, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={measurement.location}
                        onChange={(e) => updateMeasurement(index, 'location', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={measurement.pid}
                        onChange={(e) => updateMeasurement(index, 'pid', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={measurement.o2}
                        onChange={(e) => updateMeasurement(index, 'o2', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={measurement.h2s}
                        onChange={(e) => updateMeasurement(index, 'h2s', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={measurement.ch4}
                        onChange={(e) => updateMeasurement(index, 'ch4', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={measurement.co}
                        onChange={(e) => updateMeasurement(index, 'co', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => deleteMeasurement(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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