import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Waf } from './constructs/waf';
import { WafParameters } from './parameters';

export interface WafStackProps extends cdk.StackProps {
  readonly wafOptions: WafParameters;
  readonly envName?: string;
}

export class WafStack extends cdk.Stack {
  public readonly webAclArn: string | undefined;

  constructor(scope: Construct, id: string, props: WafStackProps) {
    super(scope, id, props);

    const waf = new Waf(this, 'Waf', {
      options: props.wafOptions,
      envName: props.envName,
    });

    this.webAclArn = waf.webAclArn;

    if (this.webAclArn) {
      new cdk.CfnOutput(this, 'WebAclArn', {
        value: this.webAclArn,
        description: 'WAF WebACL ARN for CloudFront',
        exportName: `${this.stackName}-WebAclArn`,
      });
    }
  }
}
