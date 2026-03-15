import { CfnOutput, RemovalPolicy, Stack } from 'aws-cdk-lib';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as bedrockagentcore from 'aws-cdk-lib/aws-bedrockagentcore';
import { Construct } from 'constructs';
import * as path from 'path';

export interface AgentCoreProps {
  readonly bedrockRegion: string;
  readonly bedrockModelId: string;
  readonly environmentVariables?: Record<string, string>;
}

export class AgentCore extends Construct {
  public readonly runtime: bedrockagentcore.CfnRuntime;
  public readonly runtimeArn: string;

  constructor(scope: Construct, id: string, props: AgentCoreProps) {
    super(scope, id);

    const region = Stack.of(this).region;
    const account = Stack.of(this).account;
    const stackName = Stack.of(this).stackName;

    const imageAsset = new ecr_assets.DockerImageAsset(this, 'AgentImage', {
      directory: path.join(__dirname, '../../agent'),
      platform: ecr_assets.Platform.LINUX_ARM64,
    });

    // AgentCore 実行ロール
    const role = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('bedrock-agentcore.amazonaws.com'),
      inlinePolicies: {
        AgentCorePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                'ecr:BatchGetImage',
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchCheckLayerAvailability',
              ],
              resources: [imageAsset.repository.repositoryArn],
            }),
            new iam.PolicyStatement({
              actions: ['ecr:GetAuthorizationToken'],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              actions: [
                'logs:CreateLogGroup',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams',
              ],
              resources: [
                `arn:aws:logs:${region}:${account}:log-group:/aws/bedrock-agentcore/runtimes/*`,
              ],
            }),
            new iam.PolicyStatement({
              actions: [
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              resources: [
                `arn:aws:logs:${region}:${account}:log-group:/aws/bedrock-agentcore/runtimes/*:log-stream:*`,
              ],
            }),
            new iam.PolicyStatement({
              actions: [
                'xray:GetSamplingRules',
                'xray:GetSamplingTargets',
                'xray:PutTelemetryRecords',
                'xray:PutTraceSegments',
              ],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              actions: ['cloudwatch:PutMetricData'],
              resources: ['*'],
              conditions: {
                StringEquals: { 'cloudwatch:namespace': 'bedrock-agentcore' },
              },
            }),
            new iam.PolicyStatement({
              actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
              ],
              resources: [
                'arn:aws:bedrock:*::foundation-model/*',
                `arn:aws:bedrock:${region}:${account}:*`,
              ],
            }),
            new iam.PolicyStatement({
              actions: [
                'bedrock:Retrieve',
              ],
              resources: [
                `arn:aws:bedrock:${region}:${account}:knowledge-base/*`,
              ],
            }),
            new iam.PolicyStatement({
              actions: [
                'kendra:Retrieve',
                'kendra:Query',
              ],
              resources: [
                `arn:aws:kendra:${region}:${account}:index/*`,
              ],
            }),
          ],
        }),
      },
    });

    // AgentCore Runtime
    this.runtime = new bedrockagentcore.CfnRuntime(this, 'Runtime', {
      agentRuntimeName: `${stackName.replace(/-/g, '_')}_Agent`,
      agentRuntimeArtifact: {
        containerConfiguration: {
          containerUri: imageAsset.imageUri,
        },
      },
      networkConfiguration: { networkMode: 'PUBLIC' },
      roleArn: role.roleArn,
      protocolConfiguration: 'HTTP',
      environmentVariables: {
        BEDROCK_REGION: props.bedrockRegion,
        BEDROCK_MODELID: props.bedrockModelId,
        ...props.environmentVariables,
      },
    });

    this.runtimeArn = this.runtime.attrAgentRuntimeArn;

    new CfnOutput(this, 'RuntimeArn', {
      value: this.runtimeArn,
    });
  }
}
