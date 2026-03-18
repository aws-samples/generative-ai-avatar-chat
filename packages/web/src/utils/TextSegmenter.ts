/**
 * TextSegmenter
 * 
 * Splits streaming text into segments for voice synthesis.
 * Segments are split by sentence-ending punctuation.
 */
export class TextSegmenter {
  private buffer: string = '';

  /**
   * Add a text chunk and return completed segments.
   * 
   * @param chunk - Text chunk to add
   * @returns Array of completed segments (non-empty, non-markdown-symbol-only)
   */
  addChunk(chunk: string): string[] {
    this.buffer += chunk;
    const segments: string[] = [];

    // Split by sentence-ending punctuation only
    // Japanese: 。！？
    // English: . ! ?
    // Korean: . ! ?
    // Vietnamese: . ! ?
    // Chinese: 。！？
    const sentencePattern = /[^。！？.!?]+[。！？.!?]/g;
    const matches = [...this.buffer.matchAll(sentencePattern)];
    
    if (matches.length > 0) {
      matches.forEach((match) => {
        const sentence = match[0];
        const trimmed = sentence.trim();
        const isMarkdownOnly = this.isMarkdownSymbolOnly(trimmed);
        
        // Filter out empty sentences and markdown-symbol-only sentences
        if (trimmed && !isMarkdownOnly) {
          segments.push(trimmed);
        }
      });

      // Calculate the end position of the last match
      const lastMatch = matches[matches.length - 1];
      const processedLength = lastMatch.index! + lastMatch[0].length;
      
      // Keep only the unprocessed part in the buffer
      this.buffer = this.buffer.substring(processedLength);
    }
    
    return segments;
  }

  /**
   * Flush the buffer and return the final segment.
   * 
   * @returns The final segment, or null if empty or markdown-symbol-only
   */
  flush(): string | null {
    const finalSegment = this.buffer.trim();
    this.buffer = '';

    if (finalSegment && !this.isMarkdownSymbolOnly(finalSegment)) {
      return finalSegment;
    }

    return null;
  }

  /**
   * Reset the buffer.
   */
  reset(): void {
    this.buffer = '';
  }

  /**
   * Check if a line contains only markdown symbols or emojis.
   * 
   * @param text - Text to check
   * @returns True if the text contains only markdown symbols or emojis
   */
  private isMarkdownSymbolOnly(text: string): boolean {
    const trimmed = text.trim();
    
    // Match lines that contain only: #, ##, ###, -, *, 1., 2., etc.
    if (/^[#\-*\d.\s]+$/.test(trimmed)) {
      return true;
    }
    
    // Check if line contains only emojis and whitespace
    // Using Unicode property escapes for Extended_Pictographic which covers all emojis
    // This is the recommended approach as of ES2018+
    const withoutEmojis = trimmed.replace(/\p{Extended_Pictographic}/gu, '');
    
    // If after removing all emojis, only whitespace remains, it's emoji-only
    return withoutEmojis.trim().length === 0 && trimmed.length > 0;
  }
}
