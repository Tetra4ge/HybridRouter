import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '../../.env' });

const apiKey = process.env.FIREWORKS_API_KEY;
const baseURL = process.env.FIREWORKS_BASE_URL || 'https://api.fireworks.ai/inference/v1';

const client = new OpenAI({
  apiKey,
  baseURL,
});

const models = ['glm-5p1', 'glm-5p2', 'deepseek-v4-pro', 'kimi-k2p6'];

async function testFormat(model) {
  console.log(`\n=== Testing formats on ${model} ===`);
  
  // Format 1: No system message, instructions in user message
  try {
    const res1 = await client.chat.completions.create({
      model: `accounts/fireworks/models/${model}`,
      messages: [
        { role: 'user', content: 'Answer in exactly one word: What is the capital of France?' }
      ],
      max_tokens: 15,
      temperature: 0.0,
    });
    console.log(`Format 1 (User instruction) Response: "${res1.choices[0]?.message?.content?.trim()}"`);
  } catch (e) {
    console.error(`Format 1 error:`, e.message);
  }

  // Format 2: Standard system message, but with user content
  try {
    const res2 = await client.chat.completions.create({
      model: `accounts/fireworks/models/${model}`,
      messages: [
        { role: 'system', content: 'Reply in one word only.' },
        { role: 'user', content: 'France capital:' }
      ],
      max_tokens: 15,
      temperature: 0.0,
    });
    console.log(`Format 2 (System + concise user) Response: "${res2.choices[0]?.message?.content?.trim()}"`);
  } catch (e) {
    console.error(`Format 2 error:`, e.message);
  }
}

async function run() {
  for (const model of models) {
    await testFormat(model);
  }
}

run();
