import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import { NearbyRestaurants } from '../components/NearbyRestaurants';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }: { position: L.LatLng | null, setPosition: (pos: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <>
      <Marker position={position} />
      <Circle
        center={position}
        radius={1000}
        pathOptions={{
          color: '#34519e',
          fillColor: '#34519e',
          fillOpacity: 0.1
        }}
      />
    </>
  );
}

function MapController({ center }: { center: L.LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export function NewSite() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { siteId } = useParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    city: '',
    projectNumber: '',
    projectManager: '',
    engineers: '',
    drillingCompany: ''
  });

  const isEditMode = Boolean(siteId);

  useEffect(() => {
    if (isEditMode) {
      loadSiteData();
    }
  }, [siteId]);

  const loadSiteData = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('sites')
        .select('*')
        .eq('id', siteId)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        setFormData({
          name: data.name || '',
          location: data.location || '',
          city: data.city || '',
          projectNumber: data.project_number || '',
          projectManager: data.project_manager || '',
          engineers: data.engineer_in_charge || '',
          drillingCompany: data.drilling_company || ''
        });

        if (data.coordinates) {
          setPosition(new L.LatLng(
            data.coordinates.latitude,
            data.coordinates.longitude
          ));
        }
      }
    } catch (err) {
      console.error('Error loading site:', err);
      setError('Une erreur est survenue lors du chargement des données du site');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');

      const siteData = {
        name: formData.name,
        location: formData.location,
        city: formData.city,
        project_number: formData.projectNumber,
        project_manager: formData.projectManager,
        engineer_in_charge: formData.engineers,
        drilling_company: formData.drillingCompany,
        coordinates: position ? {
          latitude: position.lat,
          longitude: position.lng
        } : null,
        user_id: user?.id
      };

      let result;
      if (isEditMode) {
        result = await supabase
          .from('sites')
          .update(siteData)
          .eq('id', siteId)
          .select()
          .single();
      } else {
        result = await supabase
          .from('sites')
          .insert([siteData])
          .select()
          .single();
      }

      const { data, error: upsertError } = result;
      if (upsertError) throw upsertError;

      if (data) {
        navigate(`/sites/${data.id}`);
      }
    } catch (err) {
      console.error('Error saving site:', err);
      setError(`Une erreur est survenue lors de ${isEditMode ? 'la modification' : 'la création'} du site`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantClick = (lat: number, lng: number) => {
    const newPosition = new L.LatLng(lat, lng);
    setPosition(newPosition);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center mb-6">
        <Link
          to="/"
          className="mr-4 p-2 rounded-full text-gray-600 hover:text-[#34519e] hover:bg-[#34519e]/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e]"
          aria-label="Retour à la liste des sites"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Modifier le Site' : 'Nouveau Site'}
        </h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
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

        {isEditMode && (
          <div className="rounded-md bg-blue-50 p-4">
            <p className="text-sm text-blue-700">
              Vous êtes en train de modifier les informations du site
            </p>
          </div>
        )}

        <div className="flex gap-6">
          {/* Colonne de gauche */}
          <div className="flex-1 space-y-6">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
              <div className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Nom du client
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="projectNumber" className="block text-sm font-medium text-gray-700">
                    Numéro d'affaire
                  </label>
                  <input
                    type="text"
                    id="projectNumber"
                    required
                    value={formData.projectNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectNumber: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                    Adresse
                  </label>
                  <input
                    type="text"
                    id="location"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    Commune
                  </label>
                  <input
                    type="text"
                    id="city"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position sur la carte
                  </label>
                  <div className="h-[400px] rounded-lg overflow-hidden border border-gray-300">
                    <MapContainer
                      center={position || [46.603354, 1.888334]}
                      zoom={position ? 12 : 6}
                      className="h-full"
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <LocationMarker position={position} setPosition={setPosition} />
                      {position && <MapController center={position} />}
                    </MapContainer>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Cliquez sur la carte pour définir la position du site
                  </p>
                </div>

                {/* Nearby Restaurants Table */}
                <div className="mt-6">
                  <NearbyRestaurants 
                    position={position} 
                    onRestaurantClick={handleRestaurantClick}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Colonne de droite */}
          <div className="w-80">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 space-y-6">
              <div>
                <label htmlFor="projectManager" className="block text-sm font-medium text-gray-700">
                  Chef de projet
                </label>
                <input
                  type="text"
                  id="projectManager"
                  value={formData.projectManager}
                  onChange={(e) => setFormData(prev => ({ ...prev, projectManager: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="engineers" className="block text-sm font-medium text-gray-700">
                  Opérateur
                </label>
                <input
                  type="text"
                  id="engineers"
                  value={formData.engineers}
                  onChange={(e) => setFormData(prev => ({ ...prev, engineers: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="drillingCompany" className="block text-sm font-medium text-gray-700">
                  Entreprise de Forage
                </label>
                <input
                  type="text"
                  id="drillingCompany"
                  value={formData.drillingCompany}
                  onChange={(e) => setFormData(prev => ({ ...prev, drillingCompany: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#34519e] hover:bg-[#34519e]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] disabled:opacity-50"
              >
                {loading ? (
                  isEditMode ? 'Modification...' : 'Création...'
                ) : (
                  isEditMode ? 'Enregistrer les modifications' : 'Créer le site'
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}