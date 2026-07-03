import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { createOfficial, listOfficials, setOfficialStatus } from './users.controller';
import { getSettings, updateSettings } from './config.controller';

const router = Router();

// ── Identity & Access Management (admin only) ──────────────────────────────

router.post('/users', authMiddleware, authorize('system_users', 'manage'), createOfficial);
router.get('/users', authMiddleware, authorize('system_users', 'manage'), listOfficials);
router.put(
  '/users/:id/status',
  authMiddleware,
  authorize('system_users', 'manage'),
  setOfficialStatus,
);

// ── System configuration (admin only) ──────────────────────────────────────

router.get('/settings', authMiddleware, authorize('system_settings', 'manage'), getSettings);
router.put('/settings', authMiddleware, authorize('system_settings', 'manage'), updateSettings);

export default router;
