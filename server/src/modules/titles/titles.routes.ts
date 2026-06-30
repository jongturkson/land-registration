import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { issueTitle, downloadTitleCertificate } from './titles.controller';

const router = Router();

router.post(
  '/applications/:id/issue-title',
  authMiddleware,
  authorize('title', 'issue'),
  issueTitle,
);

router.get(
  '/titles/:id/download',
  authMiddleware,
  authorize('title', 'read'),
  downloadTitleCertificate,
);

export default router;
