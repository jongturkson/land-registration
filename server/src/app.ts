import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import authRouter from './modules/auth/auth.routes';
import applicationsRouter from './modules/applications/applications.routes';
import bulletinRouter from './modules/bulletin/bulletin.routes';
import titlesRouter from './modules/titles/titles.routes';
import { authMiddleware } from './middleware/auth';
import { authorize } from './middleware/authorize';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/applications', applicationsRouter);
app.use('/bulletins', bulletinRouter);
app.use(titlesRouter);

// Temporary route for RBAC smoke-testing — remove before production
app.get('/ping-protected', authMiddleware, authorize('title', 'issue'), (_req, res) => {
  res.json({ ok: true });
});

export default app;
