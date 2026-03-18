import boto3
from strands import tool

from config import BEDROCK_REGION, KENDRA_INDEX_ID

kendra_client = boto3.client(
    "kendra",
    region_name=BEDROCK_REGION,
)


@tool
def kendra_retrieve_tool(query: str) -> dict:
    """Kendraを使用してドキュメントを検索します。
    ドキュメントは日本語で書かれています。ユーザーの質問が他の言語の場合は、クエリを日本語に翻訳してから検索してください。

    Args:
        query: 検索クエリ（日本語で指定）
    """
    try:
        result = kendra_client.retrieve(
            IndexId=KENDRA_INDEX_ID,
            QueryText=query,
            AttributeFilter={
                "AndAllFilters": [
                    {"EqualsTo": {"Key": "_language_code", "Value": {"StringValue": "ja"}}}
                ]
            },
        )
        items = result.get("ResultItems", [])
        return {
            "documents": [
                {
                    "title": item.get("DocumentTitle", {}).get("Text"),
                    "uri": item.get("DocumentURI"),
                    "score": item.get("ScoreAttributes", {}).get("ScoreConfidence"),
                    "content": item.get("Content") or item.get("DocumentExcerpt", {}).get("Text", ""),
                }
                for item in items
            ],
            "totalResults": len(items),
            "source": "kendra",
        }
    except Exception as e:
        return {"documents": [], "totalResults": 0, "source": "kendra", "error": str(e)}
