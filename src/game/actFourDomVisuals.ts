import type { ActOneCardDefinition, ActOnePlayerPose } from '../content/actOne';
import { ACT_FOUR_BOSS, ACT_FOUR_SUPPORT_CARD } from '../content/actFour';
import type { ActFourRelicConsumptionBeat } from '../content/actFour';
import {
  ACT_FOUR_ARTIFACT_CONSUME_FLIGHT_MS,
  ACT_FOUR_ARTIFACT_RESULT_LINE_MS,
  ACT_FOUR_GIFT_VIDEO_SRC,
  ACT_FOUR_POST_SHOWDOWN_CUTSCENE_SRC,
  isActFourTransformedPlayerPhase,
} from './actFourFinaleFlow';
import type { ActFourDialogueLayout, ActFourFinalePhase, ActFourSupportPhase } from './actFourFinaleFlow';
import { renderActFourCreditsScreen } from './actFourCredits';
import { escapeAttribute, escapeHtml, renderEyebrow, renderTextParagraphs } from './domMarkup';
import type { DialogueSequenceDefinition, RelicDefinition } from '../types';
import { renderActOneFloater, renderActOneHandCard } from './actOneBattleDomVisuals';
import type { ActOneFloater } from './actOneBattleDomVisuals';
import type { ActOneFacingDirection } from './actOneDomVisuals';
import { renderActOnePlayerSprite } from './actOneDomVisuals';

export interface ActFourShowdownOverlayOptions {
  finalePhase: ActFourFinalePhase;
  finalePromptLabel: string;
  giftWatched: boolean;
  winReady: boolean;
}

export interface ActFourRelicTokenStateOptions {
  consumedRelicIds: ReadonlySet<string>;
  index: number;
  lastConsumedRelicId: string | null;
  relic: RelicDefinition;
  relicTargetX: number;
  relicTargetY: number;
}

export interface ActFourRelicTokenState {
  className: string;
  style: string;
}

export interface ActFourRelicTokenRenderEntry {
  imagePath?: string;
  relic: RelicDefinition;
}

export interface ActFourRelicTokensRenderOptions {
  consumedRelicIds: ReadonlySet<string>;
  entries: readonly ActFourRelicTokenRenderEntry[];
  lastConsumedRelicId: string | null;
  relicTargetX: number;
  relicTargetY: number;
}

export interface ActFourArtifactGainLineOptions {
  copy: string | null;
  left: number;
  relicColor: string;
  top: number;
}

export interface ActFourArtifactGainLineLayoutOptions {
  floorOffset: number;
  playerScreenX: number;
  playerTransformDisplaySize: number;
  spriteScale: number;
  viewportHeight: number;
}

export interface ActFourRelicTargetLayoutOptions {
  floorOffset: number;
  playerScreenX: number;
  playerTransformDisplaySize: number;
  spriteScale: number;
  viewportHeight: number;
}

export interface ActFourScreenPosition {
  x: number;
  y: number;
}

export interface ActFourArtifactDialogueOptions {
  artifactBeat: ActFourRelicConsumptionBeat;
  layout: ActFourDialogueLayout;
}

export interface ActFourArtifactRitualOptions {
  artifactDialogueMarkup: string;
  artifactGainLineMarkup: string;
  finalePhase: ActFourFinalePhase;
  relicTokensMarkup: string;
}

export interface ActFourFinaleCardSelectionEntry {
  artPath?: string | null;
  card: ActOneCardDefinition;
  index: number;
  selected: boolean;
}

export interface ActFourFinaleCardSelectionOptions {
  entries: readonly ActFourFinaleCardSelectionEntry[];
}

export interface ActFourFinaleShellOptions {
  artifactRitualMarkup: string;
  bossFeedbackMarkup: string;
  cardSelectionMarkup: string;
  finalePhase: ActFourFinalePhase;
  winReadyMarkup: string;
}

export interface ActFourBossFeedbackOptions {
  bossScreenX: number;
  floaters: readonly ActOneFloater[];
  floorOffset: number;
  playerScreenX: number;
  playerSpriteHeight: number;
  viewportHeight: number;
  viewportWidth: number;
}

export interface ActFourSupportDialogueOptions {
  dialogueLine: DialogueSequenceDefinition;
  interactive?: boolean;
  layout: ActFourDialogueLayout;
}

export interface ActFourSupportOverlayOptions {
  dialogueMarkup: string;
  phase: ActFourSupportPhase;
}

