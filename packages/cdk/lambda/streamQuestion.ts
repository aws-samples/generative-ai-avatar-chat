import { Handler } from 'aws-lambda';
import api from './utils/bedrockApi';
import kendraApi from './utils/kendraApi';
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

    const documents = (await kendraApi.retrieve(question)).ResultItems ?? [];

    const prompt = ragPrompt.qaPrompt(documents, question, event.questionLang);
    for await (const token of api.invokeStream(prompt)) {
      responseStream.write(token);
    }
    responseStream.end();
  }
);
