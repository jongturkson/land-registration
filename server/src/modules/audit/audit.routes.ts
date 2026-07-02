import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { listAuditLogs, verifyChain } from './audit.controller';

const router = Router();

router.get('/audit/logs', authMiddleware, authorize('audit', 'read'), listAuditLogs);
router.get('/audit/verify-chain', authMiddleware, authorize('audit', 'verify'), verifyChain);

export default router;
