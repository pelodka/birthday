import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import type { ActTwoAnimationSlot, FallbackRigDefinition } from '../types';
import { getActTwoAnimationFile } from './actTwoModelSchema';
import { createThreePlaceholderRig } from './playerPlaceholderThree';
import { disposeObjectTree } from './threeDisposal';

export type PartyAnimationMode = 'field-idle' | 'field-move' | 'battle-idle';
export type PartyAnimationCue =
  | 'battle-start'
  | 'battle-guard'
  | 'battle-hit'
  | 'battle-attack'
  | 'battle-skill'
  | 'battle-victory';
export type PartyVisualActorId = 'boss-prime' | 'planner-mage';

export interface PartyVisual {
  clearAnimationCue: () => void;
  group: THREE.Group;
  setMotion: (time: number, movementBias?: number) => void;
  setAnimationMode: (mode: PartyAnimationMode) => void;
  playAnimationCue: (cue: PartyAnimationCue) => number;
  dispose: () => void;
}

interface CreatePartyVisualOptions {
  actorId: PartyVisualActorId;
  rig: FallbackRigDefinition;
  accentColor: string;
}

type HeroClipSlot =
  | 'explorationIdle'
  | 'explorationMove'
  | 'battleStart'
  | 'battleIdle'
  | 'battleGuard'
  | 'battleHit'
  | 'battleAttack'
  | 'battleSkill'
  | 'battleVictory';

interface HeroClipLibrary {
  scene: THREE.Group;
  clips: Partial<Record<HeroClipSlot, THREE.AnimationClip>>;
}

interface PartyVisualConfig {
  battleFacingOffset: number;
  battleAttackFacingOffset?: number;
  battleAttackDurationReductionMs?: number;
  fieldFacingOffset: number;
  startsHiddenUntilImport: boolean;
  targetHeight: number;
}

const PARTY_SLOT_BINDINGS: Record<HeroClipSlot, ActTwoAnimationSlot> = {
  explorationIdle: 'exploration-idle',
  explorationMove: 'exploration-move',
  battleStart: 'battle-start',
  battleIdle: 'battle-idle',
  battleGuard: 'battle-guard',
  battleHit: 'battle-hit',
  battleAttack: 'battle-attack',
  battleSkill: 'battle-skill',
  battleVictory: 'battle-victory',
};

const PARTY_VISUAL_CONFIGS: Record<PartyVisualActorId, PartyVisualConfig> = {
  'boss-prime': {
    battleFacingOffset: 0,
    battleAttackFacingOffset: -0.57,
    fieldFacingOffset: 0,
    startsHiddenUntilImport: true,
    targetHeight: 2.6,
  },
  'planner-mage': {
    battleFacingOffset: 0,
    battleAttackFacingOffset: -0.83 + Math.PI,
    battleAttackDurationReductionMs: 3000,
    fieldFacingOffset: 0,
    startsHiddenUntilImport: true,
    targetHeight: 2.6,
  },
};

const HERO_IDLE_POSE_TIME = 0;

const gltfLoader = new GLTFLoader();