export function renderActFourBossSprite(): string {
  return `
    <div class="act-four-boss" aria-label="${escapeAttribute(ACT_FOUR_BOSS.name)}">
      <span class="act-four-boss__sheet" data-act-four-boss-sheet aria-hidden="true">
        <img
          class="act-four-boss__sheet-image"
          data-act-four-boss-sheet-image
          src="${escapeAttribute(ACT_FOUR_BOSS.sprite.image)}"
          alt=""
          aria-hidden="true"
          draggable="false"
          loading="eager"
          fetchpriority="high"
          decoding="async"
        >
      </span>
    </div>
  `;
}

export function renderActFourPlayerSprite(
  pose: ActOnePlayerPose,
  facingDirection: ActOneFacingDirection,
  finalePhase: ActFourFinalePhase,
): string {
  if (isActFourTransformedPlayerPhase(finalePhase)) {
    return `
      <span
        class="act-one-player__sprite act-one-player__sprite--sheet act-four-player-transform__sprite"
        data-act-four-player-transform-sheet
        aria-hidden="true"
      ></span>
    `;
  }

  if (pose === 'battle') {
    return `
      <span
        class="act-one-player__sprite act-one-player__sprite--battle act-one-player__sprite--sheet act-four-player-battle__sprite ${facingDirection < 0 ? 'is-facing-left' : ''}"
        data-act-four-player-battle-sheet
        aria-hidden="true"
      ></span>
    `;
  }

  return renderActOnePlayerSprite(pose, facingDirection);
}

export function getActFourRelicTokenState({
  consumedRelicIds,
  index,
  lastConsumedRelicId,
  relic,
  relicTargetX,
  relicTargetY,
}: ActFourRelicTokenStateOptions): ActFourRelicTokenState {
  const consumedClass = consumedRelicIds.has(relic.id) ? ' is-consumed' : '';
  const consumingClass = lastConsumedRelicId === relic.id ? ' is-consuming' : '';
  const relicStartX = 24 + index * 70 + 29;
  const relicStartY = 24 + 29;

  return {
    className: `act-four-relic-token${consumedClass}${consumingClass}`,
    style: `--relic-color:${relic.color}; --relic-target-x:${(relicTargetX - relicStartX).toFixed(2)}px; --relic-target-y:${(relicTargetY - relicStartY).toFixed(2)}px; --relic-consume-duration:${ACT_FOUR_ARTIFACT_CONSUME_FLIGHT_MS}ms;`,
  };
}

export function renderActFourRelicTokens({
  consumedRelicIds,
  entries,
  lastConsumedRelicId,
  relicTargetX,
  relicTargetY,
}: ActFourRelicTokensRenderOptions): string {
  return entries
    .map(({ imagePath, relic }, index) => {
      const tokenState = getActFourRelicTokenState({
        consumedRelicIds,
        index,
        lastConsumedRelicId,
        relic,
        relicTargetX,
        relicTargetY,
      });
      const iconMarkup = imagePath
        ? `<img src="${escapeAttribute(imagePath)}" alt="" aria-hidden="true" decoding="async">`
        : `<span>${escapeHtml(relic.pixelLabel)}</span>`;

      return `
        <span
          class="${tokenState.className}"
          style="${tokenState.style}"
          aria-label="${escapeAttribute(relic.name)}"
          data-act-four-relic-token="${escapeAttribute(relic.id)}"
        >
          ${iconMarkup}
        </span>
      `;
    })
    .join('');
}

export function getActFourArtifactGainLineLayout({
  floorOffset,
  playerScreenX,
  playerTransformDisplaySize,
  spriteScale,
  viewportHeight,
}: ActFourArtifactGainLineLayoutOptions): ActFourScreenPosition {
  const playerDisplayHeight = playerTransformDisplaySize * spriteScale;
  const lineY = viewportHeight - floorOffset - playerDisplayHeight - 34;

  return {
    x: playerScreenX,
    y: clampNumber(lineY, 72, viewportHeight - floorOffset - 108),
  };
}

export function getActFourRelicTargetLayout({
  floorOffset,
  playerScreenX,
  playerTransformDisplaySize,
  spriteScale,
  viewportHeight,
}: ActFourRelicTargetLayoutOptions): ActFourScreenPosition {
  return {
    x: playerScreenX,
    y: viewportHeight - floorOffset - playerTransformDisplaySize * spriteScale * 0.54,
  };
}

export function renderActFourArtifactGainLine({
  copy,
  left,
  relicColor,
  top,
}: ActFourArtifactGainLineOptions): string {
  return copy
    ? `<div class="act-four-artifact-gain-line" style="left:${left.toFixed(2)}px; top:${top.toFixed(2)}px; --artifact-gain-color:${relicColor}; --artifact-gain-duration:${ACT_FOUR_ARTIFACT_RESULT_LINE_MS}ms;">${escapeHtml(copy)}</div>`
    : '';
}

