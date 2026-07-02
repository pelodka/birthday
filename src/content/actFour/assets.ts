import type { SpriteSheetFrame, SpriteSheetSpec } from '../../types';
import type { ActOneCardDefinition } from '../actOne';

export type ActFourSupportAnimationId =
  | 'valera-summon'
  | 'valera-idle'
  | 'valera-transform'
  | 'valera-transform-conjure'
  | 'valera-transform-support';
export type ActFourBossAnimationId = 'jubilee-wag';
export type ActFourShowdownAnimationId = 'boss-prime-anime' | 'jubilee-anime';
export type ActFourPlayerTransformAnimationId = 'boss-prime-transform';

export interface ActFourSupportSpriteDefinition {
  id: ActFourSupportAnimationId;
  image: string;
  sheetWidth: number;
  sheetHeight: number;
  columns: number;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  displaySize: number;
  frameDurationMs: number;
}

export interface ActFourBossSpriteDefinition {
  id: ActFourBossAnimationId;
  image: string;
  sheetWidth: number;
  sheetHeight: number;
  columns: number;
  frameWidth: number;
  frameHeight: number;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  footBaselineY?: number;
  footRevealX?: number;
  flipX?: boolean;
  frameCount: number;
  displaySize: number;
  frameDurationMs: number;
}

export interface ActFourShowdownSpriteDefinition {
  id: ActFourShowdownAnimationId;
  image: string;
  sheetWidth: number;
  sheetHeight: number;
  columns: number;
  frameWidth: number;
  frameHeight: number;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  frameCount: number;
  displayHeight: number;
  frameDurationMs: number;
  flipX?: boolean;
}

export interface ActFourPlayerTransformSpriteDefinition {
  id: ActFourPlayerTransformAnimationId;
  image: string;
  sheetWidth: number;
  sheetHeight: number;
  columns: number;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  displaySize: number;
  frameDurationMs: number;
}

export interface ActFourSupportCharacterDefinition {
  id: 'valera';
  name: string;
  sprites: Record<ActFourSupportAnimationId, ActFourSupportSpriteDefinition>;
}

export interface ActFourBossDefinition {
  id: 'titan-fifty';
  name: string;
  subtitle: string;
  placeholderLabel: string;
  sprite: ActFourBossSpriteDefinition;
}

export interface ActFourShowdownDefinition {
  durationMs: number;
  fadeMs: number;
  player: ActFourShowdownSpriteDefinition;
  boss: ActFourShowdownSpriteDefinition;
}

export type ActFourPlayerTransformDefinition = ActFourPlayerTransformSpriteDefinition;

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

export function toActFourSupportSpriteSheetSpec(sprite: ActFourSupportSpriteDefinition): SpriteSheetSpec {
  return {
    image: sprite.image,
    sheetWidth: sprite.sheetWidth,
    sheetHeight: sprite.sheetHeight,
    frameWidth: sprite.frameWidth,
    frameHeight: sprite.frameHeight,
    frameCount: sprite.frameCount,
    cropX: 0,
    cropY: 0,
    cropWidth: sprite.frameWidth,
    cropHeight: sprite.frameHeight,
    displayHeight: sprite.displaySize,
    frameDurationMs: sprite.frameDurationMs,
    frames: createUniformSpriteSheetFrames(sprite.columns, sprite.frameWidth, sprite.frameHeight, sprite.frameCount),
  };
}

export function toActFourBossSpriteSheetSpec(sprite: ActFourBossSpriteDefinition): SpriteSheetSpec {
  return {
    image: sprite.image,
    sheetWidth: sprite.sheetWidth,
    sheetHeight: sprite.sheetHeight,
    frameWidth: sprite.frameWidth,
    frameHeight: sprite.frameHeight,
    frameCount: sprite.frameCount,
    cropX: sprite.cropX ?? 0,
    cropY: sprite.cropY ?? 0,
    cropWidth: sprite.cropWidth ?? sprite.frameWidth,
    cropHeight: sprite.cropHeight ?? sprite.frameHeight,
    displayHeight: sprite.displaySize,
    frameDurationMs: sprite.frameDurationMs,
    frames: createUniformSpriteSheetFrames(sprite.columns, sprite.frameWidth, sprite.frameHeight, sprite.frameCount),
  };
}

