export type QuestionRequest = {
  question: string;
  questionLang: string;
  questionLangCode: string;
  sessionId: string;
};

export type TQuestionResponse = {
  answer: string;
  sessionId: string;
};

// WebSocket メッセージ型
export type WsSendMessage = {
  question: string;
  questionLang: string;
  questionLangCode: string;
};

export type WsChunkMessage = {
  type: 'chunk';
  text: string;
};

export type WsToolStartMessage = {
  type: 'tool_start';
};

export type WsToolEndMessage = {
  type: 'tool_end';
};

export type WsDoneMessage = {
  type: 'done';
};

export type WsErrorMessage = {
  type: 'error';
  message: string;
};

export type WsReceiveMessage =
  | WsChunkMessage
  | WsToolStartMessage
  | WsToolEndMessage
  | WsDoneMessage
  | WsErrorMessage;
