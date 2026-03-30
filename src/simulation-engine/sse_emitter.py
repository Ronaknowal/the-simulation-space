"""
SSE emitter — writes Server-Sent Events to stdout.
Node.js reads stdout and proxies events to the browser.
"""
import json
import sys
import time

_start_time = time.time()


def emit(event_type: str, data: dict):
    """Write an SSE event to stdout for Node.js to proxy."""
    # Use \n explicitly and write as bytes to avoid Windows \r\n conversion
    line = f"event: {event_type}\ndata: {json.dumps(data, default=str)}\n\n"
    if hasattr(sys.stdout, 'buffer'):
        sys.stdout.buffer.write(line.encode('utf-8'))
        sys.stdout.buffer.flush()
    else:
        sys.stdout.write(line)
        sys.stdout.flush()


def status(phase: str, message: str, progress: float = None):
    """Emit a status update with optional progress (0-100)."""
    data = {"phase": phase, "message": message}
    if progress is not None:
        data["progress"] = round(progress, 1)
    data["elapsed"] = round(time.time() - _start_time, 1)
    emit("status", data)


def agent_action(agent_id: str, agent_role: str, action: str, simulated_time: str):
    """Emit a single agent action."""
    emit("agent_action", {
        "agentId": agent_id,
        "agentRole": agent_role,
        "action": action,
        "simulatedTime": simulated_time,
    })


def impact(sector: str, severity: str, description: str, affected_entities: list, confidence: float):
    """Emit a sector impact."""
    emit("impact", {
        "sector": sector,
        "severity": severity,
        "description": description,
        "affectedEntities": affected_entities,
        "confidence": confidence,
    })


def market_impact(ticker: str, name: str, predicted_change: float, confidence: float, reasoning: str):
    """Emit a market impact."""
    emit("market_impact", {
        "ticker": ticker,
        "name": name,
        "predictedChange": predicted_change,
        "confidence": confidence,
        "reasoning": reasoning,
    })


def complete(simulation_id: str, report: str, total_agents: int,
             actions: list = None, impacts: list = None, market_impacts: list = None):
    """Emit simulation completion with all data."""
    elapsed = time.time() - _start_time
    data = {
        "simulationId": simulation_id,
        "report": report,
        "totalAgents": total_agents,
        "elapsed": round(elapsed, 3),
    }
    # Include full data so frontend can hydrate even if individual events were missed
    if actions:
        data["actions"] = actions
    if impacts:
        data["impacts"] = impacts
    if market_impacts:
        data["marketImpacts"] = market_impacts
    emit("complete", data)


def error(message: str):
    """Emit an error."""
    emit("error", {"message": message})
