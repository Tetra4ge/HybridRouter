import express from 'express';
import { PORT } from './config/env.js';
import apiRoutes from './routes/api.js';

const app = express();

app.use(express.json());

// Mount API routes
app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`Orchestrator server listening on port ${PORT}`);
});
