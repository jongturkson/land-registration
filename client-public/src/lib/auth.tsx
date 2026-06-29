import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface AuthUser {
  id: string;
  role: string;
  region: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('citizen_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);

  function setAuth(token: string, authUser: AuthUser) {
    localStorage.setItem('access_token', token);
    localStorage.setItem('citizen_user', JSON.stringify(authUser));
    setUser(authUser);
  }

  function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('citizen_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
