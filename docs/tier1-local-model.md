# 🧠 Tier-1: Local Model Server

> FastAPI + ROCm-powered local LLM serving with confidence scoring — zero Fireworks tokens.

---

## Overview

The local model server is a **separate Python service** that runs Gemma 2B or Qwen 2.5B on an AMD GPU via ROCm. It handles all tasks that Tier-0 (deterministic solvers) can't solve, before any Fireworks tokens are spent.

### Key Responsibilities

1. **Inference** — Run local LLM inference on task prompts
2. **Confidence Scoring** — Return a confidence score (0.0–1.0) with every answer
3. **Self-Consistency** — Sample multiple responses and measure agreement
4. **Classification Fallback** — Classify ambiguous tasks when regex fails

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Web Framework | FastAPI | REST API for inference requests |
| ML Framework | PyTorch + ROCm | GPU-accelerated inference on AMD |
| Model Format | HuggingFace Transformers | Model loading and tokenization |
| Models | Gemma 2B, Qwen 2.5B | Small, efficient local models |
| Validation | Pydantic | Request/response schema validation |

---

## API Endpoints

### `POST /inference`

Run inference on a single task.

**Request:**
```json
{
  "prompt": "What is the capital of France?",
  "max_tokens": 50,
  "temperature": 0.3,
  "num_samples": 1
}
```

**Response:**
```json
{
  "answer": "The capital of France is Paris.",
  "confidence": 0.95,
  "tokens_used": 12,
  "latency_ms": 145,
  "model": "gemma-2b"
}
```

### `POST /inference/consistency`

Run self-consistency sampling (multiple samples, majority vote).

**Request:**
```json
{
  "prompt": "What is 2^10?",
  "max_tokens": 20,
  "temperature": 0.7,
  "num_samples": 3
}
```

**Response:**
```json
{
  "answer": "1024",
  "confidence": 1.0,
  "samples": ["1024", "1024", "1024"],
  "agreement_ratio": 1.0,
  "tokens_used": 15,
  "model": "gemma-2b"
}
```

### `POST /classify`

Classify a task into one of the 8 categories (fallback for regex classifier).

**Request:**
```json
{
  "content": "Explain why the sky is blue",
  "categories": ["math", "code", "factual", "logic", "parsing", "classification", "creative", "multi_step"]
}
```

**Response:**
```json
{
  "category": "factual",
  "confidence": 0.88
}
```

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "gpu_available": true,
  "gpu_name": "AMD Radeon RX 7900 XTX",
  "model": "gemma-2b"
}
```

---

## Model Selection

### Recommended Models

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| **Gemma 2B** | 2B params | ⚡ Fast | Good | Classification, short answers |
| **Qwen 2.5B** | 2.5B params | ⚡ Fast | Better | Reasoning, code, multilingual |
| Phi-3 Mini | 3.8B params | 🔄 Medium | Better | General tasks |

**Default:** Start with Gemma 2B for speed. Switch to Qwen 2.5B if accuracy on your benchmark warrants it.

### Model Loading

```python
# model_manager.py

from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

class ModelManager:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
    
    def load_model(self, model_name: str = "google/gemma-2b-it"):
        """Lazy-load model on first request."""
        if self.model is None:
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype=torch.float16,
                device_map="auto"
            )
        return self.model, self.tokenizer
```

---

## Confidence Scoring

### Method 1: Self-Consistency (Recommended)

Sample the model multiple times with temperature > 0 and measure agreement:

```python
# confidence_scorer.py

def score_by_consistency(samples: list[str]) -> float:
    """
    Score confidence by measuring agreement across samples.
    If all samples agree → confidence = 1.0
    If no agreement → confidence = 0.0
    """
    if len(samples) <= 1:
        return 0.5  # Can't assess with single sample
    
    # Normalize and compare
    normalized = [s.strip().lower() for s in samples]
    most_common = max(set(normalized), key=normalized.count)
    agreement = normalized.count(most_common) / len(normalized)
    
    return agreement
```

### Method 2: Logprob Analysis

Use token-level log probabilities to assess certainty:

```python
def score_by_logprobs(logprobs: list[float]) -> float:
    """Average token probability as confidence proxy."""
    import math
    probs = [math.exp(lp) for lp in logprobs]
    return sum(probs) / len(probs) if probs else 0.0
```

### Method 3: Self-Assessment (Simpler)

Ask the model to rate its own confidence:

```python
CONFIDENCE_PROMPT = """
Answer the following question, then rate your confidence (0.0 to 1.0).

Question: {question}

Format your response as:
Answer: <your answer>
Confidence: <0.0 to 1.0>
"""
```

> **Recommendation:** Use Method 1 (self-consistency) as default. It's the most reliable for small models. Use 3 samples — more than 3 has diminishing returns.

---

## ROCm Setup

### Prerequisites

```bash
# Verify ROCm installation
rocminfo
rocm-smi

# Verify PyTorch ROCm support
python -c "import torch; print(torch.cuda.is_available())"
```

### Docker Configuration

```dockerfile
# Dockerfile for local model server
FROM rocm/pytorch:latest

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose Service

```yaml
local-model-server:
  build: ./services/local-model-server
  ports:
    - "8000:8000"
  devices:
    - /dev/kfd
    - /dev/dri
  environment:
    - HSA_OVERRIDE_GFX_VERSION=11.0.0
  volumes:
    - model-cache:/root/.cache/huggingface
```

---

## Performance Optimization

### Quantization

Use 4-bit quantization for faster inference with minimal quality loss:

```python
from transformers import BitsAndBytesConfig

quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16
)
```

### Batching

Batch multiple tasks together when possible:

```python
@app.post("/inference/batch")
async def batch_inference(requests: list[InferenceRequest]):
    # Process all requests in a single forward pass
    prompts = [r.prompt for r in requests]
    results = model_manager.batch_generate(prompts)
    return results
```

---

## Related Documents

- [⚡ Tier-0 Solvers](tier0-deterministic-solvers.md) — Tasks solved before reaching Tier-1
- [☁️ Tier-2/3 Fireworks](tier2-tier3-fireworks.md) — Where tasks go if local model confidence is low
- [🔒 Confidence Gating](confidence-gating.md) — How confidence scores drive escalation
- [🐳 Containerization](containerization.md) — Docker setup for the model server
