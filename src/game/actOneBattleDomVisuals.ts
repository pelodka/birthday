import type { ActOneCardDefinition } from '../content/actOne';
import { escapeAttribute, escapeHtml, renderEyebrow } from './domMarkup';

export type ActOneBattleActor = 'player' | 'enemy';
export type ActOneFloaterKind = 'damage' | 'blocked' | 'zero';

export interface ActOneHealthBarFx {
  id: number;
  fromRatio: number;
  toRatio: number;
}

export interface ActOneFloater {
  id: number;
  actor: ActOneBattleActor;
  kind: ActOneFloaterKind;
  text: string;
}

export interface ActOneHandCardRenderOptions {
  artPath?: string | null;
  badgeLabel?: string;
  badgeSpecial?: boolean;
  bossRelic?: boolean;
  card: ActOneCardDefinition;
  disabled?: boolean;
  index: number;
  metaLabel: string;
  selected?: boolean;
  special?: boolean;
}

export interface ActOneHealthBarRenderOptions {
  actor: ActOneBattleActor;
  bottom: number;
  effect: ActOneHealthBarFx | null;
  hp: number;
  left: number;
  maxHp: number;
  meta: string;
  ratio: number;
  title: string;
}

export interface ActOneBattleLogRenderOptions {
  bottom: number;
  entries: readonly string[];
  eyebrow: string;
  left: number;
  width: number;
}

export interface ActOneFloaterRenderOptions {
  bottom: number;
  className?: string;
  kind: ActOneFloaterKind;
  left: number;
  precision?: number;
  text: string;
}

export interface ActOneBattleOverlayLayoutOptions {
  activeCameraX: number;
  battleGroundOffset: number;
  enemyBattleHeight: number;
  enemyWorldX: number;
  playerBattleHeight: number;
  playerWorldX: number;
  viewportHeight: number;
  viewportWidth: number;
}

export interface ActOneBattleOverlayLayout {
  battleLogBottom: number;
  battleLogLeft: number;
  battleLogWidth: number;
  enemyBarBottom: number;
  enemyScreenX: number;
  endTurnBottom: number;
  endTurnLeft: number;
  playerBarBottom: number;
  playerScreenX: number;
}

export interface ActOneBattleOverlayRenderOptions {
  battleLogMarkup: string;
  battleUiLaneHeight: number;
  endTurnBottom: number;
  endTurnLeft: number;
  endTurnSelected: boolean;
  enemyHealthBarMarkup: string;
  floaterMarkup: string;
  handMarkup: string;
  playerHealthBarMarkup: string;
}

export function computeActOneBattleOverlayLayout({
  activeCameraX,
  battleGroundOffset,
  enemyBattleHeight,
  enemyWorldX,
  playerBattleHeight,
  playerWorldX,
  viewportHeight,
  viewportWidth,
}: ActOneBattleOverlayLayoutOptions): ActOneBattleOverlayLayout {
  const playerScreenX = playerWorldX - activeCameraX;
  const enemyScreenX = enemyWorldX - activeCameraX;
  const playerBarBottom = clampNumber(
    battleGroundOffset + playerBattleHeight + 28,
    battleGroundOffset + 164,
    viewportHeight - 112,
  );
  const enemyBarBottom = clampNumber(
    battleGroundOffset + enemyBattleHeight + 28,
    battleGroundOffset + 164,
    viewportHeight - 112,
  );
  const battleLogWidth = Math.min(360, viewportWidth - 36);
  const battleLogLeft = clampNumber(
    (playerScreenX + enemyScreenX) / 2 - battleLogWidth / 2,
    18,
    viewportWidth - battleLogWidth - 18,
  );
  const battleLogBottom = clampNumber(
    Math.min(playerBarBottom, enemyBarBottom) - 136,
    battleGroundOffset + 94,
    viewportHeight - 210,
  );
  const endTurnLeft = clampNumber(playerScreenX, 84, viewportWidth - 84);
  const endTurnBottom = clampNumber(
    battleGroundOffset + Math.round(playerBattleHeight * 0.34),
    battleGroundOffset + 122,
    viewportHeight - 90,
  );

  return {
    battleLogBottom,
    battleLogLeft,
    battleLogWidth,
    enemyBarBottom,
    enemyScreenX,
    endTurnBottom,
    endTurnLeft,
    playerBarBottom,
    playerScreenX,
  };
}

