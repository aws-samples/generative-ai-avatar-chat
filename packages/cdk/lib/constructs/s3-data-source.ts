import { RemovalPolicy, aws_s3, aws_s3_deployment } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class S3BucketWithDocs extends Construct {
  public readonly bucket: aws_s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // S3 Document Bucket
    const docsBucket = new aws_s3.Bucket(this, 'DocsBucket', {
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
    });

    // Upload contents of docs folder to S3
    new aws_s3_deployment.BucketDeployment(this, 'DeployDocs', {
      sources: [aws_s3_deployment.Source.asset('./docs')],
      destinationBucket: docsBucket,
    });

    this.bucket = docsBucket;
  }
}
