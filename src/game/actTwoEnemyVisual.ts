import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import type { ActTwoAnimationSlot } from '../types';
import { getActTwoAnimationFile } from './actTwoModelSchema';
import { disposeObjectTree } from './threeDisposal';

export type EnemyVisualActorId = 'taxi-migrant' | 'anton-distorton' | 'vadim-heavydim' | 'giant-khinkali';
export type EnemyAnimationCue = 'hit' | 'defeat';

export interface EnemyVisual {
  group: THREE.Group;
  setMotion: (time: number, movementBias?: number) => void;
  playEnemyCue: (cue: EnemyAnimationCue) => number;
  getEnemyCueDuration: (cue: EnemyAnimationCue) => number;
  dispose: () => void;
}

type EnemyClipSlot = 'battleIdle' | 'battleHit' | 'battleDefeat';
type ProceduralEnemyKind = 'hound' | 'wraith' | 'khinkali';

interface EnemyClipLibrary {
  scene: THREE.Group;
  clips: Partial<Record<EnemyClipSlot, THREE.AnimationClip>>;
}

interface EnemyVisualConfig {
  fallbackKind: ProceduralEnemyKind;
  defeatFacingOffset?: number;
  facingOffset: number;
  hitTimeScale: number;
  targetHeight: number;
}

const ENEMY_SLOT_BINDINGS: Record<EnemyClipSlot, ActTwoAnimationSlot> = {
  battleIdle: 'battle-idle',
  battleHit: 'battle-hit',
  battleDefeat: 'battle-defeat',
};

const ENEMY_VISUAL_CONFIGS: Record<EnemyVisualActorId, EnemyVisualConfig> = {
  'taxi-migrant': {
    fallbackKind: 'hound',
    facingOffset: 0,
    hitTimeScale: 2.25,
    targetHeight: 2.45,
  },
  'anton-distorton': {
    fallbackKind: 'hound',
    facingOffset: 0,
    hitTimeScale: 2.25,
    targetHeight: 2.55,
  },
  'vadim-heavydim': {
    fallbackKind: 'wraith',
    facingOffset: 0,
    hitTimeScale: 2.25,
    targetHeight: 2.55,
  },
  'giant-khinkali': {
    fallbackKind: 'khinkali',
    defeatFacingOffset: 0,
    facingOffset: Math.PI,
    hitTimeScale: 4,
    targetHeight: 3.35,
  },
};

const FALLBACK_HIT_DURATION_MS = 260;
const FALLBACK_DEFEAT_DURATION_MS = 540;
const gltfLoader = new GLTFLoader();

