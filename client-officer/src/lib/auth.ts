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

export function logout(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('officer_user');
}
