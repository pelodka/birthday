export interface ActThreeVector3 {
  x: number;
  y: number;
  z: number;
}

export interface ActThreeCorridorSegmentConfig {
  centerX: number;
  centerZ: number;
  length: number;
  rotationY: number;
}

export interface ActThreeRouteCenterPoint {
  z: number;
  x: number;
}

export interface ActThreeCorridorVisualConfig {
  floorWidth: number;
  floorLength: number;
  floorCenterZ: number;
  floorTexturePath: string;
  floorTextureRepeatX: number;
  floorTextureRepeatZ: number;
  laneStripWidth: number;
  wallOffsetX: number;
  wallThickness: number;
  wallHeight: number;
  wallLength: number;
  wallTexturePath: string;
  wallTextureRepeatX: number;
  wallTextureRepeatY: number;
  wallPlacardTexturePath: string;
  ceilingTexturePath: string;
  ceilingTextureRepeatX: number;
  ceilingTextureRepeatZ: number;
  columnCount: number;
  columnInsetX: number;
  columnHeight: number;
  columnWidth: number;
  columnStartZ: number;
  columnSpacing: number;
  segments: readonly ActThreeCorridorSegmentConfig[];
}

export interface ActThreeHeroVisualConfig {
  startPosition: ActThreeVector3;
  startRotationY: number;
  shootoutStartZ: number;
  credentialColor: string;
  credentialEmissive: string;
}

export interface ActThreeCameraVisualConfig {
  fov: number;
  near: number;
  far: number;
  pointerSpeed: number;
  minPitch: number;
  maxPitch: number;
}

export interface ActThreeInteractionConfig {
  takedownX: number;
  takedownDepth: number;
  takedownForwardLockDepth: number;
  checkpointForwardLockDepth: number;
  lootAdvanceDepth: number;
  pickupX: number;
  pickupDepth: number;
  laserLaneTolerance: number;
}

export interface ActThreeMotionConfig {
  laneDamping: number;
  forwardSpeed: number;
  backwardSpeed: number;
  autoAdvanceSpeed: number;
  lootPromptSeconds: number;
}

export interface ActThreeDustConfig {
  count: number;
  spreadX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  pointSize: number;
  opacity: number;
}

export interface ActThreeLaserVisualConfig {
  width: number;
  height: number;
  length: number;
  y: number;
  z: number;
}

export interface ActThreeHandsVisualConfig {
  assetPath: string;
  targetSize: number;
  position: ActThreeVector3;
  rotation: ActThreeVector3;
  bobAmplitudeX: number;
  bobAmplitudeY: number;
  bobSpeed: number;
  credentialGlow: string;
}

export interface ActThreeCrosshairVisualConfig {
  size: number;
  gap: number;
  thickness: number;
  color: string;
  glowColor: string;
}

export interface ActThreeActorModelClips {
  idle?: string;
  hit?: string;
  dead?: string;
  idleAlternates?: readonly string[];
  source?: string;
  ignoredClipNames?: readonly string[];
  clipNames?: {
    idle: string;
    hit: string;
    dead: string;
    idleAlternates?: readonly string[];
  };
}

export interface ActThreeBossAnimationSequence {
  initialIdle: string;
  hitOne: string;
  idleAfterHitOne: string;
  hitTwo: string;
  idleAfterHitTwo: string;
  death: string;
  ignored?: readonly string[];
}

export interface ActThreeGuardVisualDefinition {
  actorId: string;
  label: string;
  kind: 'checkpoint-guard';
  position: ActThreeVector3;
  accent: string;
  suitColor: string;
  emissiveColor: string;
  model: ActThreeActorModelClips;
  targetHeight: number;
  modelRotationY: number;
}

export interface ActThreeDocumentsVisualDefinition {
  actorId: string;
  label: string;
  kind: 'documents-folder';
  accent: string;
  baseColor: string;
  claspColor: string;
}

