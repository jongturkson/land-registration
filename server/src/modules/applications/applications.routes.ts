import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import {
  createApplication,
  submitApplication,
  listApplications,
  trackApplication,
} from './applications.controller';

const router = Router();

// Public — must be declared before /:id routes to avoid /:id catching it
router.get('/:id/track', trackApplication);

router.post('/', authMiddleware, createApplication);
router.post('/:id/submit', authMiddleware, submitApplication);
router.get('/', authMiddleware, authorize('application', 'read'), listApplications);

export default router;
