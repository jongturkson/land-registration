import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated, getUser } from '../lib/auth';

export default function SurveyorRoute() {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  const user = getUser();
  if (user?.role !== 'surveyor') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
