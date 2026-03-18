import { LanguageCode, Polly, VoiceId } from '@aws-sdk/client-polly';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { LANGUAGE_OPTIONS } from '../i18n';
import { audioPlayer } from '../utils/AudioPlayer';

export type TranscribeCode = Exclude<
  (typeof LANGUAGE_OPTIONS)[number]['transcribeCode'],
  ''
>;

const region = import.meta.env.VITE_APP_REGION;
const idPoolId = import.meta.env.VITE_APP_IDENTITY_POOL_ID;

const cognito = new CognitoIdentityClient({ region });

async function getPollyClient() {
  const credentials = await fromCognitoIdentityPool({
    client: cognito as any,
    identityPoolId: idPoolId,
  });

  return new Polly({ region, credentials });
}

async function initPolly() {
  const polly = await getPollyClient();
  return polly;
}

const pollyPromise = initPolly();

/**
 * Polly APIを使って音声を合成
 * @param text - 合成するテキスト
 * @param voiceId - 使用する音声ID
 * @param languageCode - 言語コード
 * @returns 音声ストリーム
 */
export async function synthesizeSpeech(
  text: string,
  voiceId: VoiceId,
  languageCode: LanguageCode
): Promise<ReadableStream> {
  const polly = await pollyPromise;

  const data = await polly.synthesizeSpeech({
    OutputFormat: 'mp3',
    Text: text,
    VoiceId: voiceId,
    Engine: 'neural',
    LanguageCode: languageCode,
  });

  return data.AudioStream as ReadableStream;
}

/**
 * テキストを合成して再生
 * VoiceQueueから呼ばれる関数
 * @param text - 合成するテキスト
 * @param transcribeCode - 言語コード
 * @returns 再生完了時にresolveするPromise
 */
export async function synthesizeAndPlaySegment(
  text: string,
  transcribeCode: TranscribeCode
): Promise<void> {
  try {
    const voiceId: VoiceId = transcribeCode === 'ja-JP' ? 'Tomoko' : 'Joanna';
    const audioStream = await synthesizeSpeech(
      text,
      voiceId,
      transcribeCode as LanguageCode
    );
    await audioPlayer.playAudioStream(audioStream);
  } catch (err) {
    console.error('[usePollyApi] Synthesis error:', err);
    throw err;
  }
}
