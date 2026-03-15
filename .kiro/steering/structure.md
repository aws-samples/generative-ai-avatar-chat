# プロジェクト構造

## モノレポレイアウト

```
/
├── packages/
│   ├── cdk/          # AWS CDKインフラストラクチャ
│   ├── web/          # Reactフロントエンド
│   └── types/        # 共有TypeScript型定義
├── docs/             # ドキュメントと画像
└── [root configs]    # Prettier、git、npm workspace設定
```

## CDKパッケージ（`packages/cdk/`）

AWSデプロイ用のInfrastructure as Code。

```
cdk/
├── bin/              # CDKアプリエントリーポイント
├── lib/
│   └── constructs/   # 再利用可能なCDK Construct
│       ├── backend-api.ts       # Lambda + API Gateway
│       ├── frontend.ts          # CloudFront + S3
│       ├── kendra-index.ts      # Kendra RAGセットアップ
│       ├── knowledgebase.ts     # Bedrock KB RAGセットアップ
│       └── s3-data-source.ts    # S3ドキュメントストレージ
├── lambda/           # Lambda関数コード
│   ├── prompts/      # LLMプロンプトテンプレート
│   └── utils/        # AWSサービスAPIラッパー
├── custom-resources/ # CDKカスタムリソースハンドラー
├── docs/             # RAG用ドキュメント（S3にアップロード）
├── test/             # Jestテスト
└── cdk.json          # CDK設定
```

### 主要なCDKファイル

- `lib/rag-avatar-stack.ts`：メインスタック定義
- `lib/parameters.ts`：環境別パラメータ管理（RAG設定、モデル設定）
- `lib/constructs/agentcore.ts`：AgentCore Runtime Construct（Dockerイメージビルド + IAMロール）
- `lib/constructs/presigned-url-api.ts`：Presigned URL Lambda Construct
- `lambda/presigned-url/`：Presigned URL発行Lambda（Python Docker ARM64）

## Webパッケージ（`packages/web/`）

3Dアバターインターフェースを持つReactフロントエンド。

```
web/
├── src/
│   ├── components/   # Reactコンポーネント
│   │   ├── Avatar.tsx           # 3Dアバターレンダラー
│   │   ├── InputQuestion.tsx    # テキスト/音声入力
│   │   └── VoiceOutputToggle.tsx
│   ├── hooks/        # カスタムReact Hooks
│   │   ├── useAvatar.ts         # アバターアニメーションロジック
│   │   ├── useQuestion.ts       # 質問送信
│   │   ├── useQuestionApi.ts    # Lambda呼び出し
│   │   ├── usePollyApi.ts       # 音声合成
│   │   └── useTranscribeStreaming.ts  # 音声認識
│   ├── i18n/         # 国際化
│   │   ├── en/, ja/, ko/, vi/, zh/
│   │   └── index.ts
│   ├── models/       # 3Dモデルファイル（.glb）
│   ├── App.tsx       # メインアプリコンポーネント
│   └── main.tsx      # エントリーポイント
├── public/           # 静的アセット
└── [configs]         # Vite、TypeScript、Tailwind、ESLint
```

### 主要なフロントエンドファイル

- `src/App.tsx`：メインアプリケーションレイアウトと状態管理
- `src/components/Avatar.tsx`：リップシンク機能付きBabylon.js 3Dアバター
- `src/hooks/useQuestionApi.ts`：WebSocket接続（AgentCore Runtime経由のPresigned URL）
- `src/i18n/`：言語別翻訳

## Typesパッケージ（`packages/types/`）

パッケージ間で共有されるTypeScript型定義。

```
types/
└── src/
    ├── index.d.ts     # メイン型エクスポート
    └── protocol.d.ts  # APIプロトコル型（WebSocketメッセージ型含む）
```

## Agentパッケージ（`packages/cdk/agent/`）

AgentCore Runtime にデプロイされる Python エージェント。`@app.websocket` で WebSocket 双方向ストリーミングを処理。

```
cdk/agent/
├── agent.py           # BedrockAgentCoreApp + WebSocket ハンドラ
├── requirements.txt   # Python依存パッケージ
└── tools/
    ├── __init__.py
    ├── kendra_tool.py          # Kendra検索ツール
    └── knowledge_base_tool.py  # Knowledge Base検索ツール
```

## 設定規約

- すべてのパッケージでTypeScript strictモードが有効
- CDKはES2020ターゲット（CommonJS）、webはESNext（ESM）
- コードフォーマットにはPrettier（ルートから `npm run lint` を実行）
- LintにはESLint（TypeScript固有のルール）

## ビルド成果物

- `packages/cdk/cdk.out/`：CDKが合成したCloudFormationテンプレート
- `packages/cdk/output.json`：CDKデプロイ出力
- `packages/web/dist/`：フロントエンドのプロダクションビルド
- `*.d.ts`、`*.js` ファイル：TypeScriptコンパイル出力（gitignore対象）
