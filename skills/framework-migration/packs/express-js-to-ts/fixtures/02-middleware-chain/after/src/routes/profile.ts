import { Router } from 'express';
import * as auth from '../middleware/auth';

const router = Router();

router.get('/', auth.requireApiKey, auth.loadUser, (req, res) => {
  res.json({ user: res.locals.user });
});

export default router;
