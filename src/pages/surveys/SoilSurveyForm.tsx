import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Camera, Save, Plus, Trash2, Upload, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface EnvironmentalObservation {
  depth: string;
  lithology: string;
  water: string;
  organoleptic: string;
  pid: string;
  samples: string;
  photos: File[];
  photoUrls: string[];
}

const WEATHER_CONDITIONS = [
  'Ensoleillé',
  'Nuageux',
  'Venteux',
  'Pluvieux'
] as const;

const DRILLING_TOOLS = [
  'Carottier portatif',
  'Carottier manuel',
  'Tarière mécanique',
  'Tarière manuelle',
  'Pelle mécanique',
  'Géoprobe'
] as const;

const REFECTION_OPTIONS = [
  'Cuttings',
  'Béton',
  'Enrobé',
  'Autres'
] as const;

const CUTTINGS_MANAGEMENT = [
  'Remis en place',
  'Évacués',
  'Stockés sur site',
  'Big-bag'
] as const;

export function SoilSurveyForm() {
  const navigate = useNavigate();
  const { siteId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [geoError, setGeoError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    coordinates: {
      x: '',
      y: '',
      z: ''
    },
    generalInfo: {
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), // ✅ Ajout des secondes
        weather: 'Ensoleillé',
        temperature: ''
    },
    drillingInfo: {
      tool: '',
      diameter: '',
      depth: '',
      refection: '',
      cuttingsManagement: '',
      remarks: ''
    },
    sampleManagement: {
      conditioning: '',
      transporter: '',
      laboratory: '',
      shippingDate: new Date().toISOString().split('T')[0]
    }
  });

  const [observations, setObservations] = useState<EnvironmentalObservation[]>([]);
  const [mainPhotos, setMainPhotos] = useState<File[]>([]);
  const [mainPhotoUrls, setMainPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            coordinates: {
              x: position.coords.longitude.toString(),
              y: position.coords.latitude.toString(),
              z: ''
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

  const handleMainPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newPhotos = Array.from(files);
      setMainPhotos(prev => [...prev, ...newPhotos]);
      
      const newUrls = newPhotos.map(photo => URL.createObjectURL(photo));
      setMainPhotoUrls(prev => [...prev, ...newUrls]);
    }
  };

  const handleObservationPhotoUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newPhotos = Array.from(files);
      const newUrls = newPhotos.map(photo => URL.createObjectURL(photo));
      
      setObservations(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          photos: [...(updated[index].photos || []), ...newPhotos],
          photoUrls: [...(updated[index].photoUrls || []), ...newUrls]
        };
        return updated;
      });
    }
  };

  const handleDeleteMainPhoto = (index: number) => {
    URL.revokeObjectURL(mainPhotoUrls[index]);
    setMainPhotos(prev => prev.filter((_, i) => i !== index));
    setMainPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteObservationPhoto = (obsIndex: number, photoIndex: number) => {
    setObservations(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[obsIndex].photoUrls[photoIndex]);
      updated[obsIndex].photos = updated[obsIndex].photos.filter((_, i) => i !== photoIndex);
      updated[obsIndex].photoUrls = updated[obsIndex].photoUrls.filter((_, i) => i !== photoIndex);
      return updated;
    });
  };

  const addObservation = () => {
    setObservations(prev => [...prev, {
      depth: '',
      lithology: '',
      water: '',
      organoleptic: '',
      pid: '',
      samples: '',
      photos: [],
      photoUrls: []
    }]);
  };

  const updateObservation = (index: number, field: keyof EnvironmentalObservation, value: string) => {
    setObservations(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const deleteObservation = (index: number) => {
    setObservations(prev => {
      const updated = [...prev];
      // Revoke all photo URLs for this observation
      updated[index].photoUrls.forEach(url => URL.revokeObjectURL(url));
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Upload main photos
      const mainPhotoUrls = [];
      for (const photo of mainPhotos) {
        const fileName = `${siteId}/main/${Date.now()}-${photo.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from('survey-photos')
          .upload(fileName, photo);
          
        if (uploadError) throw uploadError;
        if (data) {
          mainPhotoUrls.push(data.path);
        }
      }

      // Upload observation photos and create observation records
      const processedObservations = await Promise.all(
        observations.map(async (obs) => {
          const obsPhotoUrls = [];
          for (const photo of obs.photos) {
            const fileName = `${siteId}/observations/${Date.now()}-${photo.name}`;
            const { data, error: uploadError } = await supabase.storage
              .from('survey-photos')
              .upload(fileName, photo);
              
            if (uploadError) throw uploadError;
            if (data) {
              obsPhotoUrls.push(data.path);
            }
          }

          return {
            ...obs,
            photos: obsPhotoUrls
          };
        })
      );

      // Create the survey record
     const { data, error: surveyError } = await supabase
    .from('surveys')
    .insert([{
        site_id: siteId,
        type: 'soil',
        common_data: {
            date: `${formData.generalInfo.date}T${formData.generalInfo.time}`, // ✅ Format correct
            time: formData.generalInfo.time, // ✅ Stocke l’heure séparément
            weather_conditions: `${formData.generalInfo.weather} - ${formData.generalInfo.temperature}°C`
        },
        specific_data: {
            name: formData.name,
            coordinates: formData.coordinates,
            main_photos: mainPhotoUrls,
            drilling_info: formData.drillingInfo,
            observations: processedObservations,
            sample_management: formData.sampleManagement
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
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center mb-6">
        <Link
          to={`/sites/${siteId}`}
          className="mr-4 p-2 rounded-full text-gray-600 hover:text-[#34519e] hover:bg-[#34519e]/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e]"
          aria-label="Retour"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Fiche de Sondage Sol</h1>
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

        {/* Nom du sondage */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nom du sondage
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
            />
          </div>
        </div>

        {/* Localisation du sondage */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Localisation du sondage</h2>
          {geoError && (
            <div className="mb-4 rounded-md bg-yellow-50 p-4">
              <p className="text-sm text-yellow-700">{geoError}</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">x (m)</label>
              <input
                type="text"
                value={formData.coordinates.x}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  coordinates: { ...prev.coordinates, x: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">y (m)</label>
              <input
                type="text"
                value={formData.coordinates.y}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  coordinates: { ...prev.coordinates, y: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">z sol (mNGF)</label>
              <input
                type="text"
                value={formData.coordinates.z}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  coordinates: { ...prev.coordinates, z: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Photo du sondage */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Photo du sondage</h2>
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
                  onChange={handleMainPhotoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </label>
            </div>
            
            {mainPhotoUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                {mainPhotoUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`Photo ${index + 1}`}
                      className="h-24 w-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteMainPhoto(index)}
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
              <label className="block text-sm font-medium text-gray-700">Météo</label>
              <select
                value={formData.generalInfo.weather}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  generalInfo: { ...prev.generalInfo, weather: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              >
                {WEATHER_CONDITIONS.map(condition => (
                  <option key={condition} value={condition}>{condition}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">T° (°C)</label>
              <input
                type="number"
                step="0.1"
                value={formData.generalInfo.temperature}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  generalInfo: { ...prev.generalInfo, temperature: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Informations sur le sondage */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Informations sur le sondage</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Outil de sondage</label>
              <select
                value={formData.drillingInfo.tool}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  drillingInfo: { ...prev.drillingInfo, tool: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              >
                <option value="">Sélectionner un outil</option>
                {DRILLING_TOOLS.map(tool => (
                  <option key={tool} value={tool}>{tool}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Diamètre sondage (mm)</label>
              <input
                type="number"
                value={formData.drillingInfo.diameter}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  drillingInfo: { ...prev.drillingInfo, diameter: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Profondeur atteinte (m)</label>
              <input
                type="number"
                step="0.1"
                value={formData.drillingInfo.depth}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  drillingInfo: { ...prev.drillingInfo, depth: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Rebouchage et réfection</label>
              <select
                value={formData.drillingInfo.refection}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  drillingInfo: { ...prev.drillingInfo, refection: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              >
                <option value="">Sélectionner une option</option>
                {REFECTION_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Gestion des cuttings</label>
              <select
                value={formData.drillingInfo.cuttingsManagement}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  drillingInfo: { ...prev.drillingInfo, cuttingsManagement: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              >
                <option value="">Sélectionner une option</option>
                {CUTTINGS_MANAGEMENT.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Remarques / Revêtement</label>
              <textarea
                value={formData.drillingInfo.remarks}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  drillingInfo: { ...prev.drillingInfo, remarks: e.target.value }
                }))}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Observations et mesures */}
        <div className="bg-white shadow sm:rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Observations et mesures</h2>
            <button
              type="button"
              onClick={addObservation}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-[#34519e] bg-[#34519e]/10 hover:bg-[#34519e]/20"
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter une ligne
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Profondeur (m)
                  </th>
                  <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description lithologique
                  </th>
                  <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Eau
                  </th>
                  <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organoleptiques
                  </th>
                  <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PID (ppm)
                  </th>
                  <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Échantillons
                  </th>
                  <th className="px-4 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Photos
                  </th>
                  <th className="px-4 py-3 bg-gray-50"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {observations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                      Aucune observation ajoutée
                    </td>
                  </tr>
                ) : (
                  observations.map((obs, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={obs.depth}
                          onChange={(e) => updateObservation(index, 'depth', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={obs.lithology}
                          onChange={(e) => updateObservation(index, 'lithology', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={obs.water}
                          onChange={(e) => updateObservation(index, 'water', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={obs.organoleptic}
                          onChange={(e) => updateObservation(index, 'organoleptic', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.1"
                          value={obs.pid}
                          onChange={(e) => updateObservation(index, 'pid', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={obs.samples}
                          onChange={(e) => updateObservation(index, 'samples', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col space-y-2">
                          <label className="relative cursor-pointer bg-[#34519e]/10 hover:bg-[#34519e]/20 rounded-md px-2 py-1 text-center">
                            <Camera className="h-4 w-4 text-[#34519e] inline" />
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => handleObservationPhotoUpload(index, e)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </label>
                          {obs.photoUrls?.map((url, photoIndex) => (
                            <div key={photoIndex} className="relative">
                              <img
                                src={url}
                                alt={`Photo ${photoIndex + 1}`}
                                className="h-12 w-full object-cover rounded"
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteObservationPhoto(index, photoIndex)}
                                className="absolute top-0 right-0 bg-red-100 rounded-full p-0.5 hover:bg-red-200"
                              >
                                <Trash2 className="h-3 w-3 text-red-600" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => deleteObservation(index)}
                          className="text-red-600 hover:text- red-900"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
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
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nom du laboratoire
              </label>
              <select
                value={formData.sampleManagement.laboratory}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  sampleManagement: { ...prev.sampleManagement, laboratory: e.target.value }
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
              >
                <option value="">Sélectionner un laboratoire</option>
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