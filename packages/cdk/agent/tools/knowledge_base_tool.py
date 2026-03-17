import boto3
from strands import tool

from config import BEDROCK_REGION, KNOWLEDGE_BASE_ID

bedrock_agent_runtime = boto3.client(
    "bedrock-agent-runtime",
    region_name=BEDROCK_REGION,
)


@tool
def knowledge_base_retrieve_tool(query: str) -> dict:
    """Knowledge Baseを使用してドキュメントを検索します。
    ドキュメントは日本語で書かれています。ユーザーの質問が他の言語の場合は、クエリを日本語に翻訳してから検索してください。

    Args:
        query: 検索クエリ（日本語で指定）
    """
    try:
        response = bedrock_agent_runtime.retrieve(
            knowledgeBaseId=KNOWLEDGE_BASE_ID,
            retrievalQuery={"text": query},
            retrievalConfiguration={
                "vectorSearchConfiguration": {
                    "numberOfResults": 5,
                    "overrideSearchType": "HYBRID",
                }
            },
        )
        results = response.get("retrievalResults", [])
        return {
            "documents": [
                {
                    "title": r.get("metadata", {}).get("title"),
                    "uri": (r.get("location", {}).get("s3Location", {}) or {}).get("uri"),
                    "score": r.get("score"),
                    "content": (r.get("content", {}) or {}).get("text", ""),
                }
                for r in results
            ],
            "totalResults": len(results),
            "source": "knowledgebase",
        }
    except Exception as e:
        return {"documents": [], "totalResults": 0, "source": "knowledgebase", "error": str(e)}
