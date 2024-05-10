import {
  AttributeFilter,
  KendraClient,
  RetrieveCommand,
} from '@aws-sdk/client-kendra';

const kendra = new KendraClient({});

const INDEX_ID = process.env.KENDRA_INDEX_ID;

// デフォルト言語が英語なので、言語設定は必ず行う
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

const kendraApi = {
  retrieve: (query: string) => {
    const retrieveCommand = new RetrieveCommand({
      IndexId: INDEX_ID,
      QueryText: query,
      AttributeFilter: attributeFilter,
    });

    return kendra.send(retrieveCommand);
  },
};

export default kendraApi;