export function createActTwoPartyVisual({
  actorId,
  rig,
  accentColor,
}: CreatePartyVisualOptions): PartyVisual {
  const actorConfig = PARTY_VISUAL_CONFIGS[actorId];
  const startsHiddenUntilImport = actorConfig.startsHiddenUntilImport;
  const placeholder = createThreePlaceholderRig({
    rig,
    accentColor: new THREE.Color(accentColor),
    mode: 'ps1',
  });
  placeholder.group.scale.setScalar(0.92);
  placeholder.group.visible = !startsHiddenUntilImport;

  const container = new THREE.Group();
  container.visible = !startsHiddenUntilImport;
  container.add(placeholder.group);

  let animationMode: PartyAnimationMode = 'field-idle';
  let lastTime: number | null = null;
  let disposed = false;
  let importedAnchor: THREE.Group | null = null;
  let importedScene: THREE.Group | null = null;
  let importedRootMotionNode: THREE.Object3D | null = null;
  let importedRootMotionBaseline: THREE.Vector3 | null = null;
  let mixer: THREE.AnimationMixer | null = null;
  let actions: Partial<Record<HeroClipSlot, THREE.AnimationAction>> = {};
  let appliedMode: PartyAnimationMode | null = null;
  let activeCue: PartyAnimationCue | null = null;
  let activeCueAction: THREE.AnimationAction | null = null;
  let placeholderDisposed = false;

  const disposePlaceholder = (): void => {
    if (placeholderDisposed) {
      return;
    }

    placeholderDisposed = true;
    placeholder.dispose();
  };

  let motionImpl = (time: number, movementBias = 0): void => {
    placeholder.setMotion(time, movementBias);
  };

  const stopAllActions = (): void => {
    Object.values(actions).forEach((action) => {
      action?.stop();
    });
  };

  const resolveLoopPlayback = (
    mode: PartyAnimationMode,
  ): { action: THREE.AnimationAction | null; timeScale: number; pauseAtStart: boolean; facingOffset: number } => {
    if (mode === 'field-move') {
      return {
        action: actions.explorationMove ?? actions.explorationIdle ?? null,
        timeScale: 1,
        pauseAtStart: false,
        facingOffset: actorConfig.fieldFacingOffset,
      };
    }

    if (mode === 'battle-idle') {
      if (actions.battleIdle) {
        return {
          action: actions.battleIdle,
          timeScale: 0.92,
          pauseAtStart: false,
          facingOffset: actorConfig.battleFacingOffset,
        };
      }

      if (actions.explorationIdle) {
        return {
          action: actions.explorationIdle,
          timeScale: 0.92,
          pauseAtStart: false,
          facingOffset: actorConfig.battleFacingOffset,
        };
      }

      return {
        action: actions.explorationMove ?? null,
        timeScale: 1,
        pauseAtStart: true,
        facingOffset: actorConfig.battleFacingOffset,
      };
    }

    if (actions.explorationIdle) {
      return {
        action: actions.explorationIdle,
        timeScale: 0.9,
        pauseAtStart: false,
        facingOffset: actorConfig.fieldFacingOffset,
      };
    }

    return {
      action: actions.explorationMove ?? null,
      timeScale: 1,
      pauseAtStart: true,
      facingOffset: actorConfig.fieldFacingOffset,
    };
  };

  const applyLoopMode = (): void => {
    if (!mixer || activeCue) {
      return;
    }

    const playback = resolveLoopPlayback(animationMode);
    if (appliedMode === animationMode && playback.action) {
      return;
    }

    stopAllActions();

    if (importedScene) {
      importedScene.rotation.y = playback.facingOffset;
    }

    if (playback.action) {
      playback.action.enabled = true;
      playback.action.paused = false;
      playback.action.clampWhenFinished = false;
      playback.action.reset();
      playback.action.setLoop(THREE.LoopRepeat, Infinity);
      playback.action.setEffectiveTimeScale(playback.timeScale);
      playback.action.play();
      mixer.update(0);

      if (playback.pauseAtStart) {
        playback.action.paused = true;
        mixer.setTime(HERO_IDLE_POSE_TIME);
      }
    }

    appliedMode = animationMode;
  };

  const handleMixerFinished = (event: THREE.Event & { action?: THREE.AnimationAction }): void => {
    if (!activeCueAction || event.action !== activeCueAction) {
      return;
    }

    activeCue = null;
    activeCueAction = null;
    appliedMode = null;
    applyLoopMode();
  };

  const setAnimationMode = (mode: PartyAnimationMode): void => {
    const modeChanged = animationMode !== mode;
    animationMode = mode;
    if (!mixer || activeCue) {
      return;
    }

    if (!modeChanged && appliedMode === animationMode) {
      return;
    }

    appliedMode = null;
    applyLoopMode();
  };

  const clearAnimationCue = (): void => {
    activeCue = null;
    activeCueAction = null;
    appliedMode = null;
    stopAllActions();

    if (importedAnchor) {
      importedAnchor.position.x = 0;
      importedAnchor.position.y = 0;
      importedAnchor.position.z = 0;
      importedAnchor.rotation.z = 0;
    }

    applyLoopMode();
  };

  const playAnimationCue = (cue: PartyAnimationCue): number => {
    if (!mixer) {
      return 0;
    }

    const cueFacingOffset = cue === 'battle-attack'
      ? actorConfig.battleAttackFacingOffset ?? actorConfig.battleFacingOffset
      : actorConfig.battleFacingOffset;
    const resolveCueTimeScale = (action: THREE.AnimationAction | null): number => {
      if (cue !== 'battle-attack' || !action || !actorConfig.battleAttackDurationReductionMs) {
        return 1;
      }

      const clipDurationMs = action.getClip().duration * 1000;
      const targetDurationMs = Math.max(clipDurationMs - actorConfig.battleAttackDurationReductionMs, 120);
      return clipDurationMs / targetDurationMs;
    };
    const playback =
      cue === 'battle-start'
        ? { action: actions.battleStart ?? null, timeScale: 1, facingOffset: cueFacingOffset }
        : cue === 'battle-guard'
          ? { action: actions.battleGuard ?? null, timeScale: 1, facingOffset: cueFacingOffset }
          : cue === 'battle-hit'
            ? { action: actions.battleHit ?? actions.battleGuard ?? null, timeScale: 1, facingOffset: cueFacingOffset }
            : cue === 'battle-attack'
              ? { action: actions.battleAttack ?? null, timeScale: 1, facingOffset: cueFacingOffset }
              : cue === 'battle-skill'
                ? {
                    action: actions.battleSkill ?? actions.battleAttack ?? null,
                    timeScale: 1,
                    facingOffset: cueFacingOffset,
                  }
                : { action: actions.battleVictory ?? null, timeScale: 1, facingOffset: cueFacingOffset };

    if (!playback.action) {
      return 0;
    }

    playback.timeScale = resolveCueTimeScale(playback.action);
    activeCue = cue;
    activeCueAction = playback.action;
    stopAllActions();

    if (importedScene) {
      importedScene.rotation.y = playback.facingOffset;
    }

    playback.action.enabled = true;
    playback.action.paused = false;
    playback.action.clampWhenFinished = true;
    playback.action.reset();
    playback.action.setLoop(THREE.LoopOnce, 1);
    playback.action.setEffectiveTimeScale(playback.timeScale);
    playback.action.play();
    mixer.update(0);

    return Math.round((playback.action.getClip().duration / playback.timeScale) * 1000);
  };

  loadHeroClipLibrary(actorId).then((library) => {
    if (!library || disposed) {
      if (disposed && library) {
        disposeObjectTree(library.scene);
      }
      if (!disposed) {
        container.visible = true;
        placeholder.group.visible = true;
      }
      return;
    }

    importedScene = library.scene;
    normalizeImportedHero(importedScene, actorConfig.targetHeight);
    importedScene.rotation.y = actorConfig.fieldFacingOffset;

    const anchor = new THREE.Group();
    anchor.name = `act-two-${actorId}-anchor`;
    anchor.add(importedScene);

    container.remove(placeholder.group);
    container.add(anchor);
    container.visible = true;

    importedAnchor = anchor;
    importedRootMotionNode = importedScene.getObjectByName('Armature') ?? importedScene;
    importedRootMotionBaseline = importedRootMotionNode.position.clone();
    mixer = new THREE.AnimationMixer(importedScene);
    mixer.addEventListener('finished', handleMixerFinished);
    actions = createHeroActions(mixer, library.clips);
    appliedMode = null;
    lastTime = null;
    applyLoopMode();

    motionImpl = (time: number, movementBias = 0): void => {
      const dt = lastTime === null ? 0 : Math.min(Math.max(time - lastTime, 0), 0.05);
      lastTime = time;

      mixer?.update(dt);

      if (importedRootMotionNode && importedRootMotionBaseline) {
        importedRootMotionNode.position.copy(importedRootMotionBaseline);
      }

      if (!importedAnchor) {
        return;
      }

      const lean = THREE.MathUtils.clamp(movementBias * 0.14, -0.18, 0.18);

      if (activeCue) {
        importedAnchor.rotation.z = 0;
        importedAnchor.position.y = 0;
        return;
      }

      importedAnchor.position.x = 0;
      importedAnchor.position.z = 0;
      importedAnchor.rotation.z = animationMode === 'field-move' ? -lean : -lean * 0.45;
      importedAnchor.position.y = animationMode === 'battle-idle'
        ? Math.sin(time * 2.8) * 0.035
        : animationMode === 'field-idle'
          ? Math.sin(time * 2.2) * 0.02
          : 0;
    };
  });

  return {
    clearAnimationCue,
    group: container,
    setMotion: (time: number, movementBias = 0): void => {
      motionImpl(time, movementBias);
    },
    setAnimationMode,
    playAnimationCue,
    dispose: (): void => {
      if (disposed) {
        return;
      }

      disposed = true;
      mixer?.removeEventListener('finished', handleMixerFinished);
      mixer?.stopAllAction();
      if (importedScene) {
        mixer?.uncacheRoot(importedScene);
        disposeObjectTree(importedScene);
      }
      disposePlaceholder();
      importedAnchor = null;
      importedScene = null;
      importedRootMotionNode = null;
      importedRootMotionBaseline = null;
      mixer = null;
      actions = {};
    },
  };
}

