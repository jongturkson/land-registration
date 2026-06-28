import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { Box, Button, Container, Typography } from '@mui/material';
import ApplyPage from './pages/ApplyPage';

function Home() {
  return (
    <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
      <Typography
        variant="h3"
        component="h1"
        gutterBottom
        sx={{ fontFamily: "'Lora', serif", fontWeight: 700 }}
      >
        Land Registration Portal
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Start your land title application online. Complete the wizard and receive an
        instant Récépissé reference number.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button
          component={Link}
          to="/apply"
          variant="contained"
          size="large"
          color="secondary"
        >
          Start Pre-Application
        </Button>
        <Button component={Link} to="/track" variant="outlined" size="large">
          Track My Application
        </Button>
      </Box>
    </Container>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<Home />} />
      <Route path="/apply" element={<ApplyPage />} />
      <Route path="/track" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
