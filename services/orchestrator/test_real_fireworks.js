import { safeFireworksCall } from './services/solvers/fireworksClient.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

console.log("=== Real Fireworks API Connectivity Test ===");
const apiKey = process.env.FIREWORKS_API_KEY;

if (!apiKey || apiKey === 'your_fireworks_api_key_here') {
  console.error("❌ ERROR: FIREWORKS_API_KEY is not configured or is still the default placeholder in your .env file.");
  console.error("Please paste your real API key in the root .env file first.");
  process.exit(1);
}

console.log(`Using API key: ${apiKey.substring(0, 8)}...`);

async function testConnection() {
  // Force disabling mock mode by setting an env variable or deleting the test flag
  delete process.env.TEST_MOCK_FIREWORKS;

  try {
    console.log("Sending test request to Fireworks (glm-5p1)...");
    const result = await callFireworks(
      'glm-5p1',
      'Please respond with exactly the word "SUCCESS" and nothing else.',
      {
        maxTokens: 5,
        temperature: 0.0,
        systemPrompt: 'Reply with SUCCESS only.'
      }
    );

    console.log("\nResponse received successfully!");
    console.log("-----------------------------------------");
    console.log("Answer: ", result.answer);
    console.log("Latency: ", result.latencyMs, "ms");
    console.log("Tokens Used: ", result.totalTokens, `(Prompt: ${result.promptTokens}, Completion: ${result.completionTokens})`);
    console.log("-----------------------------------------");
    
    if (result.answer.toUpperCase().includes("SUCCESS")) {
      console.log("✅ SUCCESS: Real Fireworks API connection is working perfectly!");
    } else {
      console.log("⚠️ WARNING: Received a response, but it didn't match the expected output. Response:", result.answer);
    }
  } catch (error) {
    console.error("\n❌ ERROR: Failed to connect to Fireworks API.");
    console.error("Error Message:", error.message);
    if (error.status) {
      console.error("HTTP Status Code:", error.status);
    }
    console.error("\nPlease make sure that:");
    console.error("1. Your FIREWORKS_API_KEY is valid.");
    console.error("2. Your network allows outbound requests to api.fireworks.ai.");
  }
}

testConnection();
