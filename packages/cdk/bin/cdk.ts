#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RagAvatarStack } from '../lib/rag-avatar-stack';
import { getParameters, getStackName } from '../lib/parameters';

const env = process.env.ENV;
const params = getParameters(env);
const stackName = getStackName(env);

const app = new cdk.App();
new RagAvatarStack(app, stackName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  params,
});
