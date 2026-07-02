import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import type {
  ActThreeActorModelClips,
  ActThreeBossVisualDefinition,
  ActThreeCorridorVisualConfig,
  ActThreeDocumentsVisualDefinition,
  ActThreeDustConfig,
  ActThreeGuardVisualDefinition,
  ActThreeHandsVisualConfig,
  ActThreeLaserVisualConfig,
} from '../content/actThree';

const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

type ActThreeActorCue = 'idle' | 'hit' | 'dead';

interface ActThreeActorClipState {
  scene: THREE.Object3D;
  mixer: THREE.AnimationMixer | null;
  action: THREE.AnimationAction | null;
  duration: number;
}

type ClipLoadState = ActThreeActorClipState | Promise<ActThreeActorClipState>;

export interface ActThreeImportedActor {
  group: THREE.Group;
  play: (cue: ActThreeActorCue, options?: { idleVariant?: number }) => number;
  playClip: (clipName: string, cue: ActThreeActorCue) => number;
  update: (delta: number) => void;
  warmUp: (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => void;
  getCueDuration: (cue: ActThreeActorCue, options?: { idleVariant?: number }) => number;
  getActiveSlot: () => string;
  getActiveClipName: () => string;
  dispose: () => void;
}

const LOCOMOTION_CLIP_NAME_PATTERN = /(^|[_|\s-])(walk|walking|run|running)($|[_|\s-])/i;

function isLocomotionClipName(name: string): boolean {
  return LOCOMOTION_CLIP_NAME_PATTERN.test(name);
}

function createActThreeFloorMaterial(
  corridor: ActThreeCorridorVisualConfig,
  accentColor: THREE.Color,
): THREE.MeshStandardMaterial {
  const floorTexture = textureLoader.load(corridor.floorTexturePath);
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(corridor.floorTextureRepeatX, corridor.floorTextureRepeatZ);
  floorTexture.colorSpace = THREE.SRGBColorSpace;
  floorTexture.anisotropy = 8;

  return new THREE.MeshStandardMaterial({
    map: floorTexture,
    color: 0xb8c8d0,
    metalness: 0.12,
    roughness: 0.72,
    emissive: accentColor.clone().multiplyScalar(0.035),
    side: THREE.DoubleSide,
  });
}

function createActThreeWallMaterial(
  texturePath: string,
  repeatX: number,
  repeatY: number,
  accentColor: THREE.Color,
): THREE.MeshStandardMaterial {
  const wallTexture = textureLoader.load(texturePath);
  wallTexture.wrapS = THREE.RepeatWrapping;
  wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.repeat.set(repeatX, repeatY);
  wallTexture.colorSpace = THREE.SRGBColorSpace;
  wallTexture.anisotropy = 8;

  return new THREE.MeshStandardMaterial({
    map: wallTexture,
    color: 0xb4c4cc,
    emissive: accentColor.clone().multiplyScalar(0.025),
    metalness: 0.16,
    roughness: 0.76,
  });
}

function createActThreeCeilingMaterial(
  corridor: ActThreeCorridorVisualConfig,
  accentColor: THREE.Color,
): THREE.MeshStandardMaterial {
  const ceilingTexture = textureLoader.load(corridor.ceilingTexturePath);
  ceilingTexture.wrapS = THREE.RepeatWrapping;
  ceilingTexture.wrapT = THREE.RepeatWrapping;
  ceilingTexture.repeat.set(corridor.ceilingTextureRepeatX, corridor.ceilingTextureRepeatZ);
  ceilingTexture.colorSpace = THREE.SRGBColorSpace;
  ceilingTexture.anisotropy = 8;

  return new THREE.MeshStandardMaterial({
    map: ceilingTexture,
    color: 0xc8c2b5,
    emissive: accentColor.clone().multiplyScalar(0.018),
    metalness: 0.08,
    roughness: 0.82,
    side: THREE.DoubleSide,
  });
}

export function createActThreeCorridor(
  corridor: ActThreeCorridorVisualConfig,
  _lanePositions: readonly number[],
  accentColor: THREE.Color,
): THREE.Group {
  const group = new THREE.Group();
  const segmentDefinitions =
    corridor.segments.length > 0
      ? corridor.segments
      : [{ centerX: 0, centerZ: corridor.floorCenterZ, length: corridor.floorLength, rotationY: 0 }];
  const floorMaterial = createActThreeFloorMaterial(corridor, accentColor);
  const ceilingMaterial = createActThreeCeilingMaterial(corridor, accentColor);
  const wallMaterial = createActThreeWallMaterial(
    corridor.wallTexturePath,
    corridor.wallTextureRepeatX,
    corridor.wallTextureRepeatY,
    accentColor,
  );
  const placardWallMaterial = createActThreeWallMaterial(corridor.wallPlacardTexturePath, 1, 1, accentColor);
  let wallPlateIndex = 0;
  const addWallPlate = (
    width: number,
    depth: number,
    x: number,
    z: number,
    material = wallMaterial,
  ): void => {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(width, corridor.wallHeight, depth),
      material,
    );
    wall.position.set(x, corridor.wallHeight / 2, z);
    group.add(wall);
  };
  const addModularWallRun = (
    orientation: 'horizontal' | 'vertical',
    start: number,
    end: number,
    fixed: number,
  ): void => {
    const panelLength = Math.min(corridor.floorWidth, 8);
    const length = Math.abs(end - start);
    const panelCount = Math.max(1, Math.ceil(length / panelLength));
    const actualLength = length / panelCount;
    const direction = end >= start ? 1 : -1;

    for (let index = 0; index < panelCount; index += 1) {
      const center = start + direction * actualLength * (index + 0.5);
      const material = wallPlateIndex % 3 === 1 ? placardWallMaterial : wallMaterial;
      if (orientation === 'vertical') {
        addWallPlate(corridor.wallThickness, actualLength - 0.06, fixed, center, material);
      } else {
        addWallPlate(actualLength - 0.06, corridor.wallThickness, center, fixed, material);
      }
      wallPlateIndex += 1;
    }
  };
  const addFloorCeilingRect = (minX: number, maxX: number, minZ: number, maxZ: number): void => {
    const width = maxX - minX;
    const depth = maxZ - minZ;
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(centerX, 0, centerZ);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(centerX, corridor.wallHeight, centerZ);

    group.add(floor, ceiling);
  };
  const subtractInterval = (
    intervals: Array<[number, number]>,
    cutStart: number,
    cutEnd: number,
  ): Array<[number, number]> => {
    const start = Math.min(cutStart, cutEnd);
    const end = Math.max(cutStart, cutEnd);

    return intervals.flatMap(([intervalStart, intervalEnd]) => {
      if (end <= intervalStart || start >= intervalEnd) {
        return [[intervalStart, intervalEnd] as [number, number]];
      }

      const next: Array<[number, number]> = [];
      if (start > intervalStart) {
        next.push([intervalStart, start]);
      }
      if (end < intervalEnd) {
        next.push([end, intervalEnd]);
      }
      return next;
    });
  };

