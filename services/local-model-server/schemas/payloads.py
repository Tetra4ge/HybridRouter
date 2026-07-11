from pydantic import BaseModel

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
