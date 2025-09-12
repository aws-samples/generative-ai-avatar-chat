import { CfnOutput, RemovalPolicy, Stack, Duration } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { NodejsBuild } from 'deploy-time-build';
import { Construct } from 'constructs';

export interface FrontendProps {
  readonly questionStreamFunctionArn: string;
  readonly idPoolId: string;
}

export class Frontend extends Construct {
  readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: FrontendProps) {
    super(scope, id);

    const assetBucket = new s3.Bucket(this, 'AssetBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    const s3Origin = cloudfront_origins.S3BucketOrigin.withOriginAccessIdentity(assetBucket);

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: s3Origin,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(0),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(0),
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
      distribution: this.distribution,
      nodejsVersion: 22,
    });

    new CfnOutput(this, 'CloudFrontURL', {
      description: 'CloudFrontURL',
      value: `https://${this.distribution.distributionDomainName}`,
    });
  }
}