export function renderActFourArtifactDialogue({
  artifactBeat,
  layout,
}: ActFourArtifactDialogueOptions): string {
  return `
    <article class="act-four-artifact-dialogue act-four-artifact-dialogue--${layout.className}" data-act-four-dialogue-anchor="${layout.anchor}" data-act-four-artifact-speaker="${escapeAttribute(artifactBeat.speakerId ?? 'valera')}" style="${layout.style}">
      ${renderEyebrow(artifactBeat.speakerLabel)}
      ${renderTextParagraphs(artifactBeat.lines)}
      <button class="app-button app-button--bright" data-act-four-artifact-dialogue type="button">Press X</button>
    </article>
  `;
}

export function renderActFourPanelClose(): string {
  return `
    <div class="act-four-panel-close" aria-hidden="true">
      <span class="act-four-panel-close__door act-four-panel-close__door--left"></span>
      <span class="act-four-panel-close__door act-four-panel-close__door--right"></span>
    </div>
  `;
}

export function renderActFourArtifactRitual({
  artifactDialogueMarkup,
  artifactGainLineMarkup,
  finalePhase,
  relicTokensMarkup,
}: ActFourArtifactRitualOptions): string {
  return `
    <section class="act-four-artifact-ritual" data-artifact-mode="${finalePhase}">
      <div class="act-four-relic-strip" aria-label="Артефакты летят к Александру">
        ${relicTokensMarkup}
      </div>
      ${artifactDialogueMarkup || artifactGainLineMarkup}
      ${finalePhase === 'panel-close' ? renderActFourPanelClose() : ''}
    </section>
  `;
}

export function renderActFourBossFeedback({
  bossScreenX,
  floaters,
  floorOffset,
  playerScreenX,
  playerSpriteHeight,
  viewportHeight,
  viewportWidth,
}: ActFourBossFeedbackOptions): string {
  if (floaters.length === 0) {
    return '';
  }

  const bossNudge = clampNumber(viewportWidth * 0.22, 220, 460);
  const bossFeedbackHalfWidth = clampNumber(viewportWidth * 0.23, 190, 330);
  const bossLeft = clampNumber(
    bossScreenX + bossNudge - viewportWidth * 0.07,
    bossFeedbackHalfWidth + 28,
    viewportWidth - bossFeedbackHalfWidth - 28,
  );
  const playerLeft = clampNumber(playerScreenX, 92, viewportWidth - 92);
  const bossBottom = clampNumber(floorOffset + viewportHeight * 0.54, floorOffset + 190, viewportHeight - 96);
  const playerBottom = clampNumber(floorOffset + playerSpriteHeight + 34, floorOffset + 140, viewportHeight - 92);

  return floaters
    .map((floater, index) => {
      const stackIndex = floaters.slice(0, index).filter((entry) => entry.actor === floater.actor).length;
      const left = floater.actor === 'enemy' ? bossLeft : playerLeft;
      const bottom = (floater.actor === 'enemy' ? bossBottom : playerBottom) + stackIndex * 38;

      return renderActOneFloater({
        bottom,
        className: 'act-four-boss-feedback',
        kind: floater.kind,
        left,
        precision: 2,
        text: floater.text,
      });
    })
    .join('');
}