export function toActFourShowdownSpriteSheetSpec(sprite: ActFourShowdownSpriteDefinition): SpriteSheetSpec {
  return {
    image: sprite.image,
    sheetWidth: sprite.sheetWidth,
    sheetHeight: sprite.sheetHeight,
    frameWidth: sprite.frameWidth,
    frameHeight: sprite.frameHeight,
    frameCount: sprite.frameCount,
    cropX: sprite.cropX ?? 0,
    cropY: sprite.cropY ?? 0,
    cropWidth: sprite.cropWidth ?? sprite.frameWidth,
    cropHeight: sprite.cropHeight ?? sprite.frameHeight,
    displayHeight: sprite.displayHeight,
    frameDurationMs: sprite.frameDurationMs,
    frames: createUniformSpriteSheetFrames(sprite.columns, sprite.frameWidth, sprite.frameHeight, sprite.frameCount),
  };
}

export function toActFourPlayerTransformSpriteSheetSpec(sprite: ActFourPlayerTransformSpriteDefinition): SpriteSheetSpec {
  return {
    image: sprite.image,
    sheetWidth: sprite.sheetWidth,
    sheetHeight: sprite.sheetHeight,
    frameWidth: sprite.frameWidth,
    frameHeight: sprite.frameHeight,
    frameCount: sprite.frameCount,
    cropX: 0,
    cropY: 0,
    cropWidth: sprite.frameWidth,
    cropHeight: sprite.frameHeight,
    displayHeight: sprite.displaySize,
    frameDurationMs: sprite.frameDurationMs,
    frames: createUniformSpriteSheetFrames(sprite.columns, sprite.frameWidth, sprite.frameHeight, sprite.frameCount),
  };
}

export const ACT_FOUR_SUPPORT_CHARACTERS = {
  valera: {
    id: 'valera',
    name: 'Валера',
    sprites: {
      'valera-summon': {
        id: 'valera-summon',
        image: '/sprites/act-4/support/valera-transform-1-sheet.png',
        sheetWidth: 4096,
        sheetHeight: 4096,
        columns: 8,
        frameWidth: 512,
        frameHeight: 512,
        frameCount: 64,
        displaySize: 300,
        frameDurationMs: 72,
      },
      'valera-idle': {
        id: 'valera-idle',
        image: '/sprites/act-4/support/valera-idle-sheet.png',
        sheetWidth: 1280,
        sheetHeight: 1280,
        columns: 5,
        frameWidth: 256,
        frameHeight: 256,
        frameCount: 25,
        displaySize: 250,
        frameDurationMs: 130,
      },
      'valera-transform': {
        id: 'valera-transform',
        image: '/sprites/act-4/support/valera-transform-2-sheet.png',
        sheetWidth: 3584,
        sheetHeight: 3584,
        columns: 7,
        frameWidth: 512,
        frameHeight: 512,
        frameCount: 49,
        displaySize: 300,
        frameDurationMs: 82,
      },
      'valera-transform-conjure': {
        id: 'valera-transform-conjure',
        image: '/sprites/act-4/support/valera-transform-conjure.png',
        sheetWidth: 3584,
        sheetHeight: 3584,
        columns: 7,
        frameWidth: 512,
        frameHeight: 512,
        frameCount: 49,
        displaySize: 300,
        frameDurationMs: 82,
      },
      'valera-transform-support': {
        id: 'valera-transform-support',
        image: '/sprites/act-4/support/valera-transform-support.png',
        sheetWidth: 3584,
        sheetHeight: 3584,
        columns: 7,
        frameWidth: 512,
        frameHeight: 512,
        frameCount: 49,
        displaySize: 300,
        frameDurationMs: 92,
      },
    },
  },
} as const satisfies Record<'valera', ActFourSupportCharacterDefinition>;

export const ACT_FOUR_SUPPORT_CARD: ActOneCardDefinition = {
  id: 'summon-valera',
  name: 'Вызов Валеры',
  cost: 0,
  description: 'Вызывает Валеру. Он знает, где у финала кнопка, и делает вид, что это всегда было в документации.',
  type: 'special',
  persistent: true,
  singleUse: true,
};

