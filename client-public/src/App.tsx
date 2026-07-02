import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';
import WelcomePage from './pages/WelcomePage';
import HowItWorks from './pages/HowItWorks';
import ApplyPage from './pages/ApplyPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BulletinBoard from './pages/BulletinBoard';
import VerificationPortal from './pages/VerificationPortal';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavBar />
      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>
    </Box>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<WelcomePage />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/apply"
          element={
            <ProtectedRoute>
              <ApplyPage />
            </ProtectedRoute>
          }
        />
        <Route path="/bulletin" element={<BulletinBoard />} />
        <Route path="/verify" element={<VerificationPortal />} />
        <Route path="/track" element={<Navigate to="/home" replace />} />
      </Routes>
    </Layout>
  );
}
