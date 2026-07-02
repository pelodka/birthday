import type { ActorPoseAsset, ActorVisualDefinition, SpriteSheetFrame, SpriteSheetSpec } from '../../types';

export type ActOnePlayerPose = 'standing' | 'running' | 'battle';
export type ActOneEnemyPose = 'idle' | 'battle' | 'killed';
export type ActOneActorId = 'boss-prime' | 'arina-trofimova' | 'slide-cultist' | 'meeting-minotaur';
export type ActOneEncounterActorId = Exclude<ActOneActorId, 'boss-prime'>;

export interface ActOneActorVisualDefinition extends ActorVisualDefinition {
  cssKey: 'player' | 'arina' | 'cult' | 'boss';
}

export const ACT_ONE_ARTIFACT_IMAGE = '/sprites/act-1/act01-artifact-v002.png';
export const ACT_ONE_BACKGROUND_CYCLE_COUNT = 6;
export const ACT_ONE_ENCOUNTER_CYCLE_INDICES = [1, 3, 5] as const;
export const ACT_ONE_RUN_SPEED_STEPS_PER_SECOND = 5.25;

const ACT_ONE_LAYOUT_SCALE = 2;
const ACT_ONE_PODGORNY_NORMAL_DISPLAY_HEIGHT = 234;
const ACT_ONE_PODGORNY_BATTLE_DISPLAY_HEIGHT = 360;

function createUniformSpriteSheetFrames(
  columns: number,
  frameWidth: number,
  frameHeight: number,
  frameCount: number,
): SpriteSheetFrame[] {
  return Array.from({ length: frameCount }, (_, index) => ({
    x: (index % columns) * frameWidth,
    y: Math.floor(index / columns) * frameHeight,
  }));
}

function createSpriteSheetPoseAsset(
  spec: Omit<SpriteSheetSpec, 'frames'> & {
    columns: number;
  },
): ActorPoseAsset {
  return {
    kind: 'sprite-sheet',
    sheet: {
      image: spec.image,
      sheetWidth: spec.sheetWidth,
      sheetHeight: spec.sheetHeight,
      frameWidth: spec.frameWidth,
      frameHeight: spec.frameHeight,
      frameCount: spec.frameCount,
      cropX: spec.cropX,
      cropY: spec.cropY,
      cropWidth: spec.cropWidth,
      cropHeight: spec.cropHeight,
      displayHeight: spec.displayHeight,
      frameDurationMs: spec.frameDurationMs,
      frames: createUniformSpriteSheetFrames(spec.columns, spec.frameWidth, spec.frameHeight, spec.frameCount),
    },
  };
}

function createStaticImagePoseAsset(image: string): ActorPoseAsset {
  return {
    kind: 'static-image',
    image,
  };
}

