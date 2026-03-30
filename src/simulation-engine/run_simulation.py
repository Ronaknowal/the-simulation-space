#!/usr/bin/env python3
"""
The Simulation Space — Multi-Agent Simulation Engine
Entry point: reads config from stdin, writes SSE events to stdout.
Spawned by Next.js API route as a subprocess.
"""
import asyncio
import json
import os
import sys
import uuid
import time

# Add engine directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import sse_emitter
from config import Config
from utils.logger import get_logger

logger = get_logger("main")


async def run_simulation(input_config: dict):
    """Main simulation orchestrator."""
    seed = input_config.get("seed", "")
    config = input_config.get("config", {})
    agent_count = config.get("agentCount", 10)
    duration_minutes = config.get("durationMinutes", 30)
    focus_sectors = config.get("focusSectors", [])
    geographic_scope = config.get("geographicScope", [])
    sim_id = input_config.get("simId", f"sim-{uuid.uuid4().hex[:12]}")

    # Validate
    errors = Config.validate()
    if errors:
        sse_emitter.error(f"Configuration errors: {', '.join(errors)}")
        return

    logger.info(f"Starting simulation: {sim_id}")
    logger.info(f"  Seed: {seed[:80]}...")
    logger.info(f"  Agents: {agent_count}, Duration: {duration_minutes}min")
    logger.info(f"  Sectors: {focus_sectors}, Scope: {geographic_scope}")

    # ── Phase 1: Knowledge Graph (0-15%) ──
    sse_emitter.status("knowledge", "Building knowledge graph from seed event...", progress=2)
    try:
        from knowledge.graph_builder import GraphBuilder
        builder = GraphBuilder()
        graph_id = await builder.build_graph(seed, focus_sectors, geographic_scope)
        sse_emitter.status("knowledge", f"Knowledge graph ready", progress=12)
    except Exception as e:
        logger.warning(f"Knowledge graph failed (continuing without): {e}")
        graph_id = None
        sse_emitter.status("knowledge", "Skipped knowledge graph — using direct analysis", progress=12)

    # ── Phase 2: Entity Extraction (15-20%) ──
    entities = []
    if graph_id:
        sse_emitter.status("knowledge", "Extracting entities from knowledge graph...", progress=15)
        try:
            from knowledge.entity_reader import EntityReader
            reader = EntityReader()
            entities = await reader.get_entities(graph_id, max_entities=min(agent_count, 30))
            sse_emitter.status("knowledge", f"Extracted {len(entities)} entities", progress=20)
        except Exception as e:
            logger.warning(f"Entity extraction failed (continuing without): {e}")
            sse_emitter.status("knowledge", "Entity extraction skipped", progress=20)
    else:
        sse_emitter.status("knowledge", "Ready for agent generation", progress=20)

    # ── Phase 3: Agent Profiles (20-40%) ──
    sse_emitter.status("profiles", f"Generating {agent_count} agent profiles...", progress=22)
    from agents.roles import get_roles_for_count
    from agents.profile_generator import generate_profiles

    # Cap actual OASIS agents to a reasonable number (LLM calls are expensive)
    actual_agent_count = min(agent_count, 20)
    roles = get_roles_for_count(actual_agent_count)

    data_dir = os.path.join(Config.DATA_DIR, sim_id)
    os.makedirs(data_dir, exist_ok=True)
    profiles_path = os.path.join(data_dir, "reddit_profiles.json")

    profiles = generate_profiles(roles, entities, seed, profiles_path)
    sse_emitter.status("profiles", f"Generated {len(profiles)} agent profiles", progress=40)

    # ── Phase 4: Simulation Config (40-45%) ──
    sse_emitter.status("configuring", "Generating simulation configuration...", progress=42)
    from agents.config_generator import generate_simulation_config

    config_path = os.path.join(data_dir, "simulation_config.json")
    sim_config = generate_simulation_config(
        simulation_id=sim_id,
        seed=seed,
        roles=roles,
        profiles=profiles,
        duration_minutes=duration_minutes,
        output_path=config_path,
    )
    sse_emitter.status("configuring", "Simulation configured", progress=45)

    # ── Phase 5: OASIS Simulation (45-75%) ──
    sse_emitter.status("simulating", f"Launching {actual_agent_count} agents in OASIS environment...", progress=47)
    from simulation.runner import SimulationRunner

    runner = SimulationRunner(
        config=sim_config,
        profiles_path=profiles_path,
        data_dir=data_dir,
    )

    try:
        actions = await runner.run()
    except Exception as e:
        logger.error(f"OASIS simulation failed: {e}")
        sse_emitter.status("simulating", f"OASIS unavailable — running LLM agent analysis...", progress=50)
        actions = await _fallback_llm_simulation(seed, roles, duration_minutes)

    sse_emitter.status("simulating", f"Simulation complete: {len(actions)} agent actions recorded", progress=75)

    # ── Phase 6: Aggregation (75-90%) ──
    sse_emitter.status("aggregating", "Synthesizing sector and market impacts from agent consensus...", progress=77)
    from simulation.aggregator import aggregate_results

    impacts, market_impacts = aggregate_results(seed, actions, focus_sectors)
    sse_emitter.status("aggregating", f"Generated {len(impacts)} impacts, {len(market_impacts)} market predictions", progress=90)

    # ── Phase 7: Report (90-100%) ──
    sse_emitter.status("reporting", "Generating final intelligence report...", progress=92)
    from report.report_generator import generate_report

    report = generate_report(
        seed=seed,
        agent_count=agent_count,  # Show the user's requested count
        actions=actions,
        impacts=impacts,
        market_impacts=market_impacts,
        duration_minutes=duration_minutes,
    )

    # ── Complete ──
    sse_emitter.complete(
        simulation_id=sim_id,
        report=report,
        total_agents=agent_count,
        actions=actions,
        impacts=impacts,
        market_impacts=market_impacts,
    )
    logger.info(f"Simulation {sim_id} completed successfully")


