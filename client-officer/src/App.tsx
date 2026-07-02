import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ApplicationDetail from './pages/ApplicationDetail';
import SurveyorWorkspace from './pages/SurveyorWorkspace';
import SurveyorDetail from './pages/SurveyorDetail';
import TitleManagement from './pages/TitleManagement';
import TitleSubdivision from './pages/TitleSubdivision';
import AuditLedger from './pages/AuditLedger';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import SurveyorRoute from './components/SurveyorRoute';
import AppShell from './components/AppShell';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Officer routes — any authenticated user */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/applications/:id" element={<ApplicationDetail />} />
          <Route path="/titles" element={<TitleManagement />} />
          <Route path="/titles/:title_no/subdivide" element={<TitleSubdivision />} />
          <Route path="/audit" element={<AuditLedger />} />
          <Route path="/analytics" element={<AdminDashboard />} />
        </Route>
      </Route>

      {/* Surveyor-only routes */}
      <Route element={<SurveyorRoute />}>
        <Route element={<AppShell />}>
          <Route path="/survey" element={<SurveyorWorkspace />} />
          <Route path="/survey/:id" element={<SurveyorDetail />} />
        </Route>
      </Route>
    </Routes>
  );
}
