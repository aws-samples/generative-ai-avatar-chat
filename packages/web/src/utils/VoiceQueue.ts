import { audioPlayer } from './AudioPlayer';

/**
 * VoiceQueue
 * 
 * Manages sequential synthesis and playback of voice segments.
 * Ensures segments are played in the order they were enqueued.
 */
export class VoiceQueue {
  private queue: string[] = [];
  private isProcessing: boolean = false;
  private synthesizeAndPlay: ((text: string) => Promise<void>) | null = null;
  private onQueueComplete: (() => void) | null = null;
  private shouldSkipCompletionCallback: boolean = false; // Skip callback when queue was manually stopped

  /**
   * Set the synthesis and playback function.
   * This should be called during initialization to provide the actual
   * voice synthesis implementation.
   * 
   * @param fn - Function that synthesizes and plays audio for a text segment
   */
  setSynthesizeAndPlay(fn: (text: string) => Promise<void>): void {
    this.synthesizeAndPlay = fn;
  }

  /**
   * Set a callback to be called when the queue completes processing.
   * 
   * @param fn - Function to call when all segments have been played
   */
  setOnQueueComplete(fn: () => void): void {
    this.onQueueComplete = fn;
  }

  /**
   * Add a segment to the queue and start processing if not already running.
   * 
   * @param segment - Text segment to synthesize and play
   */
  enqueue(segment: string): void {
    this.queue.push(segment);
    this.shouldSkipCompletionCallback = false; // Allow callback for naturally completed queue
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the queue sequentially.
   * Each segment is synthesized and played before moving to the next.
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const segment = this.queue.shift();
      
      if (segment && this.synthesizeAndPlay) {
        try {
          await this.synthesizeAndPlay(segment);
        } catch (error) {
          console.error('Voice synthesis error:', error);
          // Continue with next segment even if this one fails
        }
      }
    }

    this.isProcessing = false;
    
    // Only call completion callback if queue completed naturally (not manually stopped)
    if (!this.shouldSkipCompletionCallback && this.onQueueComplete) {
      this.onQueueComplete();
    }
  }

  /**
   * Stop current playback and clear the queue.
   * Prevents onQueueComplete callback from firing for this interrupted queue.
   */
  stop(): void {
    this.queue = [];
    this.isProcessing = false;
    this.shouldSkipCompletionCallback = true; // Skip callback since queue was manually interrupted
    // Stop any currently playing audio
    audioPlayer.stop();
  }

  /**
   * Check if the queue is empty.
   * 
   * @returns True if the queue has no pending segments
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Check if voice is currently being played.
   * 
   * @returns True if currently processing or has items in queue
   */
  isPlaying(): boolean {
    return this.isProcessing || this.queue.length > 0;
  }
}
