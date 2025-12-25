import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as oss from 'aws-cdk-lib/aws-opensearchserverless';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3_deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';

const UUID = '339C5FED-A1B5-43B6-B40A-5E8E59E5734D';

const MODEL_VECTOR_MAPPING: { [key: string]: string } = {
  'amazon.titan-embed-text-v1': '1536',
  'amazon.titan-embed-text-v2:0': '1024',
  'cohere.embed-multilingual-v3': '1024',
  'cohere.embed-english-v3': '1024',
};
const EMBEDDING_MODEL_ID = 'amazon.titan-embed-text-v2:0';
const KNOWLEDGE_BASE_NAME = 'rag-avatar-kb-datasource';

interface OpenSearchServerlessIndexProps {
  collectionId: string;
  vectorIndexName: string;
  vectorField: string;
  metadataField: string;
  textField: string;
  vectorDimension: string;
}

class OpenSearchServerlessIndex extends Construct {
  public readonly customResourceHandler: lambda.IFunction;
  public readonly customResource: cdk.CustomResource;

  constructor(
    scope: Construct,
    id: string,
    props: OpenSearchServerlessIndexProps
  ) {
    super(scope, id);

    const customResourceHandler = new lambda.SingletonFunction(
      this,
      'OpenSearchServerlessIndex',
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        code: lambda.Code.fromAsset('custom-resources'),
        handler: 'oss-index.handler',
        uuid: UUID,
        lambdaPurpose: 'OpenSearchServerlessIndex',
        timeout: cdk.Duration.minutes(15),
      }
    );

    const customResource = new cdk.CustomResource(this, 'CustomResource', {
      serviceToken: customResourceHandler.functionArn,
      resourceType: 'Custom::OssIndex',
      properties: props,
    });

    this.customResourceHandler = customResourceHandler;
    this.customResource = customResource;
  }
}

export class BedrockKnowledgeBase extends Construct {
  public readonly knowledgeBase: bedrock.CfnKnowledgeBase;
  public readonly dataSourceBucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Knowledge Base専用のS3バケットを作成
    const dataSourceBucket = new s3.Bucket(this, 'KBDocsBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // ドキュメントをアップロード
    new s3_deployment.BucketDeployment(this, 'DeployKBDocs', {
      sources: [s3_deployment.Source.asset('./docs/kb')],
      destinationBucket: dataSourceBucket,
    });

    const collectionName = 'rag-avatar-kb-collection';
    const vectorIndexName = 'rag-avatar-kb-vector-index';
    const vectorField = 'rag-avatar-kb-vector-field';
    const metadataField = 'rag-avatar-kb-metadata-field';
    const textField = 'rag-avatar-kb-text-field';

    const knowledgeBaseRole = new iam.Role(this, 'KnowledgeBaseRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
    });

    const collection = new oss.CfnCollection(this, 'Collection', {
      name: collectionName,
      description: 'Collection for Bedrock Knowledge Base',
      type: 'VECTORSEARCH',
    });

    const aossIndex = new OpenSearchServerlessIndex(this, 'AossIndex', {
      collectionId: collection.ref,
      vectorIndexName,
      vectorField,
      textField,
      metadataField,
      vectorDimension: MODEL_VECTOR_MAPPING[EMBEDDING_MODEL_ID],
    });