  const segmentRects = segmentDefinitions.map((segment) => {
    const floorHalfWidth = corridor.floorWidth / 2;
    const rotated = Math.abs(Math.sin(segment.rotationY)) > 0.5;

    return rotated
      ? {
          minX: segment.centerX - segment.length / 2,
          maxX: segment.centerX + segment.length / 2,
          minZ: segment.centerZ - floorHalfWidth,
          maxZ: segment.centerZ + floorHalfWidth,
        }
      : {
          minX: segment.centerX - floorHalfWidth,
          maxX: segment.centerX + floorHalfWidth,
          minZ: segment.centerZ - segment.length / 2,
          maxZ: segment.centerZ + segment.length / 2,
        };
  });

  if (segmentDefinitions.length === 3) {
    addFloorCeilingRect(-7, 7, -39, 34);
    addFloorCeilingRect(7, 29, -39, -25);
    addFloorCeilingRect(29, 36, -32, -25);
    addFloorCeilingRect(29, 43, -78, -32);
  } else {
    segmentDefinitions.forEach((segment) => {
      const segmentGroup = new THREE.Group();
      segmentGroup.position.set(segment.centerX, 0, segment.centerZ);
      segmentGroup.rotation.y = segment.rotationY;

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(corridor.floorWidth, segment.length),
        floorMaterial,
      );
      floor.rotation.x = -Math.PI / 2;
      segmentGroup.add(floor);

      const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(corridor.floorWidth, segment.length),
        ceilingMaterial,
      );
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.y = corridor.wallHeight;
      segmentGroup.add(ceiling);

      group.add(segmentGroup);
    });
  }

  segmentRects.forEach((rect, rectIndex) => {
    let leftIntervals: Array<[number, number]> = [[rect.minZ, rect.maxZ]];
    let rightIntervals: Array<[number, number]> = [[rect.minZ, rect.maxZ]];
    let bottomIntervals: Array<[number, number]> = [[rect.minX, rect.maxX]];
    let topIntervals: Array<[number, number]> = [[rect.minX, rect.maxX]];

    segmentRects.forEach((otherRect, otherIndex) => {
      if (rectIndex === otherIndex) {
        return;
      }

      if (otherRect.minX < rect.minX && otherRect.maxX > rect.minX) {
        leftIntervals = subtractInterval(leftIntervals, otherRect.minZ, otherRect.maxZ);
      }
      if (otherRect.minX < rect.maxX && otherRect.maxX > rect.maxX) {
        rightIntervals = subtractInterval(rightIntervals, otherRect.minZ, otherRect.maxZ);
      }
      if (otherRect.minZ < rect.minZ && otherRect.maxZ > rect.minZ) {
        bottomIntervals = subtractInterval(bottomIntervals, otherRect.minX, otherRect.maxX);
      }
      if (otherRect.minZ < rect.maxZ && otherRect.maxZ > rect.maxZ) {
        topIntervals = subtractInterval(topIntervals, otherRect.minX, otherRect.maxX);
      }
    });

    if (segmentDefinitions.length === 3 && rectIndex === 0) {
      topIntervals = [];
    }

    leftIntervals.forEach(([start, end]) => addModularWallRun('vertical', start, end, rect.minX));
    rightIntervals.forEach(([start, end]) => addModularWallRun('vertical', start, end, rect.maxX));
    bottomIntervals.forEach(([start, end]) => addModularWallRun('horizontal', start, end, rect.minZ));
    topIntervals.forEach(([start, end]) => addModularWallRun('horizontal', start, end, rect.maxZ));
  });

  return group;
}

