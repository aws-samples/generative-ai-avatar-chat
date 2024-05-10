import { aws_kendra, aws_iam } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class KendraIndex extends Construct {
  public readonly index: aws_kendra.CfnIndex;
  constructor(scope: Construct, id: string) {
    super(scope, id);

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

    const index = new aws_kendra.CfnIndex(this, 'KendraIndex', {
      name: 'rag-avatar-index',
      edition: 'DEVELOPER_EDITION',
      roleArn: indexRole.roleArn,
    });

    this.index = index;
  }
}
