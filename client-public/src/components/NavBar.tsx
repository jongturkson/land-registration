import { useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import EditNoteIcon from '@mui/icons-material/EditNote';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CampaignIcon from '@mui/icons-material/Campaign';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import LanguageSwitcher from './LanguageSwitcher';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  function handleSignOutConfirmed() {
    setConfirmSignOut(false);
    setDrawerOpen(false);
    logout();
    navigate('/home', { replace: true });
  }

  function go(to: string) {
    setDrawerOpen(false);
    navigate(to);
  }

  // Section header inside the drawer
  function DrawerSection({ label }: { label: string }) {
    return (
      <Typography
        variant="overline"
        sx={{
          display: 'block',
          px: 2,
          pt: 2,
          pb: 0.5,
          color: 'text.secondary',
          letterSpacing: 1.5,
          fontWeight: 700,
        }}
      >
        {label}
      </Typography>
    );
  }

  const drawerItemSx = {
    mx: 1,
    my: 0.25,
    borderRadius: 1.5,
    '&:hover': { bgcolor: 'action.hover' },
  } as const;

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
          <Button component={Link} to="/how-it-works" color="inherit" size="small" sx={{ mr: 1 }}>
            {t('nav.howItWorks')}
          </Button>
          <Button component={Link} to="/verify" color="inherit" size="small" sx={{ mr: 1 }}>
            {t('nav.verify')}
          </Button>
          <Button component={Link} to="/bulletin" color="inherit" size="small" sx={{ mr: 1 }}>
            {t('nav.bulletin')}
          </Button>

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
                onClick={() => setConfirmSignOut(true)}
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
        slotProps={{ paper: { sx: { width: 300 } } }}
      >
        <Box sx={{ p: 2.5, bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="subtitle1" sx={{ fontFamily: "'Lora', serif", fontWeight: 700 }}>
            {t('nav.brand')}
          </Typography>
          {user && (
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
              {user.full_name}
            </Typography>
          )}
        </Box>

        <List sx={{ pt: 0.5 }}>
          {/* Services */}
          <DrawerSection label={t('nav.sections.services')} />
          <ListItemButton sx={drawerItemSx} onClick={() => go(user ? '/apply' : '/login')}>
            <ListItemIcon sx={{ minWidth: 38 }}><EditNoteIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary={t('nav.startApplication')} />
          </ListItemButton>
          <ListItemButton sx={drawerItemSx} onClick={() => go('/track')}>
            <ListItemIcon sx={{ minWidth: 38 }}><TravelExploreIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary={t('nav.track')} />
          </ListItemButton>
          <ListItemButton sx={drawerItemSx} onClick={() => go('/verify')}>
            <ListItemIcon sx={{ minWidth: 38 }}><VerifiedUserIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary={t('nav.verify')} />
          </ListItemButton>
          <ListItemButton sx={drawerItemSx} onClick={() => go('/bulletin')}>
            <ListItemIcon sx={{ minWidth: 38 }}><CampaignIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary={t('nav.bulletin')} />
          </ListItemButton>
          <ListItemButton sx={drawerItemSx} onClick={() => go('/how-it-works')}>
            <ListItemIcon sx={{ minWidth: 38 }}><HelpOutlineIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary={t('nav.howItWorks')} />
          </ListItemButton>

          {/* Account */}
          <DrawerSection label={t('nav.sections.account')} />
          {user ? (
            <>
              <ListItemButton sx={drawerItemSx} onClick={() => go('/my-applications')}>
                <ListItemIcon sx={{ minWidth: 38 }}><FolderSharedIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary={t('nav.myApplications')} />
              </ListItemButton>
              <ListItemButton
                sx={{ ...drawerItemSx, color: 'error.main' }}
                onClick={() => setConfirmSignOut(true)}
              >
                <ListItemIcon sx={{ minWidth: 38 }}>
                  <LogoutIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText primary={t('nav.signOut')} />
              </ListItemButton>
            </>
          ) : (
            <>
              <ListItemButton sx={drawerItemSx} onClick={() => go('/login')}>
                <ListItemIcon sx={{ minWidth: 38 }}><LoginIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary={t('nav.signIn')} />
              </ListItemButton>
              <ListItemButton sx={drawerItemSx} onClick={() => go('/register')}>
                <ListItemIcon sx={{ minWidth: 38 }}><PersonAddIcon fontSize="small" /></ListItemIcon>
                <ListItemText
                  primary={t('nav.register')}
                  slotProps={{ primary: { sx: { fontWeight: 700 } } }}
                />
              </ListItemButton>
            </>
          )}
        </List>
      </Drawer>

      {/* ── Sign-out confirmation ───────────────────────────────────── */}
      <Dialog open={confirmSignOut} onClose={() => setConfirmSignOut(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('nav.signOutConfirm.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('nav.signOutConfirm.body')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmSignOut(false)}>{t('nav.signOutConfirm.cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleSignOutConfirmed}>
            {t('nav.signOut')}
          </Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
}
