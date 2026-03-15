import { Duration, CfnOutput } from 'aws-cdk-lib';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export interface PresignedUrlApiProps {
  readonly runtimeArn: string;
}

export class PresignedUrlApi extends Construct {
  public readonly presignedUrlFunction: lambda.DockerImageFunction;

  constructor(scope: Construct, id: string, props: PresignedUrlApiProps) {
    super(scope, id);

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

    // AgentCore Runtime の presigned URL 生成に必要な権限
    this.presignedUrlFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock-agentcore:*'],
        resources: ['*'],
      })
    );

    new CfnOutput(this, 'PresignedUrlFunctionARN', {
      value: this.presignedUrlFunction.functionArn,
    });
  }
}