export function createActThreeGuard(visual: ActThreeGuardVisualDefinition): THREE.Group {
  const group = new THREE.Group();
  group.name = visual.actorId;
  return group;
}

export function createActThreeDocumentsPickup(visual: ActThreeDocumentsVisualDefinition): THREE.Group {
  const group = new THREE.Group();
  group.name = visual.actorId;

  const folderMaterial = new THREE.MeshStandardMaterial({
    color: visual.baseColor,
    emissive: visual.accent,
    emissiveIntensity: 0.55,
    metalness: 0.18,
    roughness: 0.4,
  });
  const claspMaterial = new THREE.MeshStandardMaterial({
    color: visual.claspColor,
    emissive: visual.claspColor,
    emissiveIntensity: 0.25,
    metalness: 0.45,
    roughness: 0.32,
  });

  const folderBase = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.16, 0.88), folderMaterial);
  group.add(folderBase);

  const folderTop = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.1, 0.8), folderMaterial);
  folderTop.position.set(0, 0.14, -0.04);
  folderTop.rotation.x = -0.08;
  group.add(folderTop);

  const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.22), claspMaterial);
  clasp.position.set(0.52, 0.1, 0.18);
  group.add(clasp);

  group.rotation.z = -0.08;
  group.rotation.y = 0.18;
  return group;
}

export function createActThreeBoss(visual: ActThreeBossVisualDefinition): THREE.Group {
  const group = new THREE.Group();
  group.name = visual.actorId;
  return group;
}

function getClipPaths(model: ActThreeActorModelClips): Array<[string, string]> {
  const paths: Array<[string, string]> = [];

  if (model.idle) {
    paths.push(['idle', model.idle]);
  }
  if (model.hit) {
    paths.push(['hit', model.hit]);
  }
  if (model.dead) {
    paths.push(['dead', model.dead]);
  }

  model.idleAlternates?.forEach((path, index) => {
    paths.push([`idle:${index + 1}`, path]);
  });

  return paths;
}

function findRequiredClip(clips: THREE.AnimationClip[], name: string, actorId: string): THREE.AnimationClip {
  const clip = THREE.AnimationClip.findByName(clips, name);
  if (!clip) {
    throw new Error(`Act 3 GLB ${actorId} is missing animation clip "${name}".`);
  }

  return clip;
}

function getStationaryClips(clips: THREE.AnimationClip[]): THREE.AnimationClip[] {
  return clips.filter((clip) => !isLocomotionClipName(clip.name));
}

