import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FileText, Droplets, Wind, Beaker, Waves, Activity, LineChart, ArrowLeft } from 'lucide-react';

const SURVEY_TYPES = [
  {
    id: 'soil',
    name: 'Sols',
    description: 'Études des sols et sous-sols',
    icon: FileText,
    path: 'soil'
  },
  {
    id: 'groundwater',
    name: 'Eaux souterraines',
    description: 'Analyses des nappes phréatiques',
    icon: Droplets,
    path: 'groundwater'
  },
  {
    id: 'ambient_air',
    name: 'Air ambiant',
    description: 'Qualité de l\'air environnant',
    icon: Wind,
    path: 'ambient_air'
  },
  {
    id: 'gas',
    name: 'Gaz du sol',
    description: 'Mesures des émissions gazeuses',
    icon: Beaker,
    path: 'gas'
  },
  {
    id: 'surface_water',
    name: 'Eaux superficielles',
    description: 'Analyses des eaux de surface',
    icon: Waves,
    path: 'surface_water'
  },
  {
    id: 'pid',
    name: 'Campagne PID',
    description: 'Mesures PID',
    icon: Activity,
    path: 'pid'
  },
  {
    id: 'piezometric',
    name: 'Fiche piézométrique',
    description: 'Relevés piézométriques',
    icon: LineChart,
    path: 'piezometric'
  }
] as const;

export function NewSurvey() {
  const navigate = useNavigate();
  const { siteId } = useParams();

  const handleSelectType = (typeId: string, path: string) => {
    navigate(`/sites/${siteId}/surveys/${path}/new`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <Link
          to={`/sites/${siteId}`}
          className="mr-4 p-2 rounded-full text-gray-600 hover:text-[#34519e] hover:bg-[#34519e]/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e]"
          aria-label="Retour"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle Fiche de Terrain</h1>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SURVEY_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => handleSelectType(type.id, type.path)}
                className="relative rounded-lg border p-4 hover:border-[#34519e] hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Icon className="h-6 w-6 text-[#34519e]" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{type.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">{type.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}