function loadHeroClipLibrary(actorId: PartyVisualActorId): Promise<HeroClipLibrary | null> {
  const modelPaths = getPartyModelPaths(actorId);
  const slotEntries = Object.entries(modelPaths).filter((entry): entry is [HeroClipSlot, string] => Boolean(entry[1]));
  if (slotEntries.length === 0) {
    return Promise.resolve(null);
  }

  const uniquePaths = [...new Set(slotEntries.map(([, path]) => path))];
  return Promise.all(uniquePaths.map((path) => loadGltf(path).then((gltf) => [path, gltf] as const)))
    .then((loadedEntries) => {
      const loadedByPath = new Map(loadedEntries);
      const sceneSource =
        loadedByPath.get(modelPaths.explorationIdle ?? '') ??
        loadedByPath.get(modelPaths.battleIdle ?? '') ??
        loadedByPath.get(modelPaths.explorationMove ?? '') ??
        loadedEntries[0]?.[1];

      if (!sceneSource) {
        return null;
      }

      const clips: Partial<Record<HeroClipSlot, THREE.AnimationClip>> = {};
      slotEntries.forEach(([slot, path]) => {
        clips[slot] = loadedByPath.get(path)?.animations[0] ?? undefined;
      });

      return {
        scene: sceneSource.scene,
        clips,
      };
    })
    .catch((error: unknown) => {
      console.warn(`Act 2 party GLB load failed for ${actorId}. Keeping placeholder rig.`, error);
      return null;
    });
}

