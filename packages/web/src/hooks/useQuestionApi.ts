import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { QuestionRequest, WsReceiveMessage, WsSendMessage } from 'rag-avatar-demo';

const PRESIGNED_URL_FUNCTION_ARN = import.meta.env.VITE_APP_PRESIGNED_URL_FUNCTION_ARN;

let lambdaClient: LambdaClient | null = null;

async function getLambdaClient(): Promise<LambdaClient> {
  if (lambdaClient) return lambdaClient;
  const region = import.meta.env.VITE_APP_REGION;
  const idPoolId = import.meta.env.VITE_APP_IDENTITY_POOL_ID;
  const cognito = new CognitoIdentityClient({ region });
  lambdaClient = new LambdaClient({
    region,
    credentials: await fromCognitoIdentityPool({
      client: cognito as any,
      identityPoolId: idPoolId,
    }),
  });
  return lambdaClient;
}

async function fetchPresignedUrl(sessionId: string): Promise<string> {
  const client = await getLambdaClient();
  const res = await client.send(
    new InvokeCommand({
      FunctionName: PRESIGNED_URL_FUNCTION_ARN,
      Payload: JSON.stringify({ sessionId }),
    })
  );
  const payload = JSON.parse(new TextDecoder().decode(res.Payload));

  if (res.FunctionError) {
    console.error('Lambda error:', payload);
    throw new Error(`PresignedUrl Lambda error: ${payload.errorMessage || JSON.stringify(payload)}`);
  }

  const body = typeof payload.body === 'string' ? JSON.parse(payload.body) : payload;
  if (!body.url) {
    console.error('Unexpected Lambda response:', payload);
    throw new Error('PresignedUrl Lambda returned no url');
  }
  return body.url;
}

const useQuestionApi = () => {
  return {
    questionStream: async function* (req: QuestionRequest) {
      const url = await fetchPresignedUrl(req.sessionId);
      const ws = new WebSocket(url);

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error('WebSocket connection failed'));
      });

      const msg: WsSendMessage = {
        question: req.question,
        questionLang: req.questionLang,
        questionLangCode: req.questionLangCode,
      };
      ws.send(JSON.stringify(msg));

      try {
        yield* receiveMessages(ws);
      } finally {
        ws.close();
      }
    },
  };
};

async function* receiveMessages(ws: WebSocket): AsyncGenerator<string> {
  const queue: (WsReceiveMessage | Error)[] = [];
  let resolve: (() => void) | null = null;

  ws.onmessage = (event) => {
    const msg: WsReceiveMessage = JSON.parse(event.data);
    queue.push(msg);
    resolve?.();
  };
  ws.onerror = () => {
    queue.push(new Error('WebSocket error'));
    resolve?.();
  };
  ws.onclose = () => {
    queue.push({ type: 'done' } as WsReceiveMessage);
    resolve?.();
  };

  while (true) {
    if (queue.length === 0) {
      await new Promise<void>((r) => { resolve = r; });
      resolve = null;
    }

    const item = queue.shift()!;
    if (item instanceof Error) throw item;

    const msg = item as WsReceiveMessage;
    switch (msg.type) {
      case 'chunk':
        yield msg.text;
        break;
      case 'tool_start':
        yield '<<<TOOL_CALL_START>>>';
        break;
      case 'tool_end':
        yield '<<<TOOL_CALL_END>>>';
        break;
      case 'done':
        return;
      case 'error':
        throw new Error(msg.message);
    }
  }
}

export default useQuestionApi;
