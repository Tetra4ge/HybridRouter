# 🔌 API Reference

> REST API endpoints for all services in the HybridRouter system.

---

## Orchestrator API (Node.js — port 4000)

### Task Processing

#### `POST /api/solve`

Process a single task through the routing pipeline.

**Request:**
```json
{
  "id": "task_001",
  "content": "What is the square root of 144?",
  "metadata": {}
}
```

**Response:**
```json
{
  "id": "task_001",
  "answer": "12",
  "metadata": {
    "category": "math",
    "tier_used": "tier-0",
    "solver": "deterministic/math",
    "confidence": 1.0,
    "tokens_used": 0,
    "latency_ms": 2
  }
}
```

#### `POST /api/solve/batch`

Process multiple tasks.

**Request:**
```json
{
  "tasks": [
    { "id": "task_001", "content": "What is 5 + 3?" },
    { "id": "task_002", "content": "What is the capital of France?" }
  ]
}
```

**Response:**
```json
{
  "results": [
    { "id": "task_001", "answer": "8", "metadata": { ... } },
    { "id": "task_002", "answer": "Paris", "metadata": { ... } }
  ],
  "summary": {
    "total_tasks": 2,
    "total_tokens": 45,
    "tier_distribution": { "tier-0": 1, "tier-1": 1 }
  }
}
```

#### `POST /api/classify`

Classify a task without solving it.

**Request:**
```json
{ "content": "Write a Python function to sort a list" }
```

**Response:**
```json
{
  "category": "code",
  "confidence": 0.92,
  "method": "regex"
}
```

---

### Analytics

#### `GET /api/stats/summary`

Overall performance summary.

**Response:**
```json
{
  "total_tasks": 100,
  "total_fireworks_tokens": 7200,
  "accuracy": 87.5,
  "estimated_score": 83.3,
  "tier_distribution": {
    "tier-0": 25,
    "tier-1": 46,
    "tier-2": 22,
    "tier-3": 7
  }
}
```

#### `GET /api/stats/by-category`

Performance breakdown by task category.

**Response:**
```json
{
  "categories": {
    "math": { "count": 15, "accuracy": 100, "tokens": 0, "avg_confidence": 1.0 },
    "factual": { "count": 20, "accuracy": 85, "tokens": 1200, "avg_confidence": 0.78 },
    ...
  }
}
```

#### `GET /api/stats/by-tier`

Performance breakdown by solving tier.

#### `GET /api/stats/recent?limit=50`

Most recent task logs.

#### `GET /api/stats/score`

Estimated competition score.

---

### Cache

#### `GET /api/cache/stats`

Cache hit/miss statistics.

**Response:**
```json
{
  "hits": 12,
  "misses": 88,
  "hit_rate": 0.12,
  "size": 100,
  "tokens_saved": 540
}
```

#### `DELETE /api/cache`

Clear the answer cache.

---

### Health

#### `GET /api/health`

System health check.

**Response:**
```json
{
  "status": "healthy",
  "services": {
    "orchestrator": "up",
    "local_model": "up",
    "fireworks": "reachable",
    "database": "connected"
  },
  "uptime_seconds": 3600
}
```

---

## Local Model Server API (Python — port 8000)

### `POST /inference`

Run single inference.

See [Tier-1 Local Model](tier1-local-model.md#api-endpoints) for full documentation.

### `POST /inference/consistency`

Run self-consistency sampling.

### `POST /classify`

Classify a task using the local model.

### `GET /health`

Health check with GPU status.

---

## Common Response Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Invalid request (bad schema) |
| `408` | Model timeout |
| `429` | Rate limited (Fireworks) |
| `500` | Internal server error |
| `503` | Model not loaded / service unavailable |

---

## Authentication

- **Orchestrator ↔ Local Model Server**: No auth (internal network only)
- **Orchestrator → Fireworks**: Bearer token via `FIREWORKS_API_KEY`
- **Dashboard → Orchestrator**: No auth (development only)

---

## Related Documents

- [🏗️ Architecture](architecture.md) — Service topology
- [🐳 Containerization](containerization.md) — How services connect
- [📊 Token Tracking](token-tracking.md) — Analytics endpoints
