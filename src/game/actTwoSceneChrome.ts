import { escapeHtml } from './domMarkup';

export type ActTwoPhase = 'explore' | 'dialogue' | 'transition' | 'battle' | 'artifact' | 'complete';

interface VisibilityTarget {
  visible: boolean;
}

interface ActTwoSceneChromeBindings {
  battleStage: VisibilityTarget;
  fieldDecor: VisibilityTarget;
  hudEl: HTMLElement;
  hudEyebrow: string;
  onStatusChange: (copy: string) => void;
  root: HTMLElement;
  transitionEl: HTMLElement;
}

interface ActTwoSceneChromeState {
  phase: ActTwoPhase;
  promptBody: string;
  promptTitle: string;
}

interface ActTwoPhaseChromeRule {
  datasetMode: string;
  showBattleStage: boolean;
  showFieldDecor: boolean;
  showHud: boolean;
  showSceneStatus: boolean;
  showTransition: boolean;
}

const ACT_TWO_PHASE_CHROME_RULES: Record<ActTwoPhase, ActTwoPhaseChromeRule> = {
  explore: {
    datasetMode: 'explore',
    showBattleStage: false,
    showFieldDecor: true,
    showHud: false,
    showSceneStatus: false,
    showTransition: false,
  },
  dialogue: {
    datasetMode: 'dialogue',
    showBattleStage: false,
    showFieldDecor: true,
    showHud: false,
    showSceneStatus: false,
    showTransition: false,
  },
  transition: {
    datasetMode: 'transition',
    showBattleStage: false,
    showFieldDecor: true,
    showHud: false,
    showSceneStatus: false,
    showTransition: true,
  },
  battle: {
    datasetMode: 'battle',
    showBattleStage: true,
    showFieldDecor: false,
    showHud: false,
    showSceneStatus: false,
    showTransition: false,
  },
  artifact: {
    datasetMode: 'artifact',
    showBattleStage: false,
    showFieldDecor: true,
    showHud: false,
    showSceneStatus: false,
    showTransition: false,
  },
  complete: {
    datasetMode: 'complete',
    showBattleStage: false,
    showFieldDecor: true,
    showHud: false,
    showSceneStatus: false,
    showTransition: false,
  },
};

export function applyActTwoSceneChrome(
  bindings: ActTwoSceneChromeBindings,
  state: ActTwoSceneChromeState,
): void {
  const rule = ACT_TWO_PHASE_CHROME_RULES[state.phase];

  bindings.root.dataset.mode = rule.datasetMode;
  bindings.transitionEl.classList.toggle('is-visible', rule.showTransition);
  bindings.battleStage.visible = rule.showBattleStage;
  bindings.fieldDecor.visible = rule.showFieldDecor;
  bindings.onStatusChange(rule.showSceneStatus ? state.promptBody : '');

  if (!rule.showHud) {
    bindings.hudEl.innerHTML = '';
    return;
  }

  bindings.hudEl.innerHTML = `
    <article class="act-two-poc__card">
      <p class="eyebrow">${escapeHtml(bindings.hudEyebrow)}</p>
      <h2>${escapeHtml(state.promptTitle)}</h2>
      <p>${escapeHtml(state.promptBody)}</p>
    </article>
  `;
}
