export interface OfficerUser {
  id: string;
  email: string;
  role: string;
  region: string;
}

export function getUser(): OfficerUser | null {
  const raw = localStorage.getItem('officer_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OfficerUser;
  } catch {
    return null;
  }
}

export function storeAuth(
  accessToken: string,
  refreshToken: string,
  user: OfficerUser,
): void {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
  localStorage.setItem('officer_user', JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('access_token');
}

// Each role's home workspace. Roles with no workspace yet (notary, receiver)
// land back on the login page rather than an endless redirect between guards.
export function homeRouteFor(role: string | undefined): string {
  switch (role) {
    case 'admin':
      return '/admin/analytics';
    case 'surveyor':
      return '/survey';
    case 'sub_divisional_officer':
    case 'divisional_delegate':
    case 'registrar':
    case 'regional_delegate':
    case 'governor':
    case 'chief':
      return '/dashboard';
    default:
      return '/login';
  }
}

export function logout(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('officer_user');
}