export const ACT_FOUR_CARD_ART = {
  'ordinary-strike-zero': { image: '/sprites/act-4/cards/act4-card-ordinary-strike-zero-front-v001.png' },
  'desperate-combo-zero': { image: '/sprites/act-4/cards/act4-card-desperate-combo-zero-front-v001.png' },
  'summon-valera': { image: '/sprites/act-4/cards/act4-card-summon-valera-front-v001.png' },
} as const satisfies Record<string, { image: string }>;

export const ACT_FOUR_BOSS: ActFourBossDefinition = {
  id: 'titan-fifty',
  name: 'Титан Пятидесятилетия',
  subtitle: 'Финальная инстанция юбилея',
  placeholderLabel: '50',
  sprite: {
    id: 'jubilee-wag',
    image: '/sprites/act-4/boss/jubilee-wag.png',
    sheetWidth: 3584,
    sheetHeight: 3584,
    columns: 7,
    frameWidth: 512,
    frameHeight: 512,
    cropX: 0,
    cropY: 0,
    cropWidth: 512,
    cropHeight: 512,
    footBaselineY: 432,
    footRevealX: 116,
    flipX: false,
    frameCount: 49,
    displaySize: 1500,
    frameDurationMs: 88,
  },
};

export const ACT_FOUR_SHOWDOWN: ActFourShowdownDefinition = {
  durationMs: 10000,
  fadeMs: 1300,
  player: {
    id: 'boss-prime-anime',
    image: '/sprites/act-4/player/alexander-anime-showdown.png',
    sheetWidth: 3584,
    sheetHeight: 3584,
    columns: 7,
    frameWidth: 512,
    frameHeight: 512,
    cropX: 132,
    cropY: 73,
    cropWidth: 300,
    cropHeight: 260,
    frameCount: 49,
    displayHeight: 1000,
    frameDurationMs: 78,
  },
  boss: {
    id: 'jubilee-anime',
    image: '/sprites/act-4/jubilee-anime.png',
    sheetWidth: 3584,
    sheetHeight: 3584,
    columns: 7,
    frameWidth: 512,
    frameHeight: 512,
    cropX: 50,
    cropY: 64,
    cropWidth: 450,
    cropHeight: 280,
    frameCount: 49,
    displayHeight: 1000,
    frameDurationMs: 92,
    flipX: false,
  },
};

export const ACT_FOUR_PLAYER_TRANSFORM: ActFourPlayerTransformDefinition = {
  id: 'boss-prime-transform',
  image: '/sprites/act-4/player/alexander-artifact-consume.png',
  sheetWidth: 1280,
  sheetHeight: 1280,
  columns: 5,
  frameWidth: 256,
  frameHeight: 256,
  frameCount: 25,
  displaySize: 260,
  frameDurationMs: 72,
};

export const ACT_FOUR_PLAYER_BATTLE_STANCE: SpriteSheetSpec = {
  image: '/sprites/act-4/player/alexander-battle-act4.png',
  sheetWidth: 1280,
  sheetHeight: 1280,
  frameWidth: 256,
  frameHeight: 256,
  frameCount: 25,
  cropX: 72,
  cropY: 31,
  cropWidth: 107,
  cropHeight: 197,
  displayHeight: 220,
  frameDurationMs: 110,
  frames: createUniformSpriteSheetFrames(5, 256, 256, 25),
};

export const ACT_FOUR_ZERO_DAMAGE_CARDS: readonly ActOneCardDefinition[] = [
  {
    id: 'ordinary-strike-zero',
    name: 'Обычный удар',
    cost: 0,
    description: 'Наносит 0 урона. Слишком поздно для обычного.',
    type: 'attack',
    damage: 0,
  },
  {
    id: 'desperate-combo-zero',
    name: 'Отчаянное комбо',
    cost: 0,
    description: 'Наносит 0 урона. Эффектно, но исторически бесполезно.',
    type: 'attack',
    damage: 0,
  },
];
