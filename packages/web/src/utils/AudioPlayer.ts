/**
 * AudioPlayer
 * ブラウザの音声再生を管理するクラス
 * AudioContextとAudioBufferSourceNodeの状態を一元管理
 */
class AudioPlayer {
  private context: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;

  /**
   * 音声ストリームを再生
   * @param audioStream - 音声データのストリーム
   * @returns 再生完了時にresolveするPromise
   */
  async playAudioStream(audioStream: ReadableStream): Promise<void> {
    return new Promise(async (resolve, reject) => {
      // Initialize AudioContext if needed (reuse across segments)
      if (!this.context || this.context.state === 'closed') {
        this.context = new AudioContext();
      }

      // Resume AudioContext if suspended (browser autoplay policy)
      if (this.context.state === 'suspended') {
        try {
          await this.context.resume();
        } catch (error) {
          console.error('[AudioPlayer] Failed to resume AudioContext:', error);
          reject(error);
          return;
        }
      }

      try {
        const arrayBuffer = await new Response(
          audioStream as BodyInit
        ).arrayBuffer();

        this.context.decodeAudioData(
          arrayBuffer,
          (buffer) => {
            const source = this.context!.createBufferSource();
            source.buffer = buffer;
            source.connect(this.context!.destination);

            // Resolve the promise when playback ends
            source.onended = () => {
              resolve();
            };

            this.source = source;
            source.start();
          },
          (error) => {
            console.error('[AudioPlayer] Audio decode error:', error);
            reject(error);
          }
        );
      } catch (err) {
        console.error('[AudioPlayer] Playback error:', err);
        reject(err);
      }
    });
  }

  /**
   * 現在の再生を停止
   */
  stop(): void {
    if (this.source) {
      try {
        this.source.stop();
        this.source.disconnect();
      } catch (e) {
        // Ignore errors if already stopped
      }
      this.source = null;
    }
  }

  /**
   * AudioContextをクローズしてリソースを解放
   */
  close(): void {
    this.stop();
    if (this.context) {
      this.context.close();
      this.context = null;
    }
  }
}

// シングルトンインスタンスをエクスポート
export const audioPlayer = new AudioPlayer();
