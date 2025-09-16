import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';

const client = new BedrockAgentRuntimeClient({
  region: process.env.BEDROCK_REGION,
});

const KNOWLEDGE_BASE_ID = process.env.KNOWLEDGE_BASE_ID;

// Kendraの形式に合わせたインターフェース
export interface KendraCompatibleResult {
  ResultItems?: Array<{
    DocumentId: string;
    DocumentTitle: string;
    DocumentExcerpt: {
      Text: string;
    };
    ScoreAttributes: {
      ScoreConfidence: number;
    };
  }>;
}

export const retrieve = async (
  query: string
): Promise<KendraCompatibleResult> => {
  if (!KNOWLEDGE_BASE_ID) {
    throw new Error('KNOWLEDGE_BASE_ID environment variable is not set');
  }

  const command = new RetrieveCommand({
    knowledgeBaseId: KNOWLEDGE_BASE_ID,
    retrievalQuery: {
      text: query,
    },
    retrievalConfiguration: {
      vectorSearchConfiguration: {
        numberOfResults: 5,
        overrideSearchType: 'HYBRID', // HYBRIDまたはSEMANTIC
      },
    },
  });

  try {
    const response = await client.send(command);

    // Knowledge Baseの結果をKendraの形式に変換
    // レスポンス形式は retrievalResults を使用
    const kendraCompatibleResult: KendraCompatibleResult = {
      ResultItems: response.retrievalResults?.map((item) => ({
        DocumentId:
          item.location?.s3Location?.uri ||
          item.location?.webLocation?.url ||
          item.location?.confluenceLocation?.url ||
          item.location?.salesforceLocation?.url ||
          item.location?.sharePointLocation?.url ||
          item.location?.customDocumentLocation?.id ||
          item.location?.kendraDocumentLocation?.uri ||
          item.location?.sqlLocation?.query ||
          'unknown',
        DocumentTitle:
          item.location?.s3Location?.uri ||
          item.location?.webLocation?.url ||
          item.location?.confluenceLocation?.url ||
          item.location?.salesforceLocation?.url ||
          item.location?.sharePointLocation?.url ||
          item.location?.customDocumentLocation?.id ||
          item.location?.kendraDocumentLocation?.uri ||
          item.location?.sqlLocation?.query ||
          'unknown',
        DocumentExcerpt: {
          Text: item.content?.text || '',
        },
        ScoreAttributes: {
          ScoreConfidence: item.score || 0,
        },
      })),
    };

    return kendraCompatibleResult;
  } catch (error) {
    console.error('Error retrieving from Knowledge Base:', error);
    throw error;
  }
};

export default { retrieve };
