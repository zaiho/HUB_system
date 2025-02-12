import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, Upload, AlertCircle, ArrowLeft, Camera, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface FormData {
  name: string;
  location: {
    x: string;
    y: string;
    z: string;
  };
  generalInfo: {
    date: string;
    time: string;
    airTemp: string;
    weather: 'sunny' | 'cloudy' | 'windy' | 'rainy';
    wellType: string;
    usage: string;
    hasProtectiveCover: boolean;
    hasCurb: boolean;
    hasTubing: boolean;
    hasSealing: boolean;
  };
  pidMeasurement: string;
  wellCharacteristics: {
    innerDiameter: string;
    outerDiameter: string;
    coverHeight: string;
    totalDepth: string;
    screenHeight: string;
    waterLevel: string;
    waterColumnHeight: string;
    totalWaterVolume: string;
    threeVolumes: string;
    purgingRate: string;
    pumpingTime: string;
  };
  purge: {
    equipment: string;
    materials: string;
    type: 'static' | 'dynamic';
    startRate: string;
    endRate: string;
    pumpPosition: string;
    drawdown: string;
    treatment: {
      activatedCarbon: boolean;
      other: string;
    };
    purgeVolume: string;
  };
  sampling: {
    equipment: string;
    startDate: string;
    duration: string;
    purgeLevel: string;
    pumpingRate: string;
    pumpPosition: string;
    equipmentCleaned: boolean;
  };
  parameters: {
    time: {
      start: string;
      intermediate: string;
      end: string;
    };
    waterLevel: {
      start: string;
      intermediate: string;
      end: string;
    };
    turbidity: {
      start: string;
      intermediate: string;
      end: string;
    };
    conductivity: {
      start: string;
      intermediate: string;
      end: string;
    };
    ph: {
      start: string;
      intermediate: string;
      end: string;
    };
    dissolvedOxygen: {
      start: string;
      intermediate: string;
      end: string;
    };
    temperature: {
      start: string;
      intermediate: string;
      end: string;
    };
    remarks: {
      start: string;
      intermediate: string;
      end: string;
    };
    pid: {
      start: string;
      intermediate: string;
      end: string;
    };
  };
  sampleManagement: {
    conditioning: string;
    laboratory: 'wessling' | 'agrolab';
    shippingDate: string;
    transporter: string;
  };
}

const WEATHER_CONDITIONS = [
  { value: 'sunny', label: 'Ensoleillé' },
  { value: 'cloudy', label: 'Nuageux' },
  { value: 'windy', label: 'Venteux' },
  { value: 'rainy', label: 'Pluvieux' }
] as const;

