import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { getUser, logout } from '../lib/auth';

const DRAWER_WIDTH = 260;

// Admin is IT oversight & executive monitoring only. This layout deliberately
// contains no "Applications" or "Title Management" navigation — those belong
// to the statutory processing offices and are guarded away from the admin role.
const NAV_ITEMS = [
  { to: '/admin/analytics', label: 'Dashboard', hint: 'Executive analytics' },
  { to: '/admin/audit', label: 'Ledger Integrity', hint: 'Hash-chain audit trail' },
  { to: '/admin/accounts', label: 'Official Accounts', hint: 'Provision & suspend officials' },
  { to: '/admin/settings', label: 'System Settings', hint: 'Rates, windows, maintenance' },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: '#141c26',
            color: 'grey.100',
            borderRight: 'none',
          },
        }}
      >
        <Box sx={{ px: 2.5, py: 3 }}>
          <Typography
            variant="h6"
            sx={{ fontFamily: '"Lora", serif', fontWeight: 700, lineHeight: 1.3 }}
          >
            System Administration
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            IT Oversight · Land Registration Platform
          </Typography>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

        <List sx={{ px: 1, py: 1.5, flexGrow: 1 }}>
          {NAV_ITEMS.map((item) => {
            const selected = location.pathname.startsWith(item.to);
            return (
              <ListItemButton
                key={item.to}
                component={Link}
                to={item.to}
                selected={selected}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(255,255,255,0.12)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' },
                  },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                }}
              >
                <ListItemText
                  primary={item.label}
                  secondary={item.hint}
                  slotProps={{
                    primary: { sx: { fontWeight: selected ? 700 : 500, fontSize: '0.9rem' } },
                    secondary: { sx: { color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem' } },
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <Box sx={{ p: 2.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {user?.email ?? 'Administrator'}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mb: 1.5 }}>
            Administrator · {user?.region ?? ''}
          </Typography>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            onClick={handleLogout}
            sx={{
              color: 'grey.100',
              borderColor: 'rgba(255,255,255,0.3)',
              '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.06)' },
            }}
          >
            Sign Out
          </Button>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'grey.50', minWidth: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
