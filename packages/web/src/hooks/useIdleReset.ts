import { useEffect, useRef } from 'react';
import { AvatarState } from './useAvatar';

/**
 * Manages automatic reset to initial state based on avatar state transitions
 * 
 * - speaking → idle: Reset immediately (100ms)
 * - listening → idle: Reset after 10 seconds
 * - Other transitions: No reset
 */
export const useIdleReset = (
  avatarState: AvatarState,
  stateId: number,
  onReset: () => void
) => {
  const prevStateIdRef = useRef(stateId);
  const prevAvatarStateRef = useRef(avatarState);
  const listeningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const hasTransitioned = stateId !== prevStateIdRef.current;
    const previousState = prevAvatarStateRef.current;

    prevStateIdRef.current = stateId;
    prevAvatarStateRef.current = avatarState;

    // Clear any existing listening timeout
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
      listeningTimeoutRef.current = null;
    }

    // When transitioning to idle from listening, set 10 second timer
    if (
      avatarState === 'idle' &&
      hasTransitioned &&
      previousState === 'listening'
    ) {
      listeningTimeoutRef.current = setTimeout(() => {
        onReset();
      }, 10000); // 10 seconds

      return () => {
        if (listeningTimeoutRef.current) {
          clearTimeout(listeningTimeoutRef.current);
        }
      };
    }

    // When transitioning to idle from speaking, reset immediately
    if (
      avatarState === 'idle' &&
      hasTransitioned &&
      previousState === 'speaking'
    ) {
      const timer = setTimeout(() => {
        onReset();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [avatarState, stateId, onReset]);
};
