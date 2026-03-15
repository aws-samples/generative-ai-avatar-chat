"""Agent entrypoint for AgentCore Runtime with WebSocket support."""

import asyncio
import json
import logging
import os
from typing import Optional

from bedrock_agentcore import BedrockAgentCoreApp
from starlette.websockets import WebSocketDisconnect
from strands import Agent
from strands.models.bedrock import BedrockModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = BedrockAgentCoreApp()

BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "ap-northeast-1")
BEDROCK_MODEL_ID = os.environ.get(
    "BEDROCK_MODELID", "jp.anthropic.claude-haiku-4-5-20251001-v1:0"
)
ENABLE_KENDRA = os.environ.get("ENABLE_KENDRA", "false").lower() == "true"
ENABLE_KNOWLEDGE_BASE = os.environ.get("ENABLE_KNOWLEDGE_BASE", "false").lower() == "true"

SYSTEM_PROMPT = """<role>
あなたは親切なアシスタントです。
</role>

<context>
アバターの吹き出しで会話をしているので、丁寧な話し言葉で回答してください。
</context>

<instructions>
1. ユーザーからの質問には、まず必ずツールを使って社内ドキュメントを検索してください。一般的な質問に見えても、社内固有の手順やルールがある可能性があります
2. 複数のツールが利用可能な場合、必要に応じて複数のツールを使用して包括的な情報を収集してください
3. ツールで検索した結果、関連する社内情報が見つからなかった場合のみ、一般的な知識で回答してください
4. 回答は必ずユーザーの質問と同じ言語で返してください
</instructions>

<output_format>
- 回答は300文字程度を目安に、簡潔で端的にしてください
- 箇条書きや太字は使用できますが、##などのヘッダーは使用しないでください
- 「です・ます」調の丁寧な話し言葉で、自然な会話口調を心がけてください
- 絵文字は使用しないでください（音声合成システムが読み上げられないため）
- 【重要】句読点は音声合成時の文の区切り単位として使用されます
  - 句点・感嘆符・疑問符（。！？ . ! ?）は文の終わりにのみ使用してください
  - 略語（Mr., Dr., i.e., e.g., etc.など）は使用しないでください
  - 箇条書きの番号（1., 2.など）も使用せず、「-」や「・」を使ってください
</output_format>"""

SYSTEM_PROMPT_NO_TOOLS = SYSTEM_PROMPT.replace(
    "1. ユーザーの質問に答える際は、利用可能なツールを使用してドキュメントを検索してください\n"
    "2. 複数のツールが利用可能な場合、必要に応じて複数のツールを使用して包括的な情報を収集してください\n"
    "3. ドキュメントが見つからない場合は、一般的な知識で回答してください",
    "1. ユーザーの質問に対して、一般的な知識で回答してください",
)

# Build tools
tools = []
if ENABLE_KENDRA:
    from tools.kendra_tool import kendra_retrieve_tool

    tools.append(kendra_retrieve_tool)
    logger.info("Kendra tool enabled")
if ENABLE_KNOWLEDGE_BASE:
    from tools.knowledge_base_tool import knowledge_base_retrieve_tool

    tools.append(knowledge_base_retrieve_tool)
    logger.info("Knowledge Base tool enabled")

system_prompt = SYSTEM_PROMPT if tools else SYSTEM_PROMPT_NO_TOOLS

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

# セッションごとの会話履歴（同一sessionIdは同一コンテナにルーティングされる）
session_messages: dict[str, list] = {}


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
    session_id = context.session_id or "default"

    if session_id not in session_messages:
        session_messages[session_id] = []

    async def stream_response(user_message: str, messages: list):
        in_tool = False
        try:
            async for event in agent.stream_async(user_message, messages=messages):
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

            try:
                question = data.get("question", "")
                if not question:
                    await websocket.send_json({"error": "Missing required field: question"})
                    continue
            except KeyError as e:
                await websocket.send_json({"error": f"Missing required field: {e}"})
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

            current_task = asyncio.create_task(
                stream_response(question, session_messages[session_id])
            )

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


async def cli_mode():
    """Interactive CLI mode for local testing."""
    print("CLI mode started. Type 'quit' or 'exit' to end.")
    while True:
        try:
            user_input = input("\n> ")
        except (EOFError, KeyboardInterrupt):
            print("\nBye!")
            break
        if not user_input.strip():
            continue
        if user_input.strip().lower() in ("quit", "exit"):
            break
        async for event in agent.stream_async(user_input):
            if "data" in event:
                print(event["data"], end="", flush=True)
        print()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--cli", action="store_true", help="Run in interactive CLI mode")
    args = parser.parse_args()

    if args.cli:
        asyncio.run(cli_mode())
    else:
        app.run(log_level="info")
