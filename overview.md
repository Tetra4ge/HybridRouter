# SmartRoute AI
### Hybrid Token-Efficient Routing Agent
> **"The right model for every task, at the lowest possible token cost."**

---
### Change the name as you wish!!
# Overview

SmartRoute AI is an intelligent routing gateway that minimizes LLM inference cost by dynamically selecting the cheapest model capable of solving a user's request.

Instead of sending every request directly to an expensive cloud model, SmartRoute AI follows a **hierarchical multi-tier routing strategy**.

The system first attempts deterministic (zero-token) solutions, then free local inference on AMD GPUs, followed by progressively larger Fireworks AI models only when necessary.

This architecture significantly reduces token consumption while maintaining answer quality.

---

# Problem Statement

Most AI applications work like this:

```
User
   │
   ▼
Large LLM
```

Every request—whether it is

- "Hello"
- "2 + 2"
- "Convert 5 km to m"

or

- "Write a compiler"

gets sent to an expensive LLM.

This causes

- High API costs
- Higher latency
- Unnecessary token usage
- Poor resource utilization

---

# Proposed Solution

Instead of blindly calling an LLM, SmartRoute AI intelligently answers three questions:

1. Can this be solved without AI?
2. Can a free local model solve it?
3. If cloud inference is needed, which is the cheapest capable model?

Only if necessary does it escalate to larger models.

---

# Objectives

- Reduce Fireworks AI token usage
- Utilize AMD GPUs for local inference
- Maintain response quality
- Reduce latency whenever possible
- Provide explainable routing decisions
- Track model performance and cost analytics

---

# Core Architecture

```
                        USER
                          │
                          ▼
                 React Frontend
                          │
                 Supabase Authentication
                          │
                          ▼
                 Express API Gateway
                (/api/process-task)
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
    Request Logger                Token Budget Manager
          │
          ▼
========================================================
          HIERARCHICAL ROUTING ENGINE
========================================================

Tier 0
──────────────────────────────────
Task Classifier

• Intent Detection
• Domain Detection
• Complexity Estimation
• Token Estimation

↓

Tier 1
──────────────────────────────────
Deterministic Solver

• Math
• Regex
• Unit Conversion
• Date Operations
• Parsing
• JSON Validation

↓

Solved?

YES
↓

Return Response
(Zero Tokens)

NO

↓

Tier 2
──────────────────────────────────
Local LLM
(FastAPI + AMD GPU)

Gemma 2B
Qwen 2.5B

↓

Confidence Evaluation

↓

Confidence >= Threshold?

YES
↓

Return Response

NO

↓

Tier 3
──────────────────────────────────
Fireworks AI

Small / Cheap Models

Mixtral
Llama 8B
Qwen

↓

Confidence

↓

Enough?

YES
↓

Return

NO

↓

Tier 4
──────────────────────────────────
Fireworks AI

Large Models

Llama 70B

↓

Validator

↓

Response Logger

↓

Supabase

↓

Frontend Dashboard
```

---

# Complete Data Flow

```
User
 │
 ▼
React UI
 │
 ▼
Supabase Auth
 │
 ▼
Express Backend
 │
 ▼
Task Classifier
 │
 ▼
Complexity Estimator
 │
 ▼
Routing Engine
 │
 ├───────────────┐
 │               │
 ▼               ▼
FastAPI      Fireworks AI
(Local GPU)   (Cloud)
 │               │
 └───────┬───────┘
         ▼
 Validator
         │
         ▼
 Analytics Logger
         │
         ▼
 Supabase Database
         │
         ▼
 React Dashboard
```

---

# User Input

Users interact through a unified AI interface supporting multiple tasks.

Examples

- Chat / Q&A
- Summarization
- Translation
- Code Generation
- Explain Code
- Grammar Correction
- Email Writing

Example Request

```json
{
    "task":"summarize",
    "prompt":"Summarize this article..."
}
```

---

# Backend Pipeline

## Step 1

Receive Request

```
POST /api/process-task
```

↓

Authenticate User

↓

Log Request

---

## Step 2

Task Classifier

Detect

- Task Type
- Language
- Domain
- Estimated Complexity
- Estimated Tokens

Example

```json
{
    "task":"coding",
    "difficulty":"medium",
    "estimated_tokens":180
}
```

---

## Step 3

Tier-0 Deterministic Solver

Can the problem be solved without an LLM?

Examples

- Arithmetic
- Unit conversion
- Date calculations
- Regex matching
- JSON formatting
- Parsing

If YES

Return immediately.

Cost

```
0 Tokens
```

---

## Step 4

Tier-1 Local LLM

Request forwarded to

```
FastAPI
```

Running

- Gemma 2B
- Qwen 2.5B

on AMD ROCm.

Returns

```json
{
    "answer":"...",
    "confidence":0.93
}
```

---

## Step 5

Confidence Evaluation

If

```
confidence >= 0.90
```

Return response.

Otherwise

Escalate.

---

## Step 6

Tier-2 Fireworks

Choose the cheapest capable cloud model.

Examples

- Mixtral
- Qwen
- Llama 8B

Generate answer.

