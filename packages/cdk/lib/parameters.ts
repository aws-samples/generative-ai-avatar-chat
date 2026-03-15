import * as cdk from 'aws-cdk-lib';

export interface AppParameters {
  bedrockRegion: string;
  bedrockModelId: string;
  rag: {
    kendra: { enabled: boolean };
    knowledgeBase: { enabled: boolean };
  };
}

const defaultParameters: AppParameters = {
  bedrockRegion: 'ap-northeast-1',
  bedrockModelId: 'jp.anthropic.claude-haiku-4-5-20251001-v1:0',
  rag: {
    kendra: { enabled: false },
    knowledgeBase: { enabled: true },
  },
};

const envOverrides: Record<string, Partial<AppParameters>> = {
  base: {},
  dev: {},
  stg: {},
  prod: {
    rag: {
      kendra: { enabled: true },
      knowledgeBase: { enabled: true },
    },
  },
};

function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const val = source[key];
    if (val && typeof val === 'object' && !Array.isArray(val) && typeof result[key] === 'object') {
      result[key] = deepMerge(result[key] as Record<string, any>, val as Record<string, any>) as T[keyof T];
    } else if (val !== undefined) {
      result[key] = val as T[keyof T];
    }
  }
  return result;
}

export function getParameters(env?: string): AppParameters {
  const key = env || 'base';
  const overrides = envOverrides[key];
  if (!overrides) {
    throw new Error(`Unknown env: "${key}". Valid: ${Object.keys(envOverrides).join(', ')}`);
  }
  return deepMerge(defaultParameters, overrides);
}

export function getStackName(env?: string): string {
  return env && env !== 'base' ? `RagAvatarStack-${env}` : 'RagAvatarStack';
}
