import { Router } from 'express';
import { simulatePayment, verifyTitle } from './verification.controller';

// Public routes — no JWT required. The mock payment gates the verification.
const router = Router();

router.post('/payments/simulate', simulatePayment);
router.post('/titles/verify', verifyTitle);

export default router;
