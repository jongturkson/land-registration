import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/home', { replace: true });
  }

  return (
    <AppBar position="static" color="primary" elevation={2}>
      <Toolbar>
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
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.85 }}>
            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6L23 9 12 3zm-1 12.99L7 13.5v-3.42L11 12v3.99zm2 0V12l4-1.92v3.42L13 15.99z" />
          </svg>
          <Typography variant="h6" component="span" sx={{ fontFamily: "'Lora', serif", fontWeight: 600 }}>
            Land Registration Portal
          </Typography>
        </Box>

        <Button component={Link} to="/verify" color="inherit" size="small" sx={{ mr: 1 }}>
          Verify Title
        </Button>
        <Button component={Link} to="/bulletin" color="inherit" size="small" sx={{ mr: 1 }}>
          Public Bulletin
        </Button>

        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ opacity: 0.85, display: { xs: 'none', sm: 'block' } }}>
              {user.full_name}
            </Typography>
            <Button
              color="inherit"
              variant="outlined"
              size="small"
              onClick={handleLogout}
              sx={{ borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white' } }}
            >
              Sign Out
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button component={Link} to="/login" color="inherit" size="small">
              Sign In
            </Button>
            <Button
              component={Link}
              to="/register"
              color="inherit"
              variant="outlined"
              size="small"
              sx={{ borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white' } }}
            >
              Register
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