async def _fallback_llm_simulation(seed: str, roles: list, duration_minutes: int) -> list[dict]:
    """Fallback: generate agent actions via direct LLM calls when OASIS fails."""
    from utils import llm_client
    import time as _time

    actions = []
    failures = 0
    sse_emitter.status("simulating", "Running LLM-based agent analysis...", progress=50)

    for i, role in enumerate(roles):
        progress = 50 + (25 * (i + 1) / len(roles))
        sse_emitter.status("simulating", f"Agent {i + 1}/{len(roles)}: {role.name} analyzing...", progress=progress)
        try:
            messages = [
                {"role": "system", "content": f"""You are a {role.name} with expertise in {role.expertise}.
Your personality: {role.personality}
Analyze the following event from your professional perspective. Write a 2-3 sentence analysis."""},
                {"role": "user", "content": f"EVENT: {seed}\n\nProvide your expert analysis."},
            ]
            response = llm_client.chat(messages, temperature=0.7, max_tokens=512)

            action = {
                "agentId": f"agent-{i}",
                "agentRole": role.name,
                "action": response[:300],
                "simulatedTime": f"T+{(i + 1) * (duration_minutes // len(roles))}min",
            }
            actions.append(action)
            sse_emitter.agent_action(**action)
            _time.sleep(0.3)  # Rate limit spacing

        except Exception as e:
            failures += 1
            logger.warning(f"Agent {role.name} failed: {e}")
            # If rate limited, wait and retry once
            if "429" in str(e):
                logger.info(f"Rate limited — waiting 10s before next agent...")
                sse_emitter.status("simulating", f"Rate limited — waiting before next agent...", progress=progress)
                _time.sleep(10)
                try:
                    response = llm_client.chat(messages, temperature=0.7, max_tokens=512)
                    action = {
                        "agentId": f"agent-{i}",
                        "agentRole": role.name,
                        "action": response[:300],
                        "simulatedTime": f"T+{(i + 1) * (duration_minutes // len(roles))}min",
                    }
                    actions.append(action)
                    sse_emitter.agent_action(**action)
                    failures -= 1  # Retry succeeded
                except Exception:
                    pass  # Give up on this agent

    # If ALL agents failed, generate rule-based fallback actions
    if len(actions) == 0:
        logger.warning("All LLM agents failed — generating rule-based analysis")
        sse_emitter.status("simulating", "Generating rule-based analysis (LLM unavailable)...", progress=70)
        for i, role in enumerate(roles[:10]):  # Cap at 10
            action = {
                "agentId": f"agent-{i}",
                "agentRole": role.name,
                "action": f"[{role.name}] Analysis pending — {role.analysis_focus}. Key concerns: {', '.join(role.typical_concerns[:3])}.",
                "simulatedTime": f"T+{(i + 1) * (duration_minutes // 10)}min",
            }
            actions.append(action)
            sse_emitter.agent_action(**action)
            _time.sleep(0.1)

    return actions


def main():
    """Entry point — read stdin, run simulation, write stdout."""
    try:
        # Read config from stdin
        raw = sys.stdin.read()
        if not raw.strip():
            sse_emitter.error("No input received on stdin")
            return

        input_config = json.loads(raw)
        logger.info("Received simulation config from Node.js")

        # Run the async simulation
        asyncio.run(run_simulation(input_config))

    except json.JSONDecodeError as e:
        sse_emitter.error(f"Invalid JSON input: {e}")
    except KeyboardInterrupt:
        sse_emitter.error("Simulation interrupted")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sse_emitter.error(f"Simulation engine error: {str(e)}")


if __name__ == "__main__":
    main()
