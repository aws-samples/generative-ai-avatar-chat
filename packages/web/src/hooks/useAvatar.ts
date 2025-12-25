import { AbstractMesh, Animation, AnimationGroup } from '@babylonjs/core';
import { ILoadedModel } from 'react-babylonjs';
import { create } from 'zustand';

// Constants
const MOUTH_MORPH_TARGET_INDEX = 33;
const MOUTH_ANIMATION_DURATION = 0.7;
const MOUTH_MAX_INFLUENCE = 0.6;
const SPEECH_END_DELAY_MS = 5000;

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking';

const useAvatarState = create<{
  rootMesh: AbstractMesh | undefined;
  bodyMesh: AbstractMesh | undefined;
  faceMesh: AbstractMesh | undefined;
  idleAnimation: AnimationGroup | undefined;
  raisingHandAnimation: AnimationGroup | undefined;
  raisingHandToIdleAnimation: AnimationGroup | undefined;
  thinkingAnimation: AnimationGroup | undefined;
  mouthAnimatable: any | undefined;
  avatarState: AvatarState;
  speakingTimer: NodeJS.Timeout | null;
  stateId: number; // Unique ID for each state transition
  voiceQueueStop: (() => void) | null; // Reference to voice queue stop function
  setMouthAnimatable: (animatable: any) => void;
  setModel: (model: ILoadedModel) => void;
  setVoiceQueueStop: (stopFn: (() => void) | null) => void;
  transitionTo: (newState: AvatarState) => void;
}>((set, get) => {
  return {
    rootMesh: undefined,
    bodyMesh: undefined,
    faceMesh: undefined,
    idleAnimation: undefined,
    raisingHandAnimation: undefined,
    raisingHandToIdleAnimation: undefined,
    thinkingAnimation: undefined,
    mouthAnimatable: undefined,
    avatarState: 'idle',
    speakingTimer: null,
    stateId: 0,
    voiceQueueStop: null,
    setMouthAnimatable: (animatable) => set({ mouthAnimatable: animatable }),
    setVoiceQueueStop: (stopFn) => set({ voiceQueueStop: stopFn }),
    setModel: (model) => {
      const rootMesh = model.meshes?.find((m) => m.name === '__root__');
      rootMesh?.position.set(0, -2.6, 0);
      rootMesh?.scaling.set(1.8, 1.8, 1.8);
      rootMesh?.rotation.set(0, Math.PI / 2, 0);

      set({
        ...(model.animationGroups
          ? {
              idleAnimation: model.animationGroups.find(
                (anim) => anim.name === 'Idle'
              ),
              raisingHandAnimation: model.animationGroups.find(
                (anim) => anim.name === 'RaiseHand'
              ),
              raisingHandToIdleAnimation: model.animationGroups.find(
                (anim) => anim.name === 'RaiseToIdle'
              ),
              thinkingAnimation: model.animationGroups.find(
                (anim) => anim.name === 'Thinking'
              ),
            }
          : {
              idleAnimation: undefined,
              raisingHandAnimation: undefined,
              raisingHandToIdleAnimation: undefined,
              thinkingAnimation: undefined,
            }),
        rootMesh,
        faceMesh: model.meshes?.find((m) => m.name === 'Face'),
        bodyMesh: model.meshes?.find((m) => m.name === 'Body'),
      });
    },
    transitionTo: (newState) => {
      const state = get();
      const { speakingTimer, mouthAnimatable, faceMesh, raisingHandAnimation, voiceQueueStop } = state;

      // Clear any existing timer
      if (speakingTimer) {
        clearTimeout(speakingTimer);
      }

      // Always stop voice queue on any transition
      if (voiceQueueStop) {
        voiceQueueStop();
      }

      // Stop mouth animation
      if (mouthAnimatable) {
        mouthAnimatable.stop();
      }

      // Reset mouth morph target
      if (faceMesh) {
        const morphTarget = faceMesh.morphTargetManager?.getTarget(
          MOUTH_MORPH_TARGET_INDEX
        );
        if (morphTarget) {
          morphTarget.influence = 0;
          morphTarget.animations = [];
        }
      }

      // Stop raising hand animation
      raisingHandAnimation?.stop();

      // Increment state ID to invalidate any pending callbacks
      set({ 
        avatarState: newState, 
        speakingTimer: null, 
        mouthAnimatable: undefined,
        stateId: state.stateId + 1
      });
    },
  };
});

