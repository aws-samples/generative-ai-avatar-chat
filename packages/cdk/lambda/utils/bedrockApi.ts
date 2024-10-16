import {
  BedrockRuntimeClient,
  ConversationRole,
  ConverseStreamCommand,
  InferenceConfiguration
} from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION,
});

const modelId = process.env.BEDROCK_MODELID;

const inferenceConfig: InferenceConfiguration = {
  maxTokens: 300,
  temperature: 0,
  topP: 0.999
};

const bedrockApi = {
  invokeStream: async function* (prompt: string) {
    const conversation = [
      {
        role: ConversationRole.USER,
        content: [{text: prompt}],
      },
    ];
    const command = new ConverseStreamCommand({
      modelId: modelId,
      messages: conversation,
      inferenceConfig,
    });
    const res = await client.send(command);

    if (!res.stream) {
      return;
    }

    for await (const item of res.stream) {
      if (item.contentBlockDelta) {
        yield item.contentBlockDelta.delta?.text || '';
      }
    }
  },
};

export default bedrockApi;
