# 技術スタック

## ビルドシステム

- **モノレポ**：npm workspaces（3つのパッケージ：`cdk`、`web`、`types`）
- **パッケージマネージャー**：npm（クリーンインストールには `npm ci` を使用）
- **TypeScript**：CDKはv5.2+、webはv5.7+

## インフラストラクチャ（CDKパッケージ）

- **フレームワーク**：AWS CDK v2
- **ランタイム**：Node.js with TypeScript（ES2020ターゲット、CommonJSモジュール）
- **主な依存関係**：
  - AWS SDK v3（Bedrock、Kendra、Bedrock Agent Runtime）
  - Strands Agents SDK v0.1.1（Agentオーケストレーション）
  - Zod（スキーマ検証）
  - Lambda関数を使用したカスタムリソース
- **テスト**：Jest

### Lambda関数アーキテクチャ（2025-12-05更新）

streamQuestion Lambda関数はStrands Agents SDKを使用したAgent的な実装に移行しました。

**ファイル構成:**
```
lambda/
├── streamQuestion.ts          # メインハンドラー（Strands Agent使用）
├── agent/
│   └── createAgent.ts        # Agent初期化ロジック
└── tools/
    ├── types.ts              # 共通型定義
    ├── kendraTool.ts         # Kendra Tool（API呼び出し含む）
    └── knowledgeBaseTool.ts  # Knowledge Base Tool（API呼び出し含む）
```

**主な特徴:**
- Strands Agentによる自動ツール呼び出し
- Claude Haiku 4.5（日本Cross Region Inference経由）をデフォルト使用
- 柔軟なRAG設定（Kendra/Knowledge Base/両方/なし）
- LLMによる多言語対応（翻訳API不要）
- 各RAGソースが専用S3バケットを管理

## フロントエンド（Webパッケージ）

- **フレームワーク**：React 19 with TypeScript
- **ビルドツール**：Vite 6
- **3Dエンジン**：Babylon.js v7 with react-babylonjs
- **状態管理**：Zustand
- **スタイリング**：Tailwind CSS v3
- **国際化**：react-i18next
- **UIコンポーネント**：Headless UI、React Icons

## 共通コマンド

### ルートディレクトリコマンド

```bash
# すべての依存関係をインストール
npm ci

# CDKスタックをデプロイ
npm run cdk:deploy

# CDKスタックを削除
npm run cdk:destroy

# フロントエンドをローカルで実行
npm run web:dev

# フロントエンドをプロダクション用にビルド
npm run web:build

# Prettierでコードをフォーマット
npm run lint
```

### CDKパッケージコマンド

```bash
# CDKのBootstrap（初回のみ）
npx -w packages/cdk cdk bootstrap

# TypeScriptをビルド
npm run build -w cdk

# テストを実行
npm run test -w cdk

# ウォッチモード
npm run watch -w cdk
```

### Webパッケージコマンド

```bash
# 開発サーバーを起動
npm run dev -w web

# プロダクション用にビルド
npm run build -w web

# プロダクションビルドをプレビュー
npm run preview -w web

# コードをLint
npm run lint -w web
```

## 設定ファイル

- `packages/cdk/cdk.json`：CDKアプリ設定、RAG設定（`rag.kendra.enabled`、`rag.knowledgeBase.enabled`）、Bedrockモデル設定
- `packages/web/.env.local`：ローカルフロントエンド環境変数（コミットされない）
- `packages/web/.env`：フロントエンド環境変数テンプレート
- `.prettierrc.json`：コードフォーマットルール
- `tsconfig.json`：パッケージごとのTypeScriptコンパイラオプション

### RAG設定例（cdk.json）

```json
{
  "context": {
    "bedrock-region": "ap-northeast-1",
    "bedrock-model-id": "jp.anthropic.claude-haiku-4-5-20251001-v1:0",
    "rag": {
      "kendra": {
        "enabled": false
      },
      "knowledgeBase": {
        "enabled": true
      }
    }
  }
}
```

## 開発時の注意事項

- 特に指定がない限り、すべてのコマンドは**ルートディレクトリ**から実行してください
- フロントエンドにはデプロイ済みのバックエンドリソース（Lambda ARN、Cognito Identity Pool）が必要です
- CDKのデプロイは初回実行時に約20分かかります
- TypeScriptコンパイルは `.ts` ソースと並んで `.d.ts` と `.js` ファイルを生成します
