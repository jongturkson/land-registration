import { Request, Response, NextFunction } from 'express';
import { getSystemSettings } from '../services/settings.service';

// When system_maintenance_mode is on, all state-changing requests are refused
// except authentication (so the Admin can still sign in) and the /admin
// endpoints themselves (so the Admin can turn maintenance mode back off).
// Reads (GET) stay available — the public can still track and verify.
export async function maintenanceGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (req.method === 'GET' || req.path.startsWith('/auth') || req.path.startsWith('/admin')) {
    next();
    return;
  }

  const settings = await getSystemSettings();
  if (settings.system_maintenance_mode) {
    res.status(503).json({
      message:
        'The system is temporarily under maintenance. Submissions and processing are paused — please try again later.',
    });
    return;
  }

  next();
}
