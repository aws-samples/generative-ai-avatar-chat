# プロダクト概要

3Dアバターをインタフェースとして持つ、Generative AI チャットボットのAWSサンプル実装です。

## 主な機能

- Babylon.jsを使用した3Dアバターベースの会話インターフェース
- Amazon Bedrock Knowledge Base / Amazon Kendra による RAG（Retrieval-Augmented Generation）
- Strands Agents + AgentCore Runtime による Agentic RAG（WebSocket双方向ストリーミング）
- Amazon Polly（音声合成）とAmazon Transcribe（音声認識）によるリアルタイム音声対話
- 多言語対応（英語、日本語、韓国語、ベトナム語、中国語）
- ツール呼び出し後のテキスト・音声リセット（最終回答のみ表示）

## RAGオプション

2つのRAG実装がサポートされています：
- **Knowledge Base**（デフォルト）：Amazon Bedrock Knowledge Base
- **Kendra**：Amazon Kendra

設定は `packages/cdk/lib/parameters.ts` で環境ごとに管理します。

## LLM設定

- デフォルトモデル：`ap-northeast-1` リージョンの Claude Haiku 4.5
- Amazon Bedrock Converse API対応モデルであれば利用可能
- モデルとリージョンは `packages/cdk/lib/parameters.ts` で設定

## ドキュメント管理

RAG用のドキュメントは `packages/cdk/docs/` に格納され、デプロイ後に手動で同期が必要です：
- Knowledge Base：Bedrockコンソールから同期
- Kendra：Kendraコンソールから同期
