import type { ActOneCardDefinition } from '../content/actOne';
import { escapeAttribute, escapeHtml } from './domMarkup';

export type ActOneArtifactRevealState = 'descending' | 'flight' | 'corner';

export interface ActOneArtifactRevealOptions {
  artifactAlt: string;
  artifactLabel: string;
  imagePath: string;
  interactive: boolean;
  state: ActOneArtifactRevealState;
}

export interface ActOneRewardToastOptions {
  artPath?: string | null;
  card: ActOneCardDefinition;
}

const ARTIFACT_REVEAL_CLASS_BY_STATE = {
  corner: 'is-corner',
  descending: 'is-descending',
  flight: 'is-flight',
} as const satisfies Record<ActOneArtifactRevealState, string>;

export function renderActOneArtifactReveal({
  artifactAlt,
  artifactLabel,
  imagePath,
  interactive,
  state,
}: ActOneArtifactRevealOptions): string {
  return `
    <div class="act-one-artifact-drop">
      <button
        class="act-one-artifact-drop__button ${ARTIFACT_REVEAL_CLASS_BY_STATE[state]}"
        data-artifact-collect
        type="button"
        aria-label="${escapeAttribute(`Забрать ${artifactLabel}`)}"
        ${interactive ? '' : 'disabled'}
      >
        <img class="act-one-artifact__image" src="${escapeAttribute(imagePath)}" alt="${escapeAttribute(artifactAlt)}" decoding="async">
      </button>
    </div>
  `;
}

export function renderActOneRewardToast({ artPath, card }: ActOneRewardToastOptions): string {
  if (artPath) {
    return `
      <button class="act-one-reward act-one-reward--centered act-one-reward--interactive act-one-reward--art" data-reward-continue type="button" aria-label="${escapeAttribute(`${card.name}. ${card.description}. Press X.`)}">
        <img class="act-one-reward__art" src="${escapeAttribute(artPath)}" alt="" aria-hidden="true" decoding="async">
        <span class="act-one-reward__hint act-one-reward__hint--overlay">Press X</span>
      </button>
    `;
  }

  return `
    <button class="act-one-reward act-one-reward--centered act-one-reward--interactive" data-reward-continue type="button">
      <p class="eyebrow">Карта босса получена</p>
      <strong>${escapeHtml(card.name)}</strong>
      <span>${escapeHtml(card.description)}</span>
      <span class="act-one-reward__hint">Press X</span>
    </button>
  `;
}

export function renderActOneGoPrompt(): string {
  return `
    <div class="act-one-go-prompt" data-act-one-go-prompt aria-hidden="true">
      <span class="act-one-go-prompt__text">GO</span>
      <span class="act-one-go-prompt__arrow">
        <span class="act-one-go-prompt__bar"></span>
        <span class="act-one-go-prompt__head"></span>
      </span>
    </div>
  `;
}
