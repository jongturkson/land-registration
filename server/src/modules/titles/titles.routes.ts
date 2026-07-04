import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { issueTitle, downloadTitleCertificate, cancelTitle } from './titles.controller';
import { listTitles, getTitleDetails } from './registry.controller';

const router = Router();

router.post(
  '/applications/:id/issue-title',
  authMiddleware,
  authorize('title', 'issue'),
  issueTitle,
);

// ── Registry consultation (read-only Livre Foncier view) ────────────────────
// Direct mutations (transfer / mortgage / subdivision) have been removed:
// every change to the register must arrive as a citizen application and be
// executed through the application workflow endpoints.

router.get('/titles', authMiddleware, authorize('title', 'read'), listTitles);

router.get(
  '/titles/:title_no/details',
  authMiddleware,
  authorize('title', 'read'),
  getTitleDetails,
);

router.get(
  '/titles/:id/download',
  authMiddleware,
  authorize('title', 'read'),
  downloadTitleCertificate,
);

// ── Ministerial cancellation — the sole remaining direct registry act ───────

router.post(
  '/titles/:title_no/cancel',
  authMiddleware,
  authorize('title', 'cancel'),
  cancelTitle,
);

export default router;
