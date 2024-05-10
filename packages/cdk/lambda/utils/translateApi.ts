import {
  TranslateClient,
  TranslateTextCommand,
} from '@aws-sdk/client-translate';

const translate = new TranslateClient({});

const translateApi = {
  translateText: (text: string, source: string, target: string) => {
    const command = new TranslateTextCommand({
      SourceLanguageCode: source,
      TargetLanguageCode: target,
      Text: text,
    });

    return translate.send(command);
  },
};

export default translateApi;
