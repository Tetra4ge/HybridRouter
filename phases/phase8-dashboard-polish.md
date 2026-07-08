# Phase 8: Dashboard & Polish

> React dashboard for visualization, final testing, README polish, and demo preparation.

---

## Prerequisites

- [x] All previous phases complete
- [x] Scoring pipeline works headlessly

---

## Objectives

- [ ] Build React dashboard with token tracker, task browser, accuracy monitor
- [ ] Add real-time stats API endpoints to orchestrator
- [ ] Final end-to-end testing on the standardized scoring environment
- [ ] Polish README with final architecture diagram, results, and instructions
- [ ] Record a demo video (optional but impressive)
- [ ] Final threshold tuning based on eval results

---

## Deliverables

### 1. React Dashboard

```bash
cd services/dashboard
npx -y create-vite@latest ./ -- --template react
npm install
```

**Pages:**

#### Token Usage Dashboard
- Total tokens used (big number, color-coded)
- Tokens by tier (stacked bar chart)
- Tokens by category (horizontal bar)
- Token savings vs naive approach (comparison)

#### Task Browser
- Table of all processed tasks
- Columns: ID, Category, Tier Used, Confidence, Tokens, Answer, Correct?
- Filter by category, tier, correctness
- Sort by tokens, confidence

#### Score Estimator
- Current estimated score: `accuracy - token_penalty`
- Accuracy gauge
- Token penalty gauge
- Comparison to hypothetical scores (all-Fireworks, all-local, etc.)

#### System Health
- Service status (orchestrator, model server, Fireworks)
- GPU status
- Cache stats

### 2. Stats API Endpoints

Add to orchestrator:

```javascript
// GET /api/stats/summary
// GET /api/stats/by-category
// GET /api/stats/by-tier
// GET /api/stats/recent?limit=50
// GET /api/stats/score
// GET /api/cache/stats
```

### 3. Final Testing Checklist

- [ ] Run full eval benchmark (100+ tasks)
- [ ] Accuracy above threshold
- [ ] Fireworks token count minimized
- [ ] Docker build from clean state
- [ ] `/input/tasks.json` → `/output/results.json` end-to-end
- [ ] No errors in container logs
- [ ] Stress test: 500+ tasks
- [ ] GPU and CPU modes both work

### 4. README Polish

- Update architecture diagram with final metrics
- Add "Results" section with accuracy/token numbers
- Ensure all links work
- Clear setup instructions that a judge can follow
- Add badges (Docker, Node.js, Python, ROCm)

### 5. Demo Preparation

- 30-second GIF of dashboard in action
- Screenshot of eval results
- Before/after token comparison

---

## Dashboard Technology

| Component | Choice |
|-----------|--------|
| Framework | React + Vite |
| Charting | Recharts or Chart.js |
| Styling | CSS Modules or vanilla CSS |
| HTTP Client | fetch API |
| State | React Context |

---

## Acceptance Criteria

- [ ] Dashboard shows real-time token usage
- [ ] Task browser displays all processed tasks
- [ ] Score estimator shows current estimated score
- [ ] Docker build includes dashboard (optional profile)
- [ ] README is complete and judges can follow instructions
- [ ] All tests pass

---

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `services/dashboard/` | NEW | Full React application |
| `services/orchestrator/src/server.js` | MODIFY | Add stats endpoints |
| `README.md` | MODIFY | Final polish |
| `docker-compose.yml` | MODIFY | Add dashboard service |

---

## Final Metrics

After all phases, the system should achieve:

| Metric | Target |
|--------|--------|
| Overall accuracy | > 85% |
| Total Fireworks tokens (100 tasks) | < 7,000 |
| Tier-0 coverage | > 25% |
| Local accept rate | > 50% |
| Escalation to Tier-3 | < 10% |
| Docker build time | < 10 min |
| End-to-end processing (100 tasks) | < 5 min |

---

## 🎉 Submission

After completing this phase:

1. Push all code to the repository
2. Verify `docker compose up --build` works from clean clone
3. Submit to the hackathon platform
4. Celebrate! 🚀

---

## Related Documents

- [📋 Main README](../README.md) — What judges will read first
- [🐳 Containerization](../docs/containerization.md) — Docker details
- [🏆 Scoring Formula](../docs/scoring-formula.md) — How you're scored
