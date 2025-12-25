import { Agent, BedrockModel } from '@strands-agents/sdk';
import { kendraRetrieveTool } from './tools/kendraTool';
import { knowledgeBaseRetrieveTool } from './tools/knowledgeBaseTool';

/**
 * システムプロンプトを構造化して生成
 */
function buildSystemPrompt(hasTools: boolean): string {
  const sections: string[] = [];
  
  // Role
  sections.push(`<role>
あなたは親切なアシスタントです。
</role>`);
  
  // Context
  sections.push(`<context>
アバターの吹き出しで会話をしているので、丁寧な話し言葉で回答してください。
</context>`);
  
  // Instructions
  const instructions: string[] = [];
  if (hasTools) {
    instructions.push('ユーザーの質問に答える際は、利用可能なツールを使用してドキュメントを検索してください');
    instructions.push('複数のツールが利用可能な場合、必要に応じて複数のツールを使用して包括的な情報を収集してください');
    instructions.push('ドキュメントが見つからない場合は、一般的な知識で回答してください');
  } else {
    instructions.push('ユーザーの質問に対して、一般的な知識で回答してください');
  }
  instructions.push('回答は必ずユーザーの質問と同じ言語で返してください');
  
  sections.push(`<instructions>
${instructions.map((inst, idx) => `${idx + 1}. ${inst}`).join('\n')}
</instructions>`);
  
  // Output Format
  sections.push(`<output_format>
- 回答は300文字程度を目安に、簡潔で端的にしてください
- 箇条書きや太字は使用できますが、##などのヘッダーは使用しないでください
- 「です・ます」調の丁寧な話し言葉で、自然な会話口調を心がけてください
- 絵文字は使用しないでください（音声合成システムが読み上げられないため）
- 【重要】句読点は音声合成時の文の区切り単位として使用されます
  - 句点・感嘆符・疑問符（。！？ . ! ?）は文の終わりにのみ使用してください
  - 略語（Mr., Dr., i.e., e.g., etc.など）は使用しないでください（文の途中で区切られてしまうため）
  - 箇条書きの番号（1., 2.など）も使用せず、「-」や「・」を使ってください
</output_format>`);
  
  return sections.join('\n\n');
}

export function createAgent(): Agent {
  const modelId = process.env.BEDROCK_MODELID || 'jp.anthropic.claude-haiku-4-5-20251001-v1:0';
  const region = process.env.BEDROCK_REGION || 'ap-northeast-1';
  const enableKendra = process.env.ENABLE_KENDRA === 'true';
  const enableKnowledgeBase = process.env.ENABLE_KNOWLEDGE_BASE === 'true';
  
  // BedrockModel設定
  const bedrockModel = new BedrockModel({
    modelId,
    region,
    temperature: 0.7,
    maxTokens: 2048,
    stream: true
  });
  
  // ツール配列（拡張可能）
  const tools: any[] = [];
  
  // RAGツールの追加（複数可）
  if (enableKendra) {
    tools.push(kendraRetrieveTool);
  }
  if (enableKnowledgeBase) {
    tools.push(knowledgeBaseRetrieveTool);
  }
  
  // システムプロンプトの生成
  const systemPrompt = buildSystemPrompt(tools.length > 0);
  
  return new Agent({
    model: bedrockModel,
    tools,
    systemPrompt,
    printer: false // Lambda環境ではコンソール出力を無効化
  });
}
