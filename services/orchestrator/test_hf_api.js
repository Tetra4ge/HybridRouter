import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: '../../.env' });

const HF_TOKEN = process.env.HF_TOKEN;
const MODEL_NAME = "google/gemma-2-2b-it"; // Using Gemma 2 2B

console.log("HF_TOKEN present:", !!HF_TOKEN);
console.log("Using model:", MODEL_NAME);

async function testHF() {
  const url = `https://api-inference.huggingface.co/models/${MODEL_NAME}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: "What is 5 + 3? Answer with only the number.",
        parameters: {
          max_new_tokens: 10,
          temperature: 0.1,
          return_full_text: false,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("HF API Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error calling HF API:", error.message);
  }
}

testHF();
