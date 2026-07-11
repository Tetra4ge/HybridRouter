import dotenv from 'dotenv';
import path from 'path';

// Load variables from the root .env file
dotenv.config({ path: '../../.env' });

export const PORT = process.env.PORT || 3000;
export const ENABLE_CACHE = process.env.ENABLE_CACHE === 'true';
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
