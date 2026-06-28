import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function DashboardPage() {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" component="h1">
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
        Officer workspace — coming soon.
      </Typography>
    </Box>
  );
}
