import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Api,
  KendraIndex,
  S3BucketWithDocs,
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
      'anthropic.claude-instant-v1';
    const ragType: string = this.node.tryGetContext('ragType') || 'kendra';

    const s3BucketWithDocs = new S3BucketWithDocs(this, 'S3BucketWithDocs');

    let kendraIndex: KendraIndex | undefined;
    let knowledgeBase: any | undefined;

    if (ragType === 'kendra') {
      kendraIndex = new KendraIndex(this, 'KendraIndex', {
        dataSourceBucket: s3BucketWithDocs.bucket,
      });
    } else if (ragType === 'knowledgebase') {
      knowledgeBase = new BedrockKnowledgeBase(this, 'KnowledgeBase', {
        dataSourceBucket: s3BucketWithDocs.bucket,
      });
    } else {
      throw new Error(
        `Invalid ragType: ${ragType}. Must be 'kendra' or 'knowledgebase'`
      );
    }

    // 統一APIの作成（両方のケースで実行）
    const api = new Api(this, 'Api', {
      bedrockRegion,
      bedrockModelId,
      ragType: ragType as 'kendra' | 'knowledgebase',
      kendraIndex: kendraIndex?.index,
      knowledgeBase: knowledgeBase?.knowledgeBase,
    });

    new Frontend(this, 'Frontend', {
      questionStreamFunctionArn: api.questionStreamFunction.functionArn,
      idPoolId: api.idPool.identityPoolId,
    });
  }
}
