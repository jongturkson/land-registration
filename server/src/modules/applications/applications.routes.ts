import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authMiddleware } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import {
  createApplication,
  submitApplication,
  transitionApplication,
  regionalApprove,
  listApplications,
  getApplication,
  trackApplication,
} from './applications.controller';
import { upload, uploadDocument, downloadDocument } from './documents.controller';
import { submitSurvey } from './survey.controller';
import { fileDispute } from './disputes.controller';

const router = Router();

// Inline multer error handler — prevents unhandled errors reaching the global handler
function handleMulterUpload(req: Request, res: Response, next: NextFunction): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upload.single('file')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the 5 MB size limit' : err.message;
      res.status(400).json({ message: msg });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ message: err.message });
      return;
    }
    next();
  });
}

// ── Static-prefix routes first (avoids /:id wildcard capture) ─────────────

router.get(
  '/documents/:docId/download',
  authMiddleware,
  authorize('document', 'read'),
  downloadDocument,
);

// ── Public routes ──────────────────────────────────────────────────────────

router.get('/:id/track', trackApplication);
router.post('/:reference_no/dispute', fileDispute);

// ── Citizen routes ─────────────────────────────────────────────────────────

router.post('/', authMiddleware, createApplication);
router.post('/:id/documents', authMiddleware, handleMulterUpload, uploadDocument);
router.post('/:id/submit', authMiddleware, submitApplication);

// ── Surveyor routes ────────────────────────────────────────────────────────

router.post('/:id/survey', authMiddleware, authorize('survey', 'create'), submitSurvey);

// ── Officer routes ─────────────────────────────────────────────────────────

router.post(
  '/:id/transition',
  authMiddleware,
  authorize('application', 'update'),
  transitionApplication,
);
router.post(
  '/:id/regional-approve',
  authMiddleware,
  authorize('application', 'review_regional'),
  regionalApprove,
);
router.get('/', authMiddleware, authorize('application', 'read'), listApplications);
router.get('/:id', authMiddleware, authorize('application', 'read'), getApplication);

export default router;
