/**
 * geminiClassifier.js
 * 
 * Utility to classify a query into a HybridRouter category using the Gemini Flash Lite API.
 * Called browser-side on textarea blur — uses free Gemini quota, NOT Fireworks tokens.
 * 
 * Total token cost per call: ~40 tokens (30 prompt + 10 response max)
 */

const VALID_CATEGORIES = [
  'math', 'code', 'factual', 'logic',
  'parsing', 'classification', 'creative', 'multi_step'
];

/**
 * Classifies a user query into one of the HybridRouter categories via Gemini Flash Lite.
 * @param {string} query - The user's query text
 * @param {string} apiKey - Gemini API key (from import.meta.env.VITE_GEMINI_API_KEY)
 * @returns {Promise<string|null>} - One of the VALID_CATEGORIES, or null if classification fails
 */
export async function classifyWithGemini(query, apiKey) {
  if (!query?.trim() || !apiKey) return null;

  const prompt = `Classify the following query into exactly one of these categories and reply with only that one word:
math, code, factual, logic, parsing, classification, creative, multi_step

Query: ${query.trim()}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 10,
            temperature: 0
          }
        })
      }
    );

    if (!response.ok) {
      console.warn('[AI-Classify] Gemini API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z_]/g, ''); // strip punctuation just in case

    if (VALID_CATEGORIES.includes(raw)) {
      return raw;
    }

    // Handle "multi step" → "multi_step" edge case
    if (raw === 'multistep' || raw === 'multi step') return 'multi_step';

    console.warn('[AI-Classify] Unexpected category from Gemini:', raw);
    return null; // null = don't override, keep the user's current selection
  } catch (err) {
    console.warn('[AI-Classify] Network error:', err.message);
    return null;
  }
}
