import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Api, KendraIndex, BedrockKnowledgeBase } from './constructs';
import { AgentCore } from './constructs/agentcore';
import { Frontend } from './constructs/frontend';
import { AppParameters } from './parameters';

export interface RagAvatarStackProps extends cdk.StackProps {
  params: AppParameters;
  webAclId?: string;
}

export class RagAvatarStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: RagAvatarStackProps) {
    super(scope, id, props);

    const { params } = props;

    let kendraIndex: KendraIndex | undefined;
    let knowledgeBase: BedrockKnowledgeBase | undefined;

    if (params.rag.kendra.enabled) {
      kendraIndex = new KendraIndex(this, 'KendraIndex');
    }
    if (params.rag.knowledgeBase.enabled) {
      knowledgeBase = new BedrockKnowledgeBase(this, 'KnowledgeBase');
    }

    const envVars: Record<string, string> = {};
    if (params.rag.kendra.enabled && kendraIndex) {
      envVars.ENABLE_KENDRA = 'true';
      envVars.KENDRA_INDEX_ID = kendraIndex.index.ref;
    }
    if (params.rag.knowledgeBase.enabled && knowledgeBase) {
      envVars.ENABLE_KNOWLEDGE_BASE = 'true';
      envVars.KNOWLEDGE_BASE_ID = knowledgeBase.knowledgeBase.ref;
    }

    const agentCore = new AgentCore(this, 'AgentCore', {
      bedrockRegion: params.bedrockRegion,
      bedrockModelId: params.bedrockModelId,
      environmentVariables: envVars,
    });

    const api = new Api(this, 'Api', {
      runtimeArn: agentCore.runtimeArn,
    });

    new Frontend(this, 'Frontend', {
      idPoolId: api.idPool.identityPoolId,
      presignedUrlFunctionArn: api.presignedUrlFunction.functionArn,
      webAclId: props.webAclId,
    });
  }
}
