# Phase 3: Local Model Server (Tier-1)

> Set up FastAPI + ROCm to serve Gemma 2B / Qwen 2.5B on AMD GPU — zero Fireworks tokens.

---

## Prerequisites

- [x] Phase 1 complete (project structure, classifier)
- AMD GPU with ROCm drivers installed (or CPU fallback for development)

---

## Objectives

- [ ] Implement FastAPI server with `/inference`, `/inference/consistency`, `/classify`, `/health` endpoints
- [ ] Model manager with lazy loading and GPU/CPU fallback
- [ ] Self-consistency sampling (2-3 samples, majority vote)
- [ ] Confidence scoring module
- [ ] Pydantic request/response models
- [ ] Docker integration with ROCm
- [ ] Client module in orchestrator (`localLlm.js`)
- [ ] Integration test: orchestrator → local model server

---

## Deliverables

### 1. FastAPI Server

```python
# services/local-model-server/main.py

from fastapi import FastAPI
from pydantic import BaseModel
from model_manager import ModelManager
from confidence_scorer import score_consistency

app = FastAPI(title="HybridRouter Local Model Server")
model_mgr = ModelManager()

class InferenceRequest(BaseModel):
    prompt: str
    max_tokens: int = 100
    temperature: float = 0.3
    num_samples: int = 1

class InferenceResponse(BaseModel):
    answer: str
    confidence: float
    tokens_used: int
    latency_ms: int
    model: str

@app.post("/inference", response_model=InferenceResponse)
async def inference(req: InferenceRequest):
    ...

@app.post("/inference/consistency")
async def consistency_inference(req: InferenceRequest):
    ...

@app.post("/classify")
async def classify_task(req: ClassifyRequest):
    ...

@app.get("/health")
async def health():
    ...
```

### 2. Model Manager

```python
# services/local-model-server/model_manager.py

class ModelManager:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.device = None
    
    def load(self, model_name: str = "google/gemma-2b-it"):
        # Lazy load on first request
        # Detect GPU vs CPU
        # Load with float16 for GPU, float32 for CPU
        ...
    
    def generate(self, prompt: str, max_tokens: int, temperature: float) -> tuple[str, int]:
        # Returns (generated_text, tokens_used)
        ...
    
    def generate_samples(self, prompt: str, n: int, max_tokens: int, temperature: float) -> list[str]:
        # Generate n samples for self-consistency
        ...
```

### 3. Confidence Scorer

```python
# services/local-model-server/confidence_scorer.py

def score_consistency(samples: list[str]) -> tuple[str, float]:
    """Returns (best_answer, confidence_score)"""
    ...
```

### 4. Orchestrator Client

```javascript
// services/orchestrator/src/solvers/localLlm.js

export async function solveWithLocalModel(task, options = {}) {
  const response = await fetch(`${LOCAL_MODEL_URL}/inference/consistency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: formatPrompt(task),
      max_tokens: options.maxTokens || 100,
      temperature: 0.7,
      num_samples: 3,
    }),
  });
  
  const data = await response.json();
  return {
    answer: data.answer,
    confidence: data.confidence,
    tokens: 0,  // Local model = free
    tier: 'tier-1',
  };
}
```

---

## Model Selection

### Start With: Gemma 2B Instruct

```python
MODEL_NAME = "google/gemma-2b-it"
```

**Why:** Fastest, smallest footprint, good for classification and short-answer tasks.

### Upgrade To: Qwen 2.5B Instruct (if accuracy warrants)

```python
MODEL_NAME = "Qwen/Qwen2.5-3B-Instruct"
```

**Why:** Better reasoning and code quality, slightly slower.

### Decision: Run eval benchmark with both, pick whichever gives better accuracy on your task mix.

---

## ROCm Configuration

### Environment Variables

```env
HSA_OVERRIDE_GFX_VERSION=11.0.0    # Adjust for your GPU
MODEL_NAME=google/gemma-2b-it
DEVICE=auto                          # auto, cuda, cpu
```

### Verify GPU Access

```python
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"Device count: {torch.cuda.device_count()}")
if torch.cuda.is_available():
    print(f"Device name: {torch.cuda.get_device_name(0)}")
```

---

## Acceptance Criteria

- [ ] `/health` endpoint returns GPU status
- [ ] `/inference` returns answers with < 5s latency
- [ ] `/inference/consistency` returns 3 samples with agreement score
- [ ] `/classify` correctly classifies ambiguous tasks
- [ ] Orchestrator client successfully calls local model
- [ ] Graceful CPU fallback when no GPU available

---

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `services/local-model-server/main.py` | NEW | FastAPI application |
| `services/local-model-server/model_manager.py` | NEW | Model loading & inference |
| `services/local-model-server/confidence_scorer.py` | NEW | Confidence scoring |
| `services/local-model-server/requirements.txt` | NEW | Python dependencies |
| `services/local-model-server/Dockerfile` | NEW | ROCm Docker image |
| `services/orchestrator/src/solvers/localLlm.js` | NEW | Local model client |
| `services/orchestrator/src/router.js` | MODIFY | Add Tier-1 after Tier-0 |

---

## Metrics Target

| Metric | Target |
|--------|--------|
| Inference latency (single) | < 3s |
| Inference latency (3 samples) | < 8s |
| Local model accuracy (general) | > 70% |
| Fireworks tokens from Tier-1 tasks | 0 |

---

## Next Phase

→ [Phase 4: Fireworks Integration](phase4-fireworks-integration.md) — Connect Fireworks API
