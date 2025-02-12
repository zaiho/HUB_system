import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, FileText, Calendar, AlertCircle, ArrowLeft, PencilIcon, Trash2, CheckCircle, Download, FileDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Survey } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function SiteSurveys() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingSurvey, setDeletingSurvey] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    loadSurveys();
  }, [siteId]);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!siteId) {
        throw new Error('ID du site non défini');
      }

      const { data, error: fetchError } = await supabase
        .from('surveys')
        .select('id, site_id, type, created_at, created_by, common_data, specific_data')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSurveys(data || []);
    } catch (err) {
      console.error('Error loading surveys:', err);
      setError('Une erreur est survenue lors du chargement des fiches. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSoilSurveyPDF = async (survey: Survey) => {
    if (!survey || survey.type !== 'soil') return;
    
    try {
        setExportingPDF(true);
        setError(null);

        // 1️⃣ Récupérer les données complètes du sondage
        const { data: fullSurvey, error: surveyError } = await supabase
            .from('surveys')
            .select('id, site_id, type, created_at, created_by, common_data, specific_data')
            .eq('id', survey.id)
            .single();

        if (surveyError) throw surveyError;

        // 🔥 Ajouter ce log pour vérifier les données récupérées
         console.log("Données récupérées du sondage :", fullSurvey);
        console.log("Nom du sondage :", fullSurvey.specific_data?.name);
        console.log("Coordonnées :", fullSurvey.specific_data?.coordinates);
        console.log("Outil de forage :", fullSurvey.specific_data?.drilling_info?.tool);
        console.log("Profondeur atteinte :", fullSurvey.specific_data?.drilling_info?.depth);
        console.log("Transporteur :", fullSurvey.specific_data?.sample_management?.transporter);


        // 2️⃣ Récupérer les informations du site
        const { data: siteData, error: siteError } = await supabase
            .from('sites')
            .select('*')
            .eq('id', siteId)
            .single();

        if (siteError) throw siteError;

        const doc = new jsPDF();

        // En-tête avec logo
        doc.addImage('https://i.imgur.com/nEpYFLo.png', 'PNG', 10, 10, 30, 15);
        doc.setFontSize(16);
        doc.text('Fiche de suivi de sondage et prélèvement de sol', 45, 20);

        // Colonne de gauche
        doc.setFontSize(12);
        doc.text('Informations générales', 10, 40);
        
        doc.setFontSize(10);
        doc.text('Nom du sondage:', 10, 50);
        doc.text(String(fullSurvey.specific_data?.name || 'Non renseigné'), 60, 50);

        doc.text('Numéro d\'affaire:', 10, 55);
        doc.text(siteData.project_number || 'Non renseigné', 60, 55);

        doc.text('Client:', 10, 60);
        doc.text(siteData.name || 'Non renseigné', 60, 60);

        doc.text('Adresse et commune:', 10, 65);
        doc.text(`${siteData.location || ''}, ${siteData.city || 'Non renseigné'}`, 60, 65);

        doc.text('Chef de projet:', 10, 70);
        doc.text(siteData.project_manager || 'Non renseigné', 60, 70);

        doc.text('Opérateur:', 10, 75);
        doc.text(siteData.engineer_in_charge || 'Non renseigné', 60, 75);

        doc.text('Entreprise de forage:', 10, 80);
        doc.text(siteData.drilling_company || 'Non renseigné', 60, 80);

        doc.setFontSize(12);
        doc.text('Conditions météorologiques', 10, 90);
        
        doc.setFontSize(10);
        doc.text('Date:', 10, 100);
        const surveyDate = fullSurvey.common_data?.date
            ? format(new Date(fullSurvey.common_data.date), 'dd/MM/yyyy', { locale: fr })
            : 'Non renseigné';
        doc.text(surveyDate, 60, 100);

        doc.text('Heure:', 10, 105);
        const surveyTime = fullSurvey.common_data?.time
            ? fullSurvey.common_data.time
            : 'Non renseigné';
        doc.text(surveyTime, 60, 105);

        const weatherParts = fullSurvey.common_data?.weather_conditions
            ? fullSurvey.common_data.weather_conditions.split(' - ')
            : ['Non renseigné'];

        doc.text('Météo:', 10, 110);
        doc.text(weatherParts[0], 60, 110);

        doc.text('Température:', 10, 115);
        const temperatureText = weatherParts.length > 1
            ? weatherParts[1]
            : 'Non renseigné';
        doc.text(temperatureText, 60, 115);

        // Colonne de droite
        doc.setFontSize(12);
        doc.text('Localisation', 110, 40);

        doc.setFontSize(10);
        doc.text('X:', 110, 50);
        doc.text(String(fullSurvey.specific_data?.coordinates?.x || 'Non renseigné'), 160, 50);

        doc.text('Y:', 110, 55);
        doc.text(String(fullSurvey.specific_data?.coordinates?.y || 'Non renseigné'), 160, 55);

        doc.text('Z sol:', 110, 60);
        doc.text(String(fullSurvey.specific_data?.coordinates?.z || 'Non renseigné'), 160, 60);

        // Informations sondage (colonne droite)
        doc.setFontSize(12);
        doc.text('Informations sur le sondage', 110, 75);

        doc.setFontSize(10);
        doc.text('Outil de sondage:', 110, 85);
        doc.text(String(fullSurvey.specific_data?.drilling_info?.tool || 'Non renseigné'), 160, 85);

        doc.text('Diamètre sondage:', 110, 90);
        doc.text(`${fullSurvey.specific_data?.drilling_info?.diameter ? `${fullSurvey.specific_data.drilling_info.diameter} mm` : 'Non renseigné'}`,
            160, 90);

        doc.text('Profondeur atteinte:', 110, 95);
        doc.text(`${fullSurvey.specific_data?.drilling_info?.depth ? `${fullSurvey.specific_data.drilling_info.depth} m` : 'Non renseigné'}`,
            160, 95);

        doc.text('Rebouchage et réfection:', 110, 100);
        doc.text(String(fullSurvey.specific_data?.drilling_info?.refection || 'Non renseigné'), 160, 100);

        doc.text('Gestion des déblais:', 110, 105);
        doc.text(String(fullSurvey.specific_data?.drilling_info?.cuttingsManagement || 'Non renseigné'), 160, 105);

        doc.text('Remarques / Revêtement:', 110, 110);
        const remarks = fullSurvey.specific_data?.drilling_info?.remarks || 'Non renseigné';
        const remarksLines = doc.splitTextToSize(remarks, 80);
        doc.text(remarksLines, 160, 110);

      // Tableau des observations environnementales
      if (fullSurvey.specific_data?.observations) {
          doc.addPage();
          doc.setFontSize(12);
          doc.text('Observations', 10, 20);
          
          (doc as any).autoTable({
              startY: 25,
              head: [['Profondeur', 'Description lithologique', 'Eau', 'Organoleptiques', 'PID', 'Échantillons']],
              body: fullSurvey.specific_data.observations.map((obs: any) => [
                  obs.depth ? `${obs.depth} m` : 'Non renseigné',
                  obs.lithology || 'Non renseigné',
                  obs.water || 'Non renseigné',
                  obs.organoleptic || 'Non renseigné',
                  obs.pid ? `${obs.pid} ppm` : 'Non renseigné',
                  obs.samples || 'Non renseigné'
              ]),
              theme: 'grid',
              styles: { fontSize: 8 },
              headStyles: { fillColor: [52, 81, 158], textColor: [255, 255, 255] }
          });
      }

      // Section gestion des échantillons
      const finalY = (doc as any).lastAutoTable?.finalY || 200;

      doc.setFontSize(12);
      doc.text('Gestion des échantillons', 10, finalY + 20);

      doc.setFontSize(10);
      doc.text('Transporteur:', 10, finalY + 30);
      doc.text(String(fullSurvey.specific_data?.sample_management?.transporter || 'Non renseigné'), 80, finalY + 30);

      doc.text('Laboratoire:', 10, finalY + 35);
      doc.text(String(fullSurvey.specific_data?.sample_management?.laboratory || 'Non renseigné'), 80, finalY + 35);

      doc.text('Conditionnement:', 10, finalY + 40);
      doc.text(String(fullSurvey.specific_data?.sample_management?.conditioning || 'Non renseigné'), 80, finalY + 40);

      doc.text('Date d\'envoi:', 10, finalY + 45);
      doc.text(fullSurvey.specific_data?.sample_management?.shippingDate
          ? format(new Date(fullSurvey.specific_data.sample_management.shippingDate), 'dd/MM/yyyy', { locale: fr })
          : 'Non renseigné', 80, finalY + 45);

      // Photos du sondage
      if (survey.specific_data?.mainPhotos?.length > 0) {
        doc.addPage();
        doc.setFontSize(12);
        doc.text('Documentation photographique', 10, 20);
        
        for (const photoUrl of survey.specific_data.mainPhotos) {
          try {
            const { data: { publicUrl } } = supabase.storage
              .from('survey-photos')
              .getPublicUrl(photoUrl);

            if (publicUrl) {
              const yPosition = 40;
              doc.addImage(publicUrl, 'JPEG', 10, yPosition, 180, 90);
              doc.setFontSize(10);
              doc.text('Photo du sondage', 10, yPosition + 95);
              doc.setFontSize(12);
            }
          } catch (err) {
            console.error('Error loading photo:', err);
          }
        }
      }

      // Sauvegarde du PDF
      const fileName = `sondage-${survey.specific_data?.name || 'sans-nom'}-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.pdf`;
      doc.save(fileName);

    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportPDF = async () => {
    if (exportingPDF) return;
    
    try {
      setExportingPDF(true);
      setError(null);

      const { data: siteData, error: siteError } = await supabase
        .from('sites')
        .select('*')
        .eq('id', siteId)
        .single();

      if (siteError) throw siteError;

      const pdf = new jsPDF();
      
      // En-tête avec logo
      pdf.addImage('https://i.imgur.com/nEpYFLo.png', 'PNG', 10, 10, 40, 20);
      pdf.setFontSize(16);
      pdf.text('Liste des fiches de terrain', 60, 20);
      
      // Informations du site
      pdf.setFontSize(10);
      pdf.text(`Site: ${siteData.name}`, 10, 40);
      pdf.text(`Localisation: ${siteData.location}, ${siteData.city}`, 10, 45);
      pdf.text(`N° de projet: ${siteData.project_number}`, 10, 50);

      // Tableau des fiches
      const tableData = surveys.map(survey => [
        format(new Date(survey.created_at), 'dd/MM/yyyy'),
        getSurveyName(survey),
        getSurveyTypeLabel(survey.type),
        survey.common_data?.field_team?.join(', ') || ''
      ]);

      (pdf as any).autoTable({
        startY: 60,
        head: [['Date', 'Nom', 'Type', 'Opérateurs']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [52, 81, 158], textColor: [255, 255, 255] }
      });

      pdf.save(`fiches-${siteData.project_number || 'sans-numero'}.pdf`);
    } catch (err) {
      console.error('Error exporting surveys:', err);
      setError('Une erreur est survenue lors de l\'exportation des fiches. Veuillez réessayer.');
    } finally {
      setExportingPDF(false);
    }
  };

  const getSurveyName = (survey: Survey) => {
    if (!survey.specific_data) return 'Prélèvement sans nom';

    switch (survey.type) {
      case 'soil':
        return survey.specific_data.name || survey.common_data?.sampling_name || 'Sondage';
      case 'groundwater':
        return survey.specific_data.name || 'Piézomètre sans nom';
      case 'pid':
        return 'Campagne PID';
      case 'gas':
        return survey.specific_data.name || survey.common_data?.sampling_name || 'Ouvrage sans nom';
      case 'ambient_air':
        return survey.specific_data.name || survey.common_data?.sampling_name || 'Prélèvement sans nom';
      case 'surface_water':
        return survey.specific_data.name || survey.common_data?.sampling_name || 'Prélèvement sans nom';
      default:
        return 'Prélèvement sans nom';
    }
  };

  const getSurveyTypeClass = (type: string) => {
    switch (type) {
      case 'soil':
        return 'bg-green-100 text-green-800';
      case 'groundwater':
        return 'bg-[#34519e] text-white';
      case 'pid':
        return 'bg-purple-100 text-purple-800';
      case 'gas':
        return 'bg-gray-100 text-gray-800';
      case 'surface_water':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getSurveyTypeLabel = (type: string) => {
    switch (type) {
      case 'soil':
        return 'Sol';
      case 'groundwater':
        return 'Eaux souterraines';
      case 'pid':
        return 'Campagne PID';
      case 'gas':
        return 'Gaz du sol';
      case 'surface_water':
        return 'Eaux superficielles';
      default:
        return 'Air Ambiant';
    }
  };

  const handleEditSurvey = (surveyId: string, type: string) => {
    navigate(`/sites/${siteId}/surveys/${type}/${surveyId}`);
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette fiche ? Cette action est irréversible.')) {
      return;
    }

    try {
      setDeletingSurvey(surveyId);
      const { error: deleteError } = await supabase
        .from('surveys')
        .delete()
        .eq('id', surveyId);

      if (deleteError) throw deleteError;

      setSurveys(prev => prev.filter(survey => survey.id !== surveyId));
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (err) {
      console.error('Error deleting survey:', err);
      setError('Une erreur est survenue lors de la suppression de la fiche');
    } finally {
      setDeletingSurvey(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link
            to="/"
            className="mr-4 p-2 rounded-full text-gray-600 hover:text-[#34519e] hover:bg-[#34519e]/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e]"
            aria-label="Retour à la liste des sites"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Fiches de Terrain</h1>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={handleExportPDF}
            disabled={exportingPDF}
            className="inline-flex items-center px-4 py-2 border border-[#34519e] text-sm font-medium rounded-md text-[#34519e] bg-white hover:bg-[#34519e]/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e]"
          >
            <Download className="h-5 w-5 mr-2" />
            Exporter les fiches
          </button>
          <Link
            to={`/sites/${siteId}/surveys/new`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#34519e] hover:bg-[#34519e]/90"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouvelle Fiche
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
              <p className="text-sm text-green-700">La fiche a été supprimée avec succès</p>
            </div>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#34519e] border-r-transparent"></div>
        </div>
      ) : surveys.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune fiche</h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par créer une nouvelle fiche de terrain.
            </p>
            <div className="mt-6">
              <Link
                to={`/sites/${siteId}/surveys/new`}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#34519e] hover:bg-[#34519e]/90"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nouvelle Fiche
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-gray-200">
            {surveys.map((survey) => (
              <li key={survey.id} className="relative hover:bg-gray-50">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between pr-8">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-2" />
                      <p className="text-sm font-medium text-[#34519e]">
                        {getSurveyName(survey)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSurveyTypeClass(survey.type)}`}>
                          {getSurveyTypeLabel(survey.type)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {survey.type === 'soil' && (
                          <button
                            onClick={() => handleGenerateSoilSurveyPDF(survey)}
                            disabled={exportingPDF}
                            className="p-2 rounded-full text-gray-400 hover:text-[#34519e] hover:bg-[#34519e]/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] transition-colors duration-200"
                          >
                            <span className="sr-only">Générer PDF</span>
                            <FileDown className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditSurvey(survey.id, survey.type)}
                          className="p-2 rounded-full text-gray-400 hover:text-[#34519e] hover:bg-[#34519e]/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] transition-colors duration-200"
                        >
                          <span className="sr-only">Modifier la fiche</span>
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSurvey(survey.id)}
                          disabled={deletingSurvey === survey.id}
                          className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                        >
                          <span className="sr-only">Supprimer la fiche</span>
                          <Trash2 className={`h-5 w-5 ${deletingSurvey === survey.id ? 'animate-pulse' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-end">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                      <p>
                        {format(new Date(survey.common_data?.date || survey.created_at), 'PPP', { locale: fr })}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}