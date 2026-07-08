# 🐳 Containerization Guide

> Docker setup, multi-service compose, and deployment for hackathon submission.

---

## Overview

The submission must run as a **Docker container** that reads `/input/tasks.json` and writes `/output/results.json` without any user intervention. The system uses Docker Compose to orchestrate three services.

---

## Container Architecture

```
docker-compose.yml
├── orchestrator (Node.js)     → port 4000
├── local-model-server (Python) → port 8000, AMD GPU
└── dashboard (React)           → port 3000 (optional)
```

---

## Dockerfile: Orchestrator

```dockerfile
# services/orchestrator/Dockerfile
FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy source
COPY . .

# Create output directory
RUN mkdir -p /output /app/data/logs /app/data/cache

# Entry point: batch mode
CMD ["node", "main.js"]
```

---

## Dockerfile: Local Model Server

```dockerfile
# services/local-model-server/Dockerfile
FROM rocm/pytorch:rocm6.1_ubuntu22.04_py3.10_pytorch_2.4

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Download model at build time (optional, saves startup time)
# RUN python -c "from transformers import AutoModelForCausalLM, AutoTokenizer; AutoTokenizer.from_pretrained('google/gemma-2b-it'); AutoModelForCausalLM.from_pretrained('google/gemma-2b-it')"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Dockerfile: Dashboard

```dockerfile
# services/dashboard/Dockerfile
FROM node:20-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

---

## Docker Compose

```yaml
# docker-compose.yml

version: '3.8'

services:
  orchestrator:
    build: ./services/orchestrator
    ports:
      - "4000:4000"
    environment:
      - FIREWORKS_API_KEY=${FIREWORKS_API_KEY}
      - FIREWORKS_BASE_URL=${FIREWORKS_BASE_URL:-https://api.fireworks.ai/inference/v1}
      - LOCAL_MODEL_URL=http://local-model-server:8000
      - HIGH_CONFIDENCE_THRESHOLD=${HIGH_CONFIDENCE_THRESHOLD:-0.85}
      - MEDIUM_CONFIDENCE_THRESHOLD=${MEDIUM_CONFIDENCE_THRESHOLD:-0.60}
      - ENABLE_CACHE=${ENABLE_CACHE:-true}
      - LOG_LEVEL=${LOG_LEVEL:-info}
    volumes:
      - ./input:/input:ro
      - ./output:/output
      - ./data:/app/data
    depends_on:
      local-model-server:
        condition: service_healthy

  local-model-server:
    build: ./services/local-model-server
    ports:
      - "8000:8000"
    devices:
      - /dev/kfd:/dev/kfd
      - /dev/dri:/dev/dri
    environment:
      - HSA_OVERRIDE_GFX_VERSION=${HSA_OVERRIDE_GFX_VERSION:-11.0.0}
      - MODEL_NAME=${MODEL_NAME:-google/gemma-2b-it}
    volumes:
      - model-cache:/root/.cache/huggingface
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 120s  # Model loading takes time

  dashboard:
    build: ./services/dashboard
    ports:
      - "3000:3000"
    depends_on:
      - orchestrator
    profiles:
      - ui  # Only start with: docker compose --profile ui up

volumes:
  model-cache:
```

---

## Environment File

```env
# .env.example

# Required
FIREWORKS_API_KEY=your-api-key-here
FIREWORKS_BASE_URL=https://api.fireworks.ai/inference/v1

# Model configuration
MODEL_NAME=google/gemma-2b-it
HSA_OVERRIDE_GFX_VERSION=11.0.0

# Confidence thresholds
HIGH_CONFIDENCE_THRESHOLD=0.85
MEDIUM_CONFIDENCE_THRESHOLD=0.60

# Features
ENABLE_CACHE=true
ENABLE_DASHBOARD=false

# Logging
LOG_LEVEL=info
LOG_DB_PATH=/app/data/logs/tasks.db
```

---

## Running

### Full stack (headless, for scoring)

```bash
# Place tasks in input/
cp tasks.json input/tasks.json

# Run
docker compose up --build

# Results will be in output/results.json
```

### With dashboard

```bash
docker compose --profile ui up --build
```

### Development mode

```bash
# Start only model server
docker compose up local-model-server

# Run orchestrator locally
cd services/orchestrator && npm run dev
```

---

## GPU Passthrough

### Verify AMD GPU access

```bash
# On host
rocm-smi

# In container
docker run --rm --device /dev/kfd --device /dev/dri rocm/pytorch:latest rocm-smi
```

### CPU Fallback

If no AMD GPU is available, the model server should fall back to CPU:

```python
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")
```

---

## Submission Checklist

- [ ] `docker compose up --build` works from a clean clone
- [ ] No interactive prompts during startup
- [ ] Reads `/input/tasks.json` automatically
- [ ] Writes `/output/results.json` in the correct schema
- [ ] `.env.example` documents all required environment variables
- [ ] `README.md` has clear setup/run instructions
- [ ] Model server healthcheck passes before orchestrator starts
- [ ] Graceful handling when GPU is not available

---

## Related Documents

- [🏗️ Architecture](architecture.md) — Service architecture overview
- [🧠 Tier-1 Local Model](tier1-local-model.md) — Model server configuration
- [📅 Phase 7](../phases/phase7-containerization.md) — Containerization phase details
