import time
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from model_manager import ModelManager
from confidence_scorer import score_consistency

app = FastAPI(title="HybridRouter Local Model Server")
model_mgr = ModelManager()

# --- Pydantic Schemas ---

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

class ConsistencyResponse(BaseModel):
    answer: str
    confidence: float
    samples: list[str]
    agreement_ratio: float
    tokens_used: int
    model: str

class ClassifyRequest(BaseModel):
    content: str
    categories: list[str] = ["math", "code", "factual", "logic", "parsing", "classification", "creative", "multi_step"]

class ClassifyResponse(BaseModel):
    category: str
    confidence: float

# Legacy models for backward compatibility
class TaskRequest(BaseModel):
    content: str
    category: str

class TaskResponse(BaseModel):
    answer: str
    confidence: float

# --- Routes ---

@app.get("/health")
def health_check():
    is_cuda = torch.cuda.is_available()
    gpu_name = torch.cuda.get_device_name(0) if is_cuda else "None"
    return {
        "status": "healthy",
        "model_loaded": model_mgr.model is not None,
        "gpu_available": is_cuda,
        "gpu_name": gpu_name,
        "model": model_mgr.model_name
    }

@app.post("/inference", response_model=InferenceResponse)
async def run_inference(req: InferenceRequest):
    start_time = time.time()
    try:
        answer, tokens = model_mgr.generate(
            prompt=req.prompt,
            max_tokens=req.max_tokens,
            temperature=req.temperature
        )
        latency = int((time.time() - start_time) * 1000)
        return InferenceResponse(
            answer=answer,
            confidence=0.80,  # Baseline confidence for single generation
            tokens_used=tokens,
            latency_ms=latency,
            model=model_mgr.model_name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/inference/consistency", response_model=ConsistencyResponse)
async def run_consistency_inference(req: InferenceRequest):
    start_time = time.time()
    try:
        num_samples = req.num_samples if req.num_samples > 1 else 3
        # Consistency sampling requires temperature > 0.0 to generate variety
        temp = req.temperature if req.temperature > 0.0 else 0.7
        
        samples, tokens = model_mgr.generate_samples(
            prompt=req.prompt,
            n=num_samples,
            max_tokens=req.max_tokens,
            temperature=temp
        )
        best_raw, agreement = score_consistency(samples)
        latency = int((time.time() - start_time) * 1000)
        
        return ConsistencyResponse(
            answer=best_raw,
            confidence=agreement,
            samples=samples,
            agreement_ratio=agreement,
            tokens_used=tokens,
            model=model_mgr.model_name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/classify", response_model=ClassifyResponse)
async def classify_task(req: ClassifyRequest):
    try:
        categories_str = ", ".join(req.categories)
        prompt = (
            f"You are a classification assistant. Categorize the given task content into exactly one of the following categories: {categories_str}.\n\n"
            f"Task: \"{req.content}\"\n\n"
            f"Response must be exactly the category name and nothing else (do not include explanation or markdown formatting).\n"
            f"Category:"
        )
        category_raw, _ = model_mgr.generate(prompt=prompt, max_tokens=10, temperature=0.0)
        category = category_raw.strip().lower()
        
        # Match closest category from input categories list
        matched_category = "factual"  # Default fallback
        for cat in req.categories:
            if cat.lower() in category or category in cat.lower():
                matched_category = cat
                break
                
        return ClassifyResponse(
            category=matched_category,
            confidence=0.90 if matched_category != "factual" else 0.50
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Backward compatibility route for simple task solving
@app.post("/solve", response_model=TaskResponse)
async def solve_task_legacy(request: TaskRequest):
    try:
        samples, _ = model_mgr.generate_samples(
            prompt=request.content,
            n=3,
            max_tokens=100,
            temperature=0.7
        )
        best_raw, agreement = score_consistency(samples)
        return TaskResponse(
            answer=best_raw,
            confidence=agreement
        )
    except Exception as e:
        return TaskResponse(
            answer=f"Error in local model server: {str(e)}",
            confidence=0.0
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
