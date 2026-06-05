import math

def sanitize_json_numbers(obj):
    """
    Recursively replaces NaN, Infinity, and -Infinity with None (JSON null).
    """
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, dict):
        return {k: sanitize_json_numbers(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_json_numbers(v) for v in obj]
    return obj
