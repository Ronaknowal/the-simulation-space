"""
Zep search and retrieval tools for the simulation engine.
Provides knowledge graph search capabilities.
"""
from zep_cloud.client import AsyncZep
from config import Config
from utils.logger import get_logger

logger = get_logger("zep_tools")


class ZepSearchTools:
    """Provides search capabilities against Zep knowledge graphs."""

    def __init__(self, graph_id: str):
        self.graph_id = graph_id
        self.zep = AsyncZep(api_key=Config.ZEP_API_KEY)

    async def search(self, query: str, limit: int = 10) -> list[dict]:
        """
        Search the knowledge graph for relevant facts.

        Args:
            query: Search query
            limit: Max results

        Returns:
            List of fact dictionaries
        """
        try:
            result = await self.zep.memory.search(
                session_id=self.graph_id,
                text=query,
                search_scope="facts",
                limit=limit,
            )
            facts = []
            if result and hasattr(result, 'results'):
                for r in result.results:
                    facts.append({
                        "fact": r.fact if hasattr(r, 'fact') else str(r),
                        "score": r.score if hasattr(r, 'score') else 0,
                    })
            return facts
        except Exception as e:
            logger.warning(f"Zep search failed: {e}")
            return []

    async def get_context(self, query: str) -> str:
        """Get concatenated context string from graph search."""
        facts = await self.search(query, limit=5)
        return "\n".join(f["fact"] for f in facts)
