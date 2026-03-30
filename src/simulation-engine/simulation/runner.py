"""
OASIS simulation runner — executes multi-agent geopolitical simulation.
Uses Reddit platform for threaded analytical discourse.
"""
import asyncio
import json
import os
import random
import sqlite3
from typing import Any

from config import Config
from utils.logger import get_logger
import sse_emitter

logger = get_logger("runner")


class SimulationRunner:
    """Runs OASIS Reddit simulation with geopolitical agents."""

    # Reddit actions available to agents
    AVAILABLE_ACTIONS = None  # Set after import

    def __init__(self, config: dict, profiles_path: str, data_dir: str):
        self.config = config
        self.profiles_path = profiles_path
        self.data_dir = data_dir
        self.db_path = os.path.join(data_dir, "simulation.db")
        self.env = None
        self.agent_graph = None

    async def run(self) -> list[dict]:
        """
        Run the OASIS simulation and return all agent actions.

        Returns:
            List of action dictionaries
        """
        # Import OASIS (heavy imports, only when needed)
        try:
            from camel.models import ModelFactory
            from camel.types import ModelPlatformType
            import oasis
            from oasis import ActionType, LLMAction, ManualAction, generate_reddit_agent_graph
        except ImportError as e:
            raise RuntimeError(
                f"OASIS dependencies not installed: {e}. "
                f"Run: cd src/simulation-engine && pip install -r requirements.txt"
            )

        # Set available actions
        available_actions = [
            ActionType.LIKE_POST,
            ActionType.DISLIKE_POST,
            ActionType.CREATE_POST,
            ActionType.CREATE_COMMENT,
            ActionType.LIKE_COMMENT,
            ActionType.DISLIKE_COMMENT,
            ActionType.SEARCH_POSTS,
            ActionType.TREND,
            ActionType.REFRESH,
            ActionType.DO_NOTHING,
        ]

        time_config = self.config.get("time_config", {})
        total_hours = time_config.get("total_simulation_hours", 2.5)
        minutes_per_round = time_config.get("minutes_per_round", 30)
        total_rounds = max(3, int((total_hours * 60) // minutes_per_round))

        sse_emitter.status("simulating", f"Initializing OASIS environment ({total_rounds} rounds)...")

        # Setup camel-ai environment variables
        Config.setup_camel_env()

        # Create LLM model
        model = ModelFactory.create(
            model_platform=ModelPlatformType.OPENAI,
            model_type=Config.LLM_MODEL_NAME,
        )

        # Load agent profiles
        self.agent_graph = await generate_reddit_agent_graph(
            profile_path=self.profiles_path,
            model=model,
            available_actions=available_actions,
        )

        # Clean old database
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

        # Create environment
        self.env = oasis.make(
            agent_graph=self.agent_graph,
            platform=oasis.DefaultPlatformType.REDDIT,
            database_path=self.db_path,
            semaphore=Config.OASIS_SEMAPHORE,
        )

        await self.env.reset()
        sse_emitter.status("simulating", "OASIS environment ready. Starting simulation rounds...")

        # Post initial event
        event_config = self.config.get("event_config", {})
        initial_posts = event_config.get("initial_posts", [])
        if initial_posts:
            for post in initial_posts:
                agent_id = post.get("poster_agent_id", 0)
                content = post.get("content", "")
                try:
                    agent = self.agent_graph.get_agent(agent_id)
                    action = ManualAction(
                        action_type=ActionType.CREATE_POST,
                        action_args={"content": content},
                    )
                    await self.env.step({agent: action})
                    sse_emitter.agent_action(
                        f"agent-{agent_id}",
                        "System",
                        f"Posted intelligence briefing: {content[:80]}...",
                        "T+0",
                    )
                except Exception as e:
                    logger.warning(f"Failed to post initial event: {e}")

        # Run simulation rounds
        all_actions = []
        agent_configs = self.config.get("agent_configs", [])

        for round_num in range(total_rounds):
            simulated_minutes = round_num * minutes_per_round
            simulated_hour = (simulated_minutes // 60) % 24
            time_label = f"T+{simulated_minutes}min"

            sse_emitter.status(
                "simulating",
                f"Round {round_num + 1}/{total_rounds} — {time_label} simulated..."
            )

            # Select active agents for this round
            active_agents = self._select_active_agents(
                agent_configs, simulated_hour, round_num
            )

            if not active_agents:
                continue

            # Build action dict — each active agent uses LLM to decide
            actions = {}
            for agent_id in active_agents:
                try:
                    agent = self.agent_graph.get_agent(agent_id)
                    actions[agent] = LLMAction()
                except Exception:
                    pass

            if actions:
                try:
                    await self.env.step(actions)
                except Exception as e:
                    logger.warning(f"Round {round_num + 1} step error: {e}")

            # Read actions from this round's database entries
            round_actions = self._read_round_actions(round_num, time_label, agent_configs)
            all_actions.extend(round_actions)

            # Emit agent actions as SSE events
            for act in round_actions:
                sse_emitter.agent_action(
                    act["agentId"],
                    act["agentRole"],
                    act["action"],
                    act["simulatedTime"],
                )

        # Cleanup
        try:
            await self.env.close()
        except Exception:
            pass

        logger.info(f"Simulation complete: {len(all_actions)} total actions across {total_rounds} rounds")
        return all_actions

    def _select_active_agents(
        self, agent_configs: list[dict], hour: int, round_num: int
    ) -> list[int]:
        """Select which agents are active this round based on config."""
        time_config = self.config.get("time_config", {})
        peak_hours = time_config.get("peak_hours", [9, 10, 11, 14, 15, 16])
        off_peak_hours = time_config.get("off_peak_hours", [0, 1, 2, 3, 4, 5])

        if hour in peak_hours:
            multiplier = time_config.get("peak_activity_multiplier", 1.5)
        elif hour in off_peak_hours:
            multiplier = time_config.get("off_peak_activity_multiplier", 0.3)
        else:
            multiplier = 1.0

        base_min = time_config.get("agents_per_hour_min", 3)
        base_max = time_config.get("agents_per_hour_max", 10)
        target = int(random.uniform(base_min, base_max) * multiplier)

        candidates = []
        for cfg in agent_configs:
            agent_id = cfg.get("agent_id", 0)
            activity = cfg.get("activity_level", 0.5)
            active_hours = cfg.get("active_hours", list(range(6, 23)))
            if hour in active_hours and random.random() < activity:
                candidates.append(agent_id)

        return random.sample(candidates, min(target, len(candidates))) if candidates else []

    def _read_round_actions(
        self, round_num: int, time_label: str, agent_configs: list[dict]
    ) -> list[dict]:
        """Read agent actions from the OASIS SQLite database."""
        actions = []
        if not os.path.exists(self.db_path):
            return actions

        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Read most recent actions (OASIS stores in 'trace' table)
            cursor.execute("""
                SELECT user_id, action, info, created_at
                FROM trace
                ORDER BY created_at DESC
                LIMIT 50
            """)

            role_map = {cfg["agent_id"]: cfg.get("role_id", "unknown") for cfg in agent_configs}
            seen = set()

            for row in cursor.fetchall():
                user_id, action_type, info_json, created_at = row
                key = f"{user_id}-{action_type}-{created_at}"
                if key in seen:
                    continue
                seen.add(key)

                try:
                    info = json.loads(info_json) if info_json else {}
                except json.JSONDecodeError:
                    info = {}

                # Skip boring actions
                if action_type in ("DO_NOTHING", "REFRESH", "TREND"):
                    continue

                action_text = info.get("content", info.get("response", str(info)[:150]))
                role_id = role_map.get(user_id, "analyst")

                actions.append({
                    "agentId": f"agent-{user_id}",
                    "agentRole": role_id.replace("_", " ").title(),
                    "action": f"[{action_type}] {action_text[:200]}",
                    "simulatedTime": time_label,
                })

            conn.close()
        except Exception as e:
            logger.warning(f"Failed to read round actions: {e}")

        return actions
