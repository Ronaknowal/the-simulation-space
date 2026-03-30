"""
Unified LLM client — OpenAI-compatible API wrapper.
Supports Gemini, OpenAI, and any OpenAI-compatible endpoint.
"""
import json
import re
from openai import OpenAI
from config import Config


def get_client() -> OpenAI:
    """Create an OpenAI-compatible client."""
    return OpenAI(
        api_key=Config.LLM_API_KEY,
        base_url=Config.LLM_BASE_URL,
    )


def chat(messages: list, temperature: float = 0.7, max_tokens: int = 4096) -> str:
    """
    Send a chat completion request and return the response text.
    """
    client = get_client()
    response = client.chat.completions.create(
        model=Config.LLM_MODEL_NAME,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    content = response.choices[0].message.content or ""
    # Strip thinking tags (some models like DeepSeek include these)
    content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
    return content


def chat_json(messages: list, temperature: float = 0.3, max_tokens: int = 8192) -> dict:
    """
    Send a chat completion request and parse the response as JSON.
    Handles markdown code blocks and common JSON issues.
    """
    content = chat(messages, temperature=temperature, max_tokens=max_tokens)

    # Strip markdown code blocks
    cleaned = re.sub(r"```(?:json)?\s*", "", content).strip()
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].strip()

    # Find the JSON object
    start = cleaned.find("{")
    if start == -1:
        raise ValueError(f"No JSON object found in response: {content[:200]}")

    # Find matching closing brace
    depth = 0
    end = -1
    for i in range(start, len(cleaned)):
        if cleaned[i] == "{":
            depth += 1
        elif cleaned[i] == "}":
            depth -= 1
            if depth == 0:
                end = i
                break

    if end == -1:
        raise ValueError("Unclosed JSON object in response")

    json_str = cleaned[start:end + 1]
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        # Try fixing trailing commas
        fixed = re.sub(r",(\s*[}\]])", r"\1", json_str)
        return json.loads(fixed)
