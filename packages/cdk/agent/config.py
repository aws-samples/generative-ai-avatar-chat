"""Environment configuration."""

import os

BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "ap-northeast-1")
BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODELID", "jp.anthropic.claude-haiku-4-5-20251001-v1:0")
ENABLE_KENDRA = os.environ.get("ENABLE_KENDRA", "false").lower() == "true"
ENABLE_KNOWLEDGE_BASE = os.environ.get("ENABLE_KNOWLEDGE_BASE", "false").lower() == "true"
KENDRA_INDEX_ID = os.environ.get("KENDRA_INDEX_ID", "")
KNOWLEDGE_BASE_ID = os.environ.get("KNOWLEDGE_BASE_ID", "")
