import { AbstractMesh, Animation, AnimationGroup } from '@babylonjs/core';
import { ILoadedModel } from 'react-babylonjs';
import { create } from 'zustand';

const useAvatarState = create<{
  rootMesh: AbstractMesh | undefined;
  bodyMesh: AbstractMesh | undefined;
  faceMesh: AbstractMesh | undefined;
  idleAnimation: AnimationGroup | undefined;
  raisingHandAnimation: AnimationGroup | undefined;
  raisingHandToIdleAnimation: AnimationGroup | undefined;
  thinkingAnimation: AnimationGroup | undefined;
  setModel: (model: ILoadedModel) => void;
}>((set) => {
  return {
    rootMesh: undefined,
    bodyMesh: undefined,
    faceMesh: undefined,
    idleAnimation: undefined,
    raisingHandAnimation: undefined,
    raisingHandToIdleAnimation: undefined,
    thinkingAnimation: undefined,
    setModel: (model) => {
      const rootMesh = model.meshes?.find((m) => m.name === '__root__');
      rootMesh?.position.set(0, -2.6, 0);
      rootMesh?.scaling.set(1.8, 1.8, 1.8);
      rootMesh?.rotation.set(0, Math.PI / 2, 0);

      set({
        ...(model.animationGroups
          ? {
            idleAnimation: model.animationGroups.find(anim => anim.name === 'Idle'),
            raisingHandAnimation: model.animationGroups.find(anim => anim.name === 'RaiseHand'),
            raisingHandToIdleAnimation: model.animationGroups.find(anim => anim.name === 'RaiseToIdle'),
            thinkingAnimation: model.animationGroups.find(anim => anim.name === 'Thinking'),
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
  };
});

const useAvatar = () => {
  const {
    faceMesh,
    idleAnimation,
    raisingHandAnimation,
    raisingHandToIdleAnimation,
    thinkingAnimation,
    setModel,
  } = useAvatarState();

  const speech = () => {
    thinkingAnimation?.stop();
    raisingHandAnimation?.start(true);
    if (faceMesh) {
      const morphTarget = faceMesh.morphTargetManager?.getTarget(33);
      if (morphTarget) {
        const animationDuration = 0.7;
        const maxInfluence = 0.6; // Maximum Mouth Opening Size
        const totalAnimationTime = 5;

        // Round up loopCount to look natural
        const loopCount = Math.ceil(totalAnimationTime / animationDuration);

        const animation = new Animation(
          'morphAnim',
          'influence',
          30,
          Animation.ANIMATIONTYPE_FLOAT,
          Animation.ANIMATIONLOOPMODE_CYCLE
        );

        // Key for animations
        const keys = [];

        // Transition from 0 to maxInfluence and back to 0 over animationDuration seconds,
        // repeating for loopCount times
        for (let i = 0; i < loopCount; i++) {
          keys.push({ frame: 30 * animationDuration * i, value: 0 });
          // Reach maxInfluence in half the time
          keys.push({
            frame: 30 * animationDuration * i + (animationDuration / 2) * 30,
            value: maxInfluence,
          });
          // Return to 0 before starting the next cycle
          keys.push({ frame: 30 * animationDuration * (i + 1), value: 0 });
        }

        animation.setKeys(keys);

        // Apply animation to target
        morphTarget.animations = [];
        morphTarget.animations.push(animation);

        // Start Animation
        const animatable = faceMesh
          .getScene()
          .beginAnimation(
            morphTarget,
            0,
            30 * animationDuration * loopCount,
            false
          );

        // Set shape key to 0 at the end of animation
        animatable.onAnimationEnd = () => {
          raisingHandAnimation?.stop();
          raisingHandToIdleAnimation?.start(false);
        };
      }
    }
  };

  return {
    startThinking: () => {
      idleAnimation?.stop();
      thinkingAnimation?.start(true);
    },
    stopThinking: () => {
      thinkingAnimation?.stop();
      idleAnimation?.start(true);
    },
    startSpeech: () => {
      speech();
    },
    startIdle: () => {
      idleAnimation?.start(true);
    },
    setModel,
  };
};

export default useAvatar;
