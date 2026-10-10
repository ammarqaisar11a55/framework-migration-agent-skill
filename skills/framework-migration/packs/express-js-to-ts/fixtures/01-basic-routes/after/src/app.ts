import express from 'express';
import { users, nextId } from './store';

import type { Request, Response } from 'express';

const app = express();

app.use(express.json());

function health(req: Request, res: Response) {
  res.json({ status: 'ok' });
}

app.get('/health', health);

app.get('/users', (req, res) => {
  res.json(users);
});

app.get('/users/:id', (req, res) => {
  const user = users.find((u) => u.id === Number(req.params.id));
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

app.post('/users', (req, res) => {
  const user = { id: nextId(), name: req.body.name };
  users.push(user);
  res.status(201).json(user);
});

export default app;