const useAvatar = () => {
  const {
    faceMesh,
    idleAnimation,
    raisingHandAnimation,
    raisingHandToIdleAnimation,
    thinkingAnimation,
    avatarState,
    stateId,
    setMouthAnimatable,
    setModel,
    transitionTo,
  } = useAvatarState();

  const startIdleAnimation = () => {
    idleAnimation?.stop();
    thinkingAnimation?.stop();
    raisingHandAnimation?.stop();
    raisingHandToIdleAnimation?.stop();
    idleAnimation?.start(true);
  };

  const startListeningAnimation = () => {
    // Same as idle for now, but can be customized
    startIdleAnimation();
  };

  const startThinkingAnimation = () => {
    idleAnimation?.stop();
    raisingHandAnimation?.stop();
    raisingHandToIdleAnimation?.stop();
    thinkingAnimation?.start(true);
  };

  const startSpeechAnimation = () => {
    thinkingAnimation?.stop();
    idleAnimation?.stop();
    raisingHandAnimation?.start(true);
    
    if (faceMesh) {
      const morphTarget = faceMesh.morphTargetManager?.getTarget(
        MOUTH_MORPH_TARGET_INDEX
      );
      if (morphTarget) {
        const animation = new Animation(
          'morphAnim',
          'influence',
          30,
          Animation.ANIMATIONTYPE_FLOAT,
          Animation.ANIMATIONLOOPMODE_CYCLE
        );

        const keys = [
          { frame: 0, value: 0 },
          {
            frame: (MOUTH_ANIMATION_DURATION / 2) * 30,
            value: MOUTH_MAX_INFLUENCE,
          },
          { frame: MOUTH_ANIMATION_DURATION * 30, value: 0 },
        ];

        animation.setKeys(keys);
        morphTarget.animations = [];
        morphTarget.animations.push(animation);

        const animatable = faceMesh
          .getScene()
          .beginAnimation(
            morphTarget,
            0,
            MOUTH_ANIMATION_DURATION * 30,
            true
          );

        setMouthAnimatable(animatable);
      }
    }
  };

  const scheduleSpeechEnd = (onComplete: () => void) => {
    // Capture current state ID
    const currentStateId = useAvatarState.getState().stateId;

    // Stop mouth animation immediately when voice ends
    stopMouthAnimation();

    // Start the transition animation to idle
    raisingHandAnimation?.stop();
    const idleAnimatable = raisingHandToIdleAnimation?.start(false);

    if (idleAnimatable) {
      idleAnimatable.onAnimationEndObservable.addOnce(() => {
        const timer = setTimeout(() => {
          // Only execute if state hasn't changed
          if (useAvatarState.getState().stateId === currentStateId) {
            onComplete();
          }
        }, SPEECH_END_DELAY_MS);
        
        // Store timer in state
        useAvatarState.setState({ speakingTimer: timer });
      });
    } else {
      // Fallback if animation doesn't exist
      const timer = setTimeout(() => {
        // Only execute if state hasn't changed
        if (useAvatarState.getState().stateId === currentStateId) {
          onComplete();
        }
      }, SPEECH_END_DELAY_MS);
      useAvatarState.setState({ speakingTimer: timer });
    }
  };

  const stopMouthAnimation = () => {
    const state = useAvatarState.getState();
    const { mouthAnimatable, faceMesh } = state;

    // Stop mouth animation
    if (mouthAnimatable) {
      mouthAnimatable.stop();
    }

    // Reset mouth morph target
    if (faceMesh) {
      const morphTarget = faceMesh.morphTargetManager?.getTarget(
        MOUTH_MORPH_TARGET_INDEX
      );
      if (morphTarget) {
        morphTarget.influence = 0;
        morphTarget.animations = [];
      }
    }

    // Clear mouthAnimatable from state
    useAvatarState.setState({ mouthAnimatable: undefined });
  };

  return {
    avatarState,
    stateId,
    transitionTo,
    startIdleAnimation,
    startListeningAnimation,
    startThinkingAnimation,
    startSpeechAnimation,
    scheduleSpeechEnd,
    stopMouthAnimation,
    setModel,
  };
};

export { useAvatarState };
export default useAvatar;
