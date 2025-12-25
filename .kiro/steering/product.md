# プロダクト概要

3Dアバターをインタフェースとして持つ、Generative AI チャットボットのAWSサンプル実装です。

## 主な機能

- Babylon.jsを使用した3Dアバターベースの会話インターフェース
- Amazon BedrockまたはAmazon Kendraによる RAG（Retrieval-Augmented Generation）
- Amazon Polly（音声合成）とAmazon Transcribe（音声認識）によるリアルタイム音声対話
- 多言語対応（英語、日本語、韓国語、ベトナム語、中国語）
- LLMモデルからのストリーミングレスポンス

## RAGオプション

2つのRAG実装がサポートされています：
- **Knowledge Base**（デフォルト）：Amazon Bedrock Knowledge Base
- **Kendra**：Amazon Kendra

設定は `packages/cdk/cdk.json` の `ragType` フィールドで行います。

## LLM設定

- デフォルトモデル：`ap-northeast-1` リージョンの Claude 3.5 Sonnet
- Amazon Bedrock Converse API対応モデルであれば利用可能
- モデルとリージョンは `packages/cdk/cdk.json` の `bedrock-model-id` と `bedrock-region` で設定

## ドキュメント管理

RAG用のドキュメントは `packages/cdk/docs/` に格納され、デプロイ後に手動で同期が必要です：
- Knowledge Base：Bedrockコンソールから同期
- Kendra：Kendraコンソールから同期
