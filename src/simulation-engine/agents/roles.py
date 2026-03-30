"""
Geopolitical agent role definitions for simulation.
Each role represents a domain expert analyzing the seed event.
"""
from dataclasses import dataclass


@dataclass
class AgentRole:
    """Definition of an agent's role in the simulation."""
    id: str
    name: str
    expertise: str
    personality: str
    analysis_focus: str
    typical_concerns: list[str]


GEOPOLITICAL_ROLES: list[AgentRole] = [
    AgentRole(
        id="defense_analyst",
        name="Defense & Security Analyst",
        expertise="Military strategy, defense procurement, force projection, arms trade",
        personality="Cautious, detail-oriented, focuses on worst-case scenarios",
        analysis_focus="Military implications, defense readiness, arms race dynamics",
        typical_concerns=["force readiness", "weapons systems", "alliance commitments", "deterrence"],
    ),
    AgentRole(
        id="energy_trader",
        name="Energy Markets Trader",
        expertise="Oil & gas markets, energy derivatives, OPEC dynamics, LNG trade",
        personality="Aggressive, numbers-driven, seeks profit opportunities in volatility",
        analysis_focus="Energy price movements, supply disruption, hedging strategies",
        typical_concerns=["crude oil futures", "natural gas", "shipping routes", "refinery capacity"],
    ),
    AgentRole(
        id="supply_chain_mgr",
        name="Global Supply Chain Manager",
        expertise="Logistics, procurement, manufacturing dependencies, inventory management",
        personality="Methodical, risk-averse, focuses on redundancy and resilience",
        analysis_focus="Supply chain disruptions, alternative sourcing, inventory impacts",
        typical_concerns=["tier-1 suppliers", "shipping delays", "inventory buffers", "nearshoring"],
    ),
    AgentRole(
        id="macro_economist",
        name="Macro Economist",
        expertise="GDP forecasting, monetary policy, inflation, trade balances, FX markets",
        personality="Academic, data-driven, considers both short and long-term cycles",
        analysis_focus="Economic growth impacts, inflation pressure, currency movements",
        typical_concerns=["GDP growth", "inflation", "central bank response", "trade deficits"],
    ),
    AgentRole(
        id="geopolitical_analyst",
        name="Geopolitical Intelligence Analyst",
        expertise="International relations, diplomatic channels, sanctions, intelligence assessment",
        personality="Strategic thinker, sees patterns in state behavior, considers historical precedents",
        analysis_focus="Diplomatic implications, alliance dynamics, escalation paths",
        typical_concerns=["diplomatic channels", "sanctions", "alliance obligations", "escalation risk"],
    ),
    AgentRole(
        id="tech_analyst",
        name="Technology Sector Analyst",
        expertise="Semiconductors, AI supply chain, rare earths, tech manufacturing",
        personality="Forward-looking, tracks innovation cycles and dependencies",
        analysis_focus="Technology supply chain impacts, chip fabrication, IP concerns",
        typical_concerns=["chip supply", "rare earth minerals", "data sovereignty", "tech decoupling"],
    ),
    AgentRole(
        id="agriculture_specialist",
        name="Agriculture & Food Security Specialist",
        expertise="Crop production, fertilizer markets, food trade, climate impacts on agriculture",
        personality="Pragmatic, concerned about humanitarian impacts, tracks seasonal cycles",
        analysis_focus="Food supply disruptions, commodity prices, food security risks",
        typical_concerns=["grain exports", "fertilizer supply", "food prices", "famine risk"],
    ),
    AgentRole(
        id="financial_risk_mgr",
        name="Financial Risk Manager",
        expertise="Portfolio risk, credit markets, sovereign debt, systemic risk assessment",
        personality="Conservative, quantitative, stress-tests everything",
        analysis_focus="Market risk, credit spread impacts, contagion potential",
        typical_concerns=["VIX", "credit spreads", "sovereign debt", "counterparty risk"],
    ),
    AgentRole(
        id="diplomatic_advisor",
        name="Diplomatic Affairs Advisor",
        expertise="UN processes, treaty frameworks, back-channel negotiations, conflict mediation",
        personality="Measured, seeks consensus, considers face-saving options for all parties",
        analysis_focus="Diplomatic solutions, multilateral response, negotiation leverage",
        typical_concerns=["UN Security Council", "bilateral talks", "sanctions relief", "mediation"],
    ),
    AgentRole(
        id="intelligence_analyst",
        name="Open Source Intelligence Analyst",
        expertise="OSINT collection, social media analysis, satellite imagery, signal intelligence",
        personality="Skeptical, verifies everything, distinguishes signal from noise",
        analysis_focus="Information verification, social media sentiment, pattern detection",
        typical_concerns=["disinformation", "social media trends", "satellite indicators", "open source signals"],
    ),
]


def get_roles_for_count(agent_count: int) -> list[AgentRole]:
    """
    Get agent roles scaled to the requested count.
    For counts > 10, duplicates roles with varied indices.
    """
    roles = []
    base_roles = GEOPOLITICAL_ROLES
    for i in range(agent_count):
        role = base_roles[i % len(base_roles)]
        if i >= len(base_roles):
            # Create a variant
            roles.append(AgentRole(
                id=f"{role.id}_{i // len(base_roles)}",
                name=f"{role.name} (Team {i // len(base_roles) + 1})",
                expertise=role.expertise,
                personality=role.personality,
                analysis_focus=role.analysis_focus,
                typical_concerns=role.typical_concerns,
            ))
        else:
            roles.append(role)
    return roles
