import express from 'express';
import dotenv from 'dotenv';
import { solveTask } from './router.js';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/api/tasks', async (req, res) => {
  try {
    const task = req.body;
    if (!task || !task.id || !task.content) {
      return res.status(400).json({ error: 'Invalid task format' });
    }
    const result = await solveTask(task);
    res.json(result);
  } catch (error) {
    console.error('Error solving task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Orchestrator server listening on port ${PORT}`);
});
