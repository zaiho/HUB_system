import React, { useState, useEffect } from 'react';
import { 
  User, 
  KeyRound, 
  Mail, 
  Shield, 
  Moon, 
  Sun, 
  Download, 
  Trash2, 
  LogOut, 
  Laptop2, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Device {
  id: string;
  device: string;
  lastActive: string;
  location: string;
}

interface PasswordStrength {
  score: number;
  feedback: string;
}

export function Settings() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [darkMode, setDarkMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devices] = useState<Device[]>([
    { 
      id: '1', 
      device: 'Chrome - Windows', 
      lastActive: new Date().toISOString(),
      location: 'Paris, France'
    }
  ]);

  // Form states
  const [personalInfo, setPersonalInfo] = useState({
    firstName: user?.full_name?.split(' ')[0] || '',
    lastName: user?.full_name?.split(' ')[1] || '',
    email: user?.email || ''
  });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: ''
  });

  useEffect(() => {
    // Load user preferences
    const theme = localStorage.getItem('theme');
    setDarkMode(theme === 'dark');
  }, []);

  useEffect(() => {
    // Apply theme changes
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const checkPasswordStrength = (password: string) => {
    let score = 0;
    let feedback = '';

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    switch (score) {
      case 0:
      case 1:
        feedback = 'Très faible';
        break;
      case 2:
        feedback = 'Faible';
        break;
      case 3:
        feedback = 'Moyen';
        break;
      case 4:
        feedback = 'Fort';
        break;
      case 5:
        feedback = 'Très fort';
        break;
    }

    setPasswordStrength({ score, feedback });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: passwords.new 
      });

      if (error) throw error;

      setSuccessMessage('Mot de passe mis à jour avec succès');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      setError('Erreur lors de la modification du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalInfoUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: personalInfo.email,
        data: { 
          full_name: `${personalInfo.firstName} ${personalInfo.lastName}`.trim() 
        }
      });

      if (error) throw error;

      setSuccessMessage('Informations personnelles mises à jour avec succès');
    } catch (err) {
      setError('Erreur lors de la mise à jour des informations');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!confirm('Êtes-vous sûr de vouloir déconnecter tous les appareils ?')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      setSuccessMessage('Tous les appareils ont été déconnectés');
    } catch (err) {
      setError('Erreur lors de la déconnexion des appareils');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      const { data: sites, error: sitesError } = await supabase
        .from('sites')
        .select('*')
        .eq('user_id', user?.id);

      if (sitesError) throw sitesError;

      const { data: surveys, error: surveysError } = await supabase
        .from('surveys')
        .select('*')
        .eq('created_by', user?.id);

      if (surveysError) throw surveysError;

      const exportData = {
        user: {
          email: user?.email,
          full_name: user?.full_name
        },
        sites,
        surveys
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hub-environnement-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMessage('Données exportées avec succès');
    } catch (err) {
      setError('Erreur lors de l\'export des données');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible après 30 jours.')) {
      return;
    }

    setLoading(true);
    try {
      // Dans un environnement de production, nous enverrions une requête à une fonction Edge/Serverless
      // pour gérer la suppression du compte avec une période de grâce
      const { error } = await supabase.auth.updateUser({
        data: { 
          deletion_requested: new Date().toISOString(),
          deletion_effective: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      });

      if (error) throw error;

      await signOut();
      setSuccessMessage('Demande de suppression de compte envoyée');
    } catch (err) {
      setError('Erreur lors de la demande de suppression du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Paramètres</h1>

      {/* Messages */}
      {successMessage && (
        <div className="mb-4 p-4 rounded-md bg-green-50 flex items-center">
          <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 rounded-md bg-red-50 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'account', label: 'Compte', icon: User },
            { id: 'security', label: 'Sécurité', icon: Shield },
            { id: 'personalization', label: 'Personnalisation', icon: Laptop2 },
            { id: 'privacy', label: 'Confidentialité', icon: KeyRound }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === id
                  ? 'border-[#34519e] text-[#34519e]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <Icon className="h-5 w-5 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {/* Compte */}
        {activeTab === 'account' && (
          <div className="space-y-8">
            {/* Informations personnelles */}
            <div className="bg-white shadow sm:rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Informations personnelles</h2>
              <form onSubmit={handlePersonalInfoUpdate} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                      Prénom
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={personalInfo.firstName}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, firstName: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                      Nom
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={personalInfo.lastName}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, lastName: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#34519e] hover:bg-[#34519e]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] disabled:opacity-50"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>

            {/* Modification du mot de passe */}
            <div className="bg-white shadow sm:rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Modification du mot de passe</h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                    Mot de passe actuel
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    value={passwords.current}
                    onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                    minLength={8}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={passwords.new}
                    onChange={(e) => {
                      setPasswords(prev => ({ ...prev, new: e.target.value }));
                      checkPasswordStrength(e.target.value);
                    }}
                    minLength={8}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                  />
                  {passwords.new && (
                    <div className="mt-1">
                      <div className="flex items-center">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full">
                          <div
                            className={`h-2 rounded-full ${
                              passwordStrength.score <= 2
                                ? 'bg-red-500'
                                : passwordStrength.score <= 3
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          />
                        </div>
                        <span className="ml-2 text-sm text-gray-500">
                          {passwordStrength.feedback}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                    minLength={8}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm"
                  />
                  {passwords.new && passwords.confirm && (
                    <p className={`mt-1 text-sm ${passwords.new === passwords.confirm ? 'text-green-600' : 'text-red-600'}`}>
                      {passwords.new === passwords.confirm ? 'Les mots de passe correspondent' : 'Les mots de passe ne correspondent pas'}
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading || passwords.new !== passwords.confirm}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#34519e] hover:bg-[#34519e]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] disabled:opacity-50"
                  >
                    Modifier le mot de passe
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Sécurité */}
        {activeTab === 'security' && (
          <div className="space-y-8">
            {/* Appareils connectés */}
            <div className="bg-white shadow sm:rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Appareils connectés</h2>
                <button
                  onClick={handleLogoutAllDevices}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-[#34519e] bg-[#34519e]/10 hover:bg-[#34519e]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnecter tous les appareils
                </button>
              </div>
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Appareil</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Dernière activité</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Localisation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {devices.map((device) => (
                      <tr key={device.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {device.device}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(device.lastActive).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {device.location}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Personnalisation */}
        {activeTab === 'personalization' && (
          <div className="space-y-8">
            {/* Thème */}
            <div className="bg-white shadow sm:rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Thème</h2>
              <div className="flex items-center justify-between">
                <span className="flex items-center">
                  {darkMode ? (
                    <Moon className="h-5 w-5 text-gray-400 mr-2" />
                  ) : (
                    <Sun className="h-5 w-5 text-gray-400 mr-2" />
                  )}
                  <span className="text-sm text-gray-900">
                    {darkMode ? 'Mode sombre' : 'Mode clair'}
                  </span>
                </span>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#34519e] focus:ring-offset-2"
                  style={{ backgroundColor: darkMode ? '#34519e' : '#d1d5db' }}
                >
                  <span
                    className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-300 ease-in-out"
                    style={{ transform: `translateX(${darkMode ? '1.25rem' : '0'})` }}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confidentialité */}
        {activeTab === 'privacy' && (
          <div className="space-y-8">
            {/* Export des données */}
            <div className="bg-white shadow sm:rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Export des données</h2>
              <button
                onClick={handleExportData}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-[#34519e] bg-[#34519e]/10 hover:bg-[#34519e]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] disabled:opacity-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter mes données
              </button>
            </div>

            {/* Suppression du compte */}
            <div className="bg-white shadow sm:rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Suppression du compte</h2>
              <div className="rounded-md bg-red-50 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Attention : cette action est irréversible
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Toutes vos données seront supprimées</li>
                        <li>Vous aurez 30 jours pour annuler cette action</li>
                        <li>Après 30 jours, la suppression sera définitive</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer mon compte
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}