import { useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import LanguageSwitcher from './LanguageSwitcher';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleLogout() {
    setDrawerOpen(false);
    logout();
    navigate('/home', { replace: true });
  }

  function go(to: string) {
    setDrawerOpen(false);
    navigate(to);
  }

  const navLinks = [
    { to: '/how-it-works', label: t('nav.howItWorks') },
    { to: '/verify', label: t('nav.verify') },
    { to: '/bulletin', label: t('nav.bulletin') },
  ];

  return (
    <AppBar position="static" color="primary" elevation={2}>
      <Toolbar sx={{ gap: 1 }}>
        {/* Brand — renders as a link, avoid Typography+component to sidestep MUI v9 type quirks */}
        <Box
          component={Link}
          to="/home"
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minWidth: 0, // let the brand text truncate on narrow screens
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.85, flexShrink: 0 }}>
            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6L23 9 12 3zm-1 12.99L7 13.5v-3.42L11 12v3.99zm2 0V12l4-1.92v3.42L13 15.99z" />
          </svg>
          <Typography
            variant="h6"
            component="span"
            noWrap
            sx={{
              fontFamily: "'Lora', serif",
              fontWeight: 600,
              fontSize: { xs: '1rem', sm: '1.25rem' },
            }}
          >
            {t('nav.brand')}
          </Typography>
        </Box>

        {/* ── Desktop navigation ────────────────────────────────────── */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
          {navLinks.map((link) => (
            <Button key={link.to} component={Link} to={link.to} color="inherit" size="small" sx={{ mr: 1 }}>
              {link.label}
            </Button>
          ))}

          <LanguageSwitcher />

          {user ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button component={Link} to="/my-applications" color="inherit" size="small">
                {t('nav.myApplications')}
              </Button>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                {user.full_name}
              </Typography>
              <Button
                color="inherit"
                variant="outlined"
                size="small"
                onClick={handleLogout}
                sx={{ borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white' } }}
              >
                {t('nav.signOut')}
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button component={Link} to="/login" color="inherit" size="small">
                {t('nav.signIn')}
              </Button>
              <Button
                component={Link}
                to="/register"
                color="inherit"
                variant="outlined"
                size="small"
                sx={{ borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white' } }}
              >
                {t('nav.register')}
              </Button>
            </Box>
          )}
        </Box>

        {/* ── Mobile: language toggle + hamburger ───────────────────── */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', flexShrink: 0 }}>
          <LanguageSwitcher />
          <IconButton
            color="inherit"
            edge="end"
            aria-label={t('nav.menu')}
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
          </IconButton>
        </Box>
      </Toolbar>

      {/* ── Mobile drawer menu ──────────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: 280 } } }}
      >
        <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="subtitle1" sx={{ fontFamily: "'Lora', serif", fontWeight: 700 }}>
            {t('nav.brand')}
          </Typography>
          {user && (
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
              {user.full_name}
            </Typography>
          )}
        </Box>
        <List sx={{ pt: 1 }}>
          {navLinks.map((link) => (
            <ListItemButton key={link.to} onClick={() => go(link.to)}>
              <ListItemText primary={link.label} />
            </ListItemButton>
          ))}
          <Divider sx={{ my: 1 }} />
          {user ? (
            <>
              <ListItemButton onClick={() => go('/my-applications')}>
                <ListItemText primary={t('nav.myApplications')} />
              </ListItemButton>
              <ListItemButton onClick={handleLogout}>
                <ListItemText primary={t('nav.signOut')} />
              </ListItemButton>
            </>
          ) : (
            <>
              <ListItemButton onClick={() => go('/login')}>
                <ListItemText primary={t('nav.signIn')} />
              </ListItemButton>
              <ListItemButton onClick={() => go('/register')}>
                <ListItemText primary={t('nav.register')} slotProps={{ primary: { sx: { fontWeight: 700 } } }} />
              </ListItemButton>
            </>
          )}
        </List>
      </Drawer>
    </AppBar>
  );
}
