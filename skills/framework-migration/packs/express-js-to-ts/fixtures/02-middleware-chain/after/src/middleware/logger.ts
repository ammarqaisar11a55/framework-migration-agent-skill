import type { Request, Response, NextFunction } from 'express';

const stats = { requests: 0 };

function logger(req: Request, res: Response, next: NextFunction) {
  stats.requests += 1;
  res.set('X-Request-Count', String(stats.requests));
  next();
}

export { logger, stats };
