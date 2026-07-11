import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { solveTask } from './services/router.js';

dotenv.config({ path: '../../.env' });

const INPUT_PATH = path.join(process.cwd(), '..', '..', 'input', 'tasks.json');
const OUTPUT_PATH = path.join(process.cwd(), '..', '..', 'output', 'results.json');

async function main() {
  console.log('Starting HybridRouter Batch Mode...');
  
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`Input file not found at ${INPUT_PATH}`);
    process.exit(1);
  }

  const tasksData = fs.readFileSync(INPUT_PATH, 'utf-8');
  let tasks = [];
  try {
    tasks = JSON.parse(tasksData);
  } catch (e) {
    console.error('Failed to parse input JSON');
    process.exit(1);
  }

  const results = [];
  for (const task of tasks) {
    console.log(`Processing task: ${task.id}`);
    const result = await solveTask(task);
    results.push(result);
  }

  // Ensure output dir exists
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log(`Successfully wrote ${results.length} results to ${OUTPUT_PATH}`);
}

main().catch(console.error);
