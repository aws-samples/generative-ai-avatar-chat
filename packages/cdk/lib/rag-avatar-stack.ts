import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Api,
  KendraIndex,
  BedrockKnowledgeBase,
} from './constructs';
import { Frontend } from './constructs/frontend';

export class RagAvatarStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bedrockRegion: string =
      this.node.tryGetContext('bedrock-region') || 'ap-northeast-1';
    const bedrockModelId: string =
      this.node.tryGetContext('bedrock-model-id') ||
      'jp.anthropic.claude-haiku-4-5-20251001-v1:0';
    
    // 新しいRAG設定を読み取る
    const ragConfig = this.node.tryGetContext('rag') || {};
    const enableKendra = ragConfig.kendra?.enabled || false;
    const enableKnowledgeBase = ragConfig.knowledgeBase?.enabled || false;

    let kendraIndex: KendraIndex | undefined;
    let knowledgeBase: BedrockKnowledgeBase | undefined;

    // 有効化されたRAG Constructsのみを作成
    if (enableKendra) {
      kendraIndex = new KendraIndex(this, 'KendraIndex');
    }
    
    if (enableKnowledgeBase) {
      knowledgeBase = new BedrockKnowledgeBase(this, 'KnowledgeBase');
    }

    // 統一APIの作成
    const api = new Api(this, 'Api', {
      bedrockRegion,
      bedrockModelId,
      enableKendra,
      enableKnowledgeBase,
      kendraIndex: kendraIndex?.index,
      knowledgeBase: knowledgeBase?.knowledgeBase,
    });

    new Frontend(this, 'Frontend', {
      questionStreamFunctionArn: api.questionStreamFunction.functionArn,
      idPoolId: api.idPool.identityPoolId,
    });
  }
}