export interface ActThreeBossVisualDefinition {
  actorId: string;
  label: string;
  kind: 'command-core';
  position: ActThreeVector3;
  accent: string;
  shellColor: string;
  emissiveColor: string;
  model: ActThreeActorModelClips;
  animationSequence?: ActThreeBossAnimationSequence;
  targetHeight: number;
  modelRotationY: number;
  aimRadius: number;
  aimOffset: ActThreeVector3;
}

export interface ActThreeWorldVisualConfig {
  lanePositions: readonly number[];
  routeCenterPoints: readonly ActThreeRouteCenterPoint[];
  fogNear: number;
  fogFar: number;
  corridor: ActThreeCorridorVisualConfig;
  hero: ActThreeHeroVisualConfig;
  camera: ActThreeCameraVisualConfig;
  interactions: ActThreeInteractionConfig;
  motion: ActThreeMotionConfig;
  lasers: ActThreeLaserVisualConfig;
  hands: ActThreeHandsVisualConfig;
  crosshair: ActThreeCrosshairVisualConfig;
  dust: ActThreeDustConfig;
  guards: readonly ActThreeGuardVisualDefinition[];
  documents: ActThreeDocumentsVisualDefinition;
  boss: ActThreeBossVisualDefinition;
}

export const ACT_THREE_LANE_POSITIONS = [-3.2, 0, 3.2] as const;
const DEGREE = Math.PI / 180;

