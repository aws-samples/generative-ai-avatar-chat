import { tool } from '@strands-agents/sdk';
import { z } from 'zod';
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { RAGToolResponse } from './types';

const client = new BedrockAgentRuntimeClient({
  region: process.env.BEDROCK_REGION,
});

function formatKnowledgeBaseResults(retrievalResults: any[]): RAGToolResponse {
  if (!retrievalResults || retrievalResults.length === 0) {
    return {
      documents: [],
      totalResults: 0,
      source: 'knowledgebase'
    };
  }
  
  const documents = retrievalResults.map((result: any) => ({
    title: result.metadata?.title,
    uri: result.location?.s3Location?.uri,
    score: result.score,
    content: result.content?.text || '',
    metadata: result.metadata || {}
  }));
  
  return {
    documents,
    totalResults: documents.length,
    source: 'knowledgebase'
  };
}

export const knowledgeBaseRetrieveTool = tool({
  name: 'retrieve_documents_knowledgebase',
  description: `Knowledge Baseを使用してドキュメントを検索します。
このツールは以下のドキュメントを検索対象としています：
- 総務手続きに関するよくある質問とその回答（社内FAQ）

重要: ドキュメントは日本語で書かれています。ユーザーの質問が他の言語の場合は、クエリを日本語に翻訳してから検索してください。

社内の総務手続きや一般的な質問に回答する際に使用します。
検索結果は構造化されたJSONオブジェクトとして返され、各ドキュメントにはタイトル、URI、関連性スコア、内容、メタデータが含まれます。`,
  inputSchema: z.object({
    query: z.string().describe('検索クエリ（日本語で指定）')
  }),
  callback: async (input: { query: string }) => {
    try {
      const command = new RetrieveCommand({
        knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID,
        retrievalQuery: {
          text: input.query,
        },
        retrievalConfiguration: {
          vectorSearchConfiguration: {
            numberOfResults: 5,
            overrideSearchType: 'HYBRID',
          },
        },
      });
      
      const response = await client.send(command);
      return formatKnowledgeBaseResults(response.retrievalResults || []);
    } catch (error) {
      return {
        documents: [],
        totalResults: 0,
        source: 'knowledgebase',
        error: `ドキュメント検索中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
});
