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

  // Registrar-only tools: title registry, cryptographic ledger, analytics
  const navLinks =
    user?.role === 'registrar'
      ? [
          { to: '/dashboard', label: t('shell.nav.dashboard') },
          { to: '/titles', label: t('shell.nav.titles') },
          { to: '/audit', label: t('shell.nav.audit') },
          { to: '/analytics', label: t('shell.nav.analytics') },
        ]
      : user?.role === 'surveyor'
        ? []
        : [{ to: '/dashboard', label: t('shell.nav.dashboard') }];

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
