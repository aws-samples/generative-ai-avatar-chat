import { create } from 'zustand';
import { useTranslation } from 'react-i18next';
import useQuestionApi from './useQuestionApi';
import useAvatar from './useAvatar';
import { speakText } from './usePollyApi';
import { uuidv7 } from 'uuidv7';

const generateSessionId = (): string => {
  return uuidv7();
};

// 新しいsessionIdを生成（リロード時は常に新規生成）
const getOrCreateSessionId = (): string => {
  const newSessionId = generateSessionId();
  localStorage.setItem('rag-avatar-session-id', newSessionId);
  return newSessionId;
};

export const useQuestionState = create<{
  answerText: string;
  sessionId: string;
  voiceOutputEnabled: boolean;
  setAnswerText: (s: string) => void;
  setSessionId: (s: string) => void;
  setVoiceOutputEnabled: (value: boolean) => void;
  resetSession: () => void;
}>((set) => {
  return {
    answerText: '',
    sessionId: getOrCreateSessionId(),
    voiceOutputEnabled: true,
    setAnswerText: (s) => {
      set({
        answerText: s,
      });
    },
    setSessionId(s) {
      set({
        sessionId: s,
      });
      localStorage.setItem('rag-avatar-session-id', s);
    },
    setVoiceOutputEnabled: (value) => set({ voiceOutputEnabled: value }),
    resetSession: () => {
      const newSessionId = generateSessionId();
      set({ sessionId: newSessionId });
      localStorage.setItem('rag-avatar-session-id', newSessionId);
    },
  };
});

const useQuestion = () => {
  const {
    answerText,
    setAnswerText,
    sessionId,
    voiceOutputEnabled,
    resetSession,
  } = useQuestionState();

  const { t } = useTranslation();
  const { questionStream } = useQuestionApi();
  const { startIdle } = useAvatar();

  const setStart = () => {
    startIdle();
  };

  const resetConv = () => {
    setAnswerText(t('message.initial'));
    resetSession(); // 新しいセッションを開始
    setStart();
  };

  return {
    answerText,
    resetConv,
    initiateAnswerText: () => {
      setAnswerText(t('message.initial'));
    },
    question: async (
      content: string,
      language: string,
      languageCode: string,
      speechAction: () => void
    ) => {
      try {
        setAnswerText(t('message.thinking'));

        const stream = questionStream({
          question: content,
          questionLang: language,
          questionLangCode: languageCode,
          sessionId: sessionId,
        });

        let isFirstChunk = true;
        let fullAnswer = '';

        // 発言を更新
        for await (const chunk of stream) {
          if (isFirstChunk) {
            setAnswerText('');
            isFirstChunk = false;
            speechAction();
          }
          fullAnswer += chunk;
          setAnswerText(fullAnswer);
        }

        // 音声出力が有効な場合、回答完了後に一度だけ音声合成
        if (voiceOutputEnabled && fullAnswer.trim()) {
          // languageCodeに基づいて適切な音声コードを設定
          const transcribeCode = languageCode === 'ja' ? 'ja-JP' : 'en-US';
          speakText(fullAnswer, transcribeCode);
        }
      } catch (e) {
        console.error(e);
        setAnswerText(t('message.apiError'));
        resetSession(); // エラー時のみセッションをリセット
        setStart();
        throw e;
      }
    },
  };
};

export default useQuestion;