export const ACT_ONE_ACTOR_VISUALS: Record<ActOneActorId, ActOneActorVisualDefinition> = {
  'boss-prime': {
    actorId: 'boss-prime',
    label: 'Александр',
    cssKey: 'player',
    defaultFacing: 'right',
    worldLayoutHeight: 188 * ACT_ONE_LAYOUT_SCALE,
    battleLayoutHeight: 198 * ACT_ONE_LAYOUT_SCALE,
    poses: {
      standing: createSpriteSheetPoseAsset({
        image: '/sprites/act-1/player/alexander-idle.png',
        sheetWidth: 3584,
        sheetHeight: 3584,
        frameWidth: 512,
        frameHeight: 512,
        frameCount: 49,
        cropX: 192,
        cropY: 73,
        cropWidth: 133,
        cropHeight: 364,
        displayHeight: 188,
        frameDurationMs: 140,
        columns: 7,
      }),
      running: createSpriteSheetPoseAsset({
        image: '/sprites/act-1/player/alexander-run.png',
        sheetWidth: 3584,
        sheetHeight: 3584,
        frameWidth: 512,
        frameHeight: 512,
        frameCount: 49,
        cropX: 101,
        cropY: 89,
        cropWidth: 279,
        cropHeight: 352,
        displayHeight: 176,
        frameDurationMs: 96,
        columns: 7,
      }),
      battle: createSpriteSheetPoseAsset({
        image: '/sprites/act-1/player/alexander-battle-act1.png',
        sheetWidth: 3584,
        sheetHeight: 3584,
        frameWidth: 512,
        frameHeight: 512,
        frameCount: 49,
        cropX: 161,
        cropY: 80,
        cropWidth: 224,
        cropHeight: 362,
        displayHeight: 198,
        frameDurationMs: 110,
        columns: 7,
      }),
    },
  },
  'arina-trofimova': {
    actorId: 'arina-trofimova',
    label: 'Арина Трофимова',
    cssKey: 'arina',
    defaultFacing: 'left',
    worldLayoutHeight: 188 * ACT_ONE_LAYOUT_SCALE,
    battleLayoutHeight: 212 * ACT_ONE_LAYOUT_SCALE,
    poses: {
      idle: createSpriteSheetPoseAsset({
        image: '/sprites/act-1/enemies/act1-enemy-arina-trofimova-idle-sheet-v001.png',
        sheetWidth: 1280,
        sheetHeight: 1280,
        frameWidth: 256,
        frameHeight: 256,
        frameCount: 25,
        cropX: 105,
        cropY: 42,
        cropWidth: 49,
        cropHeight: 182,
        displayHeight: 188,
        frameDurationMs: 160,
        columns: 5,
      }),
      battle: createSpriteSheetPoseAsset({
        image: '/sprites/act-1/enemies/act1-enemy-arina-trofimova-battle-sheet-v001.png',
        sheetWidth: 1280,
        sheetHeight: 1280,
        frameWidth: 256,
        frameHeight: 256,
        frameCount: 25,
        cropX: 65,
        cropY: 24,
        cropWidth: 117,
        cropHeight: 205,
        displayHeight: 212,
        frameDurationMs: 120,
        columns: 5,
      }),
      killed: createStaticImagePoseAsset('/sprites/act-1/enemies/act1-enemy-arina-trofimova-killed-v001.png'),
    },
  },
  'slide-cultist': {
    actorId: 'slide-cultist',
    label: 'Аня Тихомирова',
    cssKey: 'cult',
    defaultFacing: 'left',
    worldLayoutHeight: 196 * ACT_ONE_LAYOUT_SCALE,
    battleLayoutHeight: 250 * ACT_ONE_LAYOUT_SCALE,
    poses: {
      idle: createSpriteSheetPoseAsset({
        image: '/sprites/act-1/enemies/act1-enemy-anya-tikhomirova-idle-sheet-v001.png',
        sheetWidth: 1280,
        sheetHeight: 1280,
        frameWidth: 256,
        frameHeight: 256,
        frameCount: 25,
        cropX: 104,
        cropY: 40,
        cropWidth: 42,
        cropHeight: 179,
        displayHeight: 196,
        frameDurationMs: 160,
        columns: 5,
      }),
      battle: createSpriteSheetPoseAsset({
        image: '/sprites/act-1/enemies/act1-enemy-anya-tikhomirova-battle-sheet-v001.png',
        sheetWidth: 1280,
        sheetHeight: 1280,
        frameWidth: 256,
        frameHeight: 256,
        frameCount: 25,
        cropX: 81,
        cropY: 0,
        cropWidth: 125,
        cropHeight: 235,
        displayHeight: 250,
        frameDurationMs: 120,
        columns: 5,
      }),
      killed: createStaticImagePoseAsset('/sprites/act-1/enemies/act1-enemy-anya-tikhomirova-killed-v001.png'),
    },
  },
  'meeting-minotaur': {
    actorId: 'meeting-minotaur',
    label: 'Подгорный',
    cssKey: 'boss',
    defaultFacing: 'right',
    worldLayoutHeight: ACT_ONE_PODGORNY_NORMAL_DISPLAY_HEIGHT * ACT_ONE_LAYOUT_SCALE,
    battleLayoutHeight: ACT_ONE_PODGORNY_BATTLE_DISPLAY_HEIGHT * ACT_ONE_LAYOUT_SCALE,
    poses: {
      idle: createSpriteSheetPoseAsset({
        image: '/sprites/act-1/enemies/act1-boss-coronavirus-idle-sheet-v001.png',
        sheetWidth: 3584,
        sheetHeight: 3584,
        frameWidth: 512,
        frameHeight: 512,
        frameCount: 49,
        cropX: 176,
        cropY: 58,
        cropWidth: 160,
        cropHeight: 400,
        displayHeight: ACT_ONE_PODGORNY_NORMAL_DISPLAY_HEIGHT,
        frameDurationMs: 170,
        columns: 7,
      }),
      battle: createSpriteSheetPoseAsset({
        image: '/sprites/act-1/enemies/act1-boss-coronavirus-battle-sheet-v001.png',
        sheetWidth: 3584,
        sheetHeight: 3584,
        frameWidth: 512,
        frameHeight: 512,
        frameCount: 49,
        cropX: 120,
        cropY: 56,
        cropWidth: 304,
        cropHeight: 400,
        displayHeight: ACT_ONE_PODGORNY_BATTLE_DISPLAY_HEIGHT,
        frameDurationMs: 120,
        columns: 7,
      }),
      killed: createStaticImagePoseAsset('/sprites/act-1/enemies/act1-boss-podgorny-defeated-v001.png'),
    },
  },
} as const;

export function getActOneActorVisual(actorId: ActOneActorId): ActOneActorVisualDefinition {
  return ACT_ONE_ACTOR_VISUALS[actorId];
}

export function getActOneActorPoseAsset(actorId: ActOneActorId, pose: string): ActorPoseAsset | undefined {
  return getActOneActorVisual(actorId).poses[pose];
}

export function getActOneSpriteSheetSpec(actorId: ActOneActorId, pose: string): SpriteSheetSpec | null {
  const asset = getActOneActorPoseAsset(actorId, pose);
  return asset?.kind === 'sprite-sheet' ? asset.sheet : null;
}
