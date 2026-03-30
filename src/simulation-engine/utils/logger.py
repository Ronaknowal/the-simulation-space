"""
Logging configuration for the simulation engine.
Logs to stderr (stdout is reserved for SSE events).
"""
import logging
import sys


def get_logger(name: str = "simulation") -> logging.Logger:
    """Get a configured logger that writes to stderr (not stdout)."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler(sys.stderr)
        handler.setLevel(logging.INFO)
        formatter = logging.Formatter(
            "%(asctime)s [%(name)s] %(levelname)s: %(message)s",
            datefmt="%H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.propagate = False
    return logger
