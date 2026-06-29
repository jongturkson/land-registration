import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authMiddleware } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import {
  createApplication,
  submitApplication,
  listApplications,
  trackApplication,
} from './applications.controller';
import { upload, uploadDocument, downloadDocument } from './documents.controller';

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

// Static-prefix routes must come before /:id wildcard routes
router.get(
  '/documents/:docId/download',
  authMiddleware,
  authorize('document', 'read'),
  downloadDocument,
);

// Public — declared before /:id catch-all
router.get('/:id/track', trackApplication);

router.post('/:id/documents', authMiddleware, handleMulterUpload, uploadDocument);
router.post('/', authMiddleware, createApplication);
router.post('/:id/submit', authMiddleware, submitApplication);
router.get('/', authMiddleware, authorize('application', 'read'), listApplications);

export default router;
