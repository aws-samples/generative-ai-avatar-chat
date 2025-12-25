import { aws_kendra, aws_iam, aws_s3, aws_s3_deployment, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class KendraIndex extends Construct {
  public readonly index: aws_kendra.CfnIndex;
  public readonly dataSourceRole: aws_iam.Role;
  public readonly dataSource: aws_kendra.CfnDataSource;
  public readonly dataSourceBucket: aws_s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Kendra専用のS3バケットを作成
    const dataSourceBucket = new aws_s3.Bucket(this, 'KendraDocsBucket', {
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
    });

    // ドキュメントをアップロード
    new aws_s3_deployment.BucketDeployment(this, 'DeployKendraDocs', {
      sources: [aws_s3_deployment.Source.asset('./docs/kendra')],
      destinationBucket: dataSourceBucket,
    });

    const indexRole = new aws_iam.Role(this, 'KendraIndexRole', {
      assumedBy: new aws_iam.ServicePrincipal('kendra.amazonaws.com'),
    });

    indexRole.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['s3:GetObject'],
      })
    );

    indexRole.addManagedPolicy(
      aws_iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess')
    );

    // S3 Data Source用のIAMロール
    const dataSourceRole = new aws_iam.Role(this, 'DataSourceRole', {
      assumedBy: new aws_iam.ServicePrincipal('kendra.amazonaws.com'),
    });

    // S3バケットへのアクセス権限
    dataSourceRole.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        resources: [`arn:aws:s3:::${dataSourceBucket.bucketName}`],
        actions: ['s3:ListBucket'],
      })
    );

    dataSourceRole.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        resources: [`arn:aws:s3:::${dataSourceBucket.bucketName}/*`],
        actions: ['s3:GetObject'],
      })
    );

    const index = new aws_kendra.CfnIndex(this, 'KendraIndex', {
      name: 'rag-avatar-index',
      edition: 'DEVELOPER_EDITION',
      roleArn: indexRole.roleArn,
    });

    // Kendraインデックスへのアクセス権限
    dataSourceRole.addToPolicy(
      new aws_iam.PolicyStatement({
        effect: aws_iam.Effect.ALLOW,
        resources: [index.getAtt('Arn').toString()],
        actions: ['kendra:BatchPutDocument', 'kendra:BatchDeleteDocument'],
      })
    );

    // Kendraデータソースの作成
    const dataSource = new aws_kendra.CfnDataSource(this, 'S3DataSource', {
      indexId: index.ref,
      type: 'S3',
      name: 's3-data-source',
      roleArn: dataSourceRole.roleArn,
      languageCode: 'ja',
      dataSourceConfiguration: {
        s3Configuration: {
          bucketName: dataSourceBucket.bucketName,
        },
      },
    });

    new CfnOutput(this, 'KendraIndexId', {
      value: dataSource.indexId,
    });

    new CfnOutput(this, 'KendraS3DataSourceId', {
      value: dataSource.attrId,
    });

    this.index = index;
    this.dataSourceRole = dataSourceRole;
    this.dataSource = dataSource;
    this.dataSourceBucket = dataSourceBucket;
  }
}
