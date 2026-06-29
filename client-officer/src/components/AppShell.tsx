import { Outlet, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { getUser, logout } from '../lib/auth';

export default function AppShell() {
  const navigate = useNavigate();
  const user = getUser();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" elevation={2}>
        <Toolbar>
          <Typography
            variant="h6"
            sx={{ fontFamily: '"Lora", serif', fontWeight: 700, flexGrow: 1 }}
          >
            Land Registry — Officer Portal
          </Typography>
          {user && (
            <Typography variant="body2" sx={{ mr: 3, opacity: 0.85, textTransform: 'capitalize' }}>
              {user.role.replace(/_/g, ' ')} · {user.region}
            </Typography>
          )}
          <Button color="inherit" onClick={handleLogout}>
            Sign out
          </Button>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1, bgcolor: 'grey.50' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
