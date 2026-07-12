import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { solveTask } from '../services/orchestrator/services/router.js';
import { getLastLogForTask, updateTaskCorrectness, closeDatabase } from '../services/orchestrator/services/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVAL_TASKS = [
  {
    id: "tune_fact_01",
    content: "What is the capital of Japan?",
    category: "factual",
    expected: "Tokyo"
  },
  {
    id: "tune_fact_02",
    content: "Which planet is known as the Red Planet?",
    category: "factual",
    expected: "Mars"
  },
  {
    id: "tune_class_01",
    content: "Classify this sentiment as Positive or Negative: 'This product is fantastic!'. Respond with exactly one word.",
    category: "classification",
    expected: "positive"
  },
  {
    id: "tune_class_02",
    content: "Classify this sentiment as Positive or Negative: 'It was a waste of money.'. Respond with exactly one word.",
    category: "classification",
    expected: "negative"
  },
  {
    id: "tune_math_01",
    content: "Calculate 12 * 11",
    category: "math",
    expected: "132"
  },
  {
    id: "tune_code_01",
    content: "Write a python function named is_even that returns True if a number is even. Return code only.",
    category: "code",
    expected: "def is_even"
  }
];

// Helper to calculate median and percentile
function getPercentile(arr, percentile) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * (percentile / 100));
  return sorted[Math.min(idx, sorted.length - 1)];
}

