import { AUDIO_HOOKS } from '../audio/hooks';
import type { SceneAudioController } from '../audio/sceneAudio';
import { escapeHtml } from './domMarkup';

type ScheduleFn = (callback: () => void, delay: number) => number;

interface ActFourCreditsSequenceOptions {
  audio: SceneAudioController;
  isCreditsActive: () => boolean;
  onActionReady?: () => void;
  schedule: ScheduleFn;
}

interface ActFourCreditsRenderOptions {
  action: 'gift' | 'restart';
  actionVisible?: boolean;
  settled?: boolean;
  showThanks?: boolean;
}

export const ACT_FOUR_CREDITS_STATUS = 'A GAME BY... почти.';
export const ACT_FOUR_CREDITS_STRIKE_DELAY_MS = 3000;
export const ACT_FOUR_CREDITS_THANKS_REVEAL_DELAY_MS = 14000;
export const ACT_FOUR_CREDITS_ACTION_REVEAL_DELAY_MS = ACT_FOUR_CREDITS_THANKS_REVEAL_DELAY_MS;

export const ACT_FOUR_CREDITS_COPY = {
  label: 'A GAME BY',
  struckCredit: 'HIDEO KODJIMA',
  finalCredit: 'БРИГАДА ПРОДАКШЕНС',
  birthday: 'С ДНЕМ РОЖДЕНИЯ',
  thanks: 'СПАСИБО ЗА ИГРУ',
  gift: 'Тут Подарок',
  restart: 'Начать заново',
} as const;

const BALLOON_LETTER_COLORS = [
  '#ff5f8f',
  '#ffe66d',
  '#39d4ff',
  '#7ad66d',
  '#b78cff',
  '#ff9f43',
  '#ff6bd6',
] as const;

const BALLOON_LETTER_ACCENTS = [
  '#ffe66d',
  '#39d4ff',
  '#ff5f8f',
  '#b78cff',
  '#ff6bd6',
  '#7ad66d',
  '#ffe66d',
] as const;

const BALLOON_LETTER_ROTATIONS = [-5, 3, -2, 4, -3, 2, -4, 3, -1, 5, -3, 2, -4] as const;
const BALLOON_LETTER_ENTRIES = [
  ['-4.2em', '-1.8em'],
  ['0.3em', '-3.8em'],
  ['3.8em', '-1.4em'],
  ['-3.4em', '2.4em'],
  ['4.4em', '2.1em'],
  ['-4.8em', '0.2em'],
  ['1.1em', '3.7em'],
  ['3.8em', '-2.8em'],
  ['-2.2em', '-3.7em'],
  ['4.7em', '0.4em'],
  ['-3.9em', '2.8em'],
  ['0.4em', '4.2em'],
  ['3.2em', '2.7em'],
] as const;

export function startActFourCreditsSequence(options: ActFourCreditsSequenceOptions): void {
  const { audio, isCreditsActive, onActionReady, schedule } = options;

  audio.playHook(AUDIO_HOOKS.actFour.creditsStart);
  schedule(() => {
    if (isCreditsActive()) {
      audio.playHook(AUDIO_HOOKS.actFour.creditsStrike);
    }
  }, ACT_FOUR_CREDITS_STRIKE_DELAY_MS);
  schedule(() => {
    if (isCreditsActive()) {
      onActionReady?.();
    }
  }, ACT_FOUR_CREDITS_ACTION_REVEAL_DELAY_MS);
}

export function renderActFourCreditsScreen(options: ActFourCreditsRenderOptions): string {
  const actionAttribute = options.action === 'gift' ? 'data-act-four-gift' : 'data-act-four-restart';
  const actionLabel = options.action === 'gift' ? ACT_FOUR_CREDITS_COPY.gift : ACT_FOUR_CREDITS_COPY.restart;
  const shouldShowThanks = options.showThanks ?? true;
  const actionClassName = [
    'app-button',
    'app-button--bright',
    'act-four-credits__restart',
    options.actionVisible ? 'is-visible' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `
    <div class="act-four-credits ${options.settled ? 'is-settled' : ''}" aria-live="polite">
      <div class="act-four-credits__gag" aria-hidden="true">
        <p>${escapeHtml(ACT_FOUR_CREDITS_COPY.label)}</p>
        <strong><span>${escapeHtml(ACT_FOUR_CREDITS_COPY.struckCredit)}</span></strong>
        <span>${escapeHtml(ACT_FOUR_CREDITS_COPY.finalCredit)}</span>
      </div>
      <div class="act-four-credits__message">
        <p class="act-four-credits__birthday" aria-label="${escapeHtml(ACT_FOUR_CREDITS_COPY.birthday)}">${renderBalloonLetters(ACT_FOUR_CREDITS_COPY.birthday)}</p>
        ${shouldShowThanks ? `<p class="act-four-credits__thanks">${escapeHtml(ACT_FOUR_CREDITS_COPY.thanks)}</p>` : ''}
        <button class="${actionClassName}" ${actionAttribute} type="button" disabled>
          ${escapeHtml(actionLabel)}
        </button>
      </div>
    </div>
  `;
}

function renderBalloonLetters(copy: string): string {
  let letterIndex = 0;

  return Array.from(copy)
    .map((letter) => {
      if (letter === ' ') {
        return '<span class="act-four-credits__balloon-space" aria-hidden="true">&nbsp;</span>';
      }

      const color = BALLOON_LETTER_COLORS[letterIndex % BALLOON_LETTER_COLORS.length];
      const accent = BALLOON_LETTER_ACCENTS[letterIndex % BALLOON_LETTER_ACCENTS.length];
      const rotation = BALLOON_LETTER_ROTATIONS[letterIndex % BALLOON_LETTER_ROTATIONS.length];
      const [entryX, entryY] = BALLOON_LETTER_ENTRIES[letterIndex % BALLOON_LETTER_ENTRIES.length];
      const delay = letterIndex * 72;
      letterIndex += 1;

      return `<span class="act-four-credits__balloon-letter" aria-hidden="true" data-letter="${escapeHtml(letter)}" style="--balloon-fill: ${color}; --balloon-accent: ${accent}; --balloon-rotate: ${rotation}deg; --balloon-from-x: ${entryX}; --balloon-from-y: ${entryY}; --balloon-delay: ${delay}ms;">${escapeHtml(letter)}</span>`;
    })
    .join('');
}
