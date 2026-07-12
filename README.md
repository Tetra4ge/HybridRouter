# HybridRouter - Token-Efficient Routing Agent

**Built for the AMD Developer Hackathon 2026 — Track 1: Hybrid Token-Efficient Routing Agent**

An intelligent, multi-tier routing system designed to maximize task-solving accuracy while minimizing cloud API token costs. By leveraging local GPU resources for quick validation and classification, the system routes tasks dynamically across deterministic solvers, local hardware, and tiered cloud LLMs.

---

## 🛠️ Tech Stack & Models

### **Developer Stack**
*   **Frontend Dashboard:** React, TailwindCSS, Vanilla CSS, Vite
*   **Orchestrator Backend:** Node.js, Express, SQLite
*   **Local Inference Engine:** Python, FastAPI, Hugging Face Transformers
*   **Authentication & Live Database:** Firebase Auth & Cloud Firestore
*   **Deployment Infrastructure:** Docker, Docker Compose, AWS EC2

### **Models Used**
*   **Tier 1 (Local):** `Gemma 2B` / `Qwen 2.5B` (run locally on AMD GPU hardware using ROCm acceleration)
*   **Tier 2 (Cheap Cloud):** `Mixtral 8x7B` via Fireworks AI API
*   **Tier 3 (Strong Cloud):** `Llama 3.1 70B` via Fireworks AI API

---

## 📸 Dashboard Preview & Walkthrough

Here is a visual breakdown of the Control Center Dashboard and how it tracks operations:

### 1. Control Center Overview
Visualizes real-time metrics (Total processed tasks, Estimated Token Savings, Local Solver Rate, and P95 Pipeline Latency) computed directly from Firestore.
![Control Center Overview](images/1.png)

### 2. Live Logs Explorer
Allows developers to monitor log entries as they sync from Firestore, paginated into pages of 5 items.
![Live Logs Explorer](images/2.png)

### 3. Interactive Router Simulator
Lets you test prompts locally and witness how the orchestrator cascades each task through the routing waterfall.
![Interactive Router Simulator](images/3.png)

### 4. Decision Distribution Analysis
Displays the live percentage breakdown of which tiers are solving tasks, helping tune model confidence thresholds.
![Decision Distribution Analysis](images/4.png)

### 5. Multi-User Sync Dashboard
Real-time stats update instantly when other team members submit tasks from other clients.
![Multi-User Sync Dashboard](images/5.png)

---

## 🧠 System Architecture

The router processes tasks through a **5-tier waterfall** designed to maximize cost savings:

```
[Prompt Input]
      │
      ▼
┌──────────────┐
│  Classifier  │  --> Heuristic/Regex pre-check (math, code, etc.)
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────┐
│ Tier 0: Deterministic Solvers   │ --> Solves formulas (SymPy) & strings natively.
│ (FREE / Zero Tokens)            │     Perfect accuracy, zero token cost!
└──────────────┬──────────────────┘
               │ Unsolved
               ▼
┌─────────────────────────────────┐
│ Tier 1: Local LLM (AMD GPU)     │ --> Runs Gemma 2B or Qwen 2.5B locally via ROCm.
│ (FREE / Zero Fireworks Tokens)  │     Returns result if self-consistency confidence is high.
└──────────────┬──────────────────┘
               │ Low Confidence
               ▼
┌─────────────────────────────────┐
│ Tier 2: Fireworks Cheap Model   │ --> Escalates to Mixtral 8x7B on Fireworks cloud
│ (Minimal Token Cost)            │     for intermediate complexity.
└──────────────┬──────────────────┘
               │ Still Uncertain
               ▼
┌─────────────────────────────────┐
│ Tier 3: Fireworks Strong Model  │ --> Escalates to Llama 3.1 70B on Fireworks cloud.
│ (Expensive Token Cost)          │     Only invoked for high-complexity reasoning.
└─────────────────────────────────┘
```

---

## 📊 Scoring Formula

The system is optimized around the official competition scoring logic:

$$\text{Score} = \text{Accuracy Score} - \text{Token Penalty}$$

*   **Accuracy Score:** Percentage of correct answers.
*   **Token Penalty:** Cost incurred through paid Fireworks cloud tokens.
*   **Local & Solver Runs (Tier 0 & Tier 1):** Incur **zero** token penalty, keeping your evaluation runs cheap and boosting the total leaderboard score.

---

## 🚀 Quick Start Guide

### Prerequisites
*   Docker & Docker Compose
*   AMD GPU with ROCm support (for local inference acceleration)
*   Fireworks AI API Key
*   Firebase Project Credentials

### Run via Docker (Recommended)
1. Clone the repository and navigate to the project directory:
   ```bash
   git clone <your-repo-url>
   cd HybridRouter
   ```
2. Set up your environment variables:
   ```bash
   cp .env.example .env
   # Add your FIREWORKS_API_KEY, FIREBASE configs, and GEMINI_API_KEY
   ```
3. Boot up the entire multi-service container pipeline:
   ```bash
   docker compose up --build
   ```
4. Access the React Dashboard at `http://localhost:5173`.

### Local Development Setup
If running services individually:
*   **Local Model Server (FastAPI):**
    ```bash
    cd services/local-model-server
    pip install -r requirements.txt
    python main.py
    ```
*   **Orchestrator Backend (Express):**
    ```bash
    cd services/orchestrator
    npm install
    npm run dev
    ```
*   **Frontend App (Vite):**
    ```bash
    cd services/dashboard
    npm install
    npm run dev
    ```
