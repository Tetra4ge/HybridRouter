import express from 'express';
import { handleTask } from '../controllers/taskController.js';
import { getLogs, getStats, getCache, flushCache } from '../controllers/systemController.js';

const router = express.Router();

// Task Processing Route
router.post('/tasks', handleTask);

// System Monitoring & Telemetry Routes
router.get('/logs', getLogs);
router.get('/stats', getStats);
router.get('/cache/stats', getCache);
router.post('/cache/clear', flushCache);

export default router;
