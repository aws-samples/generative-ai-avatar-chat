import { Handler } from 'aws-lambda';
import api from './utils/bedrockApi';
import kendraApi from './utils/kendraApi';
import knowledgeBaseApi from './utils/knowledgeBaseApi';
import ragPrompt from './prompts/ragPrompt';
import translateApi from './utils/translateApi';
import { QuestionRequest } from 'rag-avatar-demo';

declare global {
  namespace awslambda {
    function streamifyResponse(
      f: (
        event: QuestionRequest,
        responseStream: NodeJS.WritableStream
      ) => Promise<void>
    ): Handler;
  }
}

export const handler = awslambda.streamifyResponse(
  async (event, responseStream) => {
    let question = event.question;
    if (event.questionLangCode !== 'ja') {
      const { TranslatedText } = await translateApi.translateText(
        event.question,
        event.questionLangCode,
        'ja'
      );
      question = TranslatedText ?? '';
    }

    // RAGタイプに基づいて適切なAPIを呼び出し
    const ragType = process.env.RAG_TYPE;
    let documents: any[] = [];

    if (ragType === 'kendra') {
      documents = (await kendraApi.retrieve(question)).ResultItems ?? [];
    } else if (ragType === 'knowledgebase') {
      documents = (await knowledgeBaseApi.retrieve(question)).ResultItems ?? [];
    } else {
      throw new Error(
        `Unsupported RAG type: ${ragType}. Must be 'kendra' or 'knowledgebase'`
      );
    }

    const prompt = ragPrompt.qaPrompt(documents, question, event.questionLang);
    for await (const token of api.invokeStream(prompt)) {
      responseStream.write(token);
    }
    responseStream.end();
  }
);
