import { useState } from 'react';
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  LanguageCode,
} from '@aws-sdk/client-transcribe-streaming';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import MicrophoneStream from 'microphone-stream';
import { Readable } from 'readable-stream';
import { PassThrough } from 'stream-browserify';
import { Buffer } from 'buffer';
import * as process from 'process';
import { create } from 'zustand';

window.process = process;
window.Buffer = Buffer;

export interface Transcripts {
  isPartial: boolean;
  transcripts: string[];
}

export const useTranscribeStreamingState = create<{
  recording: boolean;
  setRecording: (b: boolean) => void;
}>((set) => {
  return {
    recording: false,
    setRecording: (b) => {
      set({
        recording: b,
      });
    },
  };
});

interface UseTranscribeStreamingProps {
  languageCode: string;
  identityPoolId: string;
  region: string;
}

function useTranscribeStreaming(props: UseTranscribeStreamingProps) {
  const { recording, setRecording } = useTranscribeStreamingState();
  const [transcripts, setTranscripts] = useState<Transcripts[]>([]);
  const [micStream, setMicStream] = useState<MicrophoneStream | null>(null);

  const cognito = new CognitoIdentityClient({ region: props.region });

  const client = new TranscribeStreamingClient({
    region: props.region,
    credentials: fromCognitoIdentityPool({
      client: cognito,
      identityPoolId: props.identityPoolId,
    }),
  });

  const stopRecording = () => {
    if (micStream) {
      micStream.stop();
    }

    setMicStream(null);
    setRecording(false);
  };

  const startRecording = async () => {
    try {
      const micStream = new MicrophoneStream();

      setRecording(true);
      setMicStream(micStream);

      const pcmEncodeChunk = (chunk: Buffer) => {
        const input = MicrophoneStream.toRaw(chunk);
        let offset = 0;
        const buffer = new ArrayBuffer(input.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < input.length; i++, offset += 2) {
          const s = Math.max(-1, Math.min(1, input[i]));
          view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
        return Buffer.from(buffer);
      };

      const audioPayloadStream = new PassThrough({ highWaterMark: 1 * 1024 });

      micStream.setStream(
        await window.navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        })
      );

      (micStream as Readable).pipe(audioPayloadStream);

      const audioStream = async function* () {
        for await (const chunk of audioPayloadStream) {
          yield { AudioEvent: { AudioChunk: pcmEncodeChunk(chunk) } };
        }
      };

      const command = new StartStreamTranscriptionCommand({
        LanguageCode: props.languageCode as LanguageCode,
        MediaEncoding: 'pcm',
        MediaSampleRateHertz: 44100,
        AudioStream: audioStream(),
      });

      const response = await client.send(command);

      for await (const event of response.TranscriptResultStream!) {
        if (event.TranscriptEvent) {
          const results = event!.TranscriptEvent!.Transcript!.Results!.map(
            (r) => {
              return {
                isPartial: r.IsPartial!,
                transcripts: r.Alternatives!.map((a) => a.Transcript!),
              };
            }
          );

          if (results.length > 0) {
            setTranscripts(results);
          }
        }
      }
    } catch (e) {
      console.error(e);
      stopRecording();
    }
  };

  return {
    transcripts,
    recording,
    startRecording,
    stopRecording,
  };
}

export default useTranscribeStreaming;
