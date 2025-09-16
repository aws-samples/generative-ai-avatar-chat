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
