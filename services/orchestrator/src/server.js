import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { solveTask } from './router.js';
import { getRecentLogs, getSystemStats } from './logger.js';
import { getCacheStats, clearCache } from './cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// GET /api/logs -> Live logs feed
app.get('/api/logs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = getRecentLogs(limit);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

// GET /api/stats -> Summary metrics & charts
app.get('/api/stats', (req, res) => {
  try {
    const stats = getSystemStats();
    if (!stats) {
      return res.status(404).json({ error: 'No statistics logged yet' });
    }
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

// GET /api/cache/stats -> Cache hit/miss/size metrics
app.get('/api/cache/stats', (req, res) => {
  res.json(getCacheStats());
});

// POST /api/cache/clear -> Flush the in-memory cache
app.post('/api/cache/clear', (req, res) => {
  clearCache();
  res.json({ success: true, message: 'Cache cleared.' });
});

app.listen(PORT, () => {
  console.log(`Orchestrator server listening on port ${PORT}`);
});
