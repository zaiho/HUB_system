import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Sites } from './pages/Sites';
import { Archives } from './pages/Archives';
import { NewSite } from './pages/NewSite';
import { SiteSurveys } from './pages/SiteSurveys';
import { NewSurvey } from './pages/NewSurvey';
import { Settings } from './pages/Settings';
import { SoilSurveyForm } from './pages/surveys/SoilSurveyForm';
import { GroundwaterSurveyForm } from './pages/surveys/GroundwaterSurveyForm';
import { GasSurveyForm } from './pages/surveys/GasSurveyForm';
import { PIDSurveyForm } from './pages/surveys/PIDSurveyForm';
import { AmbientAirSurveyForm } from './pages/surveys/AmbientAirSurveyForm';
import { SurfaceWaterSurveyForm } from './pages/surveys/SurfaceWaterSurveyForm';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Sites />} />
            <Route path="archives" element={<Archives />} />
            <Route path="settings" element={<Settings />} />
            <Route path="sites/new" element={<NewSite />} />
            <Route path="sites/:siteId/edit" element={<NewSite />} />
            <Route path="sites/:siteId" element={<SiteSurveys />} />
            <Route path="sites/:siteId/surveys/new" element={<NewSurvey />} />
            <Route path="sites/:siteId/surveys/soil/new" element={<SoilSurveyForm />} />
            <Route path="sites/:siteId/surveys/soil/:surveyId" element={<SoilSurveyForm />} />
            <Route path="sites/:siteId/surveys/groundwater/new" element={<GroundwaterSurveyForm />} />
            <Route path="sites/:siteId/surveys/groundwater/:surveyId" element={<GroundwaterSurveyForm />} />
            <Route path="sites/:siteId/surveys/gas/new" element={<GasSurveyForm />} />
            <Route path="sites/:siteId/surveys/gas/:surveyId" element={<GasSurveyForm />} />
            <Route path="sites/:siteId/surveys/pid/new" element={<PIDSurveyForm />} />
            <Route path="sites/:siteId/surveys/pid/:surveyId" element={<PIDSurveyForm />} />
            <Route path="sites/:siteId/surveys/ambient_air/new" element={<AmbientAirSurveyForm />} />
            <Route path="sites/:siteId/surveys/ambient_air/:surveyId" element={<AmbientAirSurveyForm />} />
            <Route path="sites/:siteId/surveys/surface_water/new" element={<SurfaceWaterSurveyForm />} />
            <Route path="sites/:siteId/surveys/surface_water/:surveyId" element={<SurfaceWaterSurveyForm />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}