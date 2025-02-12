import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Briefcase, AlertCircle, ArrowLeft, ArrowUpDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Site } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type SortField = 'name' | 'city' | 'project_number';
type SortOrder = 'asc' | 'desc';

const SORT_FIELDS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Nom du client' },
  { value: 'city', label: 'Commune' },
  { value: 'project_number', label: 'Numéro d\'affaire' }
];

const SORT_ORDERS: { value: SortOrder; label: string }[] = [
  { value: 'asc', label: 'Croissant' },
  { value: 'desc', label: 'Décroissant' }
];

export function Archives() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    loadArchivedSites();
  }, [sortField, sortOrder]);

  const loadArchivedSites = async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('status', 'archived')
        .order(sortField, { ascending: sortOrder === 'asc' });

      if (error) throw error;
      setSites(data || []);
    } catch (err) {
      console.error('Error loading archived sites:', err);
      setError('Une erreur est survenue lors du chargement des sites archivés');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center mb-6">
        <Link
          to="/"
          className="mr-4 p-2 rounded-full text-gray-600 hover:text-[#34519e] hover:bg-[#34519e]/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e]"
          aria-label="Retour à la liste des sites"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Sites Archivés</h1>
      </div>

      {/* Sorting controls */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <ArrowUpDown className="h-5 w-5 text-gray-400" />
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="block rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
          >
            {SORT_FIELDS.map(field => (
              <option key={field.value} value={field.value}>
                Trier par {field.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="block rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
          >
            {SORT_ORDERS.map(order => (
              <option key={order.value} value={order.value}>
                {order.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
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
      
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#34519e] border-r-transparent"></div>
        </div>
      ) : sites.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-12 text-center">
            <MapPin className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun site archivé</h3>
            <p className="mt-1 text-sm text-gray-500">
              Les sites archivés apparaîtront ici.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-gray-200">
            {sites.map((site) => (
              <li key={site.id} className="relative hover:bg-gray-50">
                <Link
                  to={`/sites/${site.id}`}
                  className="block px-4 py-4 sm:px-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-[#34519e] truncate">
                        {site.name}
                      </p>
                      <p className="ml-2 text-sm text-gray-500">
                        #{site.project_number}
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Archivé
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        <MapPin className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        {site.city}
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        <Briefcase className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        {site.engineer_in_charge || 'Non assigné'}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                      <p>
                        Créé le{' '}
                        {format(new Date(site.created_at), 'PPP', { locale: fr })}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}