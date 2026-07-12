import os

class ModelManager:
    """Manages lazy-loading and inference for the local LLM running on CPU or GPU (ROCm/CUDA)."""
    def __init__(self):
        self.model = None
        self.tokenizer = None
        try:
            import torch
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            self.device = "cpu"
        
        # Load environment variables from any nearby .env file
        env_paths = [".env", "../.env", "../../.env", "../orchestrator/.env"]
        for p in env_paths:
            if os.path.exists(p):
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            os.environ[k.strip()] = v.strip()
                break

        # Default to Qwen/Qwen2.5-1.5B-Instruct for speed and open access, but configurable
        self.model_name = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-1.5B-Instruct")
        
    def load(self):
        """Lazy-loads the model and tokenizer on the first request."""
        if self.model is None:
            try:
                import torch
                from transformers import AutoTokenizer, AutoModelForCausalLM
            except ImportError:
                raise ImportError(
                    "PyTorch and/or Transformers library is not installed. "
                    "To use the local model server, please ensure you build the container with "
                    "INSTALL_HEAVY=true and use a base image that supports them."
                )
            
            print(f"Loading tokenizer and model for {self.model_name} on device: {self.device}...")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            
            # Use float16 for GPU to optimize memory and speed; float32 for CPU
            if self.device == "cuda":
                self.model = AutoModelForCausalLM.from_pretrained(
                    self.model_name,
                    torch_dtype=torch.float16,
                    device_map="auto"
                )
            else:
                self.model = AutoModelForCausalLM.from_pretrained(
                    self.model_name,
                    torch_dtype=torch.float32,
                    device_map="cpu"
                )
            print("Model loaded successfully.")
        return self.model, self.tokenizer

    def generate(self, prompt: str, max_tokens: int = 100, temperature: float = 0.3) -> tuple[str, int]:
        """Generates a single response for a prompt. Returns (generated_text, tokens_used)."""
        self.load()
        import torch
        
        # Apply chat template if available to adhere to instruct-tuning
        messages = [{"role": "user", "content": prompt}]
        try:
            formatted_prompt = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        except Exception:
            formatted_prompt = prompt
            
        inputs = self.tokenizer(formatted_prompt, return_tensors="pt").to(self.device)
        input_len = inputs["input_ids"].shape[1]
        
        generation_kwargs = {
            "max_new_tokens": max_tokens,
            "temperature": temperature,
            "do_sample": temperature > 0.0,
        }
        if temperature > 0.0:
            generation_kwargs["top_p"] = 0.9
            
        with torch.no_grad():
            outputs = self.model.generate(**inputs, **generation_kwargs)
            
        generated_ids = outputs[0][input_len:]
        generated_text = self.tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
        tokens_used = len(generated_ids)
        
        return generated_text, tokens_used

    def generate_samples(self, prompt: str, n: int = 3, max_tokens: int = 100, temperature: float = 0.7) -> tuple[list[str], int]:
        """Generates multiple samples for self-consistency. Returns (samples, total_tokens_used)."""
        self.load()
        import torch
        
        messages = [{"role": "user", "content": prompt}]
        try:
            formatted_prompt = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        except Exception:
            formatted_prompt = prompt
            
        inputs = self.tokenizer(formatted_prompt, return_tensors="pt").to(self.device)
        input_len = inputs["input_ids"].shape[1]
        
        samples = []
        total_tokens = 0
        
        try:
            # Attempt to generate in a single batch pass
            generation_kwargs = {
                "max_new_tokens": max_tokens,
                "temperature": temperature,
                "do_sample": True,
                "top_p": 0.9,
                "num_return_sequences": n,
            }
            with torch.no_grad():
                outputs = self.model.generate(**inputs, **generation_kwargs)
            
            for out in outputs:
                gen_ids = out[input_len:]
                gen_text = self.tokenizer.decode(gen_ids, skip_special_tokens=True).strip()
                samples.append(gen_text)
                total_tokens += len(gen_ids)
        except Exception as e:
            # Fallback to sequential generation if batch/num_return_sequences fails
            print(f"Batch generation failed, falling back to sequential: {e}")
            samples = []
            total_tokens = 0
            for _ in range(n):
                text, tokens = self.generate(prompt, max_tokens=max_tokens, temperature=temperature)
                samples.append(text)
                total_tokens += tokens
                
        return samples, total_tokens
