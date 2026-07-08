from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Local Model Server")

class TaskRequest(BaseModel):
    content: str
    category: str

class TaskResponse(BaseModel):
    answer: str
    confidence: float

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/solve", response_model=TaskResponse)
def solve_task(request: TaskRequest):
    # TODO: Implement model loading and inference for future phases.
    return TaskResponse(
        answer=f"Local model placeholder for {request.category}",
        confidence=0.5
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
