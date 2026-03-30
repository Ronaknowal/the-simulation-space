"""
Simulation config generator — creates OASIS simulation parameters.
"""
import json
import random

from agents.roles import AgentRole
from config import Config
from utils.logger import get_logger

logger = get_logger("config_gen")


def generate_simulation_config(
    simulation_id: str,
    seed: str,
    roles: list[AgentRole],
    profiles: list[dict],
    duration_minutes: int,
    output_path: str,
) -> dict:
    """
    Generate OASIS simulation configuration.

    Args:
        simulation_id: Unique simulation ID
        seed: The seed event
        roles: Agent roles
        profiles: Generated agent profiles
        duration_minutes: Simulation duration in minutes
        output_path: Path to save config JSON

    Returns:
        Configuration dictionary
    """
    # Calculate rounds: each round = 30 min simulated time
    minutes_per_round = 30
    total_rounds = max(3, min(duration_minutes // minutes_per_round, Config.OASIS_MAX_ROUNDS))
    total_hours = (total_rounds * minutes_per_round) / 60

    # Generate per-agent activity config
    agent_configs = []
    for i, (role, profile) in enumerate(zip(roles, profiles)):
        activity = _generate_agent_activity(role, i)
        agent_configs.append(activity)

    # Initial event post
    initial_posts = [
        {
            "poster_agent_id": 0,  # First agent posts the seed event
            "content": f"[INTELLIGENCE BRIEFING] {seed}",
            "subreddit": "geopolitical_analysis",
        }
    ]

    config = {
        "simulation_id": simulation_id,
        "seed_event": seed,
        "llm_model": Config.LLM_MODEL_NAME,
        "time_config": {
            "total_simulation_hours": total_hours,
            "minutes_per_round": minutes_per_round,
            "start_date": "2026-03-29",
            "timezone": "UTC",
            "agents_per_hour_min": max(3, len(profiles) // 4),
            "agents_per_hour_max": max(5, len(profiles) // 2),
            "peak_hours": [9, 10, 11, 14, 15, 16],
            "off_peak_hours": [0, 1, 2, 3, 4, 5],
            "peak_activity_multiplier": 1.5,
            "off_peak_activity_multiplier": 0.3,
        },
        "agent_configs": agent_configs,
        "event_config": {
            "initial_posts": initial_posts,
            "hot_topics": [seed[:100]],
        },
        "platform_config": {
            "recency_weight": 0.4,
            "popularity_weight": 0.3,
            "relevance_weight": 0.3,
            "viral_threshold": 5,
        },
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

    logger.info(f"Generated simulation config: {total_rounds} rounds, {len(profiles)} agents → {output_path}")
    return config


def _generate_agent_activity(role: AgentRole, agent_id: int) -> dict:
    """Generate activity parameters for a single agent."""
    # Different roles have different activity patterns
    if role.id.startswith("energy_trader") or role.id.startswith("financial_risk"):
        activity_level = random.uniform(0.7, 0.9)
        posts_per_hour = random.uniform(1.5, 3.0)
    elif role.id.startswith("intelligence") or role.id.startswith("geopolitical"):
        activity_level = random.uniform(0.6, 0.8)
        posts_per_hour = random.uniform(1.0, 2.0)
    else:
        activity_level = random.uniform(0.4, 0.7)
        posts_per_hour = random.uniform(0.5, 1.5)

    return {
        "agent_id": agent_id,
        "role_id": role.id,
        "activity_level": round(activity_level, 2),
        "posts_per_hour": round(posts_per_hour, 2),
        "comments_per_hour": round(posts_per_hour * 1.5, 2),
        "active_hours": list(range(6, 23)),
        "response_delay_min": random.randint(1, 5),
        "response_delay_max": random.randint(10, 30),
        "sentiment_bias": round(random.uniform(-0.3, 0.3), 2),
        "stance": random.choice(["analytical", "cautious", "hawkish", "dovish"]),
        "influence_weight": round(random.uniform(0.3, 1.0), 2),
    }
