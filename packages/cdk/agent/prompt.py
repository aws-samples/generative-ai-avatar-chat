"""System prompt builder."""

# ツールごとのデータソース説明
# 新しいツールを追加する場合はここにエントリを足す
_TOOL_DATA_DESCRIPTIONS: dict[str, str] = {
    "kendra": "- Kendra: Amazon Bedrock User Guide（技術ドキュメント）",
    "knowledge_base": "- Knowledge Base: 総務手続きに関するよくある質問とその回答（社内FAQ）",
}

_INSTRUCTIONS_WITH_TOOLS = """\
1. ユーザーからの質問には、まず必ずツールを使って社内ドキュメントを検索してください。一般的な質問に見えても、社内固有の手順やルールがある可能性があります
2. 複数のツールが利用可能な場合、必要に応じて複数のツールを使用して包括的な情報を収集してください
3. ツールで検索した結果、関連する社内情報が見つからなかった場合のみ、一般的な知識で回答してください
4. 回答は必ずユーザーの質問と同じ言語で返してください"""

_INSTRUCTIONS_NO_TOOLS = """\
1. ユーザーの質問に対して、一般的な知識で回答してください
2. 回答は必ずユーザーの質問と同じ言語で返してください"""

_OUTPUT_FORMAT = """\
- 回答は300文字程度を目安に、簡潔で端的にしてください
- 箇条書きや太字は使用できますが、##などのヘッダーは使用しないでください
- 「です・ます」調の丁寧な話し言葉で、自然な会話口調を心がけてください
- 絵文字は使用しないでください（音声合成システムが読み上げられないため）
- 【重要】句読点は音声合成時の文の区切り単位として使用されます
  - 句点・感嘆符・疑問符（。！？ . ! ?）は文の終わりにのみ使用してください
  - 略語（Mr., Dr., i.e., e.g., etc.など）は使用しないでください
  - 箇条書きの番号（1., 2.など）も使用せず、「-」や「・」を使ってください"""


def build_system_prompt(tools: list[str]) -> str:
    """システムプロンプトを構築する。

    Args:
        tools: 有効なツール名のリスト（例: ["kendra", "knowledge_base"]）
    """
    sections: list[str] = []

    sections.append(
        "<role>\nあなたは親切なアシスタントです。\n</role>"
    )

    # context: ツールがある場合はデータソース説明を含める
    context_lines = ["アバターの吹き出しで会話をしているので、丁寧な話し言葉で回答してください。"]
    if tools:
        context_lines.append("")
        context_lines.append("利用可能な検索ツールのデータソース:")
        for t in tools:
            if t in _TOOL_DATA_DESCRIPTIONS:
                context_lines.append(_TOOL_DATA_DESCRIPTIONS[t])
    sections.append(f"<context>\n{chr(10).join(context_lines)}\n</context>")

    # instructions
    instructions = _INSTRUCTIONS_WITH_TOOLS if tools else _INSTRUCTIONS_NO_TOOLS
    sections.append(f"<instructions>\n{instructions}\n</instructions>")

    sections.append(f"<output_format>\n{_OUTPUT_FORMAT}\n</output_format>")

    return "\n\n".join(sections)
