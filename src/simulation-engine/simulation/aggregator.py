"""
Result aggregator — synthesizes OASIS simulation output into
sector impacts and market predictions using LLM.
"""
import time
from utils import llm_client
from utils.logger import get_logger
import sse_emitter

logger = get_logger("aggregator")


def aggregate_results(
    seed: str,
    actions: list[dict],
    sectors: list[str],
) -> tuple[list[dict], list[dict]]:
    """
    Aggregate simulation actions into sector impacts and market impacts.

    Args:
        seed: The seed event
        actions: All agent actions from simulation
        sectors: Focus sectors

    Returns:
        Tuple of (sector_impacts, market_impacts)
    """
    sse_emitter.status("aggregating", "Analyzing agent actions for sector impacts...")

    # Summarize actions for the LLM
    action_summary = "\n".join(
        f"- {a['agentRole']}: {a['action'][:150]}" for a in actions[:40]
    )

    sector_str = ", ".join(sectors) if sectors else "all sectors"

    messages = [
        {"role": "system", "content": """You are an intelligence analyst synthesizing simulation results.
Based on agent actions from a multi-agent geopolitical simulation, produce:

1. SECTOR IMPACTS: 5-8 sector-level impacts with severity ratings
2. MARKET IMPACTS: 8-12 specific stock/commodity market predictions

Output ONLY valid JSON:
{
  "impacts": [
    {"sector": "Energy", "severity": "HIGH", "description": "...", "affectedEntities": ["Shell", "BP"], "confidence": 0.85}
  ],
  "marketImpacts": [
    {"ticker": "CL=F", "name": "Crude Oil", "predictedChange": 8.5, "confidence": 0.82, "reasoning": "..."}
  ]
}

Severity levels: HIGH (critical, >50% probability), MEDIUM (significant but manageable), LOW (minor/indirect).
Market changes: realistic percentages (-30% to +20%). Confidence: 0.0 to 1.0."""},
        {"role": "user", "content": f"""SEED EVENT: {seed}

FOCUS SECTORS: {sector_str}

SIMULATION AGENT ACTIONS ({len(actions)} total):
{action_summary}

Synthesize these agent actions into sector impacts and market predictions."""},
    ]

    try:
        result = llm_client.chat_json(messages, temperature=0.4, max_tokens=8192)
    except Exception as e:
        logger.error(f"Aggregation LLM call failed: {e}")
        return _fallback_impacts(seed, sectors), _fallback_markets()

    # Parse impacts
    impacts = []
    for imp in result.get("impacts", []):
        impact_data = {
            "sector": imp.get("sector", "Unknown"),
            "severity": imp.get("severity", "MEDIUM"),
            "description": imp.get("description", ""),
            "affectedEntities": imp.get("affectedEntities", []),
            "confidence": min(1.0, max(0.0, imp.get("confidence", 0.5))),
        }
        impacts.append(impact_data)
        sse_emitter.impact(**{
            "sector": impact_data["sector"],
            "severity": impact_data["severity"],
            "description": impact_data["description"],
            "affected_entities": impact_data["affectedEntities"],
            "confidence": impact_data["confidence"],
        })
        time.sleep(0.3)

    # Parse market impacts
    market_impacts = []
    for mi in result.get("marketImpacts", []):
        mi_data = {
            "ticker": mi.get("ticker", "???"),
            "name": mi.get("name", "Unknown"),
            "predictedChange": mi.get("predictedChange", 0),
            "confidence": min(1.0, max(0.0, mi.get("confidence", 0.5))),
            "reasoning": mi.get("reasoning", ""),
        }
        market_impacts.append(mi_data)
        sse_emitter.market_impact(
            ticker=mi_data["ticker"],
            name=mi_data["name"],
            predicted_change=mi_data["predictedChange"],
            confidence=mi_data["confidence"],
            reasoning=mi_data["reasoning"],
        )
        time.sleep(0.15)

    return impacts, market_impacts


def _fallback_impacts(seed: str, sectors: list[str]) -> list[dict]:
    """Generate and emit fallback impacts when LLM aggregation fails."""
    fallback_sectors = sectors if sectors else ["Geopolitical", "Financial", "Energy", "Defense", "Technology"]
    impacts = []
    for s in fallback_sectors:
        imp = {"sector": s, "severity": "MEDIUM",
               "description": f"Potential cascading impact from event: {seed[:80]}",
               "affectedEntities": [], "confidence": 0.5}
        impacts.append(imp)
        sse_emitter.impact(
            sector=imp["sector"], severity=imp["severity"],
            description=imp["description"], affected_entities=imp["affectedEntities"],
            confidence=imp["confidence"],
        )
        time.sleep(0.2)
    return impacts


def _fallback_markets() -> list[dict]:
    """Generate and emit fallback market impacts."""
    defaults = [
        {"ticker": "SPY", "name": "S&P 500", "predictedChange": -2.0, "confidence": 0.5, "reasoning": "General market uncertainty from geopolitical event"},
        {"ticker": "CL=F", "name": "Crude Oil", "predictedChange": 5.0, "confidence": 0.6, "reasoning": "Energy supply disruption risk"},
        {"ticker": "GC=F", "name": "Gold", "predictedChange": 3.0, "confidence": 0.7, "reasoning": "Flight to safe-haven assets"},
        {"ticker": "VIX", "name": "Volatility Index", "predictedChange": 15.0, "confidence": 0.8, "reasoning": "Market fear spike expected"},
    ]
    for mi in defaults:
        sse_emitter.market_impact(
            ticker=mi["ticker"], name=mi["name"],
            predicted_change=mi["predictedChange"],
            confidence=mi["confidence"], reasoning=mi["reasoning"],
        )
        time.sleep(0.15)
    return defaults
