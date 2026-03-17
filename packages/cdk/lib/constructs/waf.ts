import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { WafParameters } from '../parameters';

export interface WafProps {
  readonly options: WafParameters;
  readonly envName?: string;
}

export class Waf extends Construct {
  public readonly webAclArn: string | undefined;

  constructor(scope: Construct, id: string, props: WafProps) {
    super(scope, id);

    if (!props.options.enabled) {
      this.webAclArn = undefined;
      return;
    }

    const envSuffix = props.envName ? `-${props.envName}` : '';
    const rules: wafv2.CfnWebACL.RuleProperty[] = [];

    // IPv4 制限
    if (
      props.options.allowedIpV4AddressRanges &&
      props.options.allowedIpV4AddressRanges.length > 0
    ) {
      const ipV4Set = new wafv2.CfnIPSet(this, 'IpV4Set', {
        name: `${Stack.of(this).stackName}-ipv4-set`,
        scope: 'CLOUDFRONT',
        ipAddressVersion: 'IPV4',
        addresses: props.options.allowedIpV4AddressRanges,
      });
      rules.push({
        name: `allow-ipv4-ranges${envSuffix}`,
        priority: 1,
        statement: {
          notStatement: {
            statement: {
              ipSetReferenceStatement: { arn: ipV4Set.attrArn },
            },
          },
        },
        action: { block: {} },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'BlockedIpV4Ranges',
        },
      });
    }

    // IPv6 制限
    if (
      props.options.allowedIpV6AddressRanges &&
      props.options.allowedIpV6AddressRanges.length > 0
    ) {
      const ipV6Set = new wafv2.CfnIPSet(this, 'IpV6Set', {
        name: `${Stack.of(this).stackName}-ipv6-set`,
        scope: 'CLOUDFRONT',
        ipAddressVersion: 'IPV6',
        addresses: props.options.allowedIpV6AddressRanges,
      });
      rules.push({
        name: `allow-ipv6-ranges${envSuffix}`,
        priority: 2,
        statement: {
          notStatement: {
            statement: {
              ipSetReferenceStatement: { arn: ipV6Set.attrArn },
            },
          },
        },
        action: { block: {} },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'BlockedIpV6Ranges',
        },
      });
    }

    // 地理的制限
    if (
      props.options.allowedCountryCodes &&
      props.options.allowedCountryCodes.length > 0
    ) {
      rules.push({
        name: `allow-country-codes${envSuffix}`,
        priority: 3,
        statement: {
          notStatement: {
            statement: {
              geoMatchStatement: {
                countryCodes: props.options.allowedCountryCodes,
              },
            },
          },
        },
        action: { block: {} },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'BlockedCountries',
        },
      });
    }

    // AWS Managed Rules - Common Rule Set
    rules.push({
      name: 'AWSManagedRulesCommonRuleSet',
      priority: 100,
      overrideAction: { none: {} },
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesCommonRuleSet',
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'CommonRuleSetMetric',
      },
    });

    const webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
      name: `${Stack.of(this).stackName}-web-acl`,
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `${Stack.of(this).stackName}-web-acl-metrics`,
      },
      rules: rules.length > 0 ? rules : undefined,
    });

    this.webAclArn = webAcl.attrArn;
  }
}
