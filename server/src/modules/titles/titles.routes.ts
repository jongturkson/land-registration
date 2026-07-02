import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { issueTitle, downloadTitleCertificate } from './titles.controller';
import { listTitles, getTitleDetails } from './registry.controller';
import { transferTitle } from './mutations.controller';
import { registerMortgage } from './encumbrance.controller';
import { subdivideTitle } from './subdivision.controller';

const router = Router();

router.post(
  '/applications/:id/issue-title',
  authMiddleware,
  authorize('title', 'issue'),
  issueTitle,
);

// ── Registry consultation ───────────────────────────────────────────────────

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

// ── Title mutations (Livre Foncier entries) ─────────────────────────────────

router.post(
  '/titles/:title_no/transfer',
  authMiddleware,
  authorize('title', 'transfer'),
  transferTitle,
);

router.post(
  '/titles/:title_no/mortgage',
  authMiddleware,
  authorize('title', 'mortgage'),
  registerMortgage,
);

router.post(
  '/titles/:title_no/subdivide',
  authMiddleware,
  authorize('title', 'subdivide'),
  subdivideTitle,
);

export default router;