Evaluate confidence.

---

## Step 7

Tier-3 Fireworks

Only for

- Difficult reasoning
- Long context
- Complex coding
- Research questions

Uses

- Llama 70B

---

## Step 8

Validator

Checks

- Empty responses
- JSON validity
- Code syntax
- Response quality
- Confidence

---

## Step 9

Store Analytics

Save

- Model
- Tokens
- Latency
- Cost
- Tier Used
- User ID

---

## Step 10

Return Response

Frontend displays

- Answer
- Model Used
- Tier Used
- Token Count
- Estimated Cost
- Response Time

---

# Routing Logic

The router does not simply use task type.

Routing is based on

- Intent
- Complexity
- Estimated Tokens
- Previous Tier Result
- Confidence Score

Decision Formula

```
Task
     +
Complexity
     +
Estimated Tokens
     +
Confidence
     +
Previous Failure
     =
Best Model
```

---

# Example Routing

## Example 1

Input

```
2 + 5
```

↓

Tier 0

↓

Return

```
7
```

Tokens

```
0
```

---

## Example 2

Input

```
Summarize this paragraph
```

↓

Gemma 2B

↓

Confidence

95%

↓

Return

---

## Example 3

Input

```
Implement Red-Black Tree in C++
```

↓

Gemma

↓

Confidence

52%

↓

Escalate

↓

Mixtral

↓

Confidence

87%

↓

Return

---

## Example 4

Input

```
Explain General Relativity mathematically.
```

↓

Gemma

↓

41%

↓

Mixtral

↓

58%

↓

Llama 70B

↓

94%

↓

Return

---

# Technology Stack

## Frontend

- React
- Tailwind CSS
- Axios
- Chart.js / Recharts

---

## Backend

Node.js

Express.js

Responsibilities

- API Gateway
- Routing Logic
- Token Tracking
- Analytics
- Fireworks Integration

---

## Local AI Server

FastAPI

Responsibilities

- Host Local Models
- AMD GPU Inference
- Internal APIs

Endpoints

```
POST /chat

POST /summarize

POST /translate

POST /code

GET /health
```

---

## Cloud Models

Fireworks AI SDK

Possible Models

- Mixtral
- Llama 3.1 8B
- Llama 3.1 70B
- Qwen

---

## Infrastructure

AMD GPU Cloud

ROCm Runtime

Docker

---

## Database

Supabase

Provides

- Authentication
- PostgreSQL
- Analytics Storage

---

# Database Design

## profiles

```
id
email
name
created_at
```

---

## requests

```
id
user_id
task
prompt
tier
selected_model
complexity
confidence
latency_ms
input_tokens
output_tokens
total_tokens
estimated_cost
created_at
```

---

## model_usage

```
model
total_calls
avg_latency
avg_tokens
success_rate
```

---

# Authentication Flow

```
React

↓

Supabase Auth

↓

JWT Token

↓

Express Middleware

↓

Verify JWT

↓

Attach User ID

↓

Continue Request
```

Passwords are never stored by the backend.

---

# Core API Endpoints

## Authentication

```
POST /api/auth/signup

POST /api/auth/login

POST /api/auth/logout
```

---

## AI

```
POST /api/process-task
```

---

## Analytics

```
GET /api/history

GET /api/analytics

GET /api/models
```

---

## Health

```
GET /api/health
```

---

# FastAPI Internal Endpoints

```
POST /chat

POST /summarize

POST /translate

POST /code

GET /health
```

These endpoints are internal.

Only Express communicates with FastAPI.

---

# Token Analytics

Every request records

- Tier Used
- Model Selected
- Input Tokens
- Output Tokens
- Latency
- Estimated Cost
- Confidence Score

Dashboard visualizes

- Token Savings
- Cost Savings
- Average Latency
- Local vs Cloud Calls
- Model Distribution
- Request History

---

# Team Responsibilities

## Member 1

Backend

- Express
- Routing Engine
- Fireworks Integration

---

## Member 2

Local AI

- FastAPI
- AMD GPU
- ROCm
- Local Models

---

## Member 3

Frontend

- React
- Dashboard
- Authentication
- Charts

---

## Member 4

Infrastructure

- Docker
- Supabase
- Deployment
- Documentation
- Demo Video

---

# Future Improvements

- Semantic intent classifier using a lightweight ML model
- Reinforcement learning-based routing
- Dynamic confidence thresholds
- User-specific routing preferences
- Vector memory for context-aware conversations
- Cost prediction based on historical analytics
- Multi-cloud model providers
- Real-time model benchmarking

---

# Why This Architecture?

Instead of relying on a single LLM, SmartRoute AI implements a hierarchical routing pipeline that progressively escalates requests through deterministic algorithms, local AMD GPU inference, and cloud-hosted Fireworks AI models. Each routing decision is based on task characteristics, complexity, confidence, and cost, ensuring that only the minimum required compute is used.

This architecture minimizes token consumption, reduces operational costs, improves response latency, and provides explainable routing decisions, making it well aligned with the objectives of the **AMD Developer Hackathon – Track 1: Hybrid Token-Efficient Routing Agent**.