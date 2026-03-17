// =============================================================================
// 型定義
// =============================================================================

export interface WafParameters {
  enabled: boolean;
  /** 例: ['203.0.113.0/24'] */
  allowedIpV4AddressRanges?: string[];
  /** 例: ['2001:db8::/32'] */
  allowedIpV6AddressRanges?: string[];
  /** 例: ['JP'] */
  allowedCountryCodes?: string[];
}

export interface AppParameters {
  bedrockRegion: string;
  bedrockModelId: string;
  rag: {
    kendra: { enabled: boolean };
    knowledgeBase: { enabled: boolean };
  };
  waf: WafParameters;
}

// =============================================================================
// デフォルトパラメータ
// 全環境共通の基本設定。環境別にオーバーライドしたい場合は envOverrides を編集。
// =============================================================================

const defaultParameters: AppParameters = {
  bedrockRegion: 'ap-northeast-1',
  bedrockModelId: 'jp.anthropic.claude-haiku-4-5-20251001-v1:0',
  rag: {
    kendra: { enabled: false },
    knowledgeBase: { enabled: true },
  },
  waf: {
    enabled: false,
  },
};

// =============================================================================
// 環境別オーバーライド
// defaultParameters との差分だけ記載する。未指定のキーはデフォルト値が使われる。
// 新しい環境を追加するには、ここにキーを足すだけでOK。
// =============================================================================

const envOverrides: Record<string, Partial<AppParameters>> = {
  base: {},
  dev: {},
  stg: {},
  prod: {
    rag: {
      kendra: { enabled: false },
      knowledgeBase: { enabled: false },
    },
    waf:{
      enabled: true,
      allowedCountryCodes: ['JP'],
    }
  },
};

// =============================================================================
// ユーティリティ（内部用）
// =============================================================================

function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const val = source[key];
    if (
      val &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      typeof result[key] === 'object'
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, any>,
        val as Record<string, any>
      ) as T[keyof T];
    } else if (val !== undefined) {
      result[key] = val as T[keyof T];
    }
  }
  return result;
}

// =============================================================================
// エクスポート関数
// =============================================================================

/**
 * 指定環境のパラメータを取得する。
 * env 未指定 or "base" → defaultParameters がそのまま返る。
 */
export function getParameters(env?: string): AppParameters {
  const key = env || 'base';
  const overrides = envOverrides[key];
  if (!overrides) {
    throw new Error(
      `Unknown env: "${key}". Valid: ${Object.keys(envOverrides).join(', ')}`
    );
  }
  return deepMerge(defaultParameters, overrides);
}

/**
 * 環境に応じたスタック名を返す。
 * "base" or 未指定 → "RagAvatarStack"、それ以外 → "RagAvatarStack-{env}"
 */
export function getStackName(env?: string): string {
  return env && env !== 'base'
    ? `RagAvatarStack-${env}`
    : 'RagAvatarStack';
}

/**
 * 環境に応じた WAF スタック名を返す。
 */
export function getWafStackName(env?: string): string {
  return `${getStackName(env)}-Waf`;
}
