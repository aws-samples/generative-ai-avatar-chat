import { tool } from '@strands-agents/sdk';
import { z } from 'zod';
import {
  KendraClient,
  RetrieveCommand,
  AttributeFilter,
} from '@aws-sdk/client-kendra';
import { RAGToolResponse } from './types';

const kendra = new KendraClient({});
const INDEX_ID = process.env.KENDRA_INDEX_ID;

const attributeFilter: AttributeFilter = {
  AndAllFilters: [
    {
      EqualsTo: {
        Key: '_language_code',
        Value: {
          StringValue: 'ja',
        },
      },
    },
  ],
};

function formatKendraResults(resultItems: any[]): RAGToolResponse {
  if (!resultItems || resultItems.length === 0) {
    return {
      documents: [],
      totalResults: 0,
      source: 'kendra'
    };
  }
  
  const documents = resultItems.map((doc: any) => ({
    title: doc.DocumentTitle?.Text,
    uri: doc.DocumentURI,
    score: doc.ScoreAttributes?.ScoreConfidence,
    content: doc.Content || doc.DocumentExcerpt?.Text || '',
    metadata: {
      documentId: doc.DocumentId,
      ...(doc.DocumentAttributes || {})
    }
  }));
  
  return {
    documents,
    totalResults: documents.length,
    source: 'kendra'
  };
}

export const kendraRetrieveTool = tool({
  name: 'retrieve_documents_kendra',
  description: `Kendraを使用してドキュメントを検索します。
このツールは以下のドキュメントを検索対象としています：
- Amazon Bedrock User Guide（技術ドキュメント）

重要: ドキュメントは日本語で書かれています。ユーザーの質問が他の言語の場合は、クエリを日本語に翻訳してから検索してください。

AWS Bedrockに関する技術的な質問に回答する際に使用します。
検索結果は構造化されたJSONオブジェクトとして返され、各ドキュメントにはタイトル、URI、信頼度スコア、内容、メタデータが含まれます。`,
  inputSchema: z.object({
    query: z.string().describe('検索クエリ（日本語で指定）')
  }),
  callback: async (input: { query: string }) => {
    try {
      const command = new RetrieveCommand({
        IndexId: INDEX_ID,
        QueryText: input.query,
        AttributeFilter: attributeFilter,
      });
      const result = await kendra.send(command);
      return formatKendraResults(result.ResultItems || []);
    } catch (error) {
      return {
        documents: [],
        totalResults: 0,
        source: 'kendra',
        error: `ドキュメント検索中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
});
