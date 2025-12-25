import { Handler } from 'aws-lambda';
import { QuestionRequest } from 'rag-avatar-demo';
import { createAgent } from './rag-agent/createAgent';
import { debugLog } from './rag-agent/utils/logger';

declare global {
  namespace awslambda {
    function streamifyResponse(
      f: (
        event: QuestionRequest,
        responseStream: NodeJS.WritableStream
      ) => Promise<void>
    ): Handler;
  }
}

// マーカー定義
const TOOL_CALL_START_MARKER = '<<<TOOL_CALL_START>>>';
const TOOL_CALL_END_MARKER = '<<<TOOL_CALL_END>>>';

export const handler = awslambda.streamifyResponse(
  async (event, responseStream) => {
    const startTime = Date.now();
    let toolCallCount = 0;
    let responseText = '';
    
    try {
      const agent = createAgent();
      const question = event.question;
      
      debugLog('request_start', {
        question: question.substring(0, 200),
        sessionId: event.sessionId
      });
      
      for await (const streamEvent of agent.stream(question)) {
        // テキスト出力
        if (streamEvent.type === 'modelContentBlockDeltaEvent' && 
            streamEvent.delta.type === 'textDelta') {
          const text = streamEvent.delta.text;
          responseStream.write(text);
          responseText += text; // レスポンスを蓄積
        }
        
        // ツール使用開始 - マーカーを送信
        if (streamEvent.type === 'beforeToolCallEvent') {
          toolCallCount++;
          responseStream.write(TOOL_CALL_START_MARKER);
          debugLog('tool_use_start', {
            toolName: streamEvent.toolUse.name,
            toolUseId: streamEvent.toolUse.toolUseId,
            input: streamEvent.toolUse.input
          });
        }
        
        // ツール実行結果 - マーカーを送信
        if (streamEvent.type === 'afterToolsEvent') {
          responseStream.write(TOOL_CALL_END_MARKER);
          debugLog('tool_use_result', {
            messageRole: streamEvent.message.role,
            contentBlocks: streamEvent.message.content
          });
        }
        
        // モデルメトリクス
        if (streamEvent.type === 'modelMetadataEvent' && streamEvent.usage) {
          debugLog('model_metrics', {
            inputTokens: streamEvent.usage.inputTokens,
            outputTokens: streamEvent.usage.outputTokens,
            totalTokens: streamEvent.usage.totalTokens,
            latencyMs: streamEvent.metrics?.latencyMs
          });
        }
      }
      
      debugLog('request_complete', {
        durationMs: Date.now() - startTime,
        toolCallCount,
        responseLength: responseText.length,
        response: responseText.substring(0, 500), // 最初の500文字
        success: true
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      debugLog('request_error', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        durationMs: Date.now() - startTime,
        toolCallCount,
        responseLength: responseText.length
      });
      
      responseStream.write(`エラーが発生しました: ${errorMessage}`);
    } finally {
      responseStream.end();
    }
  }
);
