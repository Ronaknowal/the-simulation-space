"""
Report generator — synthesizes final simulation report.
"""
from utils import llm_client
from utils.logger import get_logger
import sse_emitter

logger = get_logger("report")


def generate_report(
    seed: str,
    agent_count: int,
    actions: list[dict],
    impacts: list[dict],
    market_impacts: list[dict],
    duration_minutes: int,
) -> str:
    """
    Generate the final simulation analysis report.

    Returns:
        Report text (markdown-formatted)
    """
    sse_emitter.status("reporting", "Synthesizing final analysis report...")

    # Build context from simulation results
    action_summary = "\n".join(
        f"- [{a.get('simulatedTime', '')}] {a.get('agentRole', '')}: {a.get('action', '')[:120]}"
        for a in actions[:30]
    )

    impact_summary = "\n".join(
        f"- [{imp.get('severity', 'MEDIUM')}] {imp.get('sector', '')}: {imp.get('description', '')[:120]}"
        for imp in impacts
    )

    market_summary = "\n".join(
        f"- {mi.get('ticker', '')} ({mi.get('name', '')}): {mi.get('predictedChange', 0):+.1f}% "
        f"[confidence: {mi.get('confidence', 0):.0%}] — {mi.get('reasoning', '')[:80]}"
        for mi in market_impacts
    )

    messages = [
        {"role": "system", "content": f"""You are a senior intelligence analyst writing a classified simulation report.

Write a comprehensive 4-6 paragraph analysis report covering:
1. Executive Summary — what happened in the simulation
2. Key Findings — most important insights from {agent_count} agents
3. Cascading Effects — how impacts propagate across sectors
4. Market Assessment — financial implications with specific predictions
5. Recommendations — actionable intelligence for decision-makers
6. Confidence Assessment — overall confidence level and key uncertainties

Write in professional intelligence report style. Be specific and quantitative.
Duration: {duration_minutes} minutes of simulated time with {agent_count} agents."""},
        {"role": "user", "content": f"""SEED EVENT: {seed}

AGENT ACTIONS ({len(actions)} total):
{action_summary}

SECTOR IMPACTS:
{impact_summary}

MARKET IMPACTS:
{market_summary}

Write the final simulation analysis report."""},
    ]

    try:
        report = llm_client.chat(messages, temperature=0.5, max_tokens=4096)
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        report = f"SIMULATION REPORT\n\nSeed Event: {seed}\n\n"
        report += f"Simulation completed with {agent_count} agents over {duration_minutes} minutes.\n"
        report += f"Generated {len(actions)} agent actions, {len(impacts)} sector impacts, "
        report += f"and {len(market_impacts)} market predictions.\n\n"
        report += "Detailed report generation failed. Please review raw simulation data."

    return report
