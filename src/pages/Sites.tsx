import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, MapPin, Calendar, Briefcase, Trash2, AlertCircle, CheckCircle, PencilIcon, Archive, Box } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Site } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';

export function Sites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingSite, setDeletingSite] = useState<string | null>(null);
  const [archivingSite, setArchivingSite] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSites(data || []);
    } catch (err) {
      console.error('Error loading sites:', err);
      setError('Une erreur est survenue lors du chargement des sites');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce site ? Cette action est irréversible.')) {
      return;
    }

    try {
      setDeletingSite(siteId);
      const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', siteId);

      if (error) throw error;

      setSites(sites.filter(site => site.id !== siteId));
      setSuccessMessage('Le site a été supprimé avec succès');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (err) {
      console.error('Error deleting site:', err);
      setError('Une erreur est survenue lors de la suppression du site');
    } finally {
      setDeletingSite(null);
    }
  };

  const handleArchiveSite = async (siteId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir archiver ce site ?')) {
      return;
    }

    try {
      setArchivingSite(siteId);
      const { error } = await supabase
        .from('sites')
        .update({ status: 'archived' })
        .eq('id', siteId);

      if (error) throw error;

      setSites(sites.filter(site => site.id !== siteId));
      setSuccessMessage('Le site a été archivé avec succès');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (err) {
      console.error('Error archiving site:', err);
      setError('Une erreur est survenue lors de l\'archivage du site');
    } finally {
      setArchivingSite(null);
    }
  };

  const handleEditSite = (siteId: string) => {
    navigate(`/sites/${siteId}/edit`);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Mes Sites</h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <Link
            to="/archives"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600 w-full sm:w-auto"
          >
            <Box className="h-5 w-5 mr-2" />
            Mes archives
          </Link>
          <Link
            to="/sites/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#34519e] hover:bg-[#34519e]/90 w-full sm:w-auto"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouveau Site
          </Link>
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

      {showSuccessMessage && (
        <div className="rounded-md bg-green-50 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun site</h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par créer un nouveau site pour votre projet.
            </p>
            <div className="mt-6">
              <Link
                to="/sites/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#34519e] hover:bg-[#34519e]/90"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nouveau Site
              </Link>
            </div>
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
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pr-16 sm:pr-20">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                      <p className="text-sm font-medium text-[#34519e] truncate">
                        {site.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        #{site.project_number}
                      </p>
                      <div className="flex-shrink-0 mt-2 sm:mt-0">
                        <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          En cours
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex flex-col sm:flex-row sm:space-x-6">
                      <p className="flex items-center text-sm text-gray-500">
                        <MapPin className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        {site.city}
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
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
                {user?.id === site.user_id && (
                  <div className="absolute top-4 right-4 flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleEditSite(site.id);
                      }}
                      className="p-2 rounded-full text-gray-400 hover:text-[#34519e] hover:bg-[#34519e]/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] transition-colors duration-200"
                    >
                      <span className="sr-only">Modifier le site</span>
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleArchiveSite(site.id);
                      }}
                      disabled={archivingSite === site.id}
                      className="p-2 rounded-full text-gray-400 hover:text-orange-600 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
                    >
                      <span className="sr-only">Archiver le site</span>
                      <Archive className={`h-5 w-5 ${archivingSite === site.id ? 'animate-pulse' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteSite(site.id);
                      }}
                      disabled={deletingSite === site.id}
                      className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                    >
                      <span className="sr-only">Supprimer le site</span>
                      <Trash2 className={`h-5 w-5 ${deletingSite === site.id ? 'animate-pulse' : ''}`} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}