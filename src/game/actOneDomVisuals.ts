import {
  getActOneActorPoseAsset,
  getActOneActorVisual,
  getActOneSpriteSheetSpec,
} from '../content/actOne';
import type { ActOneEncounterActorId, ActOneEnemyPose, ActOnePlayerPose } from '../content/actOne';
import { escapeAttribute } from './domMarkup';

export type ActOneFacingDirection = -1 | 1;

export interface ActOneOpponentRenderState {
  id: ActOneEncounterActorId;
  worldState: 'idle' | 'falling' | 'gone' | 'artifact';
}

export const ACT_ONE_PLAYER_WORLD_HEIGHT = getActOneActorVisual('boss-prime').worldLayoutHeight;
export const ACT_ONE_PLAYER_BATTLE_HEIGHT = getActOneActorVisual('boss-prime').battleLayoutHeight;
export const ACT_ONE_BOSS_BATTLE_DISPLAY_HEIGHT =
  getActOneSpriteSheetSpec('meeting-minotaur', 'battle')?.displayHeight ?? 330;

export function getActOneWorldHeight(actorId: ActOneEncounterActorId): number {
  return getActOneActorVisual(actorId).worldLayoutHeight;
}

export function getActOneBattleHeight(actorId: ActOneEncounterActorId): number {
  return getActOneActorVisual(actorId).battleLayoutHeight;
}

export function renderActOnePlayerSprite(pose: ActOnePlayerPose, facingDirection: ActOneFacingDirection): string {
  if (pose === 'standing' || pose === 'running') {
    return `
      <span class="act-one-player__sprite-stack" data-act-one-player-sprite-stack data-active-pose="${pose}" aria-hidden="true">
        ${renderActOnePlayerSpriteLayer('standing', facingDirection, pose)}
        ${renderActOnePlayerSpriteLayer('running', facingDirection, pose)}
      </span>
    `;
  }

  return renderActOnePlayerSpriteLayer(pose, facingDirection, pose, false);
}

export function renderActOneOpponent(encounter: ActOneOpponentRenderState, battleStance: boolean): string {
  const visual = getActOneActorVisual(encounter.id);
  const defeated = encounter.worldState === 'falling' || encounter.worldState === 'artifact';
  const pose: ActOneEnemyPose = defeated ? 'killed' : battleStance ? 'battle' : 'idle';
  const asset = getActOneActorPoseAsset(encounter.id, pose);

  if (!asset) {
    return '';
  }

  const spriteClassName = [
    'act-one-opponent__sprite',
    `act-one-opponent__sprite--${visual.cssKey}`,
    `act-one-opponent__sprite--${pose}`,
    asset.kind === 'static-image' ? 'is-blinking' : '',
    visual.defaultFacing === 'left' ? 'is-facing-left' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const spriteMarkup =
    asset.kind === 'static-image'
      ? `
          <img
            class="${spriteClassName}"
            src="${escapeAttribute(asset.image)}"
            alt=""
            aria-hidden="true"
            draggable="false"
            decoding="async"
          >
        `
      : `
          <span
            class="${spriteClassName} act-one-opponent__sprite--sheet"
            data-act-one-sheet-actor="${escapeAttribute(encounter.id)}"
            data-act-one-sheet-pose="${pose}"
            aria-hidden="true"
          ></span>
        `;

  return `
    <div class="act-one-opponent act-one-opponent--art act-one-opponent--${visual.cssKey}-art ${defeated ? 'is-defeated' : ''}">
      ${defeated ? '' : '<span class="act-one-opponent__shadow" aria-hidden="true"></span>'}
      ${spriteMarkup}
    </div>
  `;
}

function renderActOnePlayerSpriteLayer(
  pose: ActOnePlayerPose,
  facingDirection: ActOneFacingDirection,
  activePose: ActOnePlayerPose,
  layered = true,
): string {
  const asset = getActOneActorPoseAsset('boss-prime', pose);
  const className = [
    'act-one-player__sprite',
    layered ? 'act-one-player__sprite--layer' : '',
    `act-one-player__sprite--${pose}`,
    layered && pose === activePose ? 'is-active' : '',
    facingDirection < 0 ? 'is-facing-left' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (!asset) {
    return '';
  }

  if (asset.kind === 'static-image') {
    return `
      <img
        class="${className}"
        src="${escapeAttribute(asset.image)}"
        alt=""
        aria-hidden="true"
        draggable="false"
        decoding="async"
      >
    `;
  }

  return `
    <span
      class="${className} act-one-player__sprite--sheet"
      data-act-one-sheet-actor="boss-prime"
      data-act-one-sheet-pose="${pose}"
      aria-hidden="true"
    ></span>
  `;
}
