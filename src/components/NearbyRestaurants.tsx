import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import type { LatLng } from 'leaflet';

interface Restaurant {
  id: string;
  name: string;
  type: string;
  distance: number;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface Props {
  position: LatLng | null;
  onRestaurantClick: (lat: number, lng: number) => void;
}

export function NearbyRestaurants({ position, onRestaurantClick }: Props) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!position) return;

    const fetchRestaurants = async () => {
      setLoading(true);
      setError(null);

      try {
        // Construct Overpass API query
        const query = `
          [out:json][timeout:25];
          (
            node["amenity"~"restaurant|cafe|fast_food"]["name"](around:1000,${position.lat},${position.lng});
            node["shop"="bakery"]["name"](around:1000,${position.lat},${position.lng});
          );
          out body;
          >;
          out skel qt;
        `;

        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query
        });

        if (!response.ok) throw new Error('Failed to fetch restaurants');

        const data = await response.json();
        
        // Process and transform the data
        const processedRestaurants = data.elements.map((element: any) => {
          const type = element.tags.amenity || (element.tags.shop === 'bakery' ? 'bakery' : 'unknown');
          const distance = calculateDistance(
            position.lat,
            position.lng,
            element.lat,
            element.lon
          );

          return {
            id: element.id.toString(),
            name: element.tags.name || 'Sans nom',
            type: getTypeLabel(type),
            distance: Math.round(distance),
            address: element.tags['addr:street'] 
              ? `${element.tags['addr:housenumber'] || ''} ${element.tags['addr:street']}`
              : 'Adresse non disponible',
            coordinates: {
              lat: element.lat,
              lng: element.lon
            }
          };
        });

        // Sort by distance
        processedRestaurants.sort((a, b) => a.distance - b.distance);
        
        setRestaurants(processedRestaurants);
      } catch (err) {
        console.error('Error fetching restaurants:', err);
        setError('Erreur lors de la récupération des établissements');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [position]);

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Convert to meters
  };

  const toRad = (value: number): number => {
    return value * Math.PI / 180;
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'restaurant':
        return 'Restaurant';
      case 'cafe':
        return 'Café';
      case 'fast_food':
        return 'Fast-food';
      case 'bakery':
        return 'Boulangerie';
      default:
        return 'Autre';
    }
  };

  if (!position) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
        Sélectionnez un point sur la carte pour voir les établissements à proximité
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Établissements dans un rayon de 1 km
        </h3>
        {loading && (
          <p className="mt-1 text-sm text-gray-500">
            Chargement des établissements...
          </p>
        )}
        {error && (
          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      <div className="border-t border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distance
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adresse
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {restaurants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    Aucun établissement trouvé dans ce rayon
                  </td>
                </tr>
              ) : (
                restaurants.map((restaurant) => (
                  <tr key={restaurant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {restaurant.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {restaurant.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {restaurant.distance}m
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {restaurant.address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => onRestaurantClick(restaurant.coordinates.lat, restaurant.coordinates.lng)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-[#34519e] bg-[#34519e]/10 hover:bg-[#34519e]/20"
                      >
                        <MapPin className="h-4 w-4 mr-1" />
                        Voir sur la carte
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}