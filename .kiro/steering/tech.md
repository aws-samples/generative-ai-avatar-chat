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
  - Lambda関数を使用したカスタムリソース
- **テスト**：Jest

### AgentCore Runtime エージェント（agentパッケージ）

- **ランタイム**：Python 3.12
- **フレームワーク**：Bedrock AgentCore Runtime SDK（`bedrock-agentcore-starter-toolkit`）
- **AI Agent**：Strands Agents（Python版）
- **通信**：WebSocket双方向ストリーミング（`@app.websocket`デコレータ）
- **デプロイ**：`agentcore deploy` でAgentCore Runtimeにデプロイ

### Presigned URL Lambda

- **ランタイム**：Python 3.12（Docker ARM64）
- **役割**：`AgentCoreRuntimeClient.generate_presigned_url()` でSigV4署名付きWebSocket URLを生成
- **認証**：Cognito Identity Pool（未認証）経由で呼び出し

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

- `packages/cdk/cdk.json`：CDKアプリ設定
- `packages/cdk/lib/parameters.ts`：RAG設定、Bedrockモデル設定、WAF設定（環境別オーバーライド）
- `packages/web/.env.local`：ローカルフロントエンド環境変数（コミットされない）
- `packages/web/.env`：フロントエンド環境変数テンプレート
- `.prettierrc.json`：コードフォーマットルール
- `tsconfig.json`：パッケージごとのTypeScriptコンパイラオプション

### RAG設定（parameters.ts）

```typescript
// packages/cdk/lib/parameters.ts
const defaultParameters = {
  bedrockRegion: 'ap-northeast-1',
  bedrockModelId: 'jp.anthropic.claude-haiku-4-5-20251001-v1:0',
  rag: {
    kendra: { enabled: false },
    knowledgeBase: { enabled: true },
  },
};
```

環境ごとのオーバーライドは `envOverrides` で管理。

## 開発時の注意事項

- 特に指定がない限り、すべてのコマンドは**ルートディレクトリ**から実行してください
- フロントエンドにはデプロイ済みのバックエンドリソース（Lambda ARN、Cognito Identity Pool）が必要です
- CDKのデプロイは初回実行時に約20分かかります
- TypeScriptコンパイルは `.ts` ソースと並んで `.d.ts` と `.js` ファイルを生成します