function normalizeImportedActThreeActor(
  root: THREE.Object3D,
  targetHeight: number,
  rotationY: number,
): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = false;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) {
        return;
      }

      material.transparent = false;
      material.opacity = 1;
      material.alphaTest = 0;
      material.alphaMap = null;
      if (material instanceof THREE.MeshPhysicalMaterial) {
        material.transmission = 0;
        material.thickness = 0;
        material.attenuationDistance = Infinity;
      }
      material.premultipliedAlpha = false;
      material.blending = THREE.NormalBlending;
      material.side = THREE.FrontSide;
      material.depthTest = true;
      material.depthWrite = true;
      material.needsUpdate = true;
    });
  });

  root.rotation.y = rotationY;
  root.updateMatrixWorld(true);

  const initialBox = new THREE.Box3().setFromObject(root);
  const initialSize = initialBox.getSize(new THREE.Vector3());
  const height = Math.max(initialSize.y, 0.001);
  root.scale.setScalar(targetHeight / height);
  root.updateMatrixWorld(true);

  const fittedBox = new THREE.Box3().setFromObject(root);
  const fittedCenter = fittedBox.getCenter(new THREE.Vector3());
  root.position.x -= fittedCenter.x;
  root.position.z -= fittedCenter.z;
  root.position.y -= fittedBox.min.y;
}

function createClipState(
  scene: THREE.Object3D,
  animations: THREE.AnimationClip[],
): ActThreeActorClipState {
  const stationaryAnimations = getStationaryClips(animations);
  const mixer = stationaryAnimations.length > 0 ? new THREE.AnimationMixer(scene) : null;
  const clip = stationaryAnimations[0] ?? null;
  const action = mixer && clip ? mixer.clipAction(clip) : null;

  return {
    scene,
    mixer,
    action,
    duration: clip?.duration ?? 0.75,
  };
}

function isLoadedClipState(state: ClipLoadState | undefined): state is ActThreeActorClipState {
  return Boolean(state) && !(state instanceof Promise);
}

function disposeImportedScene(scene: THREE.Object3D): void {
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });
}

function resetImportedSkeletons(scene: THREE.Object3D): void {
  scene.traverse((child) => {
    if (child instanceof THREE.SkinnedMesh) {
      child.skeleton.pose();
    }
  });
}

function normalizeClipName(name: string): string {
  return name.trim().toLowerCase();
}

