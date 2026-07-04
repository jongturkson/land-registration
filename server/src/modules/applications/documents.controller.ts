import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPEG, and PNG files are accepted'));
    }
  },
});

const VALID_DOC_TYPES = new Set([
  'ID_CARD',
  'SITE_PLAN',
  'ATTESTATION',
  'JUDGMENT', // court judgment / inheritance certificate (Partition)
  'NOTARIAL_ACT', // acte notarié (Total/Partial Alienation, Mortgage)
  'RELEASE_DEED', // creditor's release deed — mainlevée notariée (Mortgage Release)
  'PROCES_VERBAL',
  'CADASTRAL_PLAN',
  'OTHER',
]);

// POST /applications/:id/documents
export async function uploadDocument(req: Request, res: Response): Promise<void> {
  const applicationId = req.params['id'] as string;
  const { doc_type } = req.body as { doc_type?: string };

  if (!doc_type || !VALID_DOC_TYPES.has(doc_type)) {
    // Derive the list from the source of truth so it never goes stale again
    res.status(400).json({
      message: `Invalid or missing doc_type. Accepted: ${[...VALID_DOC_TYPES].join(', ')}`,
    });
    return;
  }

  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }

  const application = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!application) {
    res.status(404).json({ message: 'Application not found' });
    return;
  }

  // Surveyors uploading survey documents are not the applicant — skip ownership check
  if (req.user!.role !== 'surveyor' && application.applicant_id !== req.user!.id) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const document = await prisma.applicationDocument.create({
    data: {
      application_id: applicationId,
      doc_type,
      file_path: req.file.filename,
      original_name: req.file.originalname,
    },
  });

  res.status(201).json(document);
}

// GET /applications/documents/:docId/download  — officer-only via Casbin authorize('document','read')
export async function downloadDocument(req: Request, res: Response): Promise<void> {
  const docId = req.params['docId'] as string;

  const doc = await prisma.applicationDocument.findUnique({ where: { id: docId } });
  if (!doc) {
    res.status(404).json({ message: 'Document not found' });
    return;
  }

  const filePath = path.join(UPLOAD_DIR, doc.file_path);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ message: 'File not found on server' });
    return;
  }

  res.sendFile(filePath);
}
