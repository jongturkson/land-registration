import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { getUser, logout } from '../lib/auth';
import LanguageSwitcher from './LanguageSwitcher';

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const user = getUser();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  // Strict role-based navigation — links outside the officer's mandate are
  // not rendered at all (mirrors the RoleRoute guards in App.tsx).
  function navLinksFor(role: string | undefined): { to: string; label: string }[] {
    const dashboard = { to: '/dashboard', label: t('shell.nav.dashboard') };
    const titles = { to: '/titles', label: t('shell.nav.titles') };
    const audit = { to: '/audit', label: t('shell.nav.audit') };
    const analytics = { to: '/analytics', label: t('shell.nav.analytics') };

    switch (role) {
      case 'registrar':
        return [dashboard, titles, audit, analytics];
      case 'governor':
        return [dashboard, analytics];
      case 'surveyor':
        return [];
      default:
        return [dashboard];
    }
  }
  const navLinks = navLinksFor(user?.role);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" elevation={2}>
        <Toolbar>
          <Typography
            variant="h6"
            sx={{ fontFamily: '"Lora", serif', fontWeight: 700, mr: 3 }}
          >
            {t('shell.appTitle')}
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 1 }}>
            {navLinks.map((link) => (
              <Button
                key={link.to}
                component={Link}
                to={link.to}
                color="inherit"
                size="small"
                sx={{
                  opacity: location.pathname.startsWith(link.to) ? 1 : 0.75,
                  fontWeight: location.pathname.startsWith(link.to) ? 700 : 400,
                }}
              >
                {link.label}
              </Button>
            ))}
          </Box>

          <LanguageSwitcher />

          {user && (
            <Typography variant="body2" sx={{ mr: 3, opacity: 0.85, textTransform: 'capitalize' }}>
              {user.role.replace(/_/g, ' ')} · {user.region}
            </Typography>
          )}
          <Button color="inherit" onClick={handleLogout}>
            {t('shell.signOut')}
          </Button>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1, bgcolor: 'grey.50' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
