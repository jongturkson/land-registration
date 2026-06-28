import path from 'path';
import { newEnforcer, Enforcer } from 'casbin';
import { Request, Response, NextFunction } from 'express';

const modelPath = path.join(__dirname, '../config/model.conf');
const policyPath = path.join(__dirname, '../config/policy.csv');

// Initialized once per process; subsequent calls await the same resolved promise
const enforcerPromise: Promise<Enforcer> = newEnforcer(modelPath, policyPath);

export function authorize(obj: string, act: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { role, region } = req.user;
    const enforcer = await enforcerPromise;
    const allowed = await enforcer.enforce(role, region, obj, act);

    if (!allowed) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    next();
  };
}