export function renderActOneHandCard({
  artPath,
  badgeLabel,
  badgeSpecial = false,
  bossRelic = false,
  card,
  disabled = false,
  index,
  metaLabel,
  selected = false,
  special = false,
}: ActOneHandCardRenderOptions): string {
  const className = [
    'hand-card',
    artPath ? 'hand-card--art' : '',
    special ? 'hand-card--special' : '',
    bossRelic ? 'hand-card--boss-relic' : '',
    selected ? 'is-selected' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const disabledAttr = disabled ? ' disabled' : '';

  if (!artPath) {
    return `
      <button class="${className}" data-card="${escapeAttribute(card.id)}" data-card-index="${index}" type="button"${disabledAttr}>
        <span class="eyebrow">${escapeHtml(metaLabel)}</span>
        <strong>${escapeHtml(card.name)}</strong>
        <span>${escapeHtml(card.description)}</span>
      </button>
    `;
  }

  return `
    <button class="${className}" data-card="${escapeAttribute(card.id)}" data-card-index="${index}" type="button"${disabledAttr} aria-label="${escapeAttribute(`${card.name}. ${card.description}. ${metaLabel}.`)}">
      <img class="hand-card__art" src="${escapeAttribute(artPath)}" alt="" aria-hidden="true" decoding="async">
      ${
        badgeLabel
          ? `<span class="hand-card__badge ${badgeSpecial ? 'hand-card__badge--special' : ''}">${escapeHtml(badgeLabel)}</span>`
          : ''
      }
    </button>
  `;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function renderActOneHealthBar({
  actor,
  bottom,
  effect,
  hp,
  left,
  maxHp,
  meta,
  ratio,
  title,
}: ActOneHealthBarRenderOptions): string {
  const lostRatio = effect ? Math.max(effect.fromRatio - effect.toRatio, 0) : 0;

  return `
    <article class="act-one-health-bar act-one-health-bar--${actor} ${effect ? 'is-hit' : ''}" style="left:${left}px; bottom:${bottom}px;">
      <div class="act-one-health-bar__topline">
        <strong>${escapeHtml(title)}</strong>
        <span>HP ${hp} / ${maxHp}</span>
      </div>
      <span class="act-one-health-bar__meter">
        <span class="act-one-health-bar__fill" style="width:${ratio}%"></span>
        ${
          effect && lostRatio > 0
            ? `<span class="act-one-health-bar__loss" style="left:${effect.toRatio}%; width:${lostRatio}%"></span>`
            : ''
        }
      </span>
      <span class="act-one-health-bar__meta">${escapeHtml(meta)}</span>
    </article>
  `;
}

export function renderActOneBattleLog({
  bottom,
  entries,
  eyebrow,
  left,
  width,
}: ActOneBattleLogRenderOptions): string {
  return `
    <article class="act-one-battle-log" style="left:${left}px; width:${width}px; bottom:${bottom}px;">
      ${renderEyebrow(eyebrow)}
      <div class="act-one-battle-log__entries">
        ${entries
          .map(
            (entry, index) => `
              <p class="${index === entries.length - 1 ? 'is-current' : ''}">${escapeHtml(entry)}</p>
            `,
          )
          .join('')}
      </div>
    </article>
  `;
}

export function renderActOneFloater({
  bottom,
  className,
  kind,
  left,
  precision,
  text,
}: ActOneFloaterRenderOptions): string {
  const leftValue = precision === undefined ? `${left}` : left.toFixed(precision);
  const bottomValue = precision === undefined ? `${bottom}` : bottom.toFixed(precision);
  const extraClassName = className ? ` ${className}` : '';

  return `
    <span class="act-one-floater act-one-floater--${kind}${extraClassName}" style="left:${leftValue}px; bottom:${bottomValue}px;">
      ${escapeHtml(text)}
    </span>
  `;
}

export function renderActOneBattleOverlay({
  battleLogMarkup,
  battleUiLaneHeight,
  endTurnBottom,
  endTurnLeft,
  endTurnSelected,
  enemyHealthBarMarkup,
  floaterMarkup,
  handMarkup,
  playerHealthBarMarkup,
}: ActOneBattleOverlayRenderOptions): string {
  return `
    <div class="act-one-battle-ui">
      ${playerHealthBarMarkup}
      ${enemyHealthBarMarkup}
      ${battleLogMarkup}
      ${floaterMarkup}
      <button class="app-button act-one-end-turn ${endTurnSelected ? 'is-selected' : ''}" data-end-turn type="button" style="left:${endTurnLeft}px; bottom:${endTurnBottom}px;">Конец хода</button>
      <div class="act-one-battle-controls" style="--act-one-card-dock-height:${battleUiLaneHeight}px;">
        <article class="battle-panel act-one-card-dock">
          <p class="eyebrow">Карты</p>
          <div class="hand-grid">${handMarkup || '<p class="battle-empty">Рука пуста. Завершите ход, чтобы добрать карты.</p>'}</div>
        </article>
      </div>
    </div>
  `;
}
