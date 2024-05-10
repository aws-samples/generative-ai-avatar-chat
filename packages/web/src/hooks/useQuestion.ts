import { create } from 'zustand';
import useQuestionApi from './useQuestionApi';
import { useTranslation } from 'react-i18next';

const STREAMING_TEXT_POSTFIX = '▍';

const useQuestionState = create<{
  answerText: string;
  setAnswerText: (s: string) => void;
  appendAnswerText: (s: string) => void;
  removeAnswerTextPostfix: () => void;
}>((set, get) => {
  return {
    answerText: '',
    setAnswerText: (s) => {
      set({
        answerText: s,
      });
    },
    appendAnswerText: (s) => {
      set(() => {
        return {
          answerText: get().answerText.endsWith(STREAMING_TEXT_POSTFIX)
            ? get().answerText.slice(0, -1) + s
            : get().answerText + s,
        };
      });
    },
    removeAnswerTextPostfix: () => {
      set(() => {
        return {
          answerText: get().answerText.endsWith(STREAMING_TEXT_POSTFIX)
            ? get().answerText.slice(0, -1)
            : get().answerText,
        };
      });
    },
  };
});

const useQuestion = () => {
  const {
    answerText,
    setAnswerText,
    appendAnswerText,
    removeAnswerTextPostfix,
  } = useQuestionState();

  const { questionStream } = useQuestionApi();

  const { t } = useTranslation();

  return {
    answerText,
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
        });

        let isFirstChunk = true;

        // 発言を更新
        for await (const chunk of stream) {
          if (isFirstChunk) {
            setAnswerText(STREAMING_TEXT_POSTFIX);
            isFirstChunk = false;
            speechAction();
          }
          appendAnswerText(chunk + STREAMING_TEXT_POSTFIX);
        }
        removeAnswerTextPostfix();
      } catch (e) {
        console.error(e);
        setAnswerText(t('message.apiError'));
        throw e;
      }
    },
  };
};

export default useQuestion;
