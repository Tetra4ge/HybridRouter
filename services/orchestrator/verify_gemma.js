import { solveWithLocalModel } from './services/solvers/localLlm.js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: '../../.env' });

console.log("Checking environment configuration...");
console.log("HF_TOKEN present:", !!process.env.HF_TOKEN);
console.log("USE_HF_SERVERLESS:", process.env.USE_HF_SERVERLESS);
console.log("MODEL_NAME:", process.env.MODEL_NAME);

async function verify() {
  const testTask = {
    id: "verify_gemma_test",
    content: "Answer in exactly one word: What is the capital of France?"
  };
  
  console.log("\nSending task to Gemma model...");
  console.log(`Prompt: "${testTask.content}"`);
  
  try {
    const result = await solveWithLocalModel(testTask, "factual");
    
    if (result) {
      console.log("\nSuccess! Gemma Model responded:");
      console.log("-----------------------------------------");
      console.log("Answer:", JSON.stringify(result.answer));
      console.log("Confidence Score:", result.confidence);
      console.log("Samples Generated:", result.samples);
      console.log("Solver Type Used:", result.solverType);
      console.log("-----------------------------------------");
    } else {
      console.error("\nError: The solver returned null.");
    }
  } catch (error) {
    console.error("\nFailed to run verification:", error.message);
  }
}

verify();
