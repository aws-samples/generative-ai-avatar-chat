import json
import os

from bedrock_agentcore.runtime import AgentCoreRuntimeClient


def handler(event, context):
    body = json.loads(event.get("body", "{}")) if isinstance(event.get("body"), str) else event

    session_id = body.get("sessionId")
    if not session_id:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "sessionId is required"}),
        }

    runtime_arn = os.environ["RUNTIME_ARN"]
    # ARN からリージョンを抽出: arn:aws:bedrock-agentcore:<region>:<account>:runtime/...
    region = runtime_arn.split(":")[3]

    client = AgentCoreRuntimeClient(region=region)
    presigned_url = client.generate_presigned_url(
        runtime_arn=runtime_arn,
        session_id=session_id,
        endpoint_name="DEFAULT",
    )

    return {
        "statusCode": 200,
        "body": json.dumps({"url": presigned_url}),
    }
