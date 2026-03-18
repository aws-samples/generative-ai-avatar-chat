import { create } from 'zustand';
import { useTranslation } from 'react-i18next';
import { useRef, useEffect } from 'react';
import useQuestionApi from './useQuestionApi';
import useAvatar, { useAvatarState } from './useAvatar';
import { synthesizeAndPlaySegment } from './usePollyApi';
import { uuidv7 } from 'uuidv7';
import { TextSegmenter } from '../utils/TextSegmenter';
import { VoiceQueue } from '../utils/VoiceQueue';

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
  isStreaming: boolean;
  isToolCallInProgress: boolean; // ツール呼び出し中フラグ
  setAnswerText: (s: string) => void;
  setSessionId: (s: string) => void;
  setVoiceOutputEnabled: (value: boolean) => void;
  setIsStreaming: (value: boolean) => void;
  setIsToolCallInProgress: (value: boolean) => void;
  resetSession: () => void;
}>((set) => {
  return {
    answerText: '',
    sessionId: getOrCreateSessionId(),
    voiceOutputEnabled: true,
    isStreaming: false,
    isToolCallInProgress: false,
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
    setIsStreaming: (value) => set({ isStreaming: value }),
    setIsToolCallInProgress: (value) => set({ isToolCallInProgress: value }),
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
    setIsStreaming,
    setIsToolCallInProgress,
    resetSession,
  } = useQuestionState();

  const { t } = useTranslation();
  const { questionStream } = useQuestionApi();
  const {
    transitionTo,
    startIdleAnimation,
    startThinkingAnimation,
    startSpeechAnimation,
    scheduleSpeechEnd,
    stopMouthAnimation,
    stateId,
  } = useAvatar();

  // Create refs for TextSegmenter and VoiceQueue
  const segmenter = useRef(new TextSegmenter());
  const voiceQueue = useRef(new VoiceQueue());

  // Register voice queue stop function in Zustand store
  useEffect(() => {
    useAvatarState.getState().setVoiceQueueStop(() => voiceQueue.current.stop());
    
    return () => {
      useAvatarState.getState().setVoiceQueueStop(null);
    };
  }, []);

  // Set up completion callback for voice queue
  useEffect(() => {
    const currentStateId = stateId;
    
    voiceQueue.current.setOnQueueComplete(() => {
      // Only execute if state hasn't changed since this callback was set
      const avatarState = useAvatarState.getState();
      if (avatarState.stateId === currentStateId && avatarState.avatarState === 'speaking') {
        scheduleSpeechEnd(() => {
          transitionTo('idle');
        });
      }
    });
  }, [scheduleSpeechEnd, transitionTo, stateId]);

  const setStart = () => {
    transitionTo('idle');
    startIdleAnimation();
  };

  const resetConv = () => {
    setAnswerText(t('message.initial'));
    resetSession();
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
      languageCode: string
    ) => {
      try {
        // Transition to thinking state (this will clean up any previous state)
        transitionTo('thinking');
        setAnswerText(t('message.thinking'));
        setIsStreaming(true);
        startThinkingAnimation();

        // Reset segmenter (voice queue is stopped by transitionTo)
        segmenter.current.reset();

        // Set up the synthesize and play function for VoiceQueue
        const transcribeCode = languageCode === 'ja' ? 'ja-JP' : 'en-US';
        voiceQueue.current.setSynthesizeAndPlay((text: string) =>
          synthesizeAndPlaySegment(text, transcribeCode)
        );

        const stream = questionStream({
          question: content,
          questionLang: language,
          questionLangCode: languageCode,
          sessionId: sessionId,
        });

        let isFirstChunk = true;
        let fullAnswer = '';

        // Process streaming response
        for await (const chunk of stream) {
          // ツール呼び出し開始マーカーを検知
          if (chunk.includes('<<<TOOL_CALL_START>>>')) {
            setIsToolCallInProgress(true);
            // マーカーを除去してテキストは表示
            const cleanChunk = chunk.replace('<<<TOOL_CALL_START>>>', '');
            if (cleanChunk) {
              fullAnswer += cleanChunk;
              setAnswerText(fullAnswer);
            }
            continue;
          }

          // ツール呼び出し終了マーカーを検知
          if (chunk.includes('<<<TOOL_CALL_END>>>')) {
            setIsToolCallInProgress(false);
            // 音声キューをクリア（一次回答の音声を破棄）
            if (voiceOutputEnabled) {
              voiceQueue.current.stop();
              segmenter.current.reset();
            }
            // 画面をクリアして最終回答のみを表示
            fullAnswer = '';
            setAnswerText('');
            // マーカーを除去
            const cleanChunk = chunk.replace('<<<TOOL_CALL_END>>>', '');
            if (cleanChunk) {
              fullAnswer += cleanChunk;
              setAnswerText(fullAnswer);
            }
            continue;
          }

          if (isFirstChunk) {
            setAnswerText('');
            isFirstChunk = false;
            // Transition to speaking state
            transitionTo('speaking');
            startSpeechAnimation();
          }
          fullAnswer += chunk;
          setAnswerText(fullAnswer);

          // 音声合成の処理
          if (voiceOutputEnabled) {
            // ツール呼び出しがない場合、ツール呼び出し中、または呼び出し後の場合は音声キューに追加
            // ツール呼び出し中の音声は後でTOOL_CALL_ENDでクリアされる
            const segments = segmenter.current.addChunk(chunk);
            segments.forEach(seg => {
              if (seg.trim()) {
                voiceQueue.current.enqueue(seg);
              }
            });
          }
        }

        // Flush the final segment
        if (voiceOutputEnabled) {
          const finalSegment = segmenter.current.flush();
          if (finalSegment?.trim()) {
            voiceQueue.current.enqueue(finalSegment);
          }
        } else {
          // Voice output is disabled: stop mouth and schedule transition to idle
          stopMouthAnimation();
          scheduleSpeechEnd(() => {
            transitionTo('idle');
          });
        }

        setIsStreaming(false);
        setIsToolCallInProgress(false);
      } catch (e) {
        console.error(e);
        setAnswerText(t('message.apiError'));
        setIsStreaming(false);
        resetSession();
        setStart();
        throw e;
      }
    },
  };
};

export default useQuestion;
