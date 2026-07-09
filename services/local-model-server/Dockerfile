# Use the ROCm PyTorch base image for AMD GPU support
FROM rocm/pytorch:latest

WORKDIR /app

# Copy requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application files
COPY . .

# Expose port 8000 for FastAPI API requests
EXPOSE 8000

# Start the FastAPI application with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