async function loadSingleFileActThreeImportedActor(config: {
  actorId: string;
  model: ActThreeActorModelClips;
  targetHeight: number;
  modelRotationY: number;
}): Promise<ActThreeImportedActor> {
  if (!config.model.source || !config.model.clipNames) {
    throw new Error(`Act 3 single-file actor ${config.actorId} needs source and clipNames.`);
  }

  const group = new THREE.Group();
  group.name = `${config.actorId}-imported`;

  const gltf = await gltfLoader.loadAsync(config.model.source);
  normalizeImportedActThreeActor(gltf.scene, config.targetHeight, config.modelRotationY);
  group.add(gltf.scene);
  const requiredClipNames = [
    config.model.clipNames.idle,
    config.model.clipNames.hit,
    config.model.clipNames.dead,
    ...(config.model.clipNames.idleAlternates ?? []),
  ];
  const ignoredClipNames = new Set((config.model.ignoredClipNames ?? []).map(normalizeClipName));
  requiredClipNames.forEach((clipName) => {
    if (ignoredClipNames.has(normalizeClipName(clipName))) {
      throw new Error(`Act 3 actor ${config.actorId} cannot require ignored clip "${clipName}".`);
    }
  });
  const loadedClipNames = new Set(requiredClipNames);
  const ignoredSourceClipNames = gltf.animations
    .filter((clip) => ignoredClipNames.has(normalizeClipName(clip.name)) || (isLocomotionClipName(clip.name) && !loadedClipNames.has(clip.name)))
    .map((clip) => clip.name);
  const playableAnimations = gltf.animations.filter((clip) => !ignoredSourceClipNames.includes(clip.name));
  gltf.animations = playableAnimations;

  const mixer = new THREE.AnimationMixer(gltf.scene);
  const clipsByName = new Map<string, THREE.AnimationClip>();
  requiredClipNames.forEach((clipName) => {
    if (!clipsByName.has(clipName)) {
      clipsByName.set(clipName, findRequiredClip(playableAnimations, clipName, config.actorId));
    }
  });

  const slots = new Map<string, THREE.AnimationClip>();
  slots.set('idle', clipsByName.get(config.model.clipNames.idle)!);
  slots.set('hit', clipsByName.get(config.model.clipNames.hit)!);
  slots.set('dead', clipsByName.get(config.model.clipNames.dead)!);
  config.model.clipNames.idleAlternates?.forEach((clipName, index) => {
    slots.set(`idle:${index + 1}`, clipsByName.get(clipName)!);
  });

  if (config.actorId === 'lea-command-core') {
    console.info('[Act 3 LEA] available clips:', gltf.animations.map((clip) => clip.name).join(', '));
    if (ignoredSourceClipNames.length > 0) {
      console.info('[Act 3 LEA] source clips ignored:', ignoredSourceClipNames.join(', '));
    }
    console.info('[Act 3 LEA] playable clips:', playableAnimations.map((clip) => clip.name).join(', '));
  }

  const actionsByName = new Map<string, THREE.AnimationAction>();
  clipsByName.forEach((clip, clipName) => {
    actionsByName.set(clipName, mixer.clipAction(clip));
  });
  const actions = new Map<string, THREE.AnimationAction>();
  slots.forEach((clip, slot) => {
    actions.set(slot, actionsByName.get(clip.name)!);
  });

  let activeAction: THREE.AnimationAction | null = null;
  let activeSlot = 'idle';
  let disposed = false;

  const getSlot = (cue: ActThreeActorCue, idleVariant = 0): string => {
    if (cue !== 'idle' || idleVariant === 0) {
      return cue;
    }

    const alternateSlot = `idle:${idleVariant}`;
    return slots.has(alternateSlot) ? alternateSlot : 'idle';
  };

  const playResolvedClip = (
    clip: THREE.AnimationClip,
    action: THREE.AnimationAction,
    slot: string,
    cue: ActThreeActorCue,
    applyImmediately = true,
    announce = true,
  ): number => {
    if (disposed) {
      return 0;
    }

    mixer.stopAllAction();
    resetImportedSkeletons(gltf.scene);
    actionsByName.forEach((candidate) => {
      candidate.enabled = false;
      candidate.setEffectiveWeight(0);
    });
    action.reset();
    action.enabled = true;
    action.setEffectiveWeight(1);
    action.clampWhenFinished = cue !== 'idle';
    action.setLoop(cue === 'idle' ? THREE.LoopRepeat : THREE.LoopOnce, cue === 'idle' ? Infinity : 1);
    action.play();
    activeAction = action;
    activeSlot = slot;
    if (announce && config.actorId === 'lea-command-core') {
      console.info(`[Act 3 LEA] ${cue} -> ${slot} -> ${clip.name}`);
    }
    if (applyImmediately) {
      mixer.update(0);
      gltf.scene.updateMatrixWorld(true);
    }
    return clip.duration;
  };

  const playSlot = (slot: string, cue: ActThreeActorCue, applyImmediately = true, announce = true): number => {
    const clip = slots.get(slot) ?? slots.get('idle');
    const action = actions.get(slot) ?? actions.get('idle');
    return clip && action ? playResolvedClip(clip, action, slot, cue, applyImmediately, announce) : 0;
  };

  const play = (cue: ActThreeActorCue, options: { idleVariant?: number } = {}): number =>
    playSlot(getSlot(cue, options.idleVariant ?? 0), cue);

  const playClip = (clipName: string, cue: ActThreeActorCue): number => {
    if (ignoredClipNames.has(normalizeClipName(clipName)) || ignoredSourceClipNames.includes(clipName)) {
      console.warn(`Act 3 actor ${config.actorId} ignored direct request for clip "${clipName}".`);
      return 0;
    }

    const clip = clipsByName.get(clipName);
    const action = actionsByName.get(clipName);
    if (!clip || !action) {
      console.warn(`Act 3 actor ${config.actorId} has no playable clip "${clipName}".`);
      return 0;
    }

    return playResolvedClip(clip, action, clipName, cue);
  };

  const update = (delta: number): void => {
    if (!disposed) {
      mixer.update(delta);
    }
  };

  const warmUp = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void => {
    if (disposed) {
      return;
    }

    const groupVisible = group.visible;
    const restoreSlot = activeSlot;
    actions.forEach((_, slot) => {
      const cue: ActThreeActorCue = slot === 'hit' ? 'hit' : slot === 'dead' ? 'dead' : 'idle';
      playSlot(slot, cue, true, false);
      mixer.update(0.001);
      gltf.scene.updateMatrixWorld(true);
    });
    const restoreCue: ActThreeActorCue = restoreSlot === 'hit' ? 'hit' : restoreSlot === 'dead' ? 'dead' : 'idle';
    playSlot(restoreSlot, restoreCue);
    group.visible = true;
    renderer.compile(scene, camera);
    renderer.render(scene, camera);
    group.visible = groupVisible;
  };

  const getCueDuration = (cue: ActThreeActorCue, options: { idleVariant?: number } = {}): number => {
    const slot = getSlot(cue, options.idleVariant ?? 0);
    return (slots.get(slot) ?? slots.get('idle'))?.duration ?? 0.85;
  };

  const getActiveSlot = (): string => activeSlot;
  const getActiveClipName = (): string => (slots.get(activeSlot) ?? slots.get('idle'))?.name ?? '';

  const dispose = (): void => {
    disposed = true;
    activeAction?.stop();
    mixer.stopAllAction();
    disposeImportedScene(gltf.scene);
    group.clear();
    group.removeFromParent();
  };

  play('idle');

  return {
    group,
    play,
    playClip,
    update,
    warmUp,
    getCueDuration,
    getActiveSlot,
    getActiveClipName,
    dispose,
  };
}

