import { Router } from 'express';
import { simulatePayment, verifyTitle, validateTitleNo } from './verification.controller';

// Public routes — no JWT required. The mock payment gates the verification.
const router = Router();

router.post('/payments/simulate', simulatePayment);
router.post('/titles/verify', verifyTitle);
// Free existence/validity check used by the application wizard
router.get('/titles/:title_no/validate', validateTitleNo);

export default router;
