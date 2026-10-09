import type { Request, Response, NextFunction } from 'express';

const API_KEYS = new Map([['key-ada', 'Ada'], ['key-grace', 'Grace']]);

export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  const key = req.get('x-api-key');
  if (!key || !API_KEYS.has(key)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  res.locals.apiKey = key;
  next();
};

export const loadUser = function (req: Request, res: Response, next: NextFunction) {
  res.locals.user = { name: API_KEYS.get(res.locals.apiKey) };
  next();
};