export function createActTwoEnemyVisual(actorId: EnemyVisualActorId, accentColor: string): EnemyVisual {
  const actorConfig = ENEMY_VISUAL_CONFIGS[actorId];
  const fallback = createProceduralEnemyVisual(actorConfig.fallbackKind, accentColor);
  const container = new THREE.Group();

  let disposed = false;
  let defeated = false;
  let lastTime: number | null = null;
  let importedAnchor: THREE.Group | null = null;
  let importedScene: THREE.Group | null = null;
  let importedRootMotionNode: THREE.Object3D | null = null;
  let importedRootMotionBaseline: THREE.Vector3 | null = null;
  let mixer: THREE.AnimationMixer | null = null;
  let actions: Partial<Record<EnemyClipSlot, THREE.AnimationAction>> = {};
  let activeCue: EnemyAnimationCue | null = null;
  let activeCueAction: THREE.AnimationAction | null = null;

  const getCueTimeScale = (cue: EnemyAnimationCue): number => (cue === 'hit' ? actorConfig.hitTimeScale : 1.25);
  const getCueFacingOffset = (cue: EnemyAnimationCue): number =>
    cue === 'defeat' ? actorConfig.defeatFacingOffset ?? actorConfig.facingOffset : actorConfig.facingOffset;

  const stopNonDefeatActions = (): void => {
    Object.entries(actions).forEach(([slot, action]) => {
      if (defeated && slot === 'battleDefeat') {
        return;
      }

      action?.stop();
    });
  };

  const applyBattleLoop = (): void => {
    if (!mixer || activeCue || defeated) {
      return;
    }

    stopNonDefeatActions();

    if (importedScene) {
      importedScene.rotation.y = actorConfig.facingOffset;
    }

    const loopAction = actions.battleIdle;
    if (!loopAction) {
      return;
    }

    loopAction.enabled = true;
    loopAction.paused = false;
    loopAction.clampWhenFinished = false;
    loopAction.reset();
    loopAction.setLoop(THREE.LoopRepeat, Infinity);
    loopAction.setEffectiveTimeScale(0.95);
    loopAction.play();
    mixer.update(0);
  };

  const playImportedCue = (cue: EnemyAnimationCue, holdFinalFrame = false): number => {
    if (!mixer) {
      return 0;
    }

    const action = cue === 'hit' ? actions.battleHit : actions.battleDefeat;
    if (!action) {
      return 0;
    }

    activeCue = cue;
    activeCueAction = action;
    if (cue === 'defeat') {
      defeated = true;
    }

    stopNonDefeatActions();

    if (importedScene) {
      importedScene.rotation.y = getCueFacingOffset(cue);
    }

    action.enabled = true;
    action.paused = false;
    action.clampWhenFinished = true;
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.setEffectiveTimeScale(getCueTimeScale(cue));
    action.play();

    if (holdFinalFrame) {
      action.time = action.getClip().duration;
      action.paused = true;
      activeCue = 'defeat';
      activeCueAction = null;
    }

    mixer.update(0);
    return Math.round((action.getClip().duration / getCueTimeScale(cue)) * 1000);
  };

  const handleMixerFinished = (event: THREE.Event & { action?: THREE.AnimationAction }): void => {
    if (!activeCueAction || event.action !== activeCueAction) {
      return;
    }

    if (activeCue === 'defeat') {
      activeCueAction = null;
      return;
    }

    activeCue = null;
    activeCueAction = null;
    applyBattleLoop();
  };

  const getImportedCueDuration = (cue: EnemyAnimationCue): number => {
    const action = cue === 'hit' ? actions.battleHit : actions.battleDefeat;
    return action ? Math.round((action.getClip().duration / getCueTimeScale(cue)) * 1000) : 0;
  };

  let motionImpl = (time: number, movementBias = 0.18): void => {
    fallback.setMotion(time, movementBias);
  };

  let playCueImpl = (cue: EnemyAnimationCue): number => {
    if (cue === 'defeat') {
      defeated = true;
    }

    return fallback.playEnemyCue(cue);
  };

  let getCueDurationImpl = (cue: EnemyAnimationCue): number =>
    cue === 'hit' ? FALLBACK_HIT_DURATION_MS : FALLBACK_DEFEAT_DURATION_MS;

  loadEnemyClipLibrary(actorId).then((library) => {
    if (!library || disposed) {
      if (disposed && library) {
        disposeObjectTree(library.scene);
      }
      return;
    }

    importedScene = library.scene;
    normalizeImportedEnemy(importedScene, actorConfig.targetHeight);
    importedScene.rotation.y = actorConfig.facingOffset;

    const anchor = new THREE.Group();
    anchor.name = `act-two-${actorId}-enemy-anchor`;
    anchor.add(importedScene);

    container.add(anchor);

    importedAnchor = anchor;
    importedRootMotionNode = importedScene.getObjectByName('Armature') ?? importedScene;
    importedRootMotionBaseline = importedRootMotionNode.position.clone();
    mixer = new THREE.AnimationMixer(importedScene);
    mixer.addEventListener('finished', handleMixerFinished);
    actions = createEnemyActions(mixer, library.clips);
    lastTime = null;

    motionImpl = (time: number, movementBias = 0.18): void => {
      const dt = lastTime === null ? 0 : Math.min(Math.max(time - lastTime, 0), 0.05);
      lastTime = time;

      mixer?.update(dt);

      if (importedRootMotionNode && importedRootMotionBaseline) {
        importedRootMotionNode.position.copy(importedRootMotionBaseline);
      }

      if (!importedAnchor) {
        return;
      }

      importedAnchor.position.x = 0;
      importedAnchor.position.z = 0;

      if (defeated) {
        importedAnchor.position.y = 0;
        importedAnchor.rotation.z = 0;
        return;
      }

      if (activeCue) {
        importedAnchor.position.y = activeCue === 'hit' ? Math.sin(time * 18) * 0.025 : 0;
        importedAnchor.rotation.z = 0;
        return;
      }

      const isBoss = actorId === 'giant-khinkali';
      importedAnchor.position.y = Math.sin(time * (isBoss ? 2.4 : 3.2)) * (isBoss ? 0.035 : 0.025);
      importedAnchor.rotation.z = Math.sin(time * (isBoss ? 1.6 : 2.1)) * movementBias * (isBoss ? 0.04 : 0.06);
    };

    playCueImpl = (cue: EnemyAnimationCue): number => {
      const importedDuration = playImportedCue(cue);
      if (importedDuration > 0) {
        return importedDuration;
      }

      if (cue === 'defeat') {
        defeated = true;
      }

      return fallback.playEnemyCue(cue);
    };

    getCueDurationImpl = (cue: EnemyAnimationCue): number =>
      getImportedCueDuration(cue) || (cue === 'hit' ? FALLBACK_HIT_DURATION_MS : FALLBACK_DEFEAT_DURATION_MS);

    if (defeated) {
      playImportedCue('defeat', true);
      return;
    }

    applyBattleLoop();
  });

  return {
    group: container,
    setMotion: (time: number, movementBias = 0.18): void => {
      motionImpl(time, movementBias);
    },
    playEnemyCue: (cue: EnemyAnimationCue): number => playCueImpl(cue),
    getEnemyCueDuration: (cue: EnemyAnimationCue): number => getCueDurationImpl(cue),
    dispose: (): void => {
      if (disposed) {
        return;
      }

      disposed = true;
      fallback.dispose();
      mixer?.removeEventListener('finished', handleMixerFinished);
      mixer?.stopAllAction();
      if (importedScene) {
        mixer?.uncacheRoot(importedScene);
        disposeObjectTree(importedScene);
      }
      importedAnchor = null;
      importedScene = null;
      importedRootMotionNode = null;
      importedRootMotionBaseline = null;
      mixer = null;
      actions = {};
    },
  };
}

