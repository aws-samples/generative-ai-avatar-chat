import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Api, KendraIndex, S3DataSource } from './constructs';
import { Frontend } from './constructs/frontend';

export class RagAvatarStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bedrockRegion: string =
      this.node.tryGetContext('bedrock-region') || 'ap-northeast-1';
    const bedrockModelId: string =
      this.node.tryGetContext('bedrock-model-id') ||
      'anthropic.claude-instant-v1';

    const kendraIndex = new KendraIndex(this, 'KendraIndex');

    new S3DataSource(this, 'S3DataSource', {
      index: kendraIndex.index,
    });

    const api = new Api(this, 'Api', {
      bedrockRegion,
      bedrockModelId,
      index: kendraIndex.index,
    });

    new Frontend(this, 'Frontend', {
      questionStreamFunctionArn: api.questionStreamFunction.functionArn,
      idPoolId: api.idPool.identityPoolId,
    });
  }
}
