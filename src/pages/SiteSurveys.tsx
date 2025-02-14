import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, FileText, Calendar, AlertCircle, ArrowLeft, PencilIcon, Trash2, CheckCircle, Download, FileDown, FileOutput } from 'lucide-react';
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
  const [successMessage, setSuccessMessage] = useState('');
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingSurveyPDF, setExportingSurveyPDF] = useState<string | null>(null);

  const handleGenerateSurfaceWaterSurveyPDF = async (survey: Survey) => {
    if (!survey || survey.type !== 'surface_water') return;
    
    try {
      setExportingSurveyPDF(survey.id);
      setError(null);

      // Récupérer les données complètes du sondage
      const { data: fullSurvey, error: surveyError } = await supabase
        .from('surveys')
        .select('id, site_id, type, created_at, created_by, common_data, specific_data')
        .eq('id', survey.id)
        .single();

      if (surveyError) throw surveyError;

      // Récupérer les informations du site
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
      doc.text('Fiche de prélèvement d\'Eaux Superficielles', 45, 20);

      // Informations générales
      doc.setFontSize(12);
      doc.text('Informations générales', 10, 40);
      
      doc.setFontSize(10);
      doc.text('Nom du prélèvement:', 10, 50);
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

      // Conditions météorologiques
      doc.setFontSize(12);
      doc.text('Conditions météorologiques', 10, 90);
      
      doc.setFontSize(10);
      doc.text('Date:', 10, 100);
      doc.text(format(new Date(fullSurvey.specific_data?.generalInfo?.date || fullSurvey.created_at), 'dd/MM/yyyy', { locale: fr }), 60, 100);

      doc.text('Heure:', 10, 105);
      doc.text(fullSurvey.specific_data?.generalInfo?.time || 'Non renseigné', 60, 105);

      doc.text('Température de l\'air:', 10, 110);
      doc.text(`${fullSurvey.specific_data?.generalInfo?.airTemperature || 'Non renseigné'} °C`, 60, 110);

      doc.text('Conditions météo:', 10, 115);
      doc.text(String(fullSurvey.specific_data?.generalInfo?.weatherCondition || 'Non renseigné'), 60, 115);

      // Description de la station
      doc.addPage();
      doc.setFontSize(12);
      doc.text('Description de la station de prélèvement', 10, 20);

      doc.setFontSize(10);
      doc.text('Description:', 10, 30);
      const description = doc.splitTextToSize(
        fullSurvey.specific_data?.stationDescription?.description || 'Non renseigné',
        130
      );
      doc.text(description, 60, 30);

      doc.text('Type d\'eau:', 10, 45);
      doc.text(String(fullSurvey.specific_data?.stationDescription?.waterType || 'Non renseigné'), 60, 45);

      doc.text('Débit estimé:', 10, 50);
      doc.text(String(fullSurvey.specific_data?.stationDescription?.estimatedFlow || 'Non renseigné'), 60, 50);

      doc.text('Type d\'écoulement:', 10, 55);
      doc.text(String(fullSurvey.specific_data?.stationDescription?.flowType || 'Non renseigné'), 60, 55);

      // Observations de terrain
      doc.setFontSize(12);
      doc.text('Observations de terrain', 10, 70);

      doc.setFontSize(10);
      doc.text('Turbidité:', 10, 80);
      doc.text(String(fullSurvey.specific_data?.fieldObservations?.turbidity || 'Non renseigné'), 60, 80);

      doc.text('Couleur de l\'eau:', 10, 85);
      doc.text(String(fullSurvey.specific_data?.fieldObservations?.waterColor || 'Non renseigné'), 60, 85);

      doc.text('Odeur de l\'eau:', 10, 90);
      doc.text(String(fullSurvey.specific_data?.fieldObservations?.waterOdor || 'Non renseigné'), 60, 90);

      doc.text('Présence de:', 10, 95);
      const observations = [];
      if (fullSurvey.specific_data?.fieldObservations?.hasLeavesMoss) observations.push('Feuilles/mousses');
      if (fullSurvey.specific_data?.fieldObservations?.hasFloating) observations.push('Flottants');
      if (fullSurvey.specific_data?.fieldObservations?.hasShade) observations.push('Ombrage');
      doc.text(observations.join(', ') || 'Aucune observation particulière', 60, 95);

      // Paramètres mesurés
      doc.addPage();
      doc.setFontSize(12);
      doc.text('Paramètres mesurés', 10, 20);

      const parameters = fullSurvey.specific_data?.parameters || {};
      (doc as any).autoTable({
        startY: 30,
        head: [['Paramètre', 'Début', 'Intermédiaire', 'Fin']],
        body: [
          ['Heure', parameters.time?.start || '-', parameters.time?.intermediate || '-', parameters.time?.end || '-'],
          ['Température (°C)', parameters.temperature?.start || '-', parameters.temperature?.intermediate || '-', parameters.temperature?.end || '-'],
          ['Conductivité', parameters.conductivity?.start || '-', parameters.conductivity?.intermediate || '-', parameters.conductivity?.end || '-'],
          ['pH', parameters.ph?.start || '-', parameters.ph?.intermediate || '-', parameters.ph?.end || '-'],
          ['Redox (mV)', parameters.redox?.start || '-', parameters.redox?.intermediate || '-', parameters.redox?.end || '-']
        ],
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [52, 81, 158], textColor: [255, 255, 255] }
      });

      // Prélèvements
      doc.setFontSize(12);
      doc.text('Prélèvements', 10, 100);

      doc.setFontSize(10);
      doc.text('Type de prélèvement:', 10, 110);
      doc.text(String(fullSurvey.specific_data?.sampling?.type || 'Non renseigné'), 80, 110);

      doc.text('Matériel utilisé:', 10, 115);
      doc.text(String(fullSurvey.specific_data?.sampling?.equipment || 'Non renseigné'), 80, 115);

      doc.text('Profondeur de prélèvement:', 10, 120);
      doc.text(`${fullSurvey.specific_data?.sampling?.depth || 'Non renseigné'} m`, 80, 120);

      // Conditionnement et transport
      doc.addPage();
      doc.setFontSize(12);
      doc.text('Conditionnement et transport', 10, 20);

      doc.setFontSize(10);
      doc.text('Conditionnement:', 10, 30);
      doc.text(String(fullSurvey.specific_data?.sampleManagement?.conditioning || 'Non renseigné'), 80, 30);

      doc.text('Laboratoire:', 10, 35);
      doc.text(String(fullSurvey.specific_data?.sampleManagement?.laboratory || 'Non renseigné'), 80, 35);

      doc.text('Transporteur:', 10, 40);
      doc.text(String(fullSurvey.specific_data?.sampleManagement?.transporter || 'Non renseigné'), 80, 40);

      doc.text('Date d\'envoi:', 10, 45);
      const shippingDate = fullSurvey.specific_data?.sampleManagement?.shippingDate
        ? format(new Date(fullSurvey.specific_data.sampleManagement.shippingDate), 'dd/MM/yyyy', { locale: fr })
        : 'Non renseigné';
      doc.text(shippingDate, 80, 45);

      // Sauvegarde du PDF
      const fileName = `eaux-superficielles-${fullSurvey.specific_data?.name || 'sans-nom'}-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.pdf`;
      doc.save(fileName);

    } catch (err) {
      console.error('Error generating surface water survey PDF:', err);
      setError('Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      setExportingSurveyPDF(null);
    }
  };

  const handleGenerateGroundwaterSurveyPDF = async (survey: Survey) => {
    if (!survey || survey.type !== 'groundwater') return;
    
    try {
      setExportingSurveyPDF(survey.id);
      setError(null);

      // Récupérer les données complètes du sondage
      const { data: fullSurvey, error: surveyError } = await supabase
        .from('surveys')
        .select('id, site_id, type, created_at, created_by, common_data, specific_data')
        .eq('id', survey.id)
        .single();

      if (surveyError) throw surveyError;

      // Récupérer les informations du site
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
      doc.text('Fiche de prélèvement d\'Eaux Souterraines', 45, 20);

      // Informations générales
      doc.setFontSize(12);
      doc.text('Informations générales', 10, 40);
      
      doc.setFontSize(10);
      doc.text('Nom du piézomètre:', 10, 50);
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

      // Conditions météorologiques
      doc.setFontSize(12);
      doc.text('Conditions météorologiques', 10, 90);
      
      doc.setFontSize(10);
      doc.text('Date:', 10, 100);
      doc.text(format(new Date(fullSurvey.common_data?.date || fullSurvey.created_at), 'dd/MM/yyyy', { locale: fr }), 60, 100);

      doc.text('Heure:', 10, 105);
      doc.text(fullSurvey.common_data?.time || 'Non renseigné', 60, 105);

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

      // Caractéristiques de l'ouvrage
      doc.addPage();
      doc.setFontSize(12);
      doc.text('Caractéristiques de l\'ouvrage', 10, 20);

      doc.setFontSize(10);
      doc.text('Profondeur totale:', 10, 30);
      doc.text(`${fullSurvey.specific_data?.well_characteristics?.total_depth || 'Non renseigné'} m`, 80, 30);

      doc.text('Niveau d\'eau:', 10, 35);
      doc.text(`${fullSurvey.specific_data?.well_characteristics?.water_level || 'Non renseigné'} m`, 80, 35);

      doc.text('Diamètre:', 10, 40);
      doc.text(`${fullSurvey.specific_data?.well_characteristics?.diameter || 'Non renseigné'} mm`, 80, 40);

      doc.text('Type de tubage:', 10, 45);
      doc.text(String(fullSurvey.specific_data?.well_characteristics?.casing_type || 'Non renseigné'), 80, 45);

      // Purge
      doc.setFontSize(12);
      doc.text('Purge', 10, 60);

      doc.setFontSize(10);
      doc.text('Volume d\'eau purgé:', 10, 70);
      doc.text(`${fullSurvey.specific_data?.purge?.volume || 'Non renseigné'} L`, 80, 70);

      doc.text('Débit de purge:', 10, 75);
      doc.text(`${fullSurvey.specific_data?.purge?.flow_rate || 'Non renseigné'} L/min`, 80, 75);

      doc.text('Durée de purge:', 10, 80);
      doc.text(`${fullSurvey.specific_data?.purge?.duration || 'Non renseigné'} min`, 80, 80);

      // Paramètres physico-chimiques
      doc.setFontSize(12);
      doc.text('Paramètres physico-chimiques', 10, 95);

      const parameters = fullSurvey.specific_data?.parameters || {};
      (doc as any).autoTable({
        startY: 100,
        head: [['Paramètre', 'Début', 'Milieu', 'Fin']],
        body: [
          ['pH', parameters.ph?.start || '-', parameters.ph?.middle || '-', parameters.ph?.end || '-'],
          ['Température (°C)', parameters.temperature?.start || '-', parameters.temperature?.middle || '-', parameters.temperature?.end || '-'],
          ['Conductivité (µS/cm)', parameters.conductivity?.start || '-', parameters.conductivity?.middle || '-', parameters.conductivity?.end || '-'],
          ['O2 dissous (mg/L)', parameters.dissolved_oxygen?.start || '-', parameters.dissolved_oxygen?.middle || '-', parameters.dissolved_oxygen?.end || '-'],
          ['Redox (mV)', parameters.redox?.start || '-', parameters.redox?.middle || '-', parameters.redox?.end || '-']
        ],
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [52, 81, 158], textColor: [255, 255, 255] }
      });

      // Observations organoleptiques
      doc.addPage();
      doc.setFontSize(12);
      doc.text('Observations organoleptiques', 10, 20);

      doc.setFontSize(10);
      doc.text('Couleur:', 10, 30);
      doc.text(String(fullSurvey.specific_data?.organoleptic?.color || 'Non renseigné'), 80, 30);

      doc.text('Odeur:', 10, 35);
      doc.text(String(fullSurvey.specific_data?.organoleptic?.odor || 'Non renseigné'), 80, 35);

      doc.text('Turbidité:', 10, 40);
      doc.text(String(fullSurvey.specific_data?.organoleptic?.turbidity || 'Non renseigné'), 80, 40);

      doc.text('Phase libre:', 10, 45);
      doc.text(String(fullSurvey.specific_data?.organoleptic?.free_phase || 'Non renseigné'), 80, 45);

      // Prélèvements
      doc.setFontSize(12);
      doc.text('Prélèvements', 10, 60);

      doc.setFontSize(10);
      doc.text('Méthode de prélèvement:', 10, 70);
      doc.text(String(fullSurvey.specific_data?.sampling?.method || 'Non renseigné'), 80, 70);

      doc.text('Profondeur de prélèvement:', 10, 75);
      doc.text(`${fullSurvey.specific_data?.sampling?.depth || 'Non renseigné'} m`, 80, 75);

      doc.text('Débit de prélèvement:', 10, 80);
      doc.text(`${fullSurvey.specific_data?.sampling?.flow_rate || 'Non renseigné'} L/min`, 80, 80);

      // Conditionnement et transport
      doc.setFontSize(12);
      doc.text('Conditionnement et transport', 10, 95);

      doc.setFontSize(10);
      doc.text('Laboratoire:', 10, 105);
      doc.text(String(fullSurvey.specific_data?.laboratory?.name || 'Non renseigné'), 80, 105);

      doc.text('Conditionnement:', 10, 110);
      doc.text(String(fullSurvey.specific_data?.laboratory?.packaging || 'Non renseigné'), 80, 110);

      doc.text('Transporteur:', 10, 115);
      doc.text(String(fullSurvey.specific_data?.laboratory?.transporter || 'Non renseigné'), 80, 115);

      doc.text('Date d\'envoi:', 10, 120);
      const deliveryDate = fullSurvey.specific_data?.laboratory?.deliveryDate
        ? format(new Date(fullSurvey.specific_data.laboratory.deliveryDate), 'dd/MM/yyyy', { locale: fr })
        : 'Non renseigné';
      doc.text(deliveryDate, 80, 120);

      doc.text('Analyses à réaliser:', 10, 125);
      const analyses = doc.splitTextToSize(
        fullSurvey.specific_data?.laboratory?.analyses || 'Non renseigné',
        100
      );
      doc.text(analyses, 80, 125);

      // Sauvegarde du PDF
      const fileName = `eaux-souterraines-${fullSurvey.specific_data?.name || 'sans-nom'}-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.pdf`;
      doc.save(fileName);

    } catch (err) {
      console.error('Error generating groundwater survey PDF:', err);
      setError('Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      setExportingSurveyPDF(null);
    }
  };

  const handleGenerateAirSurveyPDF = async (survey: Survey) => {
    if (!survey || survey.type !== 'ambient_air') return;
    
    try {
      setExportingSurveyPDF(survey.id);
      setError(null);

      // Récupérer les données complètes du sondage
      const { data: fullSurvey, error: surveyError } = await supabase
        .from('surveys')
        .select('id, site_id, type, created_at, created_by, common_data, specific_data')
        .eq('id', survey.id)
        .single();

      if (surveyError) throw surveyError;

      // Récupérer les informations du site
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
      doc.text('Fiche prélèvement d\'Air Ambiant', 45, 20);

      // Informations générales
      doc.setFontSize(12);
      doc.text('Informations générales', 10, 40);
      
      doc.setFontSize(10);
      doc.text('Nom du prélèvement:', 10, 50);
      doc.text(String(fullSurvey.specific_data?.samplingName || 'Non renseigné'), 60, 50);

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

      // Localisation
      doc.setFontSize(12);
      doc.text('Localisation', 10, 90);
      
      doc.setFontSize(10);
      doc.text('Pièce:', 10, 100);
      doc.text(String(fullSurvey.specific_data?.location?.room || 'Non renseigné'), 60, 100);

      doc.text('Position dans la pièce:', 10, 105);
      doc.text(String(fullSurvey.specific_data?.location?.position || 'Non renseigné'), 60, 105);

      doc.text('Coordonnées GPS:', 10, 110);
      doc.text(`Lat: ${fullSurvey.specific_data?.location?.coordinates?.latitude || 'Non renseigné'}`, 60, 110);
      doc.text(`Long: ${fullSurvey.specific_data?.location?.coordinates?.longitude || 'Non renseigné'}`, 60, 115);

      // Conditions météorologiques
      doc.addPage();
      doc.setFontSize(12);
      doc.text('Conditions météorologiques', 10, 20);
      
      doc.setFontSize(10);
      doc.text('Description:', 10, 30);
      doc.text(String(fullSurvey.specific_data?.weatherConditions?.description || 'Non renseigné'), 80, 30);

      doc.text('T°C ext:', 10, 35);
      doc.text(`${fullSurvey.specific_data?.weatherConditions?.externalTemp || 'Non renseigné'}°C`, 80, 35);

      doc.text('T°C int:', 10, 40);
      doc.text(`${fullSurvey.specific_data?.weatherConditions?.internalTemp || 'Non renseigné'}°C`, 80, 40);

      doc.text('Pression:', 10, 45);
      doc.text(`${fullSurvey.specific_data?.weatherConditions?.pressure || 'Non renseigné'} Pa`, 80, 45);

      doc.text('Humidité:', 10, 50);
      doc.text(`${fullSurvey.specific_data?.weatherConditions?.humidity || 'Non renseigné'}%`, 80, 50);

      doc.text('Vent:', 10, 55);
      doc.text(String(fullSurvey.specific_data?.weatherConditions?.windSpeedDirection || 'Non renseigné'), 80, 55);

      // Description du prélèvement
      doc.setFontSize(12);
      doc.text('Description du prélèvement', 10, 70);

      doc.setFontSize(10);
      doc.text('Type d\'échantillonnage:', 10, 80);
      doc.text(String(fullSurvey.specific_data?.sampling?.type || 'Non renseigné'), 80, 80);

      doc.text('Nombre de supports:', 10, 85);
      doc.text(String(fullSurvey.specific_data?.sampling?.supportCount || 'Non renseigné'), 80, 85);

      doc.text('Nature des supports:', 10, 90);
      doc.text(String(fullSurvey.specific_data?.sampling?.supportType || 'Non renseigné'), 80, 90);

      doc.text('Description de l\'installation:', 10, 95);
      const installDesc = doc.splitTextToSize(
        fullSurvey.specific_data?.sampling?.installationDescription || 'Non renseigné',
        100
      );
      doc.text(installDesc, 80, 95);

      doc.text('Hauteur de l\'ouvrage:', 10, 105);
      doc.text(`${fullSurvey.specific_data?.sampling?.height || 'Non renseigné'} m`, 80, 105);

      doc.text('Ventilation:', 10, 110);
      doc.text(fullSurvey.specific_data?.sampling?.ventilation ? 'Oui' : 'Non', 80, 110);

      // Mesures semi-quantitatives
      doc.addPage();
      doc.setFontSize(12);
      doc.text('Mesures semi-quantitatives', 10, 20);

      const measurements = fullSurvey.specific_data?.measurements || {};
      (doc as any).autoTable({
        startY: 30,
        head: [['Paramètre', 'Valeur']],
        body: [
          ['PID', `${measurements.pid || 'Non renseigné'} ppmV`],
          ['O2', `${measurements.o2 || 'Non renseigné'} %`],
          ['H2S', `${measurements.h2s || 'Non renseigné'} ppmV`],
          ['CH4', `${measurements.ch4 || 'Non renseigné'} %`],
          ['CO', `${measurements.co || 'Non renseigné'} ppmV`]
        ],
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [52, 81, 158], textColor: [255, 255, 255] }
      });

      // Contrôle de débit
      doc.setFontSize(12);
      doc.text('Contrôle de débit', 10, 80);

      const flow = fullSurvey.specific_data?.flow || {};
      (doc as any).autoTable({
        startY: 85,
        head: [['Paramètre', 'Début', 'Intermédiaire', 'Fin']],
        body: [
          ['Heure', flow.startTime || '-', flow.endTime || '-', flow.duration || '-'],
          ['Débit', 
            flow.flowRates?.start || '-',
            flow.flowRates?.intermediate || '-',
            flow.flowRates?.end || '-'
          ]
        ],
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [52, 81, 158], textColor: [255, 255, 255] }
      });

      doc.setFontSize(10);
      doc.text('Débit moyen retenu:', 10, 130);
      doc.text(`${flow.averageFlow || 'Non renseigné'} l/min`, 80, 130);

      doc.text('Volume total prélevé:', 10, 135);
      doc.text(`${flow.totalVolume || 'Non renseigné'} l`, 80, 135);

      // Conditionnement et transport
      doc.addPage();
      doc.setFontSize(12);
      doc.text('Conditionnement et transport', 10, 20);

      doc.setFontSize(10);
      doc.text('Laboratoire:', 10, 30);
      doc.text(String(fullSurvey.specific_data?.laboratory?.name || 'Non renseigné'), 80, 30);

      doc.text('Conditionnement:', 10, 35);
      doc.text(String(fullSurvey.specific_data?.laboratory?.packaging || 'Non renseigné'), 80, 35);

      doc.text('Transporteur:', 10, 40);
      doc.text(String(fullSurvey.specific_data?.laboratory?.transporter || 'Non renseigné'), 80, 40);

      doc.text('Date d\'envoi:', 10, 45);
      const deliveryDate = fullSurvey.specific_data?.laboratory?.deliveryDate
        ? format(new Date(fullSurvey.specific_data.laboratory.deliveryDate), 'dd/MM/yyyy', { locale: fr })
        : 'Non renseigné';
      doc.text(deliveryDate, 80, 45);

      doc.text('Substances à analyser:', 10, 50);
      const substances = doc.splitTextToSize(
        fullSurvey.specific_data?.laboratory?.substancesToAnalyze || 'Non renseigné',
        100
      );
      doc.text(substances, 80, 50);

      // Sauvegarde du PDF
      const fileName = `air-ambiant-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.pdf`;
      doc.save(fileName);

    } catch (err) {
      console.error('Error generating ambient air survey PDF:', err);
      setError('Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      setExportingSurveyPDF(null);
    }
  };

  const handleGeneratePIDSurveyPDF = async (survey: Survey) => {
    if (!survey || survey.type !== 'pid') return;
    
    try {
      setExportingSurveyPDF(survey.id);
      setError(null);

      // Récupérer les données complètes du sondage
      const { data: fullSurvey, error: surveyError } = await supabase
        .from('surveys')
        .select('id, site_id, type, created_at, created_by, common_data, specific_data')
        .eq('id', survey.id)
        .single();

      if (surveyError) throw surveyError;

      // Récupérer les informations du site
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
      doc.text('Fiche de Campagne PID', 45, 20);

      // Informations générales
      doc.setFontSize(12);
      doc.text('Informations générales', 10, 40);
      
      doc.setFontSize(10);
      doc.text('Numéro d\'affaire:', 10, 50);
      doc.text(siteData.project_number || 'Non renseigné', 60, 50);

      doc.text('Client:', 10, 55);
      doc.text(siteData.name || 'Non renseigné', 60, 55);

      doc.text('Adresse et commune:', 10, 60);
      doc.text(`${siteData.location || ''}, ${siteData.city || 'Non renseigné'}`, 60, 60);

      doc.text('Chef de projet:', 10, 65);
      doc.text(siteData.project_manager || 'Non renseigné', 60, 65);

      doc.text('Opérateur:', 10, 70);
      doc.text(siteData.engineer_in_charge || 'Non renseigné', 60, 70);

      // Conditions météorologiques
      doc.setFontSize(12);
      doc.text('Conditions météorologiques', 10, 85);
      
      doc.setFontSize(10);
      doc.text('Date:', 10, 95);
      doc.text(format(new Date(fullSurvey.specific_data?.date || fullSurvey.created_at), 'dd/MM/yyyy', { locale: fr }), 60, 95);

      doc.text('Description:', 10, 100);
      doc.text(String(fullSurvey.specific_data?.weatherConditions?.description || 'Non renseigné'), 60, 100);

      doc.text('Température ext.:', 10, 105);
      doc.text(`${fullSurvey.specific_data?.weatherConditions?.externalTemp || 'Non renseigné'}°C`, 60, 105);

      doc.text('Température int.:', 10, 110);
      doc.text(`${fullSurvey.specific_data?.weatherConditions?.internalTemp || 'Non renseigné'}°C`, 60, 110);

      doc.text('Pression:', 10, 115);
      doc.text(`${fullSurvey.specific_data?.weatherConditions?.pressure || 'Non renseigné'} Pa`, 60, 115);

      doc.text('Humidité:', 10, 120);
      doc.text(`${fullSurvey.specific_data?.weatherConditions?.humidity || 'Non renseigné'}%`, 60, 120);

      // Description de l'ouvrage
      doc.setFontSize(12);
      doc.text('Description de l\'ouvrage', 110, 40);

      doc.setFontSize(10);
      doc.text('Type d\'ouvrage:', 110, 50);
      doc.text(fullSurvey.specific_data?.structureDescription?.type === 'temporary' ? 'Temporaire' : 'Permanent', 160, 50);

      doc.text('Description:', 110, 55);
      const description = doc.splitTextToSize(
        fullSurvey.specific_data?.structureDescription?.details || 'Non renseigné',
        80
      );
      doc.text(description, 160, 55);

      // Tableau des mesures
      doc.addPage();
      doc.setFontSize(12);
      doc.text('Mesures semi-quantitatives', 10, 20);

      const measurements = fullSurvey.specific_data?.measurements || [];
      if (measurements.length > 0) {
        (doc as any).autoTable({
          startY: 30,
          head: [['Localisation', 'PID (ppmV)', 'O2 (%)', 'H2S (ppmV)', 'CH4 (%)', 'CO (ppmV)']],
          body: measurements.map((m: any) => [
            m.location || 'Non renseigné',
            m.pid || 'Non renseigné',
            m.o2 || 'Non renseigné',
            m.h2s || 'Non renseigné',
            m.ch4 || 'Non renseigné',
            m.co || 'Non renseigné'
          ]),
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [52, 81, 158], textColor: [255, 255, 255] }
        });
      } else {
        doc.setFontSize(10);
        doc.text('Aucune mesure enregistrée', 10, 40);
      }

      // Sauvegarde du PDF
      const fileName = `campagne-pid-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.pdf`;
      doc.save(fileName);

    } catch (err) {
      console.error('Error generating PID survey PDF:', err);
      setError('Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      setExportingSurveyPDF(null);
    }
  };

  const handleGenerateGasSurveyPDF = async (survey: Survey) => {
    if (!survey || survey.type !== 'gas') return;
    
    try {
      setExportingSurveyPDF(survey.id);
      setError(null);

      // Récupérer les données complètes du sondage
      const { data: fullSurvey, error: surveyError } = await supabase
        .from('surveys')
        .select('id, site_id, type, created_at, created_by, common_data, specific_data')
        .eq('id', survey.id)
        .single();

      if (surveyError) throw surveyError;

      // Récupérer les informations du site
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
      doc.text('Fiche de prélèvement de Gaz du sol', 45, 20);

      // Informations générales
      doc.setFontSize(12);
      doc.text('Informations générales', 10, 40);
      
      doc.setFontSize(10);
      doc.text('Nom de l\'ouvrage:', 10, 50);
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

      // Conditions météorologiques
      doc.setFontSize(12);
      doc.text('Conditions météorologiques', 10, 90);
      
      doc.setFontSize(10);
      doc.text('Date:', 10, 100);
      doc.text(format(new Date(fullSurvey.common_data?.date || fullSurvey.created_at), 'dd/MM/yyyy', { locale: fr }), 60, 100);

      doc.text('Température ext.:', 10, 105);
      doc.text(`${fullSurvey.specific_data?.weatherConditions?.externalTemp || 'Non renseigné'}°C`, 60, 105);

      doc.text('Température int.:', 10, 110);
      doc.text(`${fullSurvey.specific_data?.weatherConditions?.internalTemp || 'Non renseigné'}°C`, 60, 110);

      doc.text('Pression:', 10, 115);
      doc.text(`${fullSurvey.specific_data?.weatherConditions?.pressure || 'Non renseigné'} Pa`, 60, 115);

      doc.text('Humidité:', 10, 120);
      doc.text(`${fullSurvey.specific_data?.weatherConditions?.humidity || 'Non renseigné'}%`, 60, 120);

      // Description de l'ouvrage
      doc.setFontSize(12);
      doc.text('Description de l\'ouvrage', 110, 40);

      doc.setFontSize(10);
      doc.text('Type d\'ouvrage:', 110, 50);
      doc.text(fullSurvey.specific_data?.structureDescription?.type === 'temporary' ? 'Temporaire' : 'Permanent', 160, 50);

      doc.text('Description:', 110, 55);
      const description = doc.splitTextToSize(
        fullSurvey.specific_data?.structureDescription?.details || 'Non renseigné',
        80
      );
      doc.text(description, 160, 55);

      // Informations sur le prélèvement
      doc.addPage();
      doc.setFontSize(12);
      doc.text('Informations sur le prélèvement', 10, 20);

      doc.setFontSize(10);
      doc.text('Type d\'échantillonnage:', 10, 30);
      doc.text(String(fullSurvey.specific_data?.sampling?.type || 'Non renseigné'), 80, 30);

      doc.text('Nombre de supports:', 10, 35);
      doc.text(String(fullSurvey.specific_data?.sampling?.supportCount || 'Non renseigné'), 80, 35);

      doc.text('Nature des supports:', 10, 40);
      doc.text(String(fullSurvey.specific_data?.sampling?.supportType || 'Non renseigné'), 80, 40);

      doc.text('Profondeur (m):', 10, 45);
      doc.text(String(fullSurvey.specific_data?.sampling?.depth || 'Non renseigné'), 80, 45);

      doc.text('Type d\'étanchéité:', 10, 50);
      doc.text(String(fullSurvey.specific_data?.sampling?.sealType || 'Non renseigné'), 80, 50);

      // Purge de l'ouvrage
      doc.setFontSize(12);
      doc.text('Purge de l\'ouvrage', 10, 70);

      doc.setFontSize(10);
      doc.text('Détails de la purge:', 10, 80);
      const purgeDetails = doc.splitTextToSize(
        fullSurvey.specific_data?.purge?.details || 'Non renseigné',
        180
      );
      doc.text(purgeDetails, 10, 85);

      // Tableau des mesures
      doc.setFontSize(12);
      doc.text('Mesures semi-quantitatives', 10, 110);

      const measurements = fullSurvey.specific_data?.purge?.measurements || {};
      (doc as any).autoTable({
        startY: 115,
        head: [['Paramètre', 'Valeur']],
        body: [
          ['PID', `${measurements.pid || 'Non renseigné'} ppmV`],
          ['O2', `${measurements.o2 || 'Non renseigné'} %`],
          ['H2S', `${measurements.h2s || 'Non renseigné'} ppmV`],
          ['CH4', `${measurements.ch4 || 'Non renseigné'} %`],
          ['CO', `${measurements.co || 'Non renseigné'} ppmV`]
        ],
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [52, 81, 158], textColor: [255, 255, 255] }
      });

      // Contrôle de débit
      doc.addPage();
      doc.setFontSize(12);
      doc.text('Contrôle de débit', 10, 20);

      const flow = fullSurvey.specific_data?.purge?.flow || {};
      (doc as any).autoTable({
        startY: 25,
        head: [['Paramètre', 'Début', 'Intermédiaire', 'Fin']],
        body: [
          ['Heure', flow.startTime || '-', flow.endTime || '-', flow.duration || '-'],
          ['Débit', 
            flow.flowRates?.start || '-',
            flow.flowRates?.intermediate || '-',
            flow.flowRates?.end || '-'
          ]
        ],
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [52, 81, 158], textColor: [255, 255, 255] }
      });

      doc.setFontSize(10);
      doc.text('Débit moyen retenu:', 10, 70);
      doc.text(`${flow.averageFlow || 'Non renseigné'} l/min`, 80, 70);

      doc.text('Volume total prélevé:', 10, 75);
      doc.text(`${flow.totalVolume || 'Non renseigné'} l`, 80, 75);

      // Conditionnement et transport
      doc.setFontSize(12);
      doc.text('Conditionnement et transport', 10, 90);

      doc.setFontSize(10);
      doc.text('Laboratoire:', 10, 100);
      doc.text(String(fullSurvey.specific_data?.laboratory?.name || 'Non renseigné'), 80, 100);

      doc.text('Conditionnement:', 10, 105);
      doc.text(String(fullSurvey.specific_data?.laboratory?.packaging || 'Non renseigné'), 80, 105);

      doc.text('Transporteur:', 10, 110);
      doc.text(String(fullSurvey.specific_data?.laboratory?.transporter || 'Non renseigné'), 80, 110);

      doc.text('Date d\'envoi:', 10, 115);
      const deliveryDate = fullSurvey.specific_data?.laboratory?.deliveryDate
        ? format(new Date(fullSurvey.specific_data.laboratory.deliveryDate), 'dd/MM/yyyy', { locale: fr })
        : 'Non renseigné';
      doc.text(deliveryDate, 80, 115);

      doc.text('Substances à analyser:', 10, 120);
      const substances = doc.splitTextToSize(
        fullSurvey.specific_data?.laboratory?.substancesToAnalyze || 'Non renseigné',
        120
      );
      doc.text(substances, 80, 120);

      // Sauvegarde du PDF
      const fileName = `gaz-${fullSurvey.specific_data?.name || 'sans-nom'}-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.pdf`;
      doc.save(fileName);

    } catch (err) {
      console.error('Error generating gas survey PDF:', err);
      setError('Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      setExportingSurveyPDF(null);
    }
  };

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
      setSuccessMessage('La fiche a été supprimée avec succès');
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
              <p className="text-sm text-green-700">{successMessage}</p>
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
                            disabled={exportingSurveyPDF === survey.id}
                            className="p-2 rounded-full text-gray-400 hover:text-[#34519e] hover:bg-[#34519e]/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] transition-colors duration-200"
                          >
                            <span className="sr-only">Générer PDF</span>
                            <FileDown className="h-5 w-5" />
                          </button>
                        )}
                        {survey.type === 'groundwater' && (
                          <button
                            onClick={() => handleGenerateGroundwaterSurveyPDF(survey)}
                            disabled={exportingSurveyPDF === survey.id}
                            className="p-2 rounded-full text-gray-400 hover:text-[#34519e] hover:bg-[#34519e]/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] transition-colors duration-200"
                          >
                            <span className="sr-only">Générer PDF</span>
                            <FileDown className="h-5 w-5" />
                          </button>
                        )}
                        {survey.type === 'gas' && (
                          <button
                            onClick={() => handleGenerateGasSurveyPDF(survey)}
                            disabled={exportingSurveyPDF === survey.id}
                            className="p-2 rounded-full text-gray-400 hover:text-[#34519e] hover:bg-[#34519e]/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] transition-colors duration-200"
                          >
                            <span className="sr-only">Générer PDF</span>
                            <FileDown className="h-5 w-5" />
                          </button>
                        )}
                        {survey.type === 'ambient_air' && (
                          <button
                            onClick={() => handleGenerateAirSurveyPDF(survey)}
                            disabled={exportingSurveyPDF === survey.id}
                            className="p-2 rounded-full text-gray-400 hover:text-[#34519e] hover:bg-[#34519e]/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] transition-colors duration-200"
                          >
                            <span className="sr-only">Générer PDF</span>
                            <FileDown className="h-5 w-5" />
                          </button>
                        )}
                        {survey.type === 'surface_water' && (
                          <button
                            onClick={() => handleGenerateWaterSurveyPDF(survey)}
                            disabled={exportingSurveyPDF === survey.id}
                            className="p-2 rounded-full text-gray-400 hover:text-[#34519e] hover:bg-[#34519e]/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] transition-colors duration-200"
                          >
                            <span className="sr-only">Générer PDF</span>
                            <FileDown className="h-5 w-5" />
                          </button>
                        )}
                        {survey.type === 'pid' && (
                          <button
                            onClick={() => handleGeneratePIDSurveyPDF(survey)}
                            disabled={exportingSurveyPDF === survey.id}
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