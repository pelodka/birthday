import type { ActFourSupportAnimationId } from '../content/actFour';

export type ActFourSupportPhase =
  | 'summon'
  | 'idle-dialogue'
  | 'transform'
  | 'second-transform'
  | 'conjure'
  | 'support-loop'
  | 'reverse-summon'
  | 'done';

export type ActFourFinalePhase =
  | 'approach'
  | 'foot-reveal'
  | 'boss-reveal-start'
  | 'boss-reveal'
  | 'zoom-in'
  | 'zero-cards'
  | 'support-ready'
  | 'support-active'
  | 'artifact-dialogue'
  | 'artifact-consuming'
  | 'panel-close'
  | 'win-ready'
  | 'showdown'
  | 'cutscene'
  | 'gift-video'
  | 'credits';

export type ActFourDialogueAnchor = 'player' | 'system' | 'valera';

export interface ActFourDialogueAnchorRatio {
  x: number;
  y: number;
}

export interface ActFourDialogueLayout {
  className: ActFourDialogueAnchor;
  anchor: ActFourDialogueAnchor;
  style: string;
}

export const ACT_FOUR_REVEAL_ZOOM_DURATION_MS = 5400;
export const ACT_FOUR_ZOOM_IN_SETTLE_MS = 700;
export const ACT_FOUR_ARTIFACT_CONSUME_FLIGHT_MS = 4320;
export const ACT_FOUR_ARTIFACT_RESULT_LINE_MS = 1800;
export const ACT_FOUR_ARTIFACT_CONSUME_STEP_MS =
  ACT_FOUR_ARTIFACT_CONSUME_FLIGHT_MS + ACT_FOUR_ARTIFACT_RESULT_LINE_MS + 160;
export const ACT_FOUR_PANEL_CLOSE_DURATION_MS = 980;
export const ACT_FOUR_SHOWDOWN_WIN_DELAY_MS = 6000;
export const ACT_FOUR_SHOWDOWN_MUSIC_DELAY_MS = 1250;
export const ACT_FOUR_POST_SHOWDOWN_CUTSCENE_SRC = '/video/act-4-post-showdown-cutscene.mp4';
export const ACT_FOUR_GIFT_VIDEO_SRC = '/video/birthday-gift.mp4';
export const ACT_FOUR_POST_SHOWDOWN_CUTSCENE_FALLBACK_MS = 5600;
export const ACT_FOUR_POST_SHOWDOWN_CUTSCENE_HOLD_MS = 3000;
export const ACT_FOUR_POST_SHOWDOWN_CUTSCENE_FADE_MS = 720;
export const ACT_FOUR_DIALOGUE_TAIL_GAP_PX = 34;
export const ACT_FOUR_DIALOGUE_EDGE_GAP_PX = 18;
export const ACT_FOUR_DIALOGUE_PLAYER_HEAD_ANCHOR: ActFourDialogueAnchorRatio = { x: 0.5, y: 0.11 };
export const ACT_FOUR_DIALOGUE_VALERA_HEAD_ANCHORS = {
  'valera-summon': { x: 0.5, y: 0.2 },
  'valera-idle': { x: 0.5, y: 0.12 },
  'valera-transform': { x: 0.5, y: 0.22 },
  'valera-transform-conjure': { x: 0.5, y: 0.2 },
  'valera-transform-support': { x: 0.5, y: 0.15 },
} as const satisfies Record<ActFourSupportAnimationId, ActFourDialogueAnchorRatio>;

export function getActFourSupportAnimationId(phase: ActFourSupportPhase): ActFourSupportAnimationId {
  switch (phase) {
    case 'summon':
    case 'reverse-summon':
    case 'transform':
      return 'valera-summon';
    case 'second-transform':
      return 'valera-transform';
    case 'conjure':
      return 'valera-transform-conjure';
    case 'support-loop':
      return 'valera-transform-support';
    default:
      return 'valera-idle';
  }
}

export function getActFourDialogueSpeakerClass(speakerId: string): ActFourDialogueAnchor {
  if (speakerId === 'boss-prime') {
    return 'player';
  }

  if (speakerId === 'system') {
    return 'system';
  }

  return 'valera';
}

export function getActFourCameraScaleForPhase(phase: ActFourFinalePhase): number {
  return phase === 'boss-reveal' ? 0.28 : 1;
}

export function isActFourCameraCinematicPhase(phase: ActFourFinalePhase): boolean {
  return phase === 'boss-reveal-start' || phase === 'boss-reveal' || phase === 'zoom-in';
}

export function isActFourRevealCameraLockedPhase(phase: ActFourFinalePhase): boolean {
  return phase === 'foot-reveal' || phase === 'boss-reveal-start' || phase === 'boss-reveal';
}

export function isActFourCardSelectionPhase(phase: ActFourFinalePhase): boolean {
  return phase === 'zero-cards' || phase === 'support-ready';
}

export function isActFourArtifactRitualPhase(phase: ActFourFinalePhase): boolean {
  return phase === 'artifact-dialogue' || phase === 'artifact-consuming' || phase === 'panel-close';
}

export function isActFourTransformedPlayerPhase(phase: ActFourFinalePhase): boolean {
  return isActFourArtifactRitualPhase(phase) || phase === 'win-ready';
}

export function isActFourShowdownOverlayPhase(phase: ActFourFinalePhase): boolean {
  return phase === 'showdown' || phase === 'cutscene' || phase === 'gift-video' || phase === 'credits';
}