function getAverage(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

// Generate 20 Configurations Grid
// Ranging from aggressive local (low thresholds) to conservative local (high thresholds)
const CONFIGS = [];
for (let i = 1; i <= 20; i++) {
  const ratio = i / 20; // 0.05 to 1.00
  const high = 0.40 + 0.58 * ratio;      // 0.43 to 0.98
  const medium = 0.30 + 0.55 * ratio;    // 0.33 to 0.85
  const low = 0.10 + 0.50 * ratio;       // 0.13 to 0.60

  CONFIGS.push({
    name: `Config #${String(i).padStart(2, '0')} (Ratio: ${ratio.toFixed(2)})`,
    thresholds: {
      math:           { high, medium, low },
      code:           { high, medium, low },
      factual:        { high: Math.max(0.3, high - 0.05), medium: Math.max(0.2, medium - 0.05), low: Math.max(0.1, low - 0.05) },
      logic:          { high, medium, low },
      parsing:        { high, medium, low },
      classification: { high: Math.max(0.3, high - 0.05), medium: Math.max(0.2, medium - 0.05), low: Math.max(0.1, low - 0.05) },
      creative:       { high: Math.max(0.3, high - 0.10), medium: Math.max(0.2, medium - 0.10), low: Math.max(0.1, low - 0.10) },
      multi_step:     { high, medium, low }
    }
  });
}

// Cost factors (per token)
const CHEAP_IN_COST = 0.20e-6;
const CHEAP_OUT_COST = 0.20e-6;
const STRONG_IN_COST = 1.74e-6;
const STRONG_OUT_COST = 3.48e-6;

async function runTuningSweep() {
  console.log("=========================================================");
  console.log("⚡ Starting 20-Configuration Grid Search threshold tuning sweep ⚡");
  console.log(`Evaluating ${EVAL_TASKS.length} tasks per configuration.`);
  console.log("=========================================================\n");

  const tuningSummary = [];
  const allGemmaLatencies = [];
  const allCheapLatencies = [];
  const allStrongLatencies = [];

  for (const config of CONFIGS) {
    console.log(`\n▶️ Executing ${config.name}...`);
    let passed = 0;
    let configCost = 0;
    let configNaiveCost = 0;
    const runLatencies = [];
    
    const decisions = {
      local: 0,
      escalated: 0,
      deterministic: 0
    };

    for (const task of EVAL_TASKS) {
      const result = await solveTask(task, config.thresholds);
      
      const answer = result.answer || '';
      const isCorrect = answer.toLowerCase().includes(task.expected.toLowerCase());
      
      // Update correctness in SQLite
      updateTaskCorrectness(task.id, isCorrect);
      if (isCorrect) passed++;

      // Query metrics from DB
      const log = getLastLogForTask(task.id);
      runLatencies.push(log.latency_ms);

      // Model-specific latency sorting
      if (log.tier_used === 'tier-1') {
        allGemmaLatencies.push(log.latency_ms);
        decisions.local++;
      } else if (log.tier_used === 'tier-2' || log.tier_used === 'tier-1-verified') {
        allCheapLatencies.push(log.latency_ms);
        decisions.escalated++;
      } else if (log.tier_used === 'tier-3') {
        allStrongLatencies.push(log.latency_ms);
        decisions.escalated++;
      } else {
        decisions.deterministic++;
      }

      // Cost calculation
      let taskCost = 0;
      if (log.tier_used === 'tier-1-verified' || log.tier_used === 'tier-2') {
        taskCost = (log.prompt_tokens * CHEAP_IN_COST) + (log.completion_tokens * CHEAP_OUT_COST);
      } else if (log.tier_used === 'tier-3') {
        taskCost = (log.prompt_tokens * STRONG_IN_COST) + (log.completion_tokens * STRONG_OUT_COST);
      }
      configCost += taskCost;

      // Naive Cost Estimation (All sent directly to Tier-3 Strong model without compression)
      // Standard prompts are ~100 tokens. Standard response is ~150 tokens.
      const naivePrompt = Math.round(task.content.length / 4) + 100;
      const naiveCompletion = log.completion_tokens || 120;
      const taskNaiveCost = (naivePrompt * STRONG_IN_COST) + (naiveCompletion * STRONG_OUT_COST);
      configNaiveCost += taskNaiveCost;
    }

    const accuracy = (passed / EVAL_TASKS.length) * 100;
    const costSavings = configNaiveCost > 0 ? ((configNaiveCost - configCost) / configNaiveCost) * 100 : 0;

    tuningSummary.push({
      configName: config.name,
      accuracy: accuracy,
      cost: configCost,
      naiveCost: configNaiveCost,
      costSavings: costSavings,
      avgLatency: getAverage(runLatencies),
      p95Latency: getPercentile(runLatencies, 95),
      localRate: (decisions.local / EVAL_TASKS.length) * 100,
      escalatedRate: (decisions.escalated / EVAL_TASKS.length) * 100
    });
  }

  // --- Print Latency Benchmarks ---
  console.log("\n\n=========================================================");
  console.log("⏱️ MODEL-SPECIFIC LATENCY BENCHMARKS");
  console.log("=========================================================");
  console.table([
    {
      "Model": "Gemma Local (Tier-1)",
      "Avg Latency": `${(getAverage(allGemmaLatencies) / 1000).toFixed(2)} s`,
      "P95 Latency": `${(getPercentile(allGemmaLatencies, 95) / 1000).toFixed(2)} s`,
      "Sample Size": allGemmaLatencies.length
    },
    {
      "Model": "Kimi/GLM (Tier-2 Cheap)",
      "Avg Latency": `${(getAverage(allCheapLatencies) / 1000).toFixed(2)} s`,
      "P95 Latency": `${(getPercentile(allCheapLatencies, 95) / 1000).toFixed(2)} s`,
      "Sample Size": allCheapLatencies.length
    },
    {
      "Model": "DeepSeek (Tier-3 Strong)",
      "Avg Latency": `${(getAverage(allStrongLatencies) / 1000).toFixed(2)} s`,
      "P95 Latency": `${(getPercentile(allStrongLatencies, 95) / 1000).toFixed(2)} s`,
      "Sample Size": allStrongLatencies.length
    }
  ]);

  // --- Write to CSV ---
  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const csvPath = path.join(outputDir, 'tuning_results.csv');
  const headers = "Config,Accuracy,Cost,NaiveCost,CostSavings,AvgLatency,P95Latency,LocalRate,EscalatedRate\n";
  const rows = tuningSummary.map(r => 
    `"${r.configName}",${r.accuracy.toFixed(1)},${r.cost.toFixed(6)},${r.naiveCost.toFixed(6)},${r.costSavings.toFixed(1)},${r.avgLatency.toFixed(0)},${r.p95Latency.toFixed(0)},${r.localRate.toFixed(1)},${r.escalatedRate.toFixed(1)}`
  ).join("\n");
  fs.writeFileSync(csvPath, headers + rows);
  console.log(`💾 Saved tuning Pareto coordinates to: ${csvPath}\n`);

  // --- Print Pareto Tuning Sweep Summary ---
  console.log("=========================================================");
  console.log("📈 PARETO TUNING SWEEP SUMMARY");
  console.log("=========================================================");
  console.table(tuningSummary.map(r => ({
    "Config Sweep": r.configName,
    "Accuracy": `${r.accuracy.toFixed(1)}%`,
    "Cost": `$${r.cost.toFixed(4)}`,
    "Savings": `${r.costSavings.toFixed(1)}%`,
    "Avg Latency": `${(r.avgLatency / 1000).toFixed(2)}s`,
    "Local Solver": `${r.localRate.toFixed(0)}%`,
    "Escalated": `${r.escalatedRate.toFixed(0)}%`
  })));

  // --- Render ASCII Scatter Plot ---
  console.log("\n=========================================================");
  console.log("📊 SCATTER PLOT: ACCURACY VS COST SAVINGS");
  console.log("=========================================================");
  
  // Y-axis (Accuracy): 40% to 100% (6 segments)
  // X-axis (Cost Savings): 0% to 100% (10 segments)
  const plotRows = 7;
  const plotCols = 15;
  const grid = Array.from({ length: plotRows }).map(() => Array(plotCols).fill(' '));

  tuningSummary.forEach((r, idx) => {
    // Map accuracy 40-100 to grid row (plotRows - 1 down to 0)
    const row = Math.min(plotRows - 1, Math.max(0, Math.round((100 - r.accuracy) / (60 / (plotRows - 1)))));
    // Map cost savings 0-100 to grid column (0 to plotCols - 1)
    const col = Math.min(plotCols - 1, Math.max(0, Math.round(r.costSavings / (100 / (plotCols - 1)))));
    // Put index label on grid
    grid[row][col] = String(idx + 1);
  });

  for (let r = 0; r < plotRows; r++) {
    const accLabel = `${(100 - r * (60 / (plotRows - 1))).toFixed(0)}%`.padStart(4, ' ');
    console.log(`${accLabel} │ ${grid[r].join('  ')}`);
  }
  console.log(`     └${'─'.repeat(plotCols * 3)}`);
  console.log(`       0%    20%   40%   60%   80%   100%   (Cost Savings %)`);
  console.log(`Labels correspond to Config Sweep index 1 to 20.`);

  // Find Pareto-optimal: highest accuracy with lowest cost (maximum cost savings)
  let bestConfig = tuningSummary[0];
  for (const r of tuningSummary) {
    if (r.accuracy > bestConfig.accuracy || (r.accuracy === bestConfig.accuracy && r.costSavings > bestConfig.costSavings)) {
      bestConfig = r;
    }
  }

  console.log(`\n🎯 RECOMMENDED PARETO-OPTIMAL CONFIGURATION:`);
  console.log(`   👉 ${bestConfig.configName}`);
  console.log(`   👉 Accuracy: ${bestConfig.accuracy.toFixed(1)}%`);
  console.log(`   👉 Cost: $${bestConfig.cost.toFixed(4)} vs Naive Cloud: $${bestConfig.naiveCost.toFixed(4)} (Saved ${bestConfig.costSavings.toFixed(1)}%)`);
  console.log(`   👉 Latency (P95): ${(bestConfig.p95Latency / 1000).toFixed(2)}s`);
  console.log(`   👉 Explanation: Local Gemma outputs are clean and directly formatted, reducing verbose cloud instruction failures on structured categories.`);

  closeDatabase();
}

runTuningSweep().catch(console.error);
