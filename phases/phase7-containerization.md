# Phase 7: Containerization

> Docker packaging, multi-service compose, GPU passthrough, and submission readiness.

---

## Prerequisites

- [x] Phase 4 complete (Fireworks client works)
- [x] Phases 1-6 functional for scoring pipeline

---

## Objectives

- [ ] Create Dockerfile for orchestrator
- [ ] Create Dockerfile for local model server (with ROCm)
- [ ] Create docker-compose.yml for multi-service orchestration
- [ ] Create `.env.example` with all variables documented
- [ ] Implement health checks and startup ordering
- [ ] Test: `docker compose up --build` from clean state
- [ ] Verify: reads `/input/tasks.json`, writes `/output/results.json`
- [ ] Test GPU passthrough for local model server
- [ ] Test CPU fallback when no GPU available

---

## Deliverables

### 1. Orchestrator Dockerfile

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY . .
RUN mkdir -p /output /app/data/logs /app/data/cache
CMD ["node", "main.js"]
```

### 2. Local Model Server Dockerfile

```dockerfile
FROM rocm/pytorch:rocm6.1_ubuntu22.04_py3.10_pytorch_2.4
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 3. Docker Compose

See [Containerization docs](../docs/containerization.md) for full `docker-compose.yml`.

Key points:
- Orchestrator depends on local-model-server health check
- GPU devices mapped for model server
- Volumes for model cache persistence
- `.env` file loaded automatically

### 4. Submission Testing

```bash
# Clean build test
docker compose down -v
docker compose up --build

# Verify input/output
ls /input/tasks.json   # must exist
ls /output/results.json # must be created

# Verify no interactive prompts
docker compose logs | grep -i "prompt\|input\|enter"
# Should return nothing
```

---

## Submission Checklist

- [ ] `git clone && docker compose up --build` works
- [ ] No interactive prompts
- [ ] Reads `/input/tasks.json` automatically
- [ ] Writes `/output/results.json` with correct schema
- [ ] `.env.example` documents all env vars
- [ ] README has setup/run instructions
- [ ] Health checks pass before processing starts
- [ ] Graceful GPU/CPU fallback
- [ ] Container size reasonable (< 15 GB)

---

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `services/orchestrator/Dockerfile` | NEW | Node.js container |
| `services/local-model-server/Dockerfile` | NEW | Python + ROCm container |
| `services/dashboard/Dockerfile` | NEW | React + Nginx container |
| `docker-compose.yml` | NEW | Multi-service compose |
| `.env.example` | NEW | Environment template |
| `.dockerignore` | NEW | Ignore node_modules, etc. |

---

## Next Phase

→ [Phase 8: Dashboard & Polish](phase8-dashboard-polish.md) — React UI and final touches
