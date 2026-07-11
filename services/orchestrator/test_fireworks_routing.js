import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

// Configure mock state for local LLM (Hugging Face Serverless)
let mockSamples = ["Madrid", "Madrid", "Madrid"];
let mockLocalAnswer = "Madrid";

const originalFetch = globalThis.fetch;

globalThis.fetch = async (url, options) => {
  const urlStr = typeof url === 'string' ? url : url.toString();
  
  // Intercept Hugging Face Serverless (Tier-1 Local LLM)
  if (urlStr.includes('router.huggingface.co')) {
    const nextSample = mockSamples.shift() || mockLocalAnswer;
    const resData = {
      choices: [
        {
          message: {
            content: nextSample
          }
        }
      ]
    };
    return new Response(JSON.stringify(resData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Pass-through other fetch requests
  return originalFetch(url, options);
};

// Enable Fireworks mock mode
process.env.TEST_MOCK_FIREWORKS = 'true';

// Dynamically import solveTask
import { solveTask } from './services/router.js';

console.log("=== Fireworks Routing Verification ===");

const testTasks = [
  {
    id: "task_high_confidence",
    content: "What is the capital of Spain?",
    category: "factual",
    setup: () => {
      // 3 identical answers -> consistency 1.0 -> ACCEPT_LOCAL (tier-1)
      mockLocalAnswer = "Madrid";
      mockSamples = ["Madrid", "Madrid", "Madrid"];
    }
  },
  {
    id: "task_medium_confidence",
    content: "What is the capital of France?",
    category: "logic",
    setup: () => {
      // 2 identical, 1 different -> consistency 0.67 -> combined confidence ~0.70.
      // Verification mock will receive "Proposed answer: 90" and return YES -> ACCEPT_LOCAL (verified tier-1)
      mockLocalAnswer = "90";
      mockSamples = ["90", "90", "95"];
    }
  },
  {
    id: "task_medium_failed_verification",
    content: "What is the capital of Germany?",
    category: "logic",
    setup: () => {
      // 2 identical, 1 different -> consistency 0.67 -> combined confidence ~0.70.
      // Verification mock will receive "Proposed answer: 80" and return NO -> Escalate to cheap Fireworks (Tier-2)
      mockLocalAnswer = "80";
      mockSamples = ["80", "80", "90"];
    }
  },
  {
    id: "task_low_confidence",
    content: "Write a short javascript script to compute Fibonacci numbers.",
    category: "code",
    setup: () => {
      // 3 different answers -> consistency 0.33 -> combined confidence ~0.20 -> Escalate directly to Tier-3 (strong)
      mockLocalAnswer = "fib1";
      mockSamples = ["fib1", "fib2", "fib3"];
    }
  }
];

async function runRoutingTest() {
  for (const task of testTasks) {
    console.log(`\n--------------------------------------------`);
    console.log(`Task: ${task.id} (${task.category})`);
    task.setup();
    
    try {
      const result = await solveTask(task);
      console.log(`Router Result Answer: "${result.answer}"`);
    } catch (err) {
      console.log(`Failed to process:`, err.message);
    }
  }

  // Restore original fetch
  globalThis.fetch = originalFetch;
  console.log(`\n============================================`);
  console.log("Routing test finished. Check SQLite log table to view logged metrics!");
}

runRoutingTest();
