import fs from 'fs';
import path from 'path';
import { solveTask } from '../services/orchestrator/src/router.js';

const BENCHMARK_PATH = path.join(process.cwd(), '..', '..', 'eval', 'benchmark.json');

async function runEval() {
  console.log('Starting Tier-0 Evaluation...');
  
  if (!fs.existsSync(BENCHMARK_PATH)) {
    console.error(`Benchmark file not found at ${BENCHMARK_PATH}`);
    process.exit(1);
  }

  const tasksData = fs.readFileSync(BENCHMARK_PATH, 'utf-8');
  let tasks = [];
  try {
    tasks = JSON.parse(tasksData);
  } catch (e) {
    console.error('Failed to parse benchmark JSON');
    process.exit(1);
  }

  let passed = 0;
  let total = tasks.length;

  for (const task of tasks) {
    console.log(`Running task: ${task.id} (${task.category})`);
    
    // We provide category to bypass classifier if we only want to test solver directly, 
    // but solveTask currently re-classifies. That's fine since classifier works well for these.
    const result = await solveTask(task);
    
    if (result.answer === task.expected) {
      console.log(`✅ PASS: ${task.id}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${task.id}`);
      console.log(`   Expected: ${task.expected}`);
      console.log(`   Got:      ${result.answer}`);
    }
  }

  console.log('-----------------------------------');
  console.log(`EVALUATION COMPLETE: ${passed}/${total} (${((passed/total)*100).toFixed(1)}%) passed.`);
  
  if (passed !== total) {
    process.exit(1);
  }
}

runEval().catch(console.error);
