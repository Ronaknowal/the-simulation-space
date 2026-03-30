"""
Entity reader — extracts entities from Zep knowledge graphs.
"""
import asyncio
from dataclasses import dataclass, field
from typing import Optional

from zep_cloud.client import AsyncZep

from config import Config
from utils.logger import get_logger

logger = get_logger("entities")


@dataclass
class EntityNode:
    """An entity extracted from the knowledge graph."""
    uuid: str
    name: str
    entity_type: str
    summary: str = ""
    attributes: dict = field(default_factory=dict)
    related_entities: list[str] = field(default_factory=list)


class EntityReader:
    """Reads and filters entities from Zep knowledge graphs."""

    # Entity types we exclude (too generic)
    EXCLUDED_TYPES = {"entity", "node", "concept", "thing", "event"}

    def __init__(self):
        self.zep = AsyncZep(api_key=Config.ZEP_API_KEY)

    async def get_entities(self, graph_id: str, max_entities: int = 50) -> list[EntityNode]:
        """
        Extract entities from a Zep knowledge graph.

        Args:
            graph_id: The Zep session/graph ID
            max_entities: Maximum number of entities to return

        Returns:
            List of EntityNode objects
        """
        logger.info(f"Extracting entities from graph: {graph_id}")

        try:
            # Search the graph for entities via memory retrieval
            memory = await self.zep.memory.get(session_id=graph_id)

            entities = []
            seen_names = set()

            if memory and hasattr(memory, 'facts') and memory.facts:
                for fact in memory.facts:
                    # Extract entity names from facts
                    fact_text = fact.fact if hasattr(fact, 'fact') else str(fact)
                    # Use simple NER from fact text
                    entity_names = self._extract_entity_names(fact_text)
                    for name in entity_names:
                        if name.lower() not in seen_names and name.lower() not in self.EXCLUDED_TYPES:
                            seen_names.add(name.lower())
                            entities.append(EntityNode(
                                uuid=f"ent-{len(entities)}",
                                name=name,
                                entity_type=self._classify_entity(name),
                                summary=fact_text[:200],
                            ))
                            if len(entities) >= max_entities:
                                break
                    if len(entities) >= max_entities:
                        break

            logger.info(f"Extracted {len(entities)} entities")
            return entities

        except Exception as e:
            logger.error(f"Entity extraction failed: {e}")
            return []

    def _extract_entity_names(self, text: str) -> list[str]:
        """Extract potential entity names from fact text (simple heuristic)."""
        import re
        # Look for capitalized multi-word names
        pattern = r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b'
        matches = re.findall(pattern, text)
        # Filter out common words
        stopwords = {"The", "This", "That", "These", "Those", "There", "When", "Where",
                     "What", "Which", "How", "But", "And", "For", "Not", "With", "Has"}
        return [m for m in matches if m not in stopwords and len(m) > 2]

    def _classify_entity(self, name: str) -> str:
        """Simple entity type classification."""
        name_lower = name.lower()
        country_indicators = ["united", "republic", "kingdom", "states", "china", "russia",
                            "india", "japan", "korea", "iran", "israel", "saudi", "turkey"]
        company_indicators = ["corp", "inc", "ltd", "llc", "group", "holdings", "bank",
                            "motors", "airlines", "energy", "tech", "semiconductor"]
        org_indicators = ["nato", "opec", "asean", "united nations", "who", "imf",
                        "world bank", "eu", "african union"]

        if any(ind in name_lower for ind in country_indicators):
            return "Country"
        if any(ind in name_lower for ind in company_indicators):
            return "Company"
        if any(ind in name_lower for ind in org_indicators):
            return "Organization"
        return "Entity"
