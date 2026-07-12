ARG BASE_IMAGE=rocm/pytorch:rocm6.1_ubuntu22.04_py3.10_pytorch_2.4
FROM ${BASE_IMAGE}

WORKDIR /app

COPY requirements.txt .

ARG INSTALL_HEAVY=true
RUN if [ "$INSTALL_HEAVY" = "false" ]; then \
      pip install --no-cache-dir fastapi uvicorn pydantic; \
    else \
      pip install --no-cache-dir -r requirements.txt; \
    fi

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
