import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ApplicationDetail from './pages/ApplicationDetail';
import SurveyorWorkspace from './pages/SurveyorWorkspace';
import SurveyorDetail from './pages/SurveyorDetail';
import TitleManagement from './pages/TitleManagement';
import AuditLedger from './pages/AuditLedger';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import SystemSettings from './pages/admin/SystemSettings';
import SurveyorRoute from './components/SurveyorRoute';
import RoleRoute from './components/RoleRoute';
import AppShell from './components/AppShell';
import AdminLayout from './layouts/AdminLayout';

// Office roles that process application files. Admin is deliberately absent —
// IT oversight and executive monitoring only, in its own /admin workspace.
const FILE_PROCESSING_ROLES = [
  'sub_divisional_officer',
  'divisional_delegate',
  'registrar',
  'regional_delegate',
  'governor',
  'chief',
];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Application processing — offices along the statutory chain */}
      <Route element={<RoleRoute roles={FILE_PROCESSING_ROLES} />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/applications/:id" element={<ApplicationDetail />} />
        </Route>
      </Route>

      {/* Conservateur Foncier tools — registry consultation & cancellation */}
      <Route element={<RoleRoute roles={['registrar']} />}>
        <Route element={<AppShell />}>
          <Route path="/titles" element={<TitleManagement />} />
          <Route path="/audit" element={<AuditLedger />} />
        </Route>
      </Route>

      {/* Oversight analytics */}
      <Route element={<RoleRoute roles={['registrar', 'governor']} />}>
        <Route element={<AppShell />}>
          <Route path="/analytics" element={<AdminDashboard />} />
        </Route>
      </Route>

      {/* Admin console — IAM, settings, ledger & analytics in its own layout */}
      <Route element={<RoleRoute roles={['admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/analytics" element={<AdminDashboard />} />
          <Route path="/admin/audit" element={<AuditLedger />} />
          <Route path="/admin/accounts" element={<UserManagement />} />
          <Route path="/admin/settings" element={<SystemSettings />} />
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
