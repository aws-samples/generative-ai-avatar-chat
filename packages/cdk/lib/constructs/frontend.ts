import { Construct } from 'constructs';
import { CfnOutput, RemovalPolicy, Stack } from 'aws-cdk-lib';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
} from 'aws-cdk-lib/aws-s3';
import {
  CloudFrontWebDistribution,
  OriginAccessIdentity,
} from 'aws-cdk-lib/aws-cloudfront';
import { NodejsBuild } from 'deploy-time-build';

export interface FrontendProps {
  readonly questionStreamFunctionArn: string;
  readonly idPoolId: string;
}

export class Frontend extends Construct {
  readonly cloudFrontWebDistribution: CloudFrontWebDistribution;
  constructor(scope: Construct, id: string, props: FrontendProps) {
    super(scope, id);

    const assetBucket = new Bucket(this, 'AssetBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const originAccessIdentity = new OriginAccessIdentity(
      this,
      'OriginAccessIdentity'
    );
    const distribution = new CloudFrontWebDistribution(this, 'Distribution', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: assetBucket,
            originAccessIdentity,
          },
          behaviors: [
            {
              isDefaultBehavior: true,
            },
          ],
        },
      ],
      errorConfigurations: [
        {
          errorCode: 404,
          errorCachingMinTtl: 0,
          responseCode: 200,
          responsePagePath: '/',
        },
        {
          errorCode: 403,
          errorCachingMinTtl: 0,
          responseCode: 200,
          responsePagePath: '/',
        },
      ],
    });

    new NodejsBuild(this, 'ReactBuild', {
      assets: [
        {
          path: '../../',
          exclude: [
            '.git',
            '.gitignore',
            '*.md',
            'LICENSE',
            'node_modules',
            'packages/cdk/**/*',
            'packages/web/dist',
            'packages/web/node_modules',
          ],
        },
      ],
      buildCommands: ['npm ci', 'npm run web:build'],
      buildEnvironment: {
        VITE_APP_REGION: Stack.of(this).region,
        VITE_APP_IDENTITY_POOL_ID: props.idPoolId,
        VITE_APP_QUESTION_STREAM_FUNCTION_ARN: props.questionStreamFunctionArn,
      },
      outputSourceDirectory: './packages/web/dist',
      destinationBucket: assetBucket,
      distribution,
    });

    new CfnOutput(this, 'CloudFrontURL', {
      description: 'CloudFrontURL',
      value: `https://${distribution.distributionDomainName}`,
    });
    this.cloudFrontWebDistribution = distribution;
  }
}
