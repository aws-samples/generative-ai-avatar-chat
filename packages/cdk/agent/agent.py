"""Agent entrypoint for AgentCore Runtime with WebSocket support."""

import asyncio
import json
import logging
from typing import Optional

from bedrock_agentcore import BedrockAgentCoreApp
from starlette.websockets import WebSocketDisconnect
from strands import Agent
from strands.models.bedrock import BedrockModel

from config import BEDROCK_MODEL_ID, BEDROCK_REGION, ENABLE_KENDRA, ENABLE_KNOWLEDGE_BASE
from prompt import build_system_prompt

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = BedrockAgentCoreApp()

# Build tools
tools = []
enabled_tool_names: list[str] = []
if ENABLE_KENDRA:
    from tools.kendra_tool import kendra_retrieve_tool

    tools.append(kendra_retrieve_tool)
    enabled_tool_names.append("kendra")
    logger.info("Kendra tool enabled")
if ENABLE_KNOWLEDGE_BASE:
    from tools.knowledge_base_tool import knowledge_base_retrieve_tool

    tools.append(knowledge_base_retrieve_tool)
    enabled_tool_names.append("knowledge_base")
    logger.info("Knowledge Base tool enabled")

system_prompt = build_system_prompt(tools=enabled_tool_names)

agent = Agent(
    model=BedrockModel(
        model_id=BEDROCK_MODEL_ID,
        region_name=BEDROCK_REGION,
    ),
    tools=tools if tools else None,
    system_prompt=system_prompt,
    callback_handler=None,
)

logger.info("Configuration - Region: %s, Model: %s", BEDROCK_REGION, BEDROCK_MODEL_ID)
logger.info("RAG Tools - Kendra: %s, Knowledge Base: %s", ENABLE_KENDRA, ENABLE_KNOWLEDGE_BASE)
logger.info("Agent initialized successfully")


@app.websocket
async def websocket_handler(websocket, context):
    """WebSocket handler with streaming and interruption support.

    Input:  {"question": str, ...}
    Output: {"type": "chunk", "text": str}
            {"type": "done"}
            {"error": str}
    """
    await websocket.accept()
    logger.info("WebSocket connection accepted")

    current_task: Optional[asyncio.Task] = None

    async def stream_response(user_message: str):
        in_tool = False
        try:
            async for event in agent.stream_async(user_message):
                if "current_tool_use" in event and not in_tool:
                    in_tool = True
                    tool_name = event["current_tool_use"].get("name", "")
                    await websocket.send_json({"type": "tool_start", "tool": tool_name})
                elif "data" in event:
                    if in_tool:
                        in_tool = False
                        await websocket.send_json({"type": "tool_end"})
                    await websocket.send_json({"type": "chunk", "text": event["data"]})

            await websocket.send_json({"type": "done"})
            logger.info("Response completed")
        except asyncio.CancelledError:
            await websocket.send_json({"type": "done"})
            logger.info("Response interrupted")
            raise

    try:
        while True:
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)

            question = data.get("question", "")
            if not question:
                await websocket.send_json({"error": "Missing required field: question"})
                continue

            logger.info("Received: %s...", question[:100])

            # Cancel existing task if running (interruption)
            if current_task and not current_task.done():
                logger.info("Interrupting current response")
                current_task.cancel()
                try:
                    await current_task
                except asyncio.CancelledError:
                    pass

            current_task = asyncio.create_task(stream_response(question))

    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error("Error: %s", e)
        try:
            await websocket.send_json({"error": str(e)})
        except Exception:
            pass
    finally:
        if current_task and not current_task.done():
            current_task.cancel()
            try:
                await current_task
            except asyncio.CancelledError:
                pass


if __name__ == "__main__":
    app.run(log_level="info")
