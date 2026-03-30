"""
Knowledge graph builder using Zep Cloud.
Builds a knowledge graph from the seed event description.
"""
import asyncio
import time
import uuid
from typing import Optional

from zep_cloud.client import AsyncZep
from zep_cloud.types import Message

from config import Config
from utils.logger import get_logger
from utils import llm_client
import sse_emitter

logger = get_logger("knowledge")


class GraphBuilder:
    """Builds Zep knowledge graphs from seed event text."""

    def __init__(self):
        if not Config.ZEP_API_KEY:
            raise ValueError("ZEP_API_KEY is required for knowledge graph building")
        self.zep = AsyncZep(api_key=Config.ZEP_API_KEY)

    async def build_graph(self, seed: str, sectors: list[str], scope: list[str]) -> str:
        """
        Build a knowledge graph from the seed event.

        Args:
            seed: The seed event description
            sectors: Focus sectors (e.g., ["Defense", "Energy"])
            scope: Geographic scope (e.g., ["Asia Pacific", "Global"])

        Returns:
            graph_id (Zep group_id) for entity extraction
        """
        graph_id = f"sim-{uuid.uuid4().hex[:12]}"
        logger.info(f"Building knowledge graph: {graph_id}")

        # Generate rich context from seed event using LLM
        context = self._generate_context(seed, sectors, scope)

        # Create Zep session and add context as messages
        try:
            await self.zep.memory.add_session(
                session_id=graph_id,
                metadata={"type": "simulation", "seed": seed[:200]},
            )

            # Split context into chunks and add as messages
            chunks = self._chunk_text(context, chunk_size=500, overlap=50)
            sse_emitter.status("knowledge", f"Adding {len(chunks)} knowledge chunks to graph...")

            for i, chunk in enumerate(chunks):
                await self.zep.memory.add(
                    session_id=graph_id,
                    messages=[Message(role_type="system", role="analyst", content=chunk)],
                )
                # Small delay to avoid rate limits
                if i > 0 and i % 3 == 0:
                    await asyncio.sleep(0.5)

            # Wait for Zep to process
            sse_emitter.status("knowledge", "Processing knowledge graph...")
            await self._wait_for_processing(graph_id)

            logger.info(f"Knowledge graph built: {graph_id}")
            return graph_id

        except Exception as e:
            logger.error(f"Failed to build knowledge graph: {e}")
            raise

    def _generate_context(self, seed: str, sectors: list[str], scope: list[str]) -> str:
        """Use LLM to generate rich contextual analysis of the seed event."""
        sector_str = ", ".join(sectors) if sectors else "all sectors"
        scope_str = ", ".join(scope) if scope else "global"

        messages = [
            {"role": "system", "content": """You are a geopolitical intelligence analyst.
Given a seed event, generate a comprehensive analysis covering:
1. Key entities involved (countries, companies, organizations, individuals)
2. Sector impacts (defense, energy, technology, agriculture, finance)
3. Geographic implications
4. Historical precedents and analogies
5. Supply chain dependencies
6. Market implications
7. Second and third-order effects

Write a detailed 2000-word analysis. Be specific about entity names, relationships, and quantitative impacts."""},
            {"role": "user", "content": f"""SEED EVENT: {seed}

FOCUS SECTORS: {sector_str}
GEOGRAPHIC SCOPE: {scope_str}

Generate a comprehensive intelligence analysis of this event and its cascading implications."""},
        ]

        return llm_client.chat(messages, temperature=0.6, max_tokens=8192)

    def _chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
        """Split text into overlapping chunks."""
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            if chunk.strip():
                chunks.append(chunk.strip())
            start = end - overlap
        return chunks

    async def _wait_for_processing(self, graph_id: str, timeout: int = 120):
        """Wait for Zep to finish processing the graph."""
        start = time.time()
        while time.time() - start < timeout:
            try:
                memory = await self.zep.memory.get(session_id=graph_id)
                # Check if facts have been extracted
                if memory and hasattr(memory, 'facts') and memory.facts:
                    return
            except Exception:
                pass
            await asyncio.sleep(3)
        logger.warning(f"Graph processing timeout after {timeout}s — continuing anyway")
