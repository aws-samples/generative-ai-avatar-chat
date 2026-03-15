import {
  aws_kendra,
  aws_bedrock,
  CfnOutput,
} from 'aws-cdk-lib';
import * as idPool from 'aws-cdk-lib/aws-cognito-identitypool';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface ApiProps {
  enableKendra: boolean;
  enableKnowledgeBase: boolean;
  kendraIndex?: aws_kendra.CfnIndex;
  knowledgeBase?: aws_bedrock.CfnKnowledgeBase;
  presignedUrlFunction: import('aws-cdk-lib/aws-lambda').IFunction;
}

export class Api extends Construct {
  public readonly idPool: idPool.IIdentityPool;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

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

    // Presigned URL Lambda の invoke 権限を付与
    props.presignedUrlFunction.grantInvoke(identityPool.unauthenticatedRole);

    new CfnOutput(this, 'IdPoolId', {
      value: identityPool.identityPoolId,
    });

    this.idPool = identityPool;
  }
}
