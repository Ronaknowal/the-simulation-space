"""
Simulation engine configuration.
Reads from environment variables (passed by Node.js from .env.local).
"""
import os
from dotenv import load_dotenv

# Try to load .env from project root
_project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
_env_file = os.path.join(_project_root, ".env.local")
if os.path.exists(_env_file):
    load_dotenv(_env_file, override=True)
else:
    _env_file = os.path.join(_project_root, ".env")
    if os.path.exists(_env_file):
        load_dotenv(_env_file, override=True)


class Config:
    """Simulation engine configuration."""

    # LLM (OpenAI-compatible — works with Gemini via compatibility endpoint)
    LLM_API_KEY = os.environ.get("LLM_API_KEY") or os.environ.get("GEMINI_API_KEY", "")
    LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai")
    LLM_MODEL_NAME = os.environ.get("LLM_MODEL_NAME", "gemini-2.5-flash")

    # Zep Cloud
    ZEP_API_KEY = os.environ.get("ZEP_API_KEY", "")

    # OASIS simulation
    OASIS_MAX_ROUNDS = int(os.environ.get("OASIS_MAX_ROUNDS", "5"))
    OASIS_SEMAPHORE = int(os.environ.get("OASIS_SEMAPHORE", "10"))

    # Data directory for simulation artifacts
    DATA_DIR = os.path.join(os.path.dirname(__file__), ".data")

    @classmethod
    def validate(cls):
        """Validate required configuration."""
        errors = []
        if not cls.LLM_API_KEY:
            errors.append("LLM_API_KEY or GEMINI_API_KEY not configured")
        if not cls.ZEP_API_KEY:
            errors.append("ZEP_API_KEY not configured")
        return errors

    @classmethod
    def setup_camel_env(cls):
        """Set environment variables that camel-ai expects."""
        os.environ["OPENAI_API_KEY"] = cls.LLM_API_KEY
        if cls.LLM_BASE_URL:
            os.environ["OPENAI_API_BASE_URL"] = cls.LLM_BASE_URL