export const ACT_THREE_WORLD_VISUALS: ActThreeWorldVisualConfig = {
  lanePositions: ACT_THREE_LANE_POSITIONS,
  routeCenterPoints: [
    { z: 34, x: 0 },
    { z: -32, x: 0 },
    { z: -32, x: 36 },
    { z: -78, x: 36 },
  ],
  fogNear: 10,
  fogFar: 72,
  corridor: {
    floorWidth: 14,
    floorLength: 90,
    floorCenterZ: -20,
    floorTexturePath: '/textures/act-3/floor-tiles.png',
    floorTextureRepeatX: 2,
    floorTextureRepeatZ: 14,
    laneStripWidth: 0.16,
    wallOffsetX: 7.5,
    wallThickness: 1.2,
    wallHeight: 6,
    wallLength: 90,
    wallTexturePath: '/textures/act-3/wall-panels.png',
    wallTextureRepeatX: 9,
    wallTextureRepeatY: 1,
    wallPlacardTexturePath: '/textures/act-3/wall-panels-placard.png',
    ceilingTexturePath: '/textures/act-3/ceiling-panels.png',
    ceilingTextureRepeatX: 3,
    ceilingTextureRepeatZ: 12,
    columnCount: 8,
    columnInsetX: 5.9,
    columnHeight: 4.8,
    columnWidth: 0.8,
    columnStartZ: -6,
    columnSpacing: 8,
    segments: [
      { centerX: 0, centerZ: -2.5, length: 73, rotationY: 0 },
      { centerX: 18, centerZ: -32, length: 36, rotationY: Math.PI / 2 },
      { centerX: 36, centerZ: -55, length: 46, rotationY: 0 },
    ],
  },
  hero: {
    startPosition: { x: 0, y: 2.2, z: 34 },
    startRotationY: 0,
    shootoutStartZ: -60,
    credentialColor: '#f3eee0',
    credentialEmissive: '#5d4c22',
  },
  camera: {
    fov: 68,
    near: 0.05,
    far: 120,
    pointerSpeed: 0.8,
    minPitch: -44 * DEGREE,
    maxPitch: 52 * DEGREE,
  },
  interactions: {
    takedownX: 1.1,
    takedownDepth: 4.1,
    takedownForwardLockDepth: 7.5,
    checkpointForwardLockDepth: 5.25,
    lootAdvanceDepth: 1.9,
    pickupX: 1.2,
    pickupDepth: 2,
    laserLaneTolerance: 0.55,
  },
  motion: {
    laneDamping: 7,
    forwardSpeed: 7.2,
    backwardSpeed: 4.6,
    autoAdvanceSpeed: 8.5,
    lootPromptSeconds: 1.1,
  },
  lasers: {
    width: 0.28,
    height: 0.08,
    length: 28,
    y: 1.2,
    z: -33,
  },
  hands: {
    assetPath: '/models/act-3/player/fps-hands.glb',
    // Overall hand rig scale.
    targetSize: 2.33,
    // Camera-space placement: +x = right, +y = up, +z = closer to camera.
    position: { x: -0.42, y: -0.74, z: -2.19 },
    // Camera-space rotation in radians: x = tilt up/down, y = turn left/right, z = roll.
    rotation: { x: -0.24, y: Math.PI - 3.332, z: -0.08 },
    // Small motion offsets while the player moves.
    bobAmplitudeX: 0.02,
    bobAmplitudeY: 0.02,
    bobSpeed: 9.6,
    credentialGlow: '#ffcf56',
  },
  crosshair: {
    size: 30,
    gap: 7,
    thickness: 2,
    color: '#e6fcff',
    glowColor: 'rgba(87, 215, 255, 0.72)',
  },
  dust: {
    count: 180,
    spreadX: 24,
    minY: 0.5,
    maxY: 8,
    minZ: -60,
    maxZ: 14,
    pointSize: 0.08,
    opacity: 0.38,
  },
  guards: [
    {
      actorId: 'a1-zertifikat',
      label: 'A1 Zertifikat',
      kind: 'checkpoint-guard',
      position: { x: 0, y: 0, z: 0 },
      accent: '#57d7ff',
      suitColor: '#293742',
      emissiveColor: '#091219',
      model: {
        source: '/models/act-3/enemies/a1-zertifikat/enemy-1.glb',
        clipNames: {
          idle: 'FunnyDancing_03',
          hit: 'Face_Punch_Reaction',
          dead: 'Shot_and_Fall_Backward',
        },
      },
      targetHeight: 3.05,
      modelRotationY: 0,
    },
    {
      actorId: 'einbuergerungstest',
      label: 'Einburgerungstest',
      kind: 'checkpoint-guard',
      position: { x: 24, y: 0, z: -32 },
      accent: '#ffcf56',
      suitColor: '#293742',
      emissiveColor: '#091219',
      model: {
        source: '/models/act-3/enemies/einbuergerungstest/enemy-2.glb',
        clipNames: {
          idle: 'FunnyDancing_02',
          hit: 'Slap_Reaction',
          dead: 'Dead',
        },
      },
      targetHeight: 3.15,
      modelRotationY: -Math.PI / 2,
    },
  ],
  documents: {
    actorId: 'complete-dossier',
    label: 'Folder of Complete Respectability',
    kind: 'documents-folder',
    accent: '#ffcf56',
    baseColor: '#f4f3ea',
    claspColor: '#8c6d2f',
  },
  boss: {
    actorId: 'lea-command-core',
    label: 'LEA',
    kind: 'command-core',
    position: { x: 36, y: 0, z: -68 },
    accent: '#57d7ff',
    shellColor: '#16394b',
    emissiveColor: '#081721',
    model: {
      source: '/models/act-3/boss/lea/lea.glb',
      clipNames: {
        idle: 'Running',
        hit: 'Walking',
        dead: 'Big_Heart_Gesture',
        idleAlternates: ['Knock_Down'],
      },
    },
    animationSequence: {
      initialIdle: 'Running',
      hitOne: 'Walking',
      idleAfterHitOne: 'Knock_Down',
      hitTwo: 'Walking',
      idleAfterHitTwo: 'Knock_Down',
      death: 'Big_Heart_Gesture',
    },
    targetHeight: 3.8,
    modelRotationY: 0,
    aimRadius: 2.8,
    aimOffset: { x: 0, y: 1.9, z: 0 },
  },
};
