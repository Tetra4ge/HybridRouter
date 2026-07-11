# Strict version pinned to ensure AMD ROCm compatibility
FROM rocm/pytorch:rocm6.1_ubuntu22.04_py3.10_pytorch_2.4

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
