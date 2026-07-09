export const CATEGORIES = [
  'math', 'code', 'factual', 'logic', 'parsing', 'classification', 'creative', 'multi_step'
];

const MATH_PATTERNS = [
  /\b\d+\s*[\+\-\*\/\%\^]\s*\d+/,
  /\bcalculat[e|ion]\b/i,
  /\bsolve\b.*\bequation\b/i,
  /\bwhat\s+is\s+\d+/i,
  /\b(sum|product\s+of|difference|quotient)\b/i,
  /\b(square root|sqrt|factorial|log)\b/i,
  /\b(percentage|percent|%)\b/i,
  /\b(area|volume|perimeter|circumference)\b/i,
  /\b(mean|median|mode|average|std dev)\b/i,
  /\b(derivative|integral|limit)\b/i,
];

const CODE_PATTERNS = [
  /\b(write|create|implement|code|program)\b.*\b(function|class|method|script)\b/i,
  /\b(python|javascript|java|c\+\+|typescript|rust|go)\b/i,
  /```[\s\S]*```/,
  /\b(debug|fix|refactor|optimize)\b.*\b(code|bug|error)\b/i,
  /\b(algorithm|data structure|sort|search)\b/i,
  /\b(API|endpoint|request|response)\b/i,
];

const PARSING_PATTERNS = [
  /\b(extract|parse|find\s+all|list\s+all|find)\b/i,
  /\b(email|phone|url|date|name)\b.*\b(from|in)\b/i,
  /\b(convert|transform|format)\b.*\b(json|csv|xml|yaml)\b/i,
  /\b(regex|regular expression|pattern)\b/i,
];

const LOGIC_PATTERNS = [
  /\b(if\s+all\s+.*\s+are\s+|deduce|puzzle|riddle)\b/i,
  /\b(syllogism|therefore|conclusion)\b/i
];

const CLASSIFICATION_PATTERNS = [
  /\b(classify|categorize|label|sentiment)\b/i,
  /\b(positive\s+or\s+negative|is\s+this)\b/i
];

const CREATIVE_PATTERNS = [
  /\b(write\s+a\s+(poem|story|haiku|essay|song))\b/i,
  /\b(brainstorm|imagine)\b/i
];

const MULTI_STEP_PATTERNS = [
  /\b(first\s+.*\s+then|step\s+by\s+step)\b/i,
  /\b(after\s+that|finally)\b/i
];

function containsPatterns(text, patterns) {
  return patterns.some(pattern => pattern.test(text));
}

export function classify(task) {
  const text = (task.content || '').toLowerCase();
  
  if (containsMathPatterns(text)) return { category: 'math', confidence: 0.9, method: 'regex' };
  if (containsCodePatterns(text)) return { category: 'code', confidence: 0.9, method: 'regex' };
  if (containsParsingPatterns(text)) return { category: 'parsing', confidence: 0.9, method: 'regex' };
  if (containsClassificationPatterns(text)) return { category: 'classification', confidence: 0.9, method: 'regex' };
  if (containsLogicPatterns(text)) return { category: 'logic', confidence: 0.9, method: 'regex' };
  if (containsCreativePatterns(text)) return { category: 'creative', confidence: 0.9, method: 'regex' };
  if (containsMultiStepPatterns(text)) return { category: 'multi_step', confidence: 0.9, method: 'regex' };
  
  return { category: 'factual', confidence: 0.5, method: 'fallback' };
}

function containsMathPatterns(text) { return containsPatterns(text, MATH_PATTERNS); }
function containsCodePatterns(text) { return containsPatterns(text, CODE_PATTERNS); }
function containsParsingPatterns(text) { return containsPatterns(text, PARSING_PATTERNS); }
function containsClassificationPatterns(text) { return containsPatterns(text, CLASSIFICATION_PATTERNS); }
function containsLogicPatterns(text) { return containsPatterns(text, LOGIC_PATTERNS); }
function containsCreativePatterns(text) { return containsPatterns(text, CREATIVE_PATTERNS); }
function containsMultiStepPatterns(text) { return containsPatterns(text, MULTI_STEP_PATTERNS); }