export function GroundwaterSurveyForm() {
  const navigate = useNavigate();
  const { siteId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    location: {
      x: '',
      y: '',
      z: ''
    },
    generalInfo: {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      airTemp: '',
      weather: 'sunny',
      wellType: '',
      usage: '',
      hasProtectiveCover: false,
      hasCurb: false,
      hasTubing: false,
      hasSealing: false
    },
    pidMeasurement: '',
    wellCharacteristics: {
      innerDiameter: '',
      outerDiameter: '',
      coverHeight: '',
      totalDepth: '',
      screenHeight: '',
      waterLevel: '',
      waterColumnHeight: '',
      totalWaterVolume: '',
      threeVolumes: '',
      purgingRate: '',
      pumpingTime: ''
    },
    purge: {
      equipment: '',
      materials: '',
      type: 'static',
      startRate: '',
      endRate: '',
      pumpPosition: '',
      drawdown: '',
      treatment: {
        activatedCarbon: false,
        other: ''
      },
      purgeVolume: ''
    },
    sampling: {
      equipment: '',
      startDate: '',
      duration: '',
      purgeLevel: '',
      pumpingRate: '',
      pumpPosition: '',
      equipmentCleaned: false
    },
    parameters: {
      time: { start: '', intermediate: '', end: '' },
      waterLevel: { start: '', intermediate: '', end: '' },
      turbidity: { start: '', intermediate: '', end: '' },
      conductivity: { start: '', intermediate: '', end: '' },
      ph: { start: '', intermediate: '', end: '' },
      dissolvedOxygen: { start: '', intermediate: '', end: '' },
      temperature: { start: '', intermediate: '', end: '' },
      remarks: { start: '', intermediate: '', end: '' },
      pid: { start: '', intermediate: '', end: '' }
    },
    sampleManagement: {
      conditioning: '',
      laboratory: 'wessling',
      shippingDate: new Date().toISOString().split('T')[0],
      transporter: ''
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
              z: prev.location.z
            }
          }));
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  }, []);

  // Calculate derived values when water level or total depth changes
  useEffect(() => {
    const { waterLevel, totalDepth, innerDiameter } = formData.wellCharacteristics;
    
    if (waterLevel && totalDepth) {
      const waterColumnHeight = (parseFloat(totalDepth) - parseFloat(waterLevel)).toString();
      setFormData(prev => ({
        ...prev,
        wellCharacteristics: {
          ...prev.wellCharacteristics,
          waterColumnHeight
        }
      }));

      if (innerDiameter && waterColumnHeight) {
        const radius = parseFloat(innerDiameter) / 2000; // Convert mm to m
        const height = parseFloat(waterColumnHeight);
        const volume = Math.PI * radius * radius * height * 1000; // Convert to liters
        const totalWaterVolume = volume.toFixed(2);
        const threeVolumes = (volume * 3).toFixed(2);

        setFormData(prev => ({
          ...prev,
          wellCharacteristics: {
            ...prev.wellCharacteristics,
            totalWaterVolume,
            threeVolumes
          }
        }));
      }
    }
  }, [formData.wellCharacteristics.waterLevel, formData.wellCharacteristics.totalDepth, formData.wellCharacteristics.innerDiameter]);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newPhotos = Array.from(files);
      setPhotos(prev => [...prev, ...newPhotos]);
      
      const newUrls = newPhotos.map(photo => URL.createObjectURL(photo));
      setPhotoUrls(prev => [...prev, ...newUrls]);
    }
  };

  const handleDeletePhoto = (index: number) => {
    URL.revokeObjectURL(photoUrls[index]);
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Upload photos first
      const uploadedPhotoUrls = [];
      for (const photo of photos) {
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
          type: 'groundwater',
          common_data: {
            date: `${formData.generalInfo.date}T${formData.generalInfo.time}`,
            coordinates: formData.location,
            sampling_name: formData.name
          },
          specific_data: {
            ...formData,
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
        <h1 className="text-2xl font-bold text-gray-900">Fiche de Prélèvement Eaux Souterraines</h1>
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

        {/* Nom de l'ouvrage */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nom de l'ouvrage
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="PZ-001"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
            />
          </div>
        </div>

        {/* Localisation du piézomètre */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Localisation du piézomètre</h2>
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
              <label className="block text-sm font-medium text-gray-700">Z</label>
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

        {/* Photo de l'ouvrage */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Photo de l'ouvrage</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <label className="relative cursor-pointer bg-[#34519e]/10 hover:bg-[#34519e]/20 rounded-md px-4 py-2">
                <Camera className="h-5 w-5 text-[#34519e] inline mr-2" />
                <span className="text-sm font-medium text-[#34519e]">Ajouter des photos</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
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

        {/* Informations générales */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Informations générales</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
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
              <label className="block text-sm font-medium text-gray-700">Heure</label>
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
              <label className="block text-sm font-medium text-gray-700">T° air</label>
              <input
                type="number"
                step="0.1"
                value={formData.generalInfo.airTemp}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  generalInfo: { ...prev.generalInfo, airTemp: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Condition météo</label>
              <select
                value={formData.generalInfo.weather}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  generalInfo: {
                    ...prev.generalInfo,
                    weather: e.target.value as typeof formData.generalInfo.weather
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
            <div>
              <label className="block text-sm font-medium text-gray-700">Type d'ouvrage</label>
              <input
                type="text"
                value={formData.generalInfo.wellType}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  generalInfo: { ...prev.generalInfo, wellType: e.target.value }
                }))}
                placeholder="Piézomètre permanent"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Usage</label>
              <input
                type="text"
                value={formData.generalInfo.usage}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  generalInfo: { ...prev.generalInfo, usage: e.target.value }
                }))}
                placeholder="Surveillance de nappe"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.generalInfo.hasProtectiveCover}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      generalInfo: {
                        ...prev.generalInfo,
                        hasProtectiveCover: e.target.checked
                      }
                    }))}
                    className="h-4 w-4 text-[#34519e] focus:ring-[#34519e] border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    Capot protection
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.generalInfo.hasCurb}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      generalInfo: {
                        ...prev.generalInfo,
                        hasCurb: e.target.checked
                      }
                    }))}
                    className="h-4 w-4 text-[#34519e] focus:ring-[#34519e] border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    Margelle
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.generalInfo.hasTubing}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      generalInfo: {
                        ...prev.generalInfo,
                        hasTubing: e.target.checked
                      }
                    }))}
                    className="h-4 w-4 text-[#34519e] focus:ring-[#34519e] border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    Tubage
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.generalInfo.hasSealing}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      generalInfo: {
                        ...prev.generalInfo,
                        hasSealing: e.target.checked
                      }
                    }))}
                    className="h-4 w-4 text-[#34519e] focus:ring-[#34519e] border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    Colmatage
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Détection de composés */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Détection de composés</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              PID à l'ouverture (ppm)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.pidMeasurement}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                pidMeasurement: e.target.value
              }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Flottant (épaisseur en cm)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.pidMeasurement}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                pidMeasurement: e.target.value
              }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
            />
          </div>
        </div>

        {/* Caractéristiques de l'ouvrage */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Caractéristiques de l'ouvrage</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Diamètre intérieur (cm)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.wellCharacteristics.innerDiameter}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  wellCharacteristics: {
                    ...prev.wellCharacteristics,
                    innerDiameter: e.target.value
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Diamètre extérieur (cm)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.wellCharacteristics.outerDiameter}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  wellCharacteristics: {
                    ...prev.wellCharacteristics,
                    outerDiameter: e.target.value
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Hauteur capot (m/sol TN)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.wellCharacteristics.coverHeight}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  wellCharacteristics: {
                    ...prev.wellCharacteristics,
                    coverHeight: e.target.value
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Profondeur totale (m/sol TN)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.wellCharacteristics.totalDepth}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  wellCharacteristics: {
                    ...prev.wellCharacteristics,
                    totalDepth: e.target.value
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Hauteur crépine (m)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.wellCharacteristics.screenHeight}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  wellCharacteristics: {
                    ...prev.wellCharacteristics,
                    screenHeight: e.target.value
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Niveau piézométrique (m/sol TN)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.wellCharacteristics.waterLevel}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  wellCharacteristics: {
                    ...prev.wellCharacteristics,
                    waterLevel: e.target.value
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Hauteur colonne d'eau (m)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.wellCharacteristics.waterColumnHeight}
                readOnly
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Volume total d'eau (L)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.wellCharacteristics.totalWaterVolume}
                readOnly
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                3 volumes (L)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.wellCharacteristics.threeVolumes}
                readOnly
                className="mt-1 block w-full rounded-md border-gray-300 bg- gray-50 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Débit de purge prévu (l/min)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.wellCharacteristics.purgingRate}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  wellCharacteristics: {
                    ...prev.wellCharacteristics,
                    purgingRate: e.target.value
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Temps de pompage (min)
              </label>
              <input
                type="number"
                value={formData.wellCharacteristics.pumpingTime}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  wellCharacteristics: {
                    ...prev.wellCharacteristics,
                    pumpingTime: e.target.value
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Purge */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Purge</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Matériel utilisé
              </label>
              <input
                type="text"
                value={formData.purge.equipment}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  purge: { ...prev.purge, equipment: e.target.value }
                }))}
                placeholder="Pompe immergée"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Matériaux (tuyaux)
              </label>
              <input
                type="text"
                value={formData.purge.materials}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  purge: { ...prev.purge, materials: e.target.value }
                }))}
                placeholder="PVC"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type de purge
              </label>
              <div className="mt-2 space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="static"
                    checked={formData.purge.type === 'static'}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      purge: { ...prev.purge, type: e.target.value as 'static' | 'dynamic' }
                    }))}
                    className="h-4 w-4 text-[#34519e] focus:ring-[#34519e] border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Statique</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="dynamic"
                    checked={formData.purge.type === 'dynamic'}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      purge: { ...prev.purge, type: e.target.value as 'static' | 'dynamic' }
                    }))}
                    className="h-4 w-4 text-[#34519e] focus:ring-[#34519e] border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Dynamique</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Débit début purge (l/min)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.purge.startRate}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  purge: { ...prev.purge, startRate: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Fin purge (l/min)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.purge.endRate}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  purge: { ...prev.purge, endRate: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Position pompe/sol TN (m)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.purge.pumpPosition}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  purge: { ...prev.purge, pumpPosition: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Rabatement de l'eau (m)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.purge.drawdown}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  purge: { ...prev.purge, drawdown: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Traitement eau purge
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.purge.treatment.activatedCarbon}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      purge: {
                        ...prev.purge,
                        treatment: {
                          ...prev.purge.treatment,
                          activatedCarbon: e.target.checked
                        }
                      }
                    }))}
                    className="h-4 w-4 text-[#34519e] focus:ring-[#34519e] border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Charbon actif
                  </label>
                </div>
                <div>
                  <label className="block text-sm text-gray-700">
                    Autre (préciser)
                  </label>
                  <input
                    type="text"
                    value={formData.purge.treatment.other}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      purge: {
                        ...prev.purge,
                        treatment: {
                          ...prev.purge.treatment,
                          other: e.target.value
                        }
                      }
                    }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Volume rejet purge (L)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.purge.purgeVolume}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  purge: { ...prev.purge, purgeVolume: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Prélèvement - Échantillonnage */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Prélèvement - Échantillonnage</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Matériel utilisé
              </label>
              <input
                type="text"
                value={formData.sampling.equipment}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampling: { ...prev.sampling, equipment: e.target.value }
                }))}
                placeholder="Flacon en verre"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date et heure de début de pompage
              </label>
              <input
                type="datetime-local"
                value={formData.sampling.startDate}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampling: { ...prev.sampling, startDate: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Durée de pompage (min)
              </label>
              <input
                type="number"
                value={formData.sampling.duration}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampling: { ...prev.sampling, duration: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Niveau de purge atteint (L)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.sampling.purgeLevel}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampling: { ...prev.sampling, purgeLevel: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Débit de pompage (l/min)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.sampling.pumpingRate}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampling: { ...prev.sampling, pumpingRate: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Position de la pompe (m/repère)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.sampling.pumpPosition}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampling: { ...prev.sampling, pumpPosition: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nettoyage du matériel
              </label>
              <div className="mt-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.sampling.equipmentCleaned}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      sampling: { ...prev.sampling, equipmentCleaned: e.target.checked }
                    }))}
                    className="h-4 w-4 text-[#34519e] focus:ring-[#34519e] border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Oui</span>
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
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paramètre
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Début
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Intermédiaire
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fin
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[
                  { key: 'time', label: 'Heure' },
                  { key: 'waterLevel', label: 'Niveau d\'eau (m)' },
                  { key: 'turbidity', label: 'Turbidité (NTU)' },
                  { key: 'conductivity', label: 'Conductivité (µS/cm)' },
                  { key: 'ph', label: 'pH' },
                  { key: 'dissolvedOxygen', label: 'Oxygène dissous (mg/l)' },
                  { key: 'temperature', label: 'Température (°C)' },
                  { key: 'remarks', label: 'Remarques' },
                  { key: 'pid', label: 'Valeur PID (ppm)' }
                ].map(({ key, label }) => (
                  <tr key={key}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type={key === 'time' ? 'time' : 'text'}
                        value={formData.parameters[key as keyof typeof formData.parameters].start}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          parameters: {
                            ...prev.parameters,
                            [key]: {
                              ...prev.parameters[key as keyof typeof formData.parameters],
                              start: e.target.value
                            }
                          }
                        }))}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type={key === 'time' ? 'time' : 'text'}
                        value={formData.parameters[key as keyof typeof formData.parameters].intermediate}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          parameters: {
                            ...prev.parameters,
                            [key]: {
                              ...prev.parameters[key as keyof typeof formData.parameters],
                              intermediate: e.target.value
                            }
                          }
                        }))}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type={key === 'time' ? 'time' : 'text'}
                        value={formData.parameters[key as keyof typeof formData.parameters].end}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          parameters: {
                            ...prev.parameters,
                            [key]: {
                              ...prev.parameters[key as keyof typeof formData.parameters],
                              end: e.target.value
                            }
                          }
                        }))}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                      />
                    </td>
                  </tr>
                ))}
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
                  sampleManagement: { ...prev.sampleManagement, conditioning: e.target.value }
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
                    laboratory: e.target.value as 'wessling' | 'agrolab'
                  }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              >
                <option value="wessling">Wessling</option>
                <option value="agrolab">Agrolab</option>
              </select>
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
                  sampleManagement: { ...prev.sampleManagement, shippingDate: e.target.value }
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
                value={formData.sampleManagement.transporter}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampleManagement: { ...prev.sampleManagement, transporter: e.target.value }
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