async function loadActThreeImportedActor(config: {
  actorId: string;
  model: ActThreeActorModelClips;
  targetHeight: number;
  modelRotationY: number;
}): Promise<ActThreeImportedActor> {
  if (config.model.source) {
    return loadSingleFileActThreeImportedActor(config);
  }

  const group = new THREE.Group();
  group.name = `${config.actorId}-imported`;

  const entries = getClipPaths(config.model);
  const paths = new Map(entries);
  const states = new Map<string, ClipLoadState>();

  let activeSlot = '';
  let disposed = false;

  const getSlot = (cue: ActThreeActorCue, idleVariant = 0): string => {
    if (cue !== 'idle' || idleVariant === 0) {
      return cue;
    }

    const alternateSlot = `idle:${idleVariant}`;
    return paths.has(alternateSlot) ? alternateSlot : 'idle';
  };

  const loadSlot = async (slot: string): Promise<ActThreeActorClipState> => {
    const existing = states.get(slot);
    if (isLoadedClipState(existing)) {
      return existing;
    }
    if (existing) {
      return existing;
    }

    const path = paths.get(slot) ?? paths.get('idle');
    if (!path) {
      throw new Error(`No Act 3 GLB path for ${config.actorId}:${slot}`);
    }

    const loading = gltfLoader.loadAsync(path).then((gltf) => {
      normalizeImportedActThreeActor(gltf.scene, config.targetHeight, config.modelRotationY);
      gltf.scene.visible = false;
      const state = createClipState(gltf.scene, gltf.animations);
      if (disposed) {
        disposeImportedScene(state.scene);
        return state;
      }
      states.set(slot, state);
      group.add(state.scene);
      return state;
    });
    states.set(slot, loading);
    return loading;
  };

  const showState = (slot: string, state: ActThreeActorClipState, cue: ActThreeActorCue): void => {
    if (disposed || activeSlot !== slot) {
      return;
    }

    states.forEach((candidate) => {
      if (!isLoadedClipState(candidate)) {
        return;
      }

      candidate.scene.visible = false;
      candidate.action?.stop();
    });
    state.scene.visible = true;

    if (state.action) {
      state.action.reset();
      state.action.enabled = true;
      state.action.clampWhenFinished = cue !== 'idle';
      state.action.setLoop(cue === 'idle' ? THREE.LoopRepeat : THREE.LoopOnce, cue === 'idle' ? Infinity : 1);
      state.action.play();
    }
  };

  const play = (cue: ActThreeActorCue, options: { idleVariant?: number } = {}): number => {
    if (disposed) {
      return 0;
    }

    const slot = getSlot(cue, options.idleVariant ?? 0);
    activeSlot = slot;

    const state = states.get(slot);
    if (isLoadedClipState(state)) {
      showState(slot, state, cue);
      return state.duration;
    }

    void loadSlot(slot)
      .then((loadedState) => showState(slot, loadedState, cue))
      .catch((error) => {
        console.warn(`Act 3 GLB clip failed to load for ${config.actorId}:${slot}.`, error);
      });

    return getCueDuration(cue, options);
  };

  const playClip = (_clipName: string, cue: ActThreeActorCue): number => play(cue);

  const update = (delta: number): void => {
    if (disposed) {
      return;
    }

    const state = states.get(activeSlot);
    if (isLoadedClipState(state)) {
      state.mixer?.update(delta);
    }
  };

  const warmUp = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void => {
    if (disposed) {
      return;
    }

    const groupVisible = group.visible;
    const visibleBySlot = new Map<string, boolean>();
    states.forEach((state, slot) => {
      if (isLoadedClipState(state)) {
        visibleBySlot.set(slot, state.scene.visible);
        state.scene.visible = true;
      }
    });

    group.visible = true;
    renderer.compile(scene, camera);
    renderer.render(scene, camera);

    states.forEach((state, slot) => {
      if (isLoadedClipState(state)) {
        state.scene.visible = visibleBySlot.get(slot) ?? false;
      }
    });
    group.visible = groupVisible;
  };

  const getCueDuration = (cue: ActThreeActorCue, options: { idleVariant?: number } = {}): number => {
    const slot = getSlot(cue, options.idleVariant ?? 0);
    const state = states.get(slot);
    if (isLoadedClipState(state)) {
      return state.duration;
    }
    if (slot !== 'idle') {
      return 0.85;
    }

    const idle = states.get('idle');
    return isLoadedClipState(idle) ? idle.duration : 0.85;
  };

  const getActiveSlot = (): string => activeSlot;
  const getActiveClipName = (): string => {
    const state = states.get(activeSlot);
    if (isLoadedClipState(state)) {
      return state.action?.getClip().name ?? '';
    }

    return '';
  };

  const dispose = (): void => {
    disposed = true;
    states.forEach((state) => {
      if (!isLoadedClipState(state)) {
        return;
      }

      state.action?.stop();
      state.mixer?.stopAllAction();
      disposeImportedScene(state.scene);
    });
    states.clear();
    group.clear();
    group.removeFromParent();
  };

  await loadSlot('idle');
  await Promise.allSettled([loadSlot('hit'), loadSlot('dead')]);
  play('idle');

  return {
    group,
    play,
    playClip,
    update,
    warmUp,
    getCueDuration,
    getActiveSlot,
    getActiveClipName,
    dispose,
  };
}