function createHeroActions(
  mixer: THREE.AnimationMixer,
  clips: Partial<Record<HeroClipSlot, THREE.AnimationClip>>,
): Partial<Record<HeroClipSlot, THREE.AnimationAction>> {
  const actions: Partial<Record<HeroClipSlot, THREE.AnimationAction>> = {};

  (
    [
      'explorationIdle',
      'explorationMove',
      'battleStart',
      'battleIdle',
      'battleGuard',
      'battleHit',
      'battleAttack',
      'battleSkill',
      'battleVictory',
    ] as const
  ).forEach((slot) => {
    const clip = clips[slot];
    if (!clip) {
      return;
    }

    actions[slot] = mixer.clipAction(removeScaleTracks(clip));
  });

  return actions;
}

function removeScaleTracks(clip: THREE.AnimationClip): THREE.AnimationClip {
  const tracks = clip.tracks.filter((track) => !track.name.endsWith('.scale'));
  if (tracks.length === clip.tracks.length) {
    return clip;
  }

  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}

function getPartyModelPaths(actorId: PartyVisualActorId): Record<HeroClipSlot, string | null> {
  return {
    explorationIdle: getActTwoAnimationFile(actorId, PARTY_SLOT_BINDINGS.explorationIdle),
    explorationMove: getActTwoAnimationFile(actorId, PARTY_SLOT_BINDINGS.explorationMove),
    battleStart: getActTwoAnimationFile(actorId, PARTY_SLOT_BINDINGS.battleStart),
    battleIdle: getActTwoAnimationFile(actorId, PARTY_SLOT_BINDINGS.battleIdle),
    battleGuard: getActTwoAnimationFile(actorId, PARTY_SLOT_BINDINGS.battleGuard),
    battleHit: getActTwoAnimationFile(actorId, PARTY_SLOT_BINDINGS.battleHit),
    battleAttack: getActTwoAnimationFile(actorId, PARTY_SLOT_BINDINGS.battleAttack),
    battleSkill: getActTwoAnimationFile(actorId, PARTY_SLOT_BINDINGS.battleSkill),
    battleVictory: getActTwoAnimationFile(actorId, PARTY_SLOT_BINDINGS.battleVictory),
  };
}

function loadGltf(url: string): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => resolve({ scene: gltf.scene, animations: gltf.animations }),
      undefined,
      reject,
    );
  });
}

function normalizeImportedHero(root: THREE.Object3D, targetHeight: number): void {
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const height = Math.max(size.y, 0.001);
  const scale = targetHeight / height;
  root.scale.setScalar(scale);

  const scaledBounds = new THREE.Box3().setFromObject(root);
  const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
  root.position.x -= scaledCenter.x;
  root.position.z -= scaledCenter.z;
  root.position.y -= scaledBounds.min.y;
}
