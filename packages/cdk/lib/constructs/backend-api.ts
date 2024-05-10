import { Duration, aws_kendra, CfnOutput, Token } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as idPool from '@aws-cdk/aws-cognito-identitypool-alpha';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface ApiProps {
  bedrockRegion: string;
  bedrockModelId: string;
  index: aws_kendra.CfnIndex;
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
        actions: ['transcribe:*'],
        resources: ['*'],
      })
    );

    const questionStreamFunction = new NodejsFunction(this, 'StreamQuestion', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/streamQuestion.ts',
      timeout: Duration.minutes(15),
      environment: {
        BEDROCK_REGION: props.bedrockRegion,
        BEDROCK_MODELID: props.bedrockModelId,
        KENDRA_INDEX_ID: props.index.attrId,
      },
      bundling: {
        externalModules: [],
        // nodeModules: ['@aws-sdk/client-bedrock-runtime'],
      },
    });
    questionStreamFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [Token.asString(props.index.getAtt('Arn'))],
        actions: ['kendra:Retrieve'],
      })
    );
    questionStreamFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['bedrock:*', 'logs:*', 'translate:*'],
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
