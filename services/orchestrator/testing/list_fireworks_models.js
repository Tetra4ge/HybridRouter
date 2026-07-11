import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const apiKey = process.env.FIREWORKS_API_KEY;
const baseURL = process.env.FIREWORKS_BASE_URL || 'https://api.fireworks.ai/inference/v1';

console.log("=== Listing Accessible Fireworks Models ===");
console.log("Using API key:", apiKey ? `${apiKey.substring(0, 8)}...` : "NONE");

const client = new OpenAI({
  apiKey,
  baseURL,
});

async function listModels() {
  try {
    const list = await client.models.list();
    console.log(`\nSuccessfully fetched ${list.data.length} models!`);
    console.log("First 15 models:");
    list.data.slice(0, 15).forEach(m => {
      console.log(`- ${m.id}`);
    });
  } catch (error) {
    console.error("\n❌ Failed to retrieve models.");
    console.error("Error Message:", error.message);
    if (error.status) {
      console.error("HTTP Status Code:", error.status);
    }
  }
}

listModels();