export function loadActThreeGuard(visual: ActThreeGuardVisualDefinition): Promise<ActThreeImportedActor> {
  return loadActThreeImportedActor(visual);
}

export function loadActThreeBoss(visual: ActThreeBossVisualDefinition): Promise<ActThreeImportedActor> {
  return loadActThreeImportedActor(visual);
}

export function createActThreeLasers(
  lanePositions: readonly number[],
  lasers: ActThreeLaserVisualConfig,
): THREE.Mesh[] {
  return lanePositions.map((lane) => {
    const laser = new THREE.Mesh(
      new THREE.BoxGeometry(lasers.width, lasers.height, lasers.length),
      new THREE.MeshBasicMaterial({
        color: 0xff5577,
        transparent: true,
        opacity: 0,
      }),
    );
    laser.position.set(lane, lasers.y, lasers.z);
    laser.visible = false;
    return laser;
  });
}

export function createActThreeDust(accentColor: THREE.Color, dust: ActThreeDustConfig): THREE.Points {
  const positions = new Float32Array(dust.count * 3);
  for (let index = 0; index < dust.count; index += 1) {
    positions[index * 3] = THREE.MathUtils.randFloatSpread(dust.spreadX);
    positions[index * 3 + 1] = THREE.MathUtils.randFloat(dust.minY, dust.maxY);
    positions[index * 3 + 2] = THREE.MathUtils.randFloat(dust.minZ, dust.maxZ);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: accentColor,
    size: dust.pointSize,
    transparent: true,
    opacity: dust.opacity,
  });

  return new THREE.Points(geometry, material);
}

