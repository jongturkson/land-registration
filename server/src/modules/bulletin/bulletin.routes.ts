import { Router } from 'express';
import { listBulletins } from './bulletin.controller';

const router = Router();

router.get('/', listBulletins);

export default router;
