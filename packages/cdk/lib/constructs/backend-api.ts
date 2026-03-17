import { CfnOutput, Duration } from 'aws-cdk-lib';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as idPool from 'aws-cdk-lib/aws-cognito-identitypool';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export interface ApiProps {
  readonly runtimeArn: string;
}

export class Api extends Construct {
  public readonly idPool: idPool.IIdentityPool;
  public readonly presignedUrlFunction: lambda.DockerImageFunction;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    // Cognito Identity Pool（未認証アクセス）
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

    // Presigned URL Lambda
    this.presignedUrlFunction = new lambda.DockerImageFunction(
      this,
      'PresignedUrlFunction',
      {
        code: lambda.DockerImageCode.fromImageAsset(
          path.join(__dirname, '../../lambda/presigned-url'),
          { platform: ecr_assets.Platform.LINUX_ARM64 }
        ),
        architecture: Architecture.ARM_64,
        timeout: Duration.seconds(30),
        memorySize: 256,
        environment: {
          RUNTIME_ARN: props.runtimeArn,
        },
      }
    );

    this.presignedUrlFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock-agentcore:*'],
        resources: ['*']
      })
    );

    // Presigned URL Lambda の invoke 権限を未認証ロールに付与
    this.presignedUrlFunction.grantInvoke(identityPool.unauthenticatedRole);

    this.idPool = identityPool;

    new CfnOutput(this, 'IdPoolId', {
      value: identityPool.identityPoolId,
    });

    new CfnOutput(this, 'PresignedUrlFunctionARN', {
      value: this.presignedUrlFunction.functionArn,
    });
  }
}