function loadEnemyClipLibrary(actorId: EnemyVisualActorId): Promise<EnemyClipLibrary | null> {
  const modelPaths = getEnemyModelPaths(actorId);
  const slotEntries = Object.entries(modelPaths).filter((entry): entry is [EnemyClipSlot, string] => Boolean(entry[1]));
  if (slotEntries.length === 0) {
    return Promise.resolve(null);
  }

  const uniquePaths = [...new Set(slotEntries.map(([, path]) => path))];
  return Promise.all(uniquePaths.map((path) => loadGltf(path).then((gltf) => [path, gltf] as const)))
    .then((loadedEntries) => {
      const loadedByPath = new Map(loadedEntries);
      const sceneSource = loadedByPath.get(modelPaths.battleIdle ?? '') ?? loadedEntries[0]?.[1];

      if (!sceneSource) {
        return null;
      }

      const clips: Partial<Record<EnemyClipSlot, THREE.AnimationClip>> = {};
      slotEntries.forEach(([slot, path]) => {
        clips[slot] = loadedByPath.get(path)?.animations[0] ?? undefined;
      });

      return {
        scene: sceneSource.scene,
        clips,
      };
    })
    .catch((error: unknown) => {
      console.warn(`Act 2 enemy GLB load failed for ${actorId}. Keeping procedural placeholder.`, error);
      return null;
    });
}

function createEnemyActions(
  mixer: THREE.AnimationMixer,
  clips: Partial<Record<EnemyClipSlot, THREE.AnimationClip>>,
): Partial<Record<EnemyClipSlot, THREE.AnimationAction>> {
  const actions: Partial<Record<EnemyClipSlot, THREE.AnimationAction>> = {};

  (['battleIdle', 'battleHit', 'battleDefeat'] as const).forEach((slot) => {
    const clip = clips[slot];
    if (!clip) {
      return;
    }

    actions[slot] = mixer.clipAction(clip);
  });

  return actions;
}

