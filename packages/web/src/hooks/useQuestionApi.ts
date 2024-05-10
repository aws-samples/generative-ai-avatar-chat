import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import {
  InvokeWithResponseStreamCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { QuestionRequest } from 'rag-avatar-demo';

const useQuestionApi = () => {
  return {
    // Streaming Response
    questionStream: async function* (req: QuestionRequest) {
      const region = import.meta.env.VITE_APP_REGION;
      const idPoolId = import.meta.env.VITE_APP_IDENTITY_POOL_ID;

      const cognito = new CognitoIdentityClient({ region });

      const lambda = new LambdaClient({
        region,
        credentials: await fromCognitoIdentityPool({
          client: cognito,
          identityPoolId: idPoolId,
        }),
      });

      const res = await lambda.send(
        new InvokeWithResponseStreamCommand({
          FunctionName: import.meta.env.VITE_APP_QUESTION_STREAM_FUNCTION_ARN,
          Payload: JSON.stringify(req),
        })
      );
      const events = res.EventStream!;

      for await (const event of events) {
        if (event.PayloadChunk) {
          yield new TextDecoder('utf-8').decode(event.PayloadChunk.Payload);
        }

        if (event.InvokeComplete) {
          break;
        }
      }
    },
  };
};

export default useQuestionApi;
