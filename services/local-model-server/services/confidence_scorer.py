import re

def normalize_answer(answer: str) -> str:
    """Normalizes an answer for text comparison (lowercase, stripped, whitespace cleaned)."""
    if not answer:
        return ""
    # Strip whitespace and convert to lowercase
    text = answer.strip().lower()
    # Normalize multiple whitespace/newlines into a single space
    text = re.sub(r'\s+', ' ', text)
    # Remove surrounding quotes
    text = text.strip('"\'`')
    return text

def score_consistency(samples: list[str]) -> tuple[str, float]:
    """
    Performs majority voting across samples and computes an agreement ratio.
    
    Args:
        samples (list[str]): List of generated text samples.
        
    Returns:
        tuple[str, float]: (best_raw_answer, agreement_confidence)
    """
    if not samples:
        return "", 0.0
        
    if len(samples) == 1:
        return samples[0], 0.5  # Baseline confidence for a single sample
        
    # Group raw samples by their normalized forms
    normalized_groups = {}
    
    for raw_sample in samples:
        norm = normalize_answer(raw_sample)
        if norm not in normalized_groups:
            normalized_groups[norm] = []
        normalized_groups[norm].append(raw_sample)
        
    # Find the group with the highest count
    best_norm = max(normalized_groups, key=lambda k: len(normalized_groups[k]))
    best_raw = normalized_groups[best_norm][0]  # Return the first raw sample of the majority group
    
    agreement_ratio = len(normalized_groups[best_norm]) / len(samples)
    
    return best_raw, agreement_ratio