export function createActThreeFirstPersonHandsFallback(visual: ActThreeHandsVisualConfig): THREE.Group {
  const wrapper = new THREE.Group();
  wrapper.name = 'act-three-fps-hands';
  wrapper.position.set(visual.position.x, visual.position.y, visual.position.z);
  wrapper.rotation.set(visual.rotation.x, visual.rotation.y, visual.rotation.z);

  const root = new THREE.Group();
  const sleeveMaterial = new THREE.MeshStandardMaterial({
    color: 0x1d2833,
    emissive: 0x08151c,
    roughness: 0.42,
    metalness: 0.12,
  });
  const gloveMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2e8d7,
    emissive: 0x2d2416,
    emissiveIntensity: 0.18,
    roughness: 0.58,
    metalness: 0.06,
  });

  const leftForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.56, 6, 10), sleeveMaterial);
  leftForearm.position.set(-0.28, -0.04, -0.16);
  leftForearm.rotation.set(0.3, -0.22, 0.66);
  root.add(leftForearm);

  const rightForearm = leftForearm.clone();
  rightForearm.position.x = 0.28;
  rightForearm.rotation.y = 0.22;
  rightForearm.rotation.z = -0.66;
  root.add(rightForearm);

  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.42), gloveMaterial);
  leftHand.position.set(-0.18, -0.06, -0.64);
  leftHand.rotation.set(0.1, -0.1, 0.14);
  root.add(leftHand);

  const rightHand = leftHand.clone();
  rightHand.position.x = 0.18;
  rightHand.rotation.y = 0.1;
  rightHand.rotation.z = -0.14;
  root.add(rightHand);

  root.scale.setScalar(1.9);
  wrapper.add(root);
  return wrapper;
}

function finalizeActThreeFirstPersonHands(
  importedScene: THREE.Object3D,
  visual: ActThreeHandsVisualConfig,
): THREE.Group {
  const wrapper = new THREE.Group();
  wrapper.name = 'act-three-fps-hands';
  wrapper.position.set(visual.position.x, visual.position.y, visual.position.z);
  wrapper.rotation.set(visual.rotation.x, visual.rotation.y, visual.rotation.z);

  importedScene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }
    child.castShadow = false;
    child.receiveShadow = false;
    child.frustumCulled = false;
    child.renderOrder = 20;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) {
        return;
      }

      material.transparent = false;
      material.opacity = 1;
      material.alphaTest = 0;
      material.alphaMap = null;
      if (material instanceof THREE.MeshPhysicalMaterial) {
        material.transmission = 0;
        material.thickness = 0;
        material.attenuationDistance = Infinity;
      }
      material.premultipliedAlpha = false;
      material.blending = THREE.NormalBlending;
      material.side = THREE.FrontSide;
      material.depthTest = true;
      material.depthWrite = true;
      material.needsUpdate = true;
    });
  });

  wrapper.add(importedScene);
  wrapper.renderOrder = 20;
  importedScene.updateMatrixWorld(true);

  const initialBox = new THREE.Box3().setFromObject(importedScene);
  const initialSize = initialBox.getSize(new THREE.Vector3());
  const dominantDimension = Math.max(initialSize.x, initialSize.y, initialSize.z, 0.001);
  importedScene.scale.setScalar(visual.targetSize / dominantDimension);
  importedScene.updateMatrixWorld(true);

  const fittedBox = new THREE.Box3().setFromObject(importedScene);
  const fittedCenter = fittedBox.getCenter(new THREE.Vector3());
  const fittedSize = fittedBox.getSize(new THREE.Vector3());
  importedScene.position.sub(fittedCenter);
  importedScene.position.y -= fittedSize.y * 0.26;
  importedScene.position.z -= fittedSize.z * 0.18;
  importedScene.position.x += fittedSize.x * 0.14;

  return wrapper;
}

export async function loadActThreeFirstPersonHands(
  visual: ActThreeHandsVisualConfig,
): Promise<THREE.Group> {
  try {
    const gltf = await gltfLoader.loadAsync(visual.assetPath);
    return finalizeActThreeFirstPersonHands(gltf.scene, visual);
  } catch (error) {
    console.warn('Act 3 first-person hands GLB failed to load, using fallback hands.', error);
    return createActThreeFirstPersonHandsFallback(visual);
  }
}

export function setActThreeFirstPersonHandsCredentialState(
  hands: THREE.Object3D,
  visual: ActThreeHandsVisualConfig,
  enabled: boolean,
): void {
  hands.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) {
        return;
      }

      material.emissive.set(enabled ? visual.credentialGlow : '#040404');
      material.emissiveIntensity = enabled ? 0.22 : 0.06;
    });
  });
}
