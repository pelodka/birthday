import { escapeAttribute, escapeCssUrl } from './domMarkup';

export interface ActOneBackgroundCyclesRenderOptions {
  backgroundImage?: string;
  cycleCount: number;
  viewportWidth: number;
}

export interface ActOneEncounterPlacementRenderOptions {
  left: number;
  opponentMarkup: string;
}

export interface ActOneStageShellRenderOptions {
  actFourPhase?: string | null;
  artifactMarkup: string;
  backgroundCyclesMarkup: string;
  battleMarkup: string;
  cinematicCamera: boolean;
  dialogueMarkup: string;
  fightSplashVisible: boolean;
  floorOffset: number;
  goPromptMarkup: string;
  playerBattleStance: boolean;
  playerMarkup: string;
  playerX: number;
  rewardMarkup: string;
  spriteScale: number;
  supportMarkup: string;
  trackStyle: string;
  worldMarkup: string;
  worldStyle: string;
}

export function renderActOneBackgroundCycles({
  backgroundImage,
  cycleCount,
  viewportWidth,
}: ActOneBackgroundCyclesRenderOptions): string {
  return backgroundImage
    ? Array.from({ length: cycleCount }, (_, index) => {
        const cycleLeft = index * viewportWidth;

        return `<div class="act-one-stage__cycle" style="left:${cycleLeft}px; width:${viewportWidth}px; background-image:url('${escapeCssUrl(backgroundImage)}');"></div>`;
      }).join('')
    : '';
}

export function renderActOneEncounterPlacement({
  left,
  opponentMarkup,
}: ActOneEncounterPlacementRenderOptions): string {
  return `
    <div class="act-one-encounter" style="left:${left}px">
      ${opponentMarkup}
    </div>
  `;
}

export function renderActOneStageShell({
  actFourPhase,
  artifactMarkup,
  backgroundCyclesMarkup,
  battleMarkup,
  cinematicCamera,
  dialogueMarkup,
  fightSplashVisible,
  floorOffset,
  goPromptMarkup,
  playerBattleStance,
  playerMarkup,
  playerX,
  rewardMarkup,
  spriteScale,
  supportMarkup,
  trackStyle,
  worldMarkup,
  worldStyle,
}: ActOneStageShellRenderOptions): string {
  const actFourPhaseAttribute = actFourPhase ? ` data-act-four-phase="${escapeAttribute(actFourPhase)}"` : '';
  const cinematicClassName = cinematicCamera ? ' is-cinematic-camera' : '';

  return `
    <section class="act-one-shell">
      <div class="act-one-stage">
        <div class="act-one-stage__viewport"${actFourPhaseAttribute} style="--act-one-floor-offset:${floorOffset}px; --act-one-ui-lane-height:${floorOffset}px; --act-one-sprite-scale:${spriteScale};">
          <div class="act-one-stage__track${cinematicClassName}" style="${trackStyle};">
            <div class="act-one-stage__sky"></div>
            <div class="act-one-stage__parallax act-one-stage__parallax--back"></div>
            <div class="act-one-stage__parallax act-one-stage__parallax--mid"></div>
            <div class="act-one-stage__ground"></div>
            ${backgroundCyclesMarkup}
            <div class="act-one-stage__world${cinematicClassName}" style="${worldStyle};">
              ${worldMarkup}
              <div class="act-one-player ${playerBattleStance ? 'act-one-player--battle' : ''}" style="left:${playerX}px">
                ${playerMarkup}
              </div>
            </div>
          </div>
          ${goPromptMarkup}
          ${fightSplashVisible ? '<div class="act-one-fight">Fight!</div>' : ''}
          ${dialogueMarkup}
          ${battleMarkup}
          ${artifactMarkup}
          ${supportMarkup}
          ${rewardMarkup}
        </div>
      </div>
    </section>
  `;
}