    aossIndex.customResourceHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [cdk.Token.asString(collection.getAtt('Arn'))],
        actions: ['aoss:APIAccessAll'],
      })
    );

    const accessPolicy = new oss.CfnAccessPolicy(this, 'AccessPolicy', {
      name: collectionName,
      policy: JSON.stringify([
        {
          Rules: [
            {
              Resource: [`collection/${collectionName}`],
              Permission: [
                'aoss:DescribeCollectionItems',
                'aoss:CreateCollectionItems',
                'aoss:UpdateCollectionItems',
              ],
              ResourceType: 'collection',
            },
            {
              Resource: [`index/${collectionName}/*`],
              Permission: [
                'aoss:UpdateIndex',
                'aoss:DescribeIndex',
                'aoss:ReadDocument',
                'aoss:WriteDocument',
                'aoss:CreateIndex',
                'aoss:DeleteIndex',
              ],
              ResourceType: 'index',
            },
          ],
          Principal: [
            knowledgeBaseRole.roleArn,
            aossIndex.customResourceHandler.role?.roleArn,
          ],
          Description: '',
        },
      ]),
      type: 'data',
    });

    const networkPolicy = new oss.CfnSecurityPolicy(this, 'NetworkPolicy', {
      name: collectionName,
      policy: JSON.stringify([
        {
          Rules: [
            {
              Resource: [`collection/${collectionName}`],
              ResourceType: 'collection',
            },
            {
              Resource: [`collection/${collectionName}`],
              ResourceType: 'dashboard',
            },
          ],
          AllowFromPublic: true,
        },
      ]),
      type: 'network',
    });

    const encryptionPolicy = new oss.CfnSecurityPolicy(
      this,
      'EncryptionPolicy',
      {
        name: collectionName,
        policy: JSON.stringify({
          Rules: [
            {
              Resource: [`collection/${collectionName}`],
              ResourceType: 'collection',
            },
          ],
          AWSOwnedKey: true,
        }),
        type: 'encryption',
      }
    );

    collection.node.addDependency(accessPolicy);
    collection.node.addDependency(networkPolicy);
    collection.node.addDependency(encryptionPolicy);

    knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        actions: ['bedrock:InvokeModel'],
      })
    );

    knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [cdk.Token.asString(collection.getAtt('Arn'))],
        actions: ['aoss:APIAccessAll'],
      })
    );

    knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:s3:::${dataSourceBucket.bucketName}`],
        actions: ['s3:ListBucket'],
      })
    );

    knowledgeBaseRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:s3:::${dataSourceBucket.bucketName}/*`],
        actions: ['s3:GetObject'],
      })
    );

    const knowledgeBase = new bedrock.CfnKnowledgeBase(this, 'KnowledgeBase', {
      name: 'rag-avatar-kb',
      roleArn: knowledgeBaseRole.roleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:aws:bedrock:${
            cdk.Stack.of(this).region
          }::foundation-model/${EMBEDDING_MODEL_ID}`,
        },
      },
      storageConfiguration: {
        type: 'OPENSEARCH_SERVERLESS',
        opensearchServerlessConfiguration: {
          collectionArn: cdk.Token.asString(collection.getAtt('Arn')),
          fieldMapping: {
            metadataField,
            textField,
            vectorField,
          },
          vectorIndexName,
        },
      },
    });

    const dataSource = new bedrock.CfnDataSource(this, 'DataSource', {
      dataSourceConfiguration: {
        s3Configuration: {
          bucketArn: `arn:aws:s3:::${dataSourceBucket.bucketName}`,
          // inclusionPrefixes: ['docs/'],
        },
        type: 'S3',
      },
      // チャンキング戦略の設定
      vectorIngestionConfiguration: {
        chunkingConfiguration: {
          chunkingStrategy: 'FIXED_SIZE',
          fixedSizeChunkingConfiguration: {
            maxTokens: 1024,
            overlapPercentage: 10,
          },
        },
      },
      knowledgeBaseId: knowledgeBase.ref,
      name: KNOWLEDGE_BASE_NAME,
    });

    knowledgeBase.addDependency(collection);
    knowledgeBase.node.addDependency(aossIndex.customResource);

    this.knowledgeBase = knowledgeBase;
    this.dataSourceBucket = dataSourceBucket;

    new cdk.CfnOutput(this, 'KnowledgeBaseId', {
      description: 'KnowledgeBaseId',
      value: knowledgeBase.ref,
    });

    new cdk.CfnOutput(this, 'DataSourceId', {
      description: 'DataSourceId',
      value: dataSource.ref,
    });
  }
}
