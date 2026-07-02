import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { resolveDispute } from './disputes.controller';

const router = Router();

router.post(
  '/disputes/:id/resolve',
  authMiddleware,
  authorize('dispute', 'resolve'),
  resolveDispute,
);

export default router;
