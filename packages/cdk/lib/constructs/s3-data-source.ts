import {
  RemovalPolicy,
  Token,
  CfnOutput,
  aws_s3,
  aws_s3_deployment,
  aws_iam,
  aws_kendra,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';

export interface S3DataSourceProps {
  index: aws_kendra.CfnIndex;
}

export class S3DataSource extends Construct {
  constructor(scope: Construct, id: string, props: S3DataSourceProps) {
    super(scope, id);

    // S3 Document Bucket
    const docsBucket = new aws_s3.Bucket(this, 'DocsBucket', {
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
    });

    // Upload contents of docs folder to S3
    new aws_s3_deployment.BucketDeployment(this, 'DeployWebsite', {
      sources: [
        aws_s3_deployment.Source.asset(
          path.join(__dirname, '../../../cdk/docs')
        ),
      ],
      destinationBucket: docsBucket,
    });

    // Kendra S3 Data Source IAM Role
    const s3DataSourceRole = new aws_iam.Role(this, 'DataSourceRole', {
      assumedBy: new aws_iam.ServicePrincipal('kendra.amazonaws.com'),
    });

    s3DataSourceRole.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        resources: [`arn:aws:s3:::${docsBucket.bucketName}`],
        actions: ['s3:ListBucket'],
      })
    );

    s3DataSourceRole.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        resources: [`arn:aws:s3:::${docsBucket.bucketName}/*`],
        actions: ['s3:GetObject'],
      })
    );

    s3DataSourceRole.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        resources: [Token.asString(props.index.getAtt('Arn'))],
        actions: ['kendra:BatchPutDocument', 'kendra:BatchDeleteDocument'],
      })
    );

    const dataSource = new aws_kendra.CfnDataSource(this, 'S3DataSource', {
      indexId: props.index.ref,
      type: 'S3',
      name: 's3-data-source',
      roleArn: s3DataSourceRole.roleArn,
      languageCode: 'ja',
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: docsBucket.bucketName,
        },
      },
    });

    new CfnOutput(this, 'KendraIndexId', {
      value: dataSource.indexId,
    });

    new CfnOutput(this, 'KendraS3DataSourceId', {
      value: dataSource.attrId,
    });
  }
}
