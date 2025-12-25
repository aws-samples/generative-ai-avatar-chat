/**
 * デバッグログ出力ユーティリティ
 * DEBUG=true環境変数で有効化
 * 将来的にOTELに移行予定
 */

const isDebugEnabled = process.env.DEBUG === 'true';

/**
 * 構造化ログを出力
 * @param type ログタイプ（例: 'request_start', 'tool_use', 'error'）
 * @param data ログデータ
 */
export function debugLog(type: string, data: Record<string, any>): void {
  if (isDebugEnabled) {
    console.log(JSON.stringify({
      type,
      timestamp: new Date().toISOString(),
      ...data
    }));
  }
}
