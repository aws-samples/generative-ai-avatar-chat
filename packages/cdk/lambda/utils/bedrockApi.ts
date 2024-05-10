import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION,
});

const modelId = process.env.BEDROCK_MODELID;

const PARAMS = {
  max_tokens_to_sample: 300,
  temperature: 0,
  top_k: 250,
  top_p: 0.999,
  anthropic_version: 'bedrock-2023-05-31',
};

const bedrockApi = {
  invokeStream: async function* (prompt: string) {
    const command = new InvokeModelWithResponseStreamCommand({
      modelId: modelId,
      body: JSON.stringify({
        prompt: prompt,
        ...PARAMS,
      }),
      contentType: 'application/json',
    });
    const res = await client.send(command);

    if (!res.body) {
      return;
    }

    for await (const streamChunk of res.body) {
      if (!streamChunk.chunk?.bytes) {
        break;
      }
      const body = JSON.parse(
        new TextDecoder('utf-8').decode(streamChunk.chunk?.bytes)
      );
      if (body.completion) {
        yield body.completion;
      }
      if (body.stop_reason) {
        break;
      }
    }
  },
};

export default bedrockApi;
