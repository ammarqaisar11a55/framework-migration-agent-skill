import type { Request, Response, NextFunction } from 'express';

function notFound(req: Request, res: Response, next: NextFunction) {
  next(Object.assign(new Error(`No route for ${req.method} ${req.path}`), { status: 404 }));
}

// Express recognises error handlers by their four arguments, so `next` must stay.
function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'Internal Server Error' : err.message });
}

export { notFound, errorHandler };
