import { getRecentLogs, getSystemStats } from '../services/logger.js';
import { getCacheStats, clearCache } from '../services/cache.js';

export const getLogs = (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = getRecentLogs(limit);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
};

export const getStats = (req, res) => {
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
};

export const getCache = (req, res) => {
  res.json(getCacheStats());
};

export const flushCache = (req, res) => {
  clearCache();
  res.json({ success: true, message: 'Cache cleared.' });
};
