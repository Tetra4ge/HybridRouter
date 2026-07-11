import { solveTask } from '../services/router.js';

export const handleTask = async (req, res) => {
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
};
