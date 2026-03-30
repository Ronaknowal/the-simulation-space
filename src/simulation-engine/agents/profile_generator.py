"""
Agent profile generator — creates OASIS Reddit profiles for geopolitical agents.
"""
import json
import random
from typing import Optional

from agents.roles import AgentRole, get_roles_for_count
from knowledge.entity_reader import EntityNode
from utils import llm_client
from utils.logger import get_logger
import sse_emitter

logger = get_logger("profiles")


def generate_profiles(
    roles: list[AgentRole],
    entities: list[EntityNode],
    seed: str,
    output_path: str,
) -> list[dict]:
    """
    Generate OASIS Reddit agent profiles.

    Args:
        roles: Agent roles to generate profiles for
        entities: Entities from knowledge graph for context
        seed: The seed event description
        output_path: Path to save profiles JSON

    Returns:
        List of profile dictionaries in OASIS Reddit format
    """
    profiles = []
    entity_context = "\n".join(
        f"- {e.name} ({e.entity_type}): {e.summary[:100]}" for e in entities[:20]
    )

    for i, role in enumerate(roles):
        sse_emitter.status("profiles", f"Generating profile {i + 1}/{len(roles)}: {role.name}...")

        try:
            profile = _generate_single_profile(i, role, seed, entity_context)
            profiles.append(profile)
        except Exception as e:
            logger.warning(f"LLM profile generation failed for {role.name}: {e}")
            profile = _fallback_profile(i, role)
            profiles.append(profile)

    # Save to file
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(profiles, f, indent=2, ensure_ascii=False)

    logger.info(f"Generated {len(profiles)} profiles → {output_path}")
    return profiles


def _generate_single_profile(idx: int, role: AgentRole, seed: str, entity_context: str) -> dict:
    """Generate a single agent profile using LLM."""
    messages = [
        {"role": "system", "content": f"""You are creating an agent profile for a geopolitical simulation.
The agent is a {role.name} with expertise in {role.expertise}.
Their personality: {role.personality}
Their analysis focus: {role.analysis_focus}

Create a realistic Reddit-style profile for this agent. Output ONLY a JSON object:
{{
  "name": "Full Name",
  "bio": "2-3 sentence professional bio",
  "persona": "4-5 sentence detailed personality and analytical style description"
}}"""},
        {"role": "user", "content": f"""SEED EVENT: {seed}

KEY ENTITIES:
{entity_context}

Generate a profile for agent #{idx + 1} — a {role.name} analyzing this event."""},
    ]

    result = llm_client.chat_json(messages, temperature=0.8, max_tokens=1024)

    username = _safe_username(result.get("name", role.name))
    karma = random.randint(5000, 50000)

    MBTI_TYPES = ["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
                  "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"]

    return {
        "user_id": idx + 1,
        "user_name": username,
        "name": result.get("name", role.name),
        "bio": result.get("bio", f"{role.name} specializing in {role.expertise}"),
        "persona": result.get("persona", f"{role.personality}. Focuses on {role.analysis_focus}."),
        "karma": karma,
        "age": random.randint(28, 55),
        "gender": random.choice(["M", "F"]),
        "mbti": random.choice(MBTI_TYPES),
        "profession": role.name,
        "interested_topics": role.typical_concerns[:3],
        "role_id": role.id,
        "role_name": role.name,
    }


def _fallback_profile(idx: int, role: AgentRole) -> dict:
    """Rule-based fallback profile when LLM fails."""
    MBTI_TYPES = ["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
                  "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"]
    return {
        "user_id": idx + 1,
        "user_name": _safe_username(role.name),
        "name": role.name,
        "bio": f"{role.name} specializing in {role.expertise}",
        "persona": f"{role.personality}. Focuses on {role.analysis_focus}.",
        "karma": random.randint(5000, 50000),
        "age": random.randint(28, 55),
        "gender": random.choice(["M", "F"]),
        "mbti": random.choice(MBTI_TYPES),
        "profession": role.name,
        "interested_topics": role.typical_concerns[:3],
        "role_id": role.id,
        "role_name": role.name,
    }


def _safe_username(name: str) -> str:
    """Convert a name to a safe Reddit-style username."""
    import re
    base = re.sub(r"[^a-zA-Z0-9]", "_", name.lower()).strip("_")
    base = re.sub(r"_+", "_", base)[:20]
    suffix = random.randint(100, 999)
    return f"{base}_{suffix}"
