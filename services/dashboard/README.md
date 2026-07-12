# HybridRouter Dashboard

> **React + Vite** control center for the AMD Developer Hackathon 2026 — Track 1 submission.
> Visualizes real-time routing decisions, token savings, and tier performance across the HybridRouter pipeline.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [AI-Assist Smart Classifier](#-ai-assist-smart-classifier)
- [Interactive Router Playground](#interactive-router-playground)
- [Firebase Authentication](#firebase-authentication)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Docker Deployment](#docker-deployment)

---

## Overview

The dashboard is the **observability layer** of the HybridRouter system. It connects to the Orchestrator's REST API (`/api/stats`, `/api/logs`, `/api/tasks`) and presents:

- Live token savings vs. naïve cloud-only routing
- Per-tier resolution rates (Tier-0 through Tier-3)
- An interactive playground to test the routing pipeline in real time
- Full audit log of every task routed through the system

> The dashboard is **not on the critical scoring path** — it does not affect the `Score = Accuracy - Token_Penalty` formula. It is for visibility, debugging, and demo purposes.

---

## Features

### 📊 Metrics Cards
Four live stat cards at the top of the Control Center:

| Card | What It Shows |
|------|--------------|
| **Total Requests** | Count of all tasks processed in the current evaluation run |
| **Estimated Savings** | `%` saved vs. naïve all-Fireworks routing, in dollars |
| **Local Solver Rate** | `%` of tasks resolved by Tier-0 or Tier-1 (zero Fireworks tokens) |
| **P95 Pipeline Latency** | 95th-percentile end-to-end latency in seconds |

---

### 📈 Decision Distribution
Bar chart showing the real-time split of tasks across tiers:

| Tier | Model | Token Cost |
|------|-------|-----------|
| **Tier 0 — Code Solvers** | Deterministic (SymPy, Regex) | Free |
| **Tier 1 — Gemma Local** | Gemma 2B via AMD ROCm | Free |
| **Tier 2 — Cheap Cloud** | Kimi / GLM (Fireworks) | Low |
| **Tier 3 — Strong Cloud** | DeepSeek (Fireworks) | High |

---

### 🗒️ Live Logs Explorer
Scrollable audit table of all processed tasks, showing:
- Task ID, category, tier used, latency, cost, and verification status
- Color-coded tier badges (green = free, amber = cheap, red = expensive)
- Polls the orchestrator every 5 seconds automatically

---

## ✨ AI-Assist Smart Classifier

> **Branch:** `feat/gemini-classify`

### The Problem
The existing `Auto-Detect (Regex Classifier)` in the playground works for simple patterns but can mis-classify edge cases. For example, `2 + 5` typed as a multi-step question gets routed to Tier-1 Gemma instead of Tier-0 (which would answer it in 0 tokens, 0.01 seconds).

### The Solution
When a user types their query and **clicks or tabs out of the text box**, the dashboard silently calls the **Gemini Flash Lite API** to classify the query into the correct category. The Category Override dropdown auto-updates — no extra button clicks needed.

```
User types query → clicks out (blur event)
        │
        ▼
  ✦ AI classifying...   ← animated badge appears
        │
  Gemini Flash Lite API (~40 tokens, free quota)
        │
        ▼
  ✓ AI detected: math   ← green badge confirms
        │
  Category Override: [Math ▼]  ← dropdown auto-set
        │
        ▼
  [Execute Route] → Tier-0, Tokens: 0 ✅
```

### Why Gemini and not Fireworks?
- **Gemini tokens are free for scoring** — only `FIREWORKS_BASE_URL` tokens count in the hackathon formula
- **Gemini Flash Lite** is the smallest/fastest Gemini model — single-word classification takes ~40 tokens total
- The call goes **browser → Gemini API directly** — the orchestrator never sees it, no latency added to the routing pipeline

### Token Budget for AI-Assist

| Component | Tokens |
|-----------|--------|
| System prompt | ~28 tokens |
| User query (avg) | ~15 tokens |
| Model response | ≤10 tokens |
| **Total per classify call** | **~53 tokens** |

### Categories the AI can detect

| Category | Example Queries |
|----------|----------------|
| `math` | `2 + 5`, `What is 15% of 300?`, `Solve x² + 3x = 10` |
| `code` | `Write a binary search in Python`, `Debug this JavaScript` |
| `factual` | `What is the capital of Japan?`, `Who wrote Hamlet?` |
| `logic` | `If all cats are mammals and all mammals breathe...` |
| `parsing` | `Extract all emails from this text`, `Convert to JSON` |
| `classification` | `Classify the sentiment of: "This is great!"` |
| `creative` | `Write a haiku about the ocean` |
| `multi_step` | `First calculate X, then use the result to...` |

### Graceful Fallback
If the Gemini API key is not configured or the API returns an unexpected value:
- The badge silently disappears
- The dropdown stays on whatever the user last selected
- **No crash, no error popup** — the feature is purely additive

---

## Interactive Router Playground

The playground (bottom-left of the Control Center) lets you manually test any query through the full routing pipeline:

1. **Type your query** in the text area
2. **AI-Assist auto-classifies** on blur (if configured) — or pick manually from the dropdown
3. Click **Execute Route** — the orchestrator processes it through all 5 tiers
4. **Waterfall Pipeline Diagram** shows exactly which tier resolved it
5. **Output Box** shows the answer, active solver, latency, and token count

### Waterfall Pipeline Visualization

```
[Classifier] ──► [Tier-0 Code] ──► [Tier-1 Local] ──► [Tier-2 Cheap] ──► [Tier-3 Strong]
     ↑                ↑                  ↑                  ↑                   ↑
  Always runs     Math/Parsing       Gemma Local        Kimi/GLM             DeepSeek
  (free, regex)   (free, code)       (free, GPU)      (low tokens)        (high tokens)
```

Each box turns **green** (active hit), **amber** (passed through), or **grey** (bypassed).

---

## Firebase Authentication

The dashboard uses **Firebase Auth** (Google Sign-In) to identify who submits playground queries. Authentication is **optional** — the routing pipeline and scoring are completely unaffected by sign-in state.

### Architecture

```
 Browser
   │
   ├─► Firebase Auth (Google OAuth popup)
   │       └─► currentUser  ──────────────────────────┐
   │                                                   ▼
   ├─► Playground.jsx  ──► saveQueryLog(queryId, data, user)
   │                              │
   │                              ▼
   │                    Firestore: logs/{queryId}
   │                    { submittedBy, submittedByName,
   │                      submittedByPhoto, timestamp, … }
   │
   └─► Home.jsx NavBar  ──► <SignInModal />  (top-right corner)
```

### Key Files

| File | Purpose |
|------|---------|
| [`src/firebase/config.js`](src/firebase/config.js) | Firebase app init — reads `VITE_FIREBASE_*` env vars; exports `auth`, `db`, `googleProvider` |
| [`src/firebase/firestoreUtils.js`](src/firebase/firestoreUtils.js) | `saveQueryLog()` — writes a routing result to `logs/` collection, tagged with the user's `uid` and `displayName`; `subscribeToLogs()` — real-time Firestore listener for the Live Logs Explorer |
| [`src/context/AuthContext.jsx`](src/context/AuthContext.jsx) | React Context wrapping the whole app; exposes `currentUser`, `loading`, `signInWithGoogle()`, `signOutUser()` via the `useAuth()` hook |
| [`src/components/SignInModal.jsx`](src/components/SignInModal.jsx) | Floating sign-in button in the Home page nav; shows Google avatar + display name when signed in, sign-out on click |

### Sign-In Flow

1. User clicks **Sign in with Google** in the top-right corner of the Home page
2. `signInWithGoogle()` opens a **Google OAuth popup** via `signInWithPopup(auth, googleProvider)`
3. On success, `onAuthStateChanged` updates `currentUser` across the whole app
4. Every query submitted from the Playground is tagged with `submittedBy`, `submittedByName`, and `submittedByPhoto` in Firestore
5. On sign-out, `currentUser` becomes `null`; logs continue to be submitted as `anonymous`

### Firestore Security Rules

The `logs/` collection is configured so that **any authenticated user can read all logs; any authenticated user can write** (writes are tagged with their own `uid`). Unauthenticated reads are blocked by default in the Firebase Console rules.

### Setting Up Firebase

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication → Google** as a sign-in provider
3. Enable **Firestore Database** (start in production mode)
4. Add your app and copy the SDK config snippet
5. Paste the values into `.env` (see [Environment Variables](#environment-variables))

---

## Getting Started

### Prerequisites
- Node.js 20+
- Orchestrator running on `http://localhost:3000`

### Install and Run

```bash
cd services/dashboard

# Install dependencies
npm install

# Start dev server (auto-proxies /api/* to localhost:3000)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) for the landing page,  
or [http://localhost:5173/console](http://localhost:5173/console) for the Control Center.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GEMINI_API_KEY` | Optional | Gemini API key for AI-Assist Smart Classifier. Get one free at [aistudio.google.com](https://aistudio.google.com/app/apikey). If not set, AI-Assist is silently disabled. |
| `VITE_FIREBASE_API_KEY` | Required for Auth | Firebase Web API key (from Firebase Console → Project Settings → Your apps) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Required for Auth | OAuth redirect domain, e.g. `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Required for Auth | Firebase project ID, e.g. `hybridrouter-dash` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Optional | Cloud Storage bucket, e.g. `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Optional | FCM sender ID (unused unless Push Notifications added) |
| `VITE_FIREBASE_APP_ID` | Required for Auth | Firebase App ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Optional | Google Analytics measurement ID (e.g. `G-XXXXXXXX`) |

> **Security:** `.env` is in `.gitignore` and will never be committed. Only `.env.example` (with placeholder values) is tracked in git. Share your key with teammates via a secure channel (e.g., a shared `.env` in a private message or password manager).

---

## Project Structure

```
services/dashboard/
├── .env                        # ← Your secrets (gitignored)
├── .env.example                # ← Template for teammates (committed)
├── .gitignore                  # ← Ensures .env is never committed
├── Dockerfile                  # ← Production build (supports --build-arg)
├── nginx.conf                  # ← Nginx config for serving the built dist/
├── vite.config.js              # ← Dev proxy: /api/* → localhost:3000
│
└── src/
    ├── firebase/
    │   ├── config.js           # ← Firebase app init; exports auth, db, googleProvider
    │   └── firestoreUtils.js   # ← saveQueryLog() + subscribeToLogs() helpers
    │
    ├── context/
    │   └── AuthContext.jsx     # ← AuthProvider + useAuth() hook (currentUser, signInWithGoogle, signOutUser)
    │
    ├── utils/
    │   └── geminiClassifier.js # ← AI-Assist: Gemini Flash Lite classify call
    │
    ├── components/
    │   ├── SignInModal.jsx      # ← Google Sign-In button / user avatar in Home nav
    │   ├── Playground.jsx      # ← Interactive query tester + AI badge UI
    │   ├── MetricsCards.jsx    # ← 4 stat cards (requests, savings, latency)
    │   ├── DecisionDistribution.jsx # ← Tier distribution bar chart
    │   ├── LiveLogs.jsx        # ← Audit log table (real-time Firestore listener)
    │   ├── CustomCursor.jsx    # ← Fluid custom cursor dot
    │   ├── SavingsCalculator.jsx    # ← Token cost savings breakdown
    │   └── Footer.jsx          # ← Hackathon footer
    │
    ├── pages/
    │   ├── Home.jsx            # ← Landing page with hero + feature cards + auth nav
    │   └── Console.jsx         # ← Control Center (metrics + playground + logs)
    │
    ├── App.jsx                 # ← React Router setup + AuthProvider + theme state
    └── index.css               # ← Full design system (tokens, components, animations)
```

---

## Docker Deployment

The dashboard Dockerfile uses a **two-stage build** (Node builder → Nginx serve).
The Gemini API key must be passed as a build argument since `.env` is gitignored:

```bash
# Build with all Vite env vars injected at build time
docker build \
  --build-arg VITE_GEMINI_API_KEY=your-gemini-key \
  --build-arg VITE_FIREBASE_API_KEY=your-firebase-api-key \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com \
  --build-arg VITE_FIREBASE_PROJECT_ID=your-project-id \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000 \
  --build-arg VITE_FIREBASE_APP_ID=1:000000000000:web:abc123 \
  --build-arg VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX \
  -t hybridrouter-dashboard \
  services/dashboard/

# Or via docker-compose (reads from your shell environment)
# In docker-compose.yml:
#   build:
#     args:
#       - VITE_GEMINI_API_KEY=${VITE_GEMINI_API_KEY}
#       - VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}
#       - VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}
#       - VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}
#       - VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}
```

> **Why build-arg and not runtime env?**  
> Vite bakes `VITE_*` variables into the compiled JavaScript bundle at **build time** via `import.meta.env`. Unlike a Node.js server, the static files served by Nginx cannot read runtime environment variables. The key must be present when `npm run build` runs inside the Docker build stage.

---

<p align="center">
  <b>HybridRouter Dashboard — AMD Developer Hackathon 2026</b><br/>
  <i>See the routing. Save the tokens.</i>
</p>
