#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RagAvatarStack } from '../lib/rag-avatar-stack';
import { WafStack } from '../lib/waf-stack';
import { getParameters, getStackName, getWafStackName } from '../lib/parameters';

const env = process.env.ENV;
const params = getParameters(env);
const stackName = getStackName(env);

const app = new cdk.App();

// WAF（CloudFront 用は us-east-1 に作成する必要がある）
let webAclId: string | undefined;
let wafStack: WafStack | undefined;

if (params.waf.enabled) {
  const wafStackName = getWafStackName(env);
  wafStack = new WafStack(app, wafStackName, {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: 'us-east-1',
    },
    crossRegionReferences: true,
    wafOptions: params.waf,
    envName: env,
  });
  webAclId = wafStack.webAclArn;
}

const mainStack = new RagAvatarStack(app, stackName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  crossRegionReferences: params.waf.enabled,
  params,
  webAclId,
  envName: env,
});

if (wafStack) {
  mainStack.addDependency(wafStack);
}
