import express from 'express';
import { logger } from './middleware/logger';
import profile from './routes/profile';

const app = express();

app.use(logger);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/profile', profile);

export default app;
