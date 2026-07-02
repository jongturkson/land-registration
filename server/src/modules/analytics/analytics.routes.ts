import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { getDashboardAnalytics } from './analytics.controller';

const router = Router();

router.get(
  '/analytics/dashboard',
  authMiddleware,
  authorize('analytics', 'read'),
  getDashboardAnalytics,
);

export default router;
