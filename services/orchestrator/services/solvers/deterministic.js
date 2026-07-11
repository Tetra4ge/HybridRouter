import { evaluate } from 'mathjs';

function extractMathExpression(text) {
  // Pattern: Word problems "What is 15 percent of 230"
  const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:percent|%)\s*of\s*(\d+(?:\.\d+)?)/i);
  if (percentMatch) return `${percentMatch[1]} / 100 * ${percentMatch[2]}`;
  
  // Pattern: "Square root of X"
  const sqrtMatch = text.match(/square root of\s*(\d+(?:\.\d+)?)/i);
  if (sqrtMatch) return `sqrt(${sqrtMatch[1]})`;
  
  // Pattern: "Average of X, Y, Z"
  const avgMatch = text.match(/average of\s*([\d\.\,\s]+)/i);
  if (avgMatch) return `mean([${avgMatch[1]}])`;

  // Direct expression: "5 + 3 * 2", "2^10"
  // Needs at least an operator and numbers
  const directMatch = text.match(/[\d\.]+\s*[\+\-\*\/\^%]\s*[\d\.\s\+\-\*\/\^%\(\)]+/);
  if (directMatch && directMatch[0].trim().length > 2) {
    return directMatch[0].trim();
  }
  
  return null;
}

const mathSolver = {
  canSolve(task, category) {
    return category === 'math';
  },
  
  solve(task) {
    const expression = extractMathExpression(task.content);
    if (!expression) return null;
    
    try {
      const result = evaluate(expression);
      return {
        answer: String(result),
        confidence: 1.0,
        solverType: 'deterministic/math',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };
    } catch (e) {
      return null;
    }
  }
};

const parsingSolver = {
  canSolve(task, category) {
    return category === 'parsing';
  },
  
  solve(task) {
    const text = task.content;
    
    if (/extract.*email/i.test(text) || /find.*email/i.test(text)) {
      const emails = text.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];
      return { answer: emails.join(', '), confidence: 1.0, solverType: 'deterministic/regex', promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    }
    
    if (/extract.*url/i.test(text) || /find.*url/i.test(text)) {
      const urls = text.match(/https?:\/\/[^\s]+/g) || [];
      return { answer: urls.join(', '), confidence: 1.0, solverType: 'deterministic/regex', promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    }
    
    if (/extract.*date/i.test(text) || /find.*date/i.test(text)) {
      const dates = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g) || [];
      return { answer: dates.join(', '), confidence: 1.0, solverType: 'deterministic/regex', promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    }
    
    if (/extract.*phone/i.test(text) || /find.*phone/i.test(text)) {
      const phones = text.match(/[\+]?[\d\-\(\)\s]{7,15}/g) || [];
      return { answer: phones.join(', '), confidence: 1.0, solverType: 'deterministic/regex', promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    }
    
    return null;
  }
};

function extractQuotedText(text) {
  const match = text.match(/['"](.*?)['"]/);
  return match ? match[1] : text;
}

function extractList(text) {
  const parts = text.split(':');
  if (parts.length > 1) {
    return parts[1].split(',').map(s => s.trim());
  }
  return text.split(',').map(s => s.trim());
}

const textSolver = {
  canSolve(task, category) {
    return /\b(count|how many|sort|reverse|uppercase|lowercase|length)\b/i.test(task.content);
  },
  
  solve(task) {
    const text = task.content;
    
    if (/how many words/i.test(text)) {
      const targetText = extractQuotedText(text);
      const count = targetText.trim().split(/\s+/).length;
      return { answer: String(count), confidence: 1.0, solverType: 'deterministic/text', promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    }
    
    if (/how many characters/i.test(text)) {
      const targetText = extractQuotedText(text);
      return { answer: String(targetText.length), confidence: 1.0, solverType: 'deterministic/text', promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    }
    
    if (/sort.*(?:alphabetically|numerically)/i.test(text)) {
      const isNumeric = /sort.*numerically/i.test(text);
      const items = extractList(text);
      const sorted = items.sort((a, b) => isNumeric ? Number(a) - Number(b) : a.localeCompare(b));
      return { answer: sorted.join(', '), confidence: 1.0, solverType: 'deterministic/text', promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    }
    
    return null;
  }
};

const dataSolver = {
  canSolve(task, category) {
    return /\b(json|csv|count.*in|filter|find.*where)\b/i.test(task.content);
  },
  
  solve(task) {
    try {
      const jsonMatch = task.content.match(/\{.*\}/s) || task.content.match(/\[.*\]/s);
      if (!jsonMatch) return null;
      const jsonData = JSON.parse(jsonMatch[0]);
      
      // Data parsing needs specific requirements, so we shouldn't short-circuit escalation
      return null;
    } catch (e) {
      return null;
    }
  }
};

const DETERMINISTIC_SOLVERS = [
  mathSolver,
  parsingSolver,
  textSolver,
  dataSolver,
];

export function tryDeterministicSolve(task, category) {
  for (const solver of DETERMINISTIC_SOLVERS) {
    if (solver.canSolve(task, category)) {
      const result = solver.solve(task);
      if (result && result.confidence >= 0.9) {
        return result;
      }
    }
  }
  return null;
}
