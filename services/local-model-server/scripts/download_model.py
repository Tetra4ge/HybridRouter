import os
import sys

# Load env variables from root .env if present
env_file = "../../.env"
if os.path.exists(env_file):
    print("Loading .env...")
    with open(env_file, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip()

model_name = os.environ.get("MODEL_NAME", "google/gemma-2b-it")
hf_token = os.environ.get("HF_TOKEN")

print(f"Target Model: {model_name}")
print(f"HF_TOKEN present: {hf_token is not None}")

try:
    from transformers import AutoTokenizer, AutoModelForCausalLM
    import torch
    
    print(f"Step 1: Downloading tokenizer for {model_name}...")
    tokenizer = AutoTokenizer.from_pretrained(model_name, token=hf_token)
    print("Tokenizer downloaded successfully.")
    
    print(f"Step 2: Downloading weights for {model_name} (this will take a few minutes)...")
    # Determine local device for loading preview, but for caching download it to CPU/default cache first
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        token=hf_token,
        torch_dtype=torch.float32, # safe default for download/caching
    )
    print(f"Model weights downloaded and cached successfully!")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {str(e)}")
    sys.exit(1)
