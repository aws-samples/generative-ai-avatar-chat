import { RetrieveResultItem } from '@aws-sdk/client-kendra';

const ragPrompt = {
  qaPrompt: (
    documents: RetrieveResultItem[],
    question: string,
    language: string
  ) => {
    return `Instructions: あなたは社内の情報を知り尽くしたエキスパートです。
従業員から質問されるので、ですます調で丁寧に答えてください。

Human: 以下の<step></step>で質問に答えてください。

<step>
1. <question></question>が質問内容です。質問内容を正しく理解してください。
2. <documents></documents>に回答の参考となるドキュメントが設定されているので、全て理解してください。
3. <documents></documents>の内容をもとに、<question></question>の回答を生成してください。
4. <documents></documents>に回答に必要な情報がない場合は、「資料に該当の情報がありません」を回答とします。回答を創造しないでください。
5. 回答内容を<language></language>で指定された言語に翻訳してください。指定された言語以外は出力しないでください。
6. 生成した回答だけを出力してください。それ以外の文言は一切出力禁止です。回答の過程なども一切出力しないでください。
</step>

<question> 
${question}
</question> 

<documents>
${JSON.stringify(
  documents.map((doc) => ({
    DocumentTitle: doc.DocumentTitle,
    Content: doc.Content,
  }))
)}
</documents>

<language>
${language}
</language>

Assistant: `;
  },
};

export default ragPrompt;