export function renderActFourFinaleCardSelection({
  entries,
}: ActFourFinaleCardSelectionOptions): string {
  const cardMarkup = entries
    .map(({ artPath, card, index, selected }) => {
      const metaLabel = card.id === ACT_FOUR_SUPPORT_CARD.id ? 'Поддержка' : 'Урон 0';

      return renderActOneHandCard({
        artPath,
        badgeLabel: artPath ? metaLabel : undefined,
        badgeSpecial: card.id === ACT_FOUR_SUPPORT_CARD.id,
        card,
        index,
        metaLabel,
        selected,
        special: card.id === ACT_FOUR_SUPPORT_CARD.id,
      });
    })
    .join('');

  return `
    <div class="act-one-battle-controls act-four-card-controls">
      <article class="battle-panel act-one-card-dock act-four-card-dock">
        <div class="hand-grid">${cardMarkup}</div>
      </article>
    </div>
  `;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function renderActFourWinReady(finalePromptLabel: string): string {
  return `
    <section class="act-four-win-ready">
      <button class="press-to-win act-four-win-button" data-act-four-win-button type="button">${escapeHtml(finalePromptLabel)}</button>
    </section>
  `;
}

export function renderActFourFinaleShell({
  artifactRitualMarkup,
  bossFeedbackMarkup,
  cardSelectionMarkup,
  finalePhase,
  winReadyMarkup,
}: ActFourFinaleShellOptions): string {
  return `
    <div class="act-four-finale-ui" data-act-four-finale-phase="${escapeAttribute(finalePhase)}">
      ${bossFeedbackMarkup}
      ${cardSelectionMarkup}
      ${winReadyMarkup}
      ${artifactRitualMarkup}
    </div>
  `;
}

export function renderActFourSupportDialogue({
  dialogueLine,
  interactive = true,
  layout,
}: ActFourSupportDialogueOptions): string {
  const speakerId = dialogueLine.speakerId ?? 'valera';

  return `
    <article class="act-four-support__dialogue act-four-support__dialogue--${layout.className}" data-act-four-dialogue-anchor="${layout.anchor}" data-act-four-support-speaker="${escapeAttribute(speakerId)}" style="${layout.style}">
      ${renderEyebrow(dialogueLine.speakerLabel)}
      ${renderTextParagraphs(dialogueLine.lines)}
      ${
        interactive
          ? `
            <div class="act-one-dialogue__actions">
              <button class="app-button app-button--bright" data-act-four-support-dialogue type="button">Press X</button>
            </div>
          `
          : ''
      }
    </article>
  `;
}

export function renderActFourSupportOverlay({ dialogueMarkup, phase }: ActFourSupportOverlayOptions): string {
  return `
    <div class="act-four-support" data-act-four-support-phase="${phase}">
      <div class="act-four-support__sprite-wrap" aria-label="Валера support animation">
        <span class="act-four-support__sprite" data-act-four-support-sheet aria-hidden="true"></span>
      </div>
      ${dialogueMarkup}
    </div>
  `;
}

export function renderActFourShowdownOverlay({
  finalePhase,
  finalePromptLabel,
  giftWatched,
  winReady,
}: ActFourShowdownOverlayOptions): string {
  if (finalePhase === 'cutscene') {
    return `
      <div class="act-four-cutscene" aria-label="Финальная катсцена">
        <video
          class="act-four-cutscene__media"
          data-act-four-cutscene-video
          src="${escapeAttribute(ACT_FOUR_POST_SHOWDOWN_CUTSCENE_SRC)}"
          playsinline
          autoplay
          muted
          preload="auto"
        ></video>
        <span class="act-four-cutscene__fade" aria-hidden="true"></span>
      </div>
    `;
  }

  if (finalePhase === 'gift-video') {
    return `
      ${renderActFourCreditsScreen({
        action: 'gift',
        actionVisible: true,
        showThanks: false,
      })}
      <div class="act-four-gift-video" aria-label="Подарок">
        <video
          class="act-four-gift-video__media"
          data-act-four-gift-video
          src="${escapeAttribute(ACT_FOUR_GIFT_VIDEO_SRC)}"
          playsinline
          autoplay
          preload="auto"
        ></video>
      </div>
    `;
  }

  if (finalePhase === 'credits') {
    return renderActFourCreditsScreen({
      action: giftWatched ? 'restart' : 'gift',
      settled: giftWatched,
      showThanks: giftWatched,
    });
  }

  return `
    <div class="act-four-showdown ${winReady ? 'is-win-ready' : ''}" aria-label="Финальное аниме-противостояние">
      <section class="act-four-showdown__panel act-four-showdown__panel--boss" aria-label="${escapeAttribute(ACT_FOUR_BOSS.name)}">
        <span class="act-four-showdown__speed act-four-showdown__speed--boss" aria-hidden="true"></span>
        <span
          class="act-four-showdown__sheet act-four-showdown__sheet--boss"
          data-act-four-showdown-sheet="boss"
          aria-hidden="true"
        ></span>
      </section>
      <section class="act-four-showdown__panel act-four-showdown__panel--player" aria-label="Александр">
        <span class="act-four-showdown__speed act-four-showdown__speed--player" aria-hidden="true"></span>
        <span
          class="act-four-showdown__sheet act-four-showdown__sheet--player"
          data-act-four-showdown-sheet="player"
          aria-hidden="true"
        ></span>
      </section>
      ${
        winReady
          ? `<button class="press-to-win act-four-showdown__win-button" data-act-four-win-button type="button">${escapeHtml(finalePromptLabel)}</button>`
          : ''
      }
    </div>
  `;
}
