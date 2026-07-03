import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated, getUser, homeRouteFor } from '../lib/auth';

// "If something is not for you, it should not appear to you" — pages outside
// the signed-in officer's mandate redirect to their own workspace instead of
// rendering an empty shell that the API would refuse to populate anyway.
export default function RoleRoute({ roles }: { roles: string[] }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  const user = getUser();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to={homeRouteFor(user?.role)} replace />;
  }
  return <Outlet />;
}