function getEnemyModelPaths(actorId: EnemyVisualActorId): Record<EnemyClipSlot, string | null> {
  return {
    battleIdle: getActTwoAnimationFile(actorId, ENEMY_SLOT_BINDINGS.battleIdle),
    battleHit: getActTwoAnimationFile(actorId, ENEMY_SLOT_BINDINGS.battleHit),
    battleDefeat: getActTwoAnimationFile(actorId, ENEMY_SLOT_BINDINGS.battleDefeat),
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

function normalizeImportedEnemy(root: THREE.Object3D, targetHeight: number): void {
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

function createProceduralEnemyVisual(kind: ProceduralEnemyKind, accentColor: string): EnemyVisual {
  const accent = new THREE.Color(accentColor);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#d7d6e8'),
    emissive: accent.clone().multiplyScalar(0.22),
    flatShading: true,
    roughness: 0.82,
    metalness: 0.08,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 0.38,
    flatShading: true,
    roughness: 0.66,
    metalness: 0.12,
  });

  const group = new THREE.Group();
  let primaryMesh: THREE.Object3D<THREE.Object3DEventMap>;

  if (kind === 'hound') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.7, 0.65), bodyMaterial);
    body.position.set(0, 0.82, 0);
    group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.48), accentMaterial);
    head.position.set(0.82, 1.02, 0);
    group.add(head);

    [-0.38, 0.38].forEach((z) => {
      [-0.32, 0.32].forEach((x) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.18), bodyMaterial);
        leg.position.set(x, 0.36, z);
        group.add(leg);
      });
    });

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.54, 4), accentMaterial);
    tail.rotation.z = -Math.PI / 2;
    tail.position.set(-0.82, 1.02, 0);
    group.add(tail);
    primaryMesh = body;
  } else if (kind === 'wraith') {
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 0), bodyMaterial);
    core.position.y = 1.15;
    group.add(core);

    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.1, 6, 10), accentMaterial);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 1.8;
    group.add(halo);

    const shardLeft = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.74, 4), accentMaterial);
    shardLeft.position.set(-0.58, 0.82, 0);
    shardLeft.rotation.z = 0.5;
    group.add(shardLeft);

    const shardRight = shardLeft.clone();
    shardRight.position.x = 0.58;
    shardRight.rotation.z = -0.5;
    group.add(shardRight);
    primaryMesh = core;
  } else {
    const dumplingBody = new THREE.Mesh(new THREE.SphereGeometry(1.08, 12, 10), bodyMaterial);
    dumplingBody.scale.set(1.18, 0.94, 1.18);
    dumplingBody.position.y = 1.24;
    group.add(dumplingBody);

    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const fold = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.2), accentMaterial);
      fold.position.set(Math.cos(angle) * 0.46, 2.0, Math.sin(angle) * 0.46);
      fold.rotation.y = angle;
      fold.rotation.z = 0.18;
      group.add(fold);
    }

    const knotBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.34, 6), accentMaterial);
    knotBase.position.y = 2.26;
    group.add(knotBase);

    const knotTop = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), accentMaterial);
    knotTop.position.y = 2.55;
    group.add(knotTop);

    primaryMesh = dumplingBody;
  }

  const primaryMeshBaseScale = primaryMesh.scale.clone();
  let cue: EnemyAnimationCue | null = null;
  let cueEndsAt = 0;
  let defeated = false;

  return {
    group,
    setMotion: (time: number, movementBias = 0.18): void => {
      if (cue && time >= cueEndsAt && cue !== 'defeat') {
        cue = null;
      }

      if (defeated) {
        group.position.y = 0.22;
        group.rotation.z = -Math.PI / 2;
        primaryMesh.rotation.y = 0;
        return;
      }

      if (cue === 'hit') {
        group.position.y = Math.sin(time * 52) * 0.04;
        group.rotation.z = Math.sin(time * 42) * 0.08;
        primaryMesh.rotation.y = Math.sin(time * 38) * 0.24;
        return;
      }

      const isKhinkali = kind === 'khinkali';
      const bob = Math.sin(time * (isKhinkali ? 3.2 : 5.4)) * (isKhinkali ? 0.06 : 0.05);
      group.position.y = bob;
      group.rotation.z = Math.sin(time * (isKhinkali ? 1.6 : 2.2)) * movementBias * (isKhinkali ? 0.05 : 0.08);
      primaryMesh.rotation.y = Math.sin(time * (isKhinkali ? 1.4 : 1.9)) * movementBias * (isKhinkali ? 0.08 : 0.18);
      primaryMesh.scale.set(
        primaryMeshBaseScale.x,
        primaryMeshBaseScale.y + Math.sin(time * (isKhinkali ? 3.2 : 2.4)) * (isKhinkali ? 0.02 : 0),
        primaryMeshBaseScale.z,
      );
    },
    playEnemyCue: (nextCue: EnemyAnimationCue): number => {
      cue = nextCue;
      cueEndsAt = performance.now() / 1000 + (nextCue === 'hit' ? FALLBACK_HIT_DURATION_MS : FALLBACK_DEFEAT_DURATION_MS) / 1000;
      if (nextCue === 'defeat') {
        defeated = true;
      }

      return nextCue === 'hit' ? FALLBACK_HIT_DURATION_MS : FALLBACK_DEFEAT_DURATION_MS;
    },
    getEnemyCueDuration: (nextCue: EnemyAnimationCue): number =>
      nextCue === 'hit' ? FALLBACK_HIT_DURATION_MS : FALLBACK_DEFEAT_DURATION_MS,
    dispose: (): void => {
      disposeObjectTree(group);
    },
  };
}
