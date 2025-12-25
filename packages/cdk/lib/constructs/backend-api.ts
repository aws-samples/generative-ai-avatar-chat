import {
  Duration,
  aws_kendra,
  aws_bedrock,
  CfnOutput,
  Token,
} from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as idPool from 'aws-cdk-lib/aws-cognito-identitypool';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface ApiProps {
  bedrockRegion: string;
  bedrockModelId: string;
  enableKendra: boolean;
  enableKnowledgeBase: boolean;
  kendraIndex?: aws_kendra.CfnIndex;
  knowledgeBase?: aws_bedrock.CfnKnowledgeBase;
}

export class Api extends Construct {
  public readonly questionStreamFunction: NodejsFunction;
  public readonly idPool: idPool.IIdentityPool;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);
    // -----
    // Identity Pool の作成
    // -----

    const identityPool = new idPool.IdentityPool(
      this,
      'IdentityPoolForStreamingLambda',
      {
        allowUnauthenticatedIdentities: true,
      }
    );

    identityPool.unauthenticatedRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['transcribe:*', 'polly:*'],
        resources: ['*'],
      })
    );

    const questionStreamFunction = new NodejsFunction(this, 'StreamQuestion', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lambda/streamQuestion.ts',
      timeout: Duration.minutes(15),
      environment: {
        BEDROCK_REGION: props.bedrockRegion,
        BEDROCK_MODELID: props.bedrockModelId,
        ENABLE_KENDRA: props.enableKendra ? 'true' : 'false',
        ENABLE_KNOWLEDGE_BASE: props.enableKnowledgeBase ? 'true' : 'false',
        DEBUG: 'true', // デバッグログを有効化（本番環境では'false'に設定）
        ...(props.enableKendra &&
          props.kendraIndex && {
            KENDRA_INDEX_ID: props.kendraIndex.attrId,
          }),
        ...(props.enableKnowledgeBase &&
          props.knowledgeBase && {
            KNOWLEDGE_BASE_ID: props.knowledgeBase.ref,
          }),
      },
      bundling: {
        externalModules: ['@aws-sdk/*'],
        forceDockerBundling: false,
        minify: false,
        sourceMap: true,
      },
    });
    
    if (props.enableKendra && props.kendraIndex) {
      questionStreamFunction.role?.addToPrincipalPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [Token.asString(props.kendraIndex.getAtt('Arn'))],
          actions: ['kendra:Retrieve'],
        })
      );
    }

    if (props.enableKnowledgeBase && props.knowledgeBase) {
      questionStreamFunction.role?.addToPrincipalPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [props.knowledgeBase.attrKnowledgeBaseArn],
          actions: ['bedrock:Retrieve', 'bedrock:RetrieveAndGenerate'],
        })
      );
    }

    // 共通のBedrock権限
    questionStreamFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['bedrock:*', 'logs:*'],
      })
    );
    questionStreamFunction.grantInvoke(identityPool.unauthenticatedRole);

    new CfnOutput(this, 'IdPoolId', {
      value: identityPool.identityPoolId,
    });
    new CfnOutput(this, 'QuestionStreamFunctionARN', {
      value: questionStreamFunction.functionArn,
    });

    this.questionStreamFunction = questionStreamFunction;
    this.idPool = identityPool;
  }
}
