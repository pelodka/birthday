import {
  ACT_ONE_ARTIFACT_IMAGE,
  ACT_ONE_BACKGROUND_CYCLE_COUNT,
  ACT_ONE_CARD_ART,
  ACT_ONE_DECK_TEMPLATES,
  ACT_ONE_ENCOUNTER_CYCLE_INDICES,
  ACT_ONE_INTRO_DIALOGUE,
  ACT_ONE_INTRO_DIALOGUE_SEQUENCE,
  ACT_ONE_RUN_SPEED_STEPS_PER_SECOND,
  createActOneEncounterTemplates,
  getActOneSpriteSheetSpec,
} from '../content/actOne';
import {
  ACT_FOUR_BOSS,
  ACT_FOUR_CARD_ART,
  ACT_FOUR_FOOT_DIALOGUE,
  ACT_FOUR_INTRO_DIALOGUE,
  ACT_FOUR_PLAYER_BATTLE_STANCE,
  ACT_FOUR_PLAYER_TRANSFORM,
  ACT_FOUR_RELIC_CONSUMPTION_DIALOGUE,
  ACT_FOUR_REVEAL_DIALOGUE,
  ACT_FOUR_REVEAL_RESPONSE,
  ACT_FOUR_SHOWDOWN,
  ACT_FOUR_SUPPORT_CARD,
  ACT_FOUR_SUPPORT_CHARACTERS,
  ACT_FOUR_SUPPORT_DIALOGUE,
  ACT_FOUR_SUPPORT_PHASE_DIALOGUE,
  ACT_FOUR_ZERO_DAMAGE_CARDS,
  toActFourBossSpriteSheetSpec,
  toActFourPlayerTransformSpriteSheetSpec,
  toActFourShowdownSpriteSheetSpec,
  toActFourSupportSpriteSheetSpec,
} from '../content/actFour';
import type {
  ActOneCardDefinition,
  ActOneEncounterActorId,
  ActOnePlayerPose,
} from '../content/actOne';
import { AUDIO_HOOKS } from '../audio/hooks';
import type { SceneAudioController } from '../audio/sceneAudio';
import type { GamepadInputManager } from '../input/gamepad';
import type {
  DialogueSequenceDefinition,
  GameContent,
  RelicDefinition,
  SceneDefinition,
  SpriteSheetSpec,
  WorldDialogueSequenceDefinition,
} from '../types';
import {
  ACT_FOUR_ARTIFACT_CONSUME_FLIGHT_MS,
  ACT_FOUR_ARTIFACT_CONSUME_STEP_MS,
  ACT_FOUR_DIALOGUE_EDGE_GAP_PX,
  ACT_FOUR_DIALOGUE_PLAYER_HEAD_ANCHOR,
  ACT_FOUR_DIALOGUE_TAIL_GAP_PX,
  ACT_FOUR_DIALOGUE_VALERA_HEAD_ANCHORS,
  ACT_FOUR_PANEL_CLOSE_DURATION_MS,
  ACT_FOUR_POST_SHOWDOWN_CUTSCENE_FADE_MS,
  ACT_FOUR_POST_SHOWDOWN_CUTSCENE_FALLBACK_MS,
  ACT_FOUR_POST_SHOWDOWN_CUTSCENE_HOLD_MS,
  ACT_FOUR_REVEAL_ZOOM_DURATION_MS,
  ACT_FOUR_SHOWDOWN_MUSIC_DELAY_MS,
  ACT_FOUR_SHOWDOWN_WIN_DELAY_MS,
  ACT_FOUR_ZOOM_IN_SETTLE_MS,
  getActFourCameraScaleForPhase,
  getActFourDialogueSpeakerClass,
  getActFourSupportAnimationId,
  isActFourArtifactRitualPhase,
  isActFourCameraCinematicPhase,
  isActFourCardSelectionPhase,
  isActFourRevealCameraLockedPhase,
  isActFourShowdownOverlayPhase,
} from './actFourFinaleFlow';
import type {
  ActFourDialogueAnchor,
  ActFourDialogueAnchorRatio,
  ActFourDialogueLayout,
  ActFourFinalePhase,
  ActFourSupportPhase,
} from './actFourFinaleFlow';
import {
  ACT_FOUR_CREDITS_STATUS,
  startActFourCreditsSequence,
} from './actFourCredits';
import {
  describeActOneBlockFollowup,
  describeActOneCardLead,
  describeActOneEnemyReaction,
  describeActOneEnemyResolution,
  describeActOneEnemyTurnLead,
  describeActOneEnergyShortage,
  describeActOneTurnStart,
  formatEncounterIntent,
  getActOneBattleLogEyebrow,
  getActOneBattleName,
} from './actOneBattleCopy';
import {
  computeActOneBattleOverlayLayout,
  renderActOneBattleLog,
  renderActOneBattleOverlay,
  renderActOneFloater,
  renderActOneHandCard,
  renderActOneHealthBar,
} from './actOneBattleDomVisuals';
import type {
  ActOneBattleActor,
  ActOneFloater,
  ActOneFloaterKind,
  ActOneHealthBarFx,
} from './actOneBattleDomVisuals';
import { renderActOneDialogueOverlay } from './actOneDialogueDomVisuals';
import {
  ACT_ONE_BOSS_BATTLE_DISPLAY_HEIGHT,
  ACT_ONE_PLAYER_BATTLE_HEIGHT,
  ACT_ONE_PLAYER_WORLD_HEIGHT,
  getActOneBattleHeight,
  getActOneWorldHeight,
  renderActOneOpponent,
  renderActOnePlayerSprite,
  type ActOneFacingDirection,
} from './actOneDomVisuals';
import {
  renderActOneArtifactReveal,
  renderActOneGoPrompt,
  renderActOneRewardToast,
} from './actOneProgressionDomVisuals';
import type { ActOneArtifactRevealState } from './actOneProgressionDomVisuals';
import {
  renderActOneBackgroundCycles,
  renderActOneEncounterPlacement,
  renderActOneStageShell,
} from './actOneStageDomVisuals';
import {
  getActFourArtifactGainLineLayout,
  getActFourRelicTokenState,
  getActFourRelicTargetLayout,
  renderActFourArtifactDialogue,
  renderActFourArtifactGainLine,
  renderActFourArtifactRitual,
  renderActFourBossFeedback,
  renderActFourBossSprite,
  renderActFourFinaleCardSelection,
  renderActFourFinaleShell,
  renderActFourPanelClose,
  renderActFourPlayerSprite,
  renderActFourRelicTokens,
  renderActFourShowdownOverlay,
  renderActFourSupportDialogue,
  renderActFourSupportOverlay,
  renderActFourWinReady,
} from './actFourDomVisuals';
import { escapeCssUrl, escapeHtml, renderEyebrow, renderTextParagraphs } from './domMarkup';
import { createScheduler } from './scheduler';

interface DomEncounterConfig {
  target: HTMLElement;
  scene: SceneDefinition;
  content: GameContent;
  input: GamepadInputManager;
  audio: SceneAudioController;
  onComplete: () => void;
  onRestart: () => void;
  onStatusChange: (copy: string) => void;
}

interface CombatantState {
  id: string;
  name: string;
  battleName: string;
  hp: number;
  maxHp: number;
  intent?: string;
  damage?: number;
  alive?: boolean;
}

type CardState = ActOneCardDefinition;
type ActOneDialogueState = WorldDialogueSequenceDefinition;

interface ActOneEncounterState extends CombatantState {
  id: ActOneEncounterActorId;
  position: number;
  battleIntro: string;
  dialogue: WorldDialogueSequenceDefinition;
  dialogueSequence?: WorldDialogueSequenceDefinition[];
  responseDialogue?: WorldDialogueSequenceDefinition;
  rewardCard?: CardState;
  rewardCopy?: string;
  worldState: 'idle' | 'falling' | 'gone' | 'artifact';
  boss?: boolean;
}

type ActOneMode =
  | 'intro-dialogue'
  | 'explore'
  | 'encounter-dialogue'
  | 'fight-splash'
  | 'battle'
  | 'defeat-animation'
  | 'reward-toast'
  | 'artifact-reveal'
  | 'artifact-flight'
  | 'artifact-dialogue';

interface ActFourSupportState {
  phase: ActFourSupportPhase;
  dialogueIndex: number;
}

type Cleanup = () => void;

type ActOneMoveDirection = -1 | 0 | 1;
type ActOneBattleFocusTarget =
  | { kind: 'card'; index: number }
  | { kind: 'end-turn' }
  | null;
type ActOneBattleControlTarget = Exclude<ActOneBattleFocusTarget, null>;

const ACT_ONE_GO_PROMPT_DURATION_MS = 3000;

interface ActOneBattleCardSlot {
  card: CardState;
  index: number;
}

export function mountDomEncounter(config: DomEncounterConfig): Cleanup {
  switch (config.scene.id) {
    case 'act-1-calendar':
    case 'act-4-finale':
      return mountCardBattle(config);
    default:
      config.target.innerHTML = `
        <section class="battle-shell">
          <article class="battle-panel">
            <p class="eyebrow">Unsupported Act</p>
            <h2>${escapeHtml(config.scene.title)}</h2>
            <p>This DOM battle frame has not been wired for this scene yet.</p>
          </article>
        </section>
      `;
      return () => {
        config.target.innerHTML = '';
      };
  }
}

function mountCardBattle({
  target,
  scene,
  content,
  input,
  audio,
  onComplete,
  onRestart,
  onStatusChange,
}: DomEncounterConfig): Cleanup {
  const isActFourPoc = scene.id === 'act-4-finale';
  const scheduler = createScheduler();
  const baseFloorOffset = Number.parseInt(scene.backgroundFloorOffset ?? '68', 10) || 68;
  const { schedule } = scheduler;

  const readViewportSize = (): { width: number; height: number } => ({
    width: Math.max(320, target.clientWidth || window.innerWidth || 960),
    height: Math.max(480, target.clientHeight || window.innerHeight || 720),
  });

  const computeResponsiveSpriteScale = (width: number, height: number): number => {
    if (height <= 720) {
      return 1.45;
    }

    if (height <= 840) {
      return 1.65;
    }

    if (width <= 820) {
      return 1.7;
    }

    const widthRatio = width / 720;
    const heightRatio = height / 520;
    return clamp(Number((Math.min(widthRatio, heightRatio) * 1.22).toFixed(2)), 1.2, 1.9);
  };

  const computeResponsiveFloorOffset = (height: number, responsiveSpriteScale: number): number => {
    const desiredFloorOffset = baseFloorOffset + Math.round(Math.min(height * 0.02, 18));
    const maxFloorOffsetForBoss = Math.max(
      84,
      Math.floor(height - ACT_ONE_BOSS_BATTLE_DISPLAY_HEIGHT * responsiveSpriteScale - 26),
    );

    return Math.max(Math.min(desiredFloorOffset, maxFloorOffsetForBoss), Math.min(84, maxFloorOffsetForBoss));
  };

  const computeResponsiveBattleUiLaneHeight = (
    width: number,
    height: number,
    _responsiveSpriteScale: number,
  ): number => {
    const baseDockHeight =
      height <= 720 ? 214 : height <= 840 ? 248 : width <= 820 ? 244 : 272;
    const desiredDockHeight = Math.round(baseDockHeight * 1.5);
    const maxDockHeight = Math.max(baseFloorOffset, Math.floor(height * (width <= 820 ? 0.48 : 0.5)));
    const baseMinDockHeight = height <= 720 ? 184 : 204;
    const minDockHeight = Math.min(Math.round(baseMinDockHeight * 1.5), maxDockHeight);

    return clamp(desiredDockHeight, minDockHeight, maxDockHeight);
  };

  let viewportWidth = 0;
  let viewportHeight = 0;
  let worldWidth = 0;
  let playerStartX = 0;
  let moveStep = 0;
  let battleFrameInset = 0;
  let followInset = 0;
  let floorOffset = 0;
  let battleUiLaneHeight = 0;
  let spriteScale = 2;
  let actFourCutsceneFadeStarted = false;
  let actFourGiftWatched = false;
  let actFourGiftVideo: HTMLVideoElement | null = null;

  const encounters: ActOneEncounterState[] = createActOneEncounterTemplates(scene)
    .slice(0, isActFourPoc ? 1 : undefined)
    .map((encounter) => {
      const nextEncounter: ActOneEncounterState = {
        ...encounter,
        rewardCard: isActFourPoc ? undefined : encounter.rewardCard,
        rewardCopy: isActFourPoc ? scene.outro : encounter.rewardCopy,
        alive: true,
        position: 0,
        worldState: 'idle',
      };

      if (!isActFourPoc) {
        return nextEncounter;
      }

      return {
        ...nextEncounter,
        name: ACT_FOUR_BOSS.name,
        battleName: ACT_FOUR_BOSS.name,
        hp: 1,
        maxHp: 1,
        damage: 0,
        intent: 'HP ∞. Основание: юбилей.',
        battleIntro: 'Обычный карточный бой загружается и сразу начинает выглядеть подозрительно.',
        dialogue: {
          ...ACT_FOUR_REVEAL_DIALOGUE,
          anchor: 'enemy',
        },
        responseDialogue: {
          ...ACT_FOUR_REVEAL_RESPONSE,
          anchor: 'player',
        },
        boss: true,
      };
    });

  const introDialogueSequence: ActOneDialogueState[] = isActFourPoc
    ? [ACT_FOUR_INTRO_DIALOGUE]
    : ACT_ONE_INTRO_DIALOGUE_SEQUENCE;
  const introDialogue: ActOneDialogueState = introDialogueSequence[0] ?? ACT_ONE_INTRO_DIALOGUE;

  const buildDeck = (): CardState[] =>
    shuffle([
      ...ACT_ONE_DECK_TEMPLATES.map((card) => ({ ...card })),
      ...ACT_ONE_DECK_TEMPLATES.filter((card) => card.id !== 'reply-all').map((card) => ({ ...card })),
    ]);

  const updateEncounterPositions = (): void => {
    const cycleWidth = viewportWidth;
    const encounterAnchorX = cycleWidth - battleFrameInset;

    encounters.forEach((encounter, index) => {
      const cycleIndex = ACT_ONE_ENCOUNTER_CYCLE_INDICES[index] ?? index + 1;
      encounter.position = cycleIndex * cycleWidth + encounterAnchorX;
    });

    worldWidth = Math.max(cycleWidth * ACT_ONE_BACKGROUND_CYCLE_COUNT, 1400);
  };

  let mode: ActOneMode = 'intro-dialogue';
  let discardPile: CardState[] = [];
  let hand: CardState[] = [];
  let drawPile = buildDeck();
  let encounterIndex = 0;
  let dialogue: ActOneDialogueState | null = introDialogue;
  let introDialogueStep = 0;
  let encounterDialogueStep = 0;
  let playerX = 0;
  let playerHp = 48;
  let playerMaxHp = 48;
  let playerBlock = 0;
  let energy = 3;
  let turn = 1;
  let victoryLocked = false;
  let statusCopy = 'Три реплики вступления, а дальше начинается путь.';
  let rewardToast: CardState | null = null;
  const cardArtById = {
    ...ACT_ONE_CARD_ART,
    ...ACT_FOUR_CARD_ART,
  } as const satisfies Record<string, { image: string }>;
  const loadedCardArt = new Set<string>();
  let cardArtPreloadDisposed = false;
  const unlockedBossCards: CardState[] = [];
  const spentBossCards = new Set<string>();
  let actFourFinalePhase: ActFourFinalePhase = 'approach';
  let actFourZeroCardsPlayed = 0;
  let actFourArtifactDialogueIndex = 0;
  let actFourLastConsumedRelicId: string | null = null;
  let actFourArtifactGainLine: string | null = null;
  const actFourConsumedRelicIds = new Set<string>();
  let actFourRevealZoomInProgress = false;
  let actFourSupportCardUsed = false;
  let actFourSupportState: ActFourSupportState | null = null;
  let actFourEncounterCameraX: number | null = null;
  let actFourFootNoticePlayed = false;
  let actFourBossAnimationFrame = 0;
  let actFourBossAnimationStartedAt = 0;
  let actFourShowdownAnimationFrame = 0;
  let actFourShowdownStartedAt = 0;
  let actFourShowdownWinReady = false;
  let actFourShowdownSfxPlayed = false;
  let actFourSupportAnimationFrame = 0;
  let actFourSupportAnimationStartedAt = 0;
  let actFourPlayerTransformAnimationFrame = 0;
  let actFourPlayerTransformAnimationStartedAt = 0;
  let actFourCutsceneVideo: HTMLVideoElement | null = null;
  let playerIsMoving = false;
  let playerFacingDirection: ActOneFacingDirection = 1;
  let leftInputHeld = false;
  let rightInputHeld = false;
  let gamepadMoveDirection: ActOneMoveDirection = 0;
  let gamepadBattleNavX: ActOneMoveDirection = 0;
  let gamepadBattleNavY: ActOneMoveDirection = 0;
  let preferredMoveDirection: ActOneFacingDirection = 1;
  let actOneGoPromptVisible = false;
  let actOneGoPromptToken = 0;
  let battleFocusTarget: ActOneBattleFocusTarget = null;
  let battleLogEntries: string[] = [];
  let enemyTurnPending = false;
  let battleFxId = 0;
  let healthBarFx: Record<ActOneBattleActor, ActOneHealthBarFx | null> = {
    player: null,
    enemy: null,
  };
  let floaters: ActOneFloater[] = [];
  let resizeFrame = 0;
  let movementFrame = 0;
  let movementTimestamp = 0;
  let spriteSheetAnimationFrame = 0;
  let battleFocusFrame = 0;

  audio.playHook(isActFourPoc ? AUDIO_HOOKS.actFour.approachStart : AUDIO_HOOKS.actOne.introDialogue);

  const currentEncounter = (): ActOneEncounterState | undefined => encounters[encounterIndex];
  const getActFourRelics = (): RelicDefinition[] =>
    content.transformation.steps
      .map((step) => content.relics.find((relic) => relic.id === step.relicId))
      .filter((relic): relic is RelicDefinition => Boolean(relic));
  const getActFourRelicActivationLine = (relic: RelicDefinition): string =>
    content.transformation.steps.find((step) => step.relicId === relic.id)?.callout ??
    relic.finaleLabel ??
    relic.name;
  const getRelicImagePath = (relic: RelicDefinition): string | undefined =>
    relic.imagePath ?? (relic.id === 'calendar-core' ? ACT_ONE_ARTIFACT_IMAGE : undefined);
  const getActFourCameraScale = (): number =>
    isActFourPoc ? getActFourCameraScaleForPhase(actFourFinalePhase) : 1;
  const isActFourCameraCinematic = (): boolean =>
    isActFourPoc && isActFourCameraCinematicPhase(actFourFinalePhase);
  const getTrackTransform = (activeCameraX: number): string => `translateX(${-activeCameraX}px)`;
  const getWorldTransform = (): string => `scale(${getActFourCameraScale()})`;
  const getWorldTransformOrigin = (activeCameraX: number): string =>
    `${(activeCameraX + viewportWidth * 0.58).toFixed(2)}px bottom`;
  const getWorldTransformOriginX = (activeCameraX: number): number => activeCameraX + viewportWidth * 0.58;
  const projectWorldXToScreen = (worldX: number, activeCameraX: number): number => {
    const cameraScale = getActFourCameraScale();
    if (!isActFourPoc || cameraScale === 1) {
      return worldX - activeCameraX;
    }

    const originX = getWorldTransformOriginX(activeCameraX);
    return originX + (worldX - originX) * cameraScale - activeCameraX;
  };
  const applyTrackCameraStyles = (trackEl: HTMLElement, activeCameraX: number): void => {
    trackEl.style.transform = getTrackTransform(activeCameraX);
    trackEl.style.transformOrigin = 'left bottom';
    trackEl.classList.toggle('is-cinematic-camera', isActFourCameraCinematic());
  };
  const applyWorldCameraStyles = (worldEl: HTMLElement, activeCameraX: number): void => {
    worldEl.style.transform = getWorldTransform();
    worldEl.style.transformOrigin = getWorldTransformOrigin(activeCameraX);
    worldEl.classList.toggle('is-cinematic-camera', isActFourCameraCinematic());
  };
  const syncActFourCameraDom = (activeCameraX = cameraX()): boolean => {
    const viewportEl = target.querySelector<HTMLElement>('.act-one-stage__viewport');
    const trackEl = target.querySelector<HTMLElement>('.act-one-stage__track');
    const worldEl = target.querySelector<HTMLElement>('.act-one-stage__world');

    if (!viewportEl || !trackEl || !worldEl) {
      return false;
    }

    viewportEl.dataset.actFourPhase = actFourFinalePhase;
    syncActFourShellPhase();
    applyTrackCameraStyles(trackEl, activeCameraX);
    applyWorldCameraStyles(worldEl, activeCameraX);
    return true;
  };
  const startActFourRevealZoom = (): void => {
    if (!isActFourPoc || actFourRevealZoomInProgress || actFourFinalePhase !== 'boss-reveal-start') {
      return;
    }

    actFourRevealZoomInProgress = true;
    actFourFinalePhase = 'boss-reveal';
    audio.playHook(AUDIO_HOOKS.actFour.revealZoomOut);
    setStatus('Камера отъезжает: это не нога, а полвека, получившие форму и право голоса.');
    if (!syncActFourCameraDom()) {
      render();
    }

    schedule(() => {
      if (mode !== 'encounter-dialogue' || actFourFinalePhase !== 'boss-reveal') {
        actFourRevealZoomInProgress = false;
        return;
      }

      actFourRevealZoomInProgress = false;
      dialogue = currentEncounter()?.dialogue ?? dialogue;
      if (!patchActFourRevealDialogue()) {
        render();
      }
    }, ACT_FOUR_REVEAL_ZOOM_DURATION_MS);
  };
  const startActFourZoomIn = (): void => {
    if (!isActFourPoc) {
      return;
    }

    const encounter = currentEncounter();
    if (encounter) {
      playerX = encounterPlayerFrameX(encounter);
    }
    dialogue = null;
    actFourFinalePhase = 'boss-reveal';
    setStatus('Камера возвращается. Обычные карты выходят на сцену с очень плохой юридической позицией.');
    if (!patchActFourRevealZoomStart()) {
      render();
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (mode !== 'encounter-dialogue' || actFourFinalePhase !== 'boss-reveal') {
          return;
        }

        actFourFinalePhase = 'zoom-in';
        actFourEncounterCameraX = null;
        audio.playHook(AUDIO_HOOKS.actFour.revealZoomIn);
        if (!syncActFourCameraDom()) {
          render();
        }
        schedule(startBattle, ACT_FOUR_REVEAL_ZOOM_DURATION_MS + ACT_FOUR_ZOOM_IN_SETTLE_MS);
      });
    });
  };
  const syncActFourShellPhase = (): void => {
    if (!isActFourPoc) {
      return;
    }

    const shell = target.closest<HTMLElement>('.stage-shell');
    if (shell) {
      shell.dataset.actFourPhase = actFourFinalePhase;
    }
  };
  const getEncounterStartHook = (encounter: ActOneEncounterState): string => {
    if (isActFourPoc) {
      return AUDIO_HOOKS.actFour.revealStart;
    }

    if (encounter.boss) {
      return AUDIO_HOOKS.actOne.encounterStartBoss;
    }

    return encounter.id === 'slide-cultist'
      ? AUDIO_HOOKS.actOne.encounterStartSecond
      : AUDIO_HOOKS.actOne.encounterStartOpening;
  };
  const getBattleStartHook = (encounter: ActOneEncounterState): string => {
    if (isActFourPoc) {
      return AUDIO_HOOKS.actFour.cardsStart;
    }

    if (encounter.boss) {
      return AUDIO_HOOKS.actOne.battleStartBoss;
    }

    return encounter.id === 'slide-cultist'
      ? AUDIO_HOOKS.actOne.battleStartSecond
      : AUDIO_HOOKS.actOne.battleStartOpening;
  };
  const getCardArtPath = (cardId: string): string | null => {
    const art = cardArtById[cardId as keyof typeof cardArtById];
    if (!art || !loadedCardArt.has(cardId)) {
      return null;
    }

    return art.image;
  };
  const findVisibleCardState = (cardId: string, cardIndex: string | undefined): CardState | null => {
    const parsedIndex = Number(cardIndex);
    if (Number.isInteger(parsedIndex) && hand[parsedIndex]?.id === cardId) {
      return hand[parsedIndex]!;
    }

    return hand.find((card) => card.id === cardId) ?? (rewardToast?.id === cardId ? rewardToast : null);
  };
  const patchLoadedCardArt = (cardId: string): void => {
    const artPath = getCardArtPath(cardId);
    if (!artPath) {
      return;
    }

    target.querySelectorAll<HTMLButtonElement>('.hand-card[data-card]').forEach((button) => {
      if (button.dataset.card !== cardId || button.querySelector('.hand-card__art')) {
        return;
      }

      const card = findVisibleCardState(cardId, button.dataset.cardIndex);
      if (!card) {
        return;
      }

      const isActFourCard = button.closest('.act-four-card-dock') !== null;
      const metaLabel = isActFourCard
        ? card.id === ACT_FOUR_SUPPORT_CARD.id
          ? 'Поддержка'
          : 'Урон 0'
        : card.persistent
          ? 'Карта босса'
          : `Цена ${card.cost}`;
      const image = document.createElement('img');
      image.className = 'hand-card__art';
      image.src = artPath;
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');
      image.decoding = 'async';
      button.classList.add('hand-card--art');
      button.setAttribute('aria-label', `${card.name}. ${card.description}. ${metaLabel}.`);

      if (!isActFourCard) {
        button.replaceChildren(image);
        return;
      }

      const badge = document.createElement('span');
      badge.className = `hand-card__badge ${card.id === ACT_FOUR_SUPPORT_CARD.id ? 'hand-card__badge--special' : ''}`.trim();
      badge.textContent = metaLabel;
      button.replaceChildren(image, badge);
    });

    if (mode !== 'reward-toast' || rewardToast?.id !== cardId) {
      return;
    }

    const rewardButton = target.querySelector<HTMLButtonElement>('.act-one-reward[data-reward-continue]');
    if (!rewardButton || rewardButton.querySelector('.act-one-reward__art')) {
      return;
    }

    const rewardImage = document.createElement('img');
    rewardImage.className = 'act-one-reward__art';
    rewardImage.src = artPath;
    rewardImage.alt = '';
    rewardImage.setAttribute('aria-hidden', 'true');
    rewardImage.decoding = 'async';

    const hint = document.createElement('span');
    hint.className = 'act-one-reward__hint act-one-reward__hint--overlay';
    hint.textContent = 'Press X';

    rewardButton.classList.add('act-one-reward--art');
    rewardButton.setAttribute('aria-label', `${rewardToast.name}. ${rewardToast.description}. Press X.`);
    rewardButton.replaceChildren(rewardImage, hint);
  };
  const preloadCardArt = (): void => {
    Object.entries(cardArtById).forEach(([cardId, art]) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        if (cardArtPreloadDisposed || loadedCardArt.has(cardId)) {
          return;
        }

        loadedCardArt.add(cardId);
        patchLoadedCardArt(cardId);
      };
      image.onerror = () => {
        if (cardArtPreloadDisposed) {
          return;
        }

        loadedCardArt.delete(cardId);
      };
      image.src = art.image;
    });
  };
  const encounterCycleIndex = (encounter: ActOneEncounterState): number => {
    const orderedIndex = encounters.indexOf(encounter);
    return ACT_ONE_ENCOUNTER_CYCLE_INDICES[orderedIndex] ?? orderedIndex + 1;
  };
  const maxCameraX = (): number => Math.max(worldWidth - viewportWidth, 0);
  const hpRatio = (hp: number, maxHp: number): number => clamp((hp / Math.max(maxHp, 1)) * 100, 0, 100);
  const encounterLockCameraX = (encounter: ActOneEncounterState): number =>
    clamp(encounter.position - (viewportWidth - battleFrameInset), 0, maxCameraX());
  const encounterPlayerFrameX = (encounter: ActOneEncounterState): number =>
    clamp(encounter.position - (viewportWidth - battleFrameInset * 2), 80, worldWidth - 120);
  const actFourRevealPlayerFrameX = (encounter: ActOneEncounterState): number => {
    const revealGap = Math.round(clamp(viewportWidth * 0.72, viewportWidth * 0.58, viewportWidth * 0.82));
    return clamp(encounter.position - revealGap, 80, worldWidth - 120);
  };
  const actFourBossFootScreenLeft = (encounter: ActOneEncounterState, activeCameraX: number): number => {
    const sprite = ACT_FOUR_BOSS.sprite;
    const sheetSpec = toActFourBossSpriteSheetSpec(sprite);
    const sheetScale = (sheetSpec.displayHeight * spriteScale) / sheetSpec.cropHeight;
    const footRevealX = sprite.footRevealX ?? sheetSpec.cropWidth * 0.5;
    const bossScreenX = encounter.position - activeCameraX;
    return bossScreenX - (sheetSpec.cropWidth * sheetScale) / 2 + footRevealX * sheetScale;
  };
  const isActFourBossFootVisible = (encounter: ActOneEncounterState, activeCameraX: number): boolean =>
    actFourBossFootScreenLeft(encounter, activeCameraX) <= viewportWidth - clamp(viewportWidth * 0.08, 96, 180);
  const startActFourBossRevealDialogue = (encounter: ActOneEncounterState): void => {
    actFourEncounterCameraX = cameraX();
    encounterDialogueStep = 0;
    dialogue = { ...ACT_FOUR_FOOT_DIALOGUE, anchor: 'player' };
    mode = 'encounter-dialogue';
    actFourFinalePhase = 'boss-reveal-start';
    audio.playHook(getEncounterStartHook(encounter));
    setStatus('Александр дошёл до масштаба, где число уже отбрасывает тень.');
    if (!patchActFourExploreToBossReveal()) {
      render();
    }
  };
  const encounterApproachStartX = (encounter: ActOneEncounterState): number =>
    clamp(Math.max(encounterCycleIndex(encounter) - 1, 0) * viewportWidth + playerStartX, 80, worldWidth - 120);
  const followCameraX = (): number => clamp(playerX - followInset, 0, maxCameraX());
  const resolveHeldMoveDirection = (): ActOneMoveDirection => {
    if (gamepadMoveDirection !== 0) {
      return gamepadMoveDirection;
    }

    if (leftInputHeld && rightInputHeld) {
      return preferredMoveDirection;
    }

    if (leftInputHeld) {
      return -1;
    }

    if (rightInputHeld) {
      return 1;
    }

    return 0;
  };
  const stopSpriteSheetAnimation = (): void => {
    if (!spriteSheetAnimationFrame) {
      return;
    }

    cancelAnimationFrame(spriteSheetAnimationFrame);
    spriteSheetAnimationFrame = 0;
  };
  const stopActFourSupportAnimation = (): void => {
    if (!actFourSupportAnimationFrame) {
      return;
    }

    cancelAnimationFrame(actFourSupportAnimationFrame);
    actFourSupportAnimationFrame = 0;
  };
  const stopActFourPlayerTransformAnimation = (): void => {
    if (!actFourPlayerTransformAnimationFrame) {
      return;
    }

    cancelAnimationFrame(actFourPlayerTransformAnimationFrame);
    actFourPlayerTransformAnimationFrame = 0;
  };
  const stopActFourBossAnimation = (): void => {
    if (!actFourBossAnimationFrame) {
      return;
    }

    cancelAnimationFrame(actFourBossAnimationFrame);
    actFourBossAnimationFrame = 0;
  };
  const stopActFourShowdownAnimation = (): void => {
    if (!actFourShowdownAnimationFrame) {
      return;
    }

    cancelAnimationFrame(actFourShowdownAnimationFrame);
    actFourShowdownAnimationFrame = 0;
  };
  const syncActFourSupportAnimation = (): void => {
    stopActFourSupportAnimation();

    if (!isActFourPoc || !actFourSupportState || actFourSupportState.phase === 'done') {
      return;
    }

    const sheetElement = target.querySelector<HTMLElement>('[data-act-four-support-sheet]');
    if (!sheetElement) {
      return;
    }

    const phase = actFourSupportState.phase;
    const animationId = getActFourSupportAnimationId(phase);
    const sprite = ACT_FOUR_SUPPORT_CHARACTERS.valera.sprites[animationId];
    const sheetSpec = toActFourSupportSpriteSheetSpec(sprite);
    const startedAt = actFourSupportAnimationStartedAt || performance.now();
    actFourSupportAnimationStartedAt = startedAt;

    const paint = (timestamp: number): void => {
      if (!sheetElement.isConnected || !actFourSupportState || actFourSupportState.phase !== phase) {
        actFourSupportAnimationFrame = 0;
        return;
      }

      const elapsed = Math.max(timestamp - startedAt, 0);
      const rawFrame = Math.floor(elapsed / sheetSpec.frameDurationMs);
      const shouldLoop = phase === 'idle-dialogue' || phase === 'support-loop';
      const forwardFrame = shouldLoop ? rawFrame % sheetSpec.frameCount : Math.min(rawFrame, sheetSpec.frameCount - 1);
      const frameIndex = phase === 'summon' ? sheetSpec.frameCount - 1 - forwardFrame : forwardFrame;
      paintSpriteSheetFrame(sheetElement, sheetSpec, frameIndex);

      if (!shouldLoop && rawFrame >= sheetSpec.frameCount - 1) {
        actFourSupportAnimationFrame = 0;
        return;
      }

      actFourSupportAnimationFrame = requestAnimationFrame(paint);
    };

    paint(performance.now());
  };
  const syncActFourBossAnimation = (): void => {
    stopActFourBossAnimation();

    if (!isActFourPoc) {
      return;
    }

    const sheetElement = target.querySelector<HTMLElement>('[data-act-four-boss-sheet]');
    const imageElement = target.querySelector<HTMLImageElement>('[data-act-four-boss-sheet-image]');
    if (!sheetElement || !imageElement) {
      return;
    }

    const sheetSpec = toActFourBossSpriteSheetSpec(ACT_FOUR_BOSS.sprite);
    const startedAt = actFourBossAnimationStartedAt || performance.now();
    actFourBossAnimationStartedAt = startedAt;

    const paint = (timestamp: number): void => {
      if (!sheetElement.isConnected) {
        actFourBossAnimationFrame = 0;
        return;
      }

      const elapsed = Math.max(timestamp - startedAt, 0);
      const frameIndex = Math.floor(elapsed / sheetSpec.frameDurationMs) % sheetSpec.frameCount;
      paintImageSpriteSheetFrame(sheetElement, imageElement, sheetSpec, frameIndex);
      sheetElement.classList.toggle('is-flipped-x', ACT_FOUR_BOSS.sprite.flipX === true);
      const sheetScale = (sheetSpec.displayHeight * spriteScale) / sheetSpec.cropHeight;
      const footBaselineY = ACT_FOUR_BOSS.sprite.footBaselineY ?? sheetSpec.cropHeight;
      const footSink = Math.max((sheetSpec.frameHeight - footBaselineY) * sheetScale, 0);
      sheetElement.style.bottom = `${(-footSink).toFixed(2)}px`;
      actFourBossAnimationFrame = requestAnimationFrame(paint);
    };

    paint(performance.now());
  };
  const paintShowdownSpriteSheetFrame = (
    sheetElement: HTMLElement,
    sheetSpec: SpriteSheetSpec,
    frameIndex: number,
  ): void => {
    const scale = sheetSpec.displayHeight / sheetSpec.cropHeight;
    const width = sheetSpec.cropWidth * scale;
    const height = sheetSpec.displayHeight;
    const backgroundWidth = sheetSpec.sheetWidth * scale;
    const backgroundHeight = sheetSpec.sheetHeight * scale;
    const frame = sheetSpec.frames[frameIndex % sheetSpec.frameCount];
    if (!frame) {
      return;
    }

    sheetElement.style.width = `${width.toFixed(2)}px`;
    sheetElement.style.height = `${height.toFixed(2)}px`;
    sheetElement.style.backgroundImage = `url("${escapeCssUrl(sheetSpec.image)}")`;
    sheetElement.style.backgroundSize = `${backgroundWidth.toFixed(2)}px ${backgroundHeight.toFixed(2)}px`;
    sheetElement.style.backgroundPosition = `${(-((frame.x + sheetSpec.cropX) * scale)).toFixed(2)}px ${(-((frame.y + sheetSpec.cropY) * scale)).toFixed(2)}px`;
  };
  const syncActFourShowdownAnimation = (): void => {
    stopActFourShowdownAnimation();

    if (!isActFourPoc || actFourFinalePhase !== 'showdown') {
      return;
    }

    const playerSheet = target.querySelector<HTMLElement>('[data-act-four-showdown-sheet="player"]');
    const bossSheet = target.querySelector<HTMLElement>('[data-act-four-showdown-sheet="boss"]');
    if (!playerSheet || !bossSheet) {
      return;
    }

    const playerSpec = toActFourShowdownSpriteSheetSpec(ACT_FOUR_SHOWDOWN.player);
    const bossSpec = toActFourShowdownSpriteSheetSpec(ACT_FOUR_SHOWDOWN.boss);
    const startedAt = actFourShowdownStartedAt || performance.now();
    actFourShowdownStartedAt = startedAt;

    const paint = (timestamp: number): void => {
      if (!playerSheet.isConnected || !bossSheet.isConnected || actFourFinalePhase !== 'showdown') {
        actFourShowdownAnimationFrame = 0;
        return;
      }

      const elapsed = Math.max(timestamp - startedAt, 0);
      paintShowdownSpriteSheetFrame(
        playerSheet,
        playerSpec,
        Math.floor(elapsed / playerSpec.frameDurationMs) % playerSpec.frameCount,
      );
      paintShowdownSpriteSheetFrame(
        bossSheet,
        bossSpec,
        Math.floor(elapsed / bossSpec.frameDurationMs) % bossSpec.frameCount,
      );
      bossSheet.classList.toggle('is-flipped-x', ACT_FOUR_SHOWDOWN.boss.flipX === true);
      actFourShowdownAnimationFrame = requestAnimationFrame(paint);
    };

    paint(performance.now());
  };
  const syncPlayerSpriteMarkup = (pose: ActOnePlayerPose): void => {
    const playerEl = target.querySelector<HTMLElement>('.act-one-player');

    if (!playerEl) {
      return;
    }

    const spriteStack = playerEl.querySelector<HTMLElement>('[data-act-one-player-sprite-stack]');
    if (spriteStack && (pose === 'standing' || pose === 'running')) {
      spriteStack.dataset.activePose = pose;
      spriteStack.querySelectorAll<HTMLElement>('.act-one-player__sprite').forEach((spriteEl) => {
        spriteEl.classList.toggle('is-active', spriteEl.classList.contains(`act-one-player__sprite--${pose}`));
        spriteEl.classList.toggle('is-facing-left', playerFacingDirection < 0);
      });
      return;
    }

    stopActFourPlayerTransformAnimation();
    playerEl.innerHTML = renderActOnePlayerSprite(pose, playerFacingDirection);
    syncSpriteSheetAnimations();
  };
  const paintSpriteSheetFrame = (
    sheetElement: HTMLElement,
    sheetSpec: SpriteSheetSpec,
    frameIndex: number,
  ): void => {
    const scale = (sheetSpec.displayHeight * spriteScale) / sheetSpec.cropHeight;
    const width = sheetSpec.cropWidth * scale;
    const height = sheetSpec.displayHeight * spriteScale;
    const backgroundWidth = sheetSpec.sheetWidth * scale;
    const backgroundHeight = sheetSpec.sheetHeight * scale;
    const frame = sheetSpec.frames[frameIndex % sheetSpec.frameCount];

    if (!frame) {
      return;
    }

    sheetElement.style.width = `${width.toFixed(2)}px`;
    sheetElement.style.height = `${height.toFixed(2)}px`;
    sheetElement.style.backgroundImage = `url("${escapeCssUrl(sheetSpec.image)}")`;
    sheetElement.style.backgroundSize = `${backgroundWidth.toFixed(2)}px ${backgroundHeight.toFixed(2)}px`;
    sheetElement.style.backgroundPosition = `${(-((frame.x + sheetSpec.cropX) * scale)).toFixed(2)}px ${(-((frame.y + sheetSpec.cropY) * scale)).toFixed(2)}px`;
  };
  const paintImageSpriteSheetFrame = (
    sheetElement: HTMLElement,
    imageElement: HTMLImageElement,
    sheetSpec: SpriteSheetSpec,
    frameIndex: number,
  ): void => {
    const scale = (sheetSpec.displayHeight * spriteScale) / sheetSpec.cropHeight;
    const width = sheetSpec.cropWidth * scale;
    const height = sheetSpec.displayHeight * spriteScale;
    const imageWidth = sheetSpec.sheetWidth * scale;
    const imageHeight = sheetSpec.sheetHeight * scale;
    const frame = sheetSpec.frames[frameIndex % sheetSpec.frameCount];

    if (!frame) {
      return;
    }

    sheetElement.style.width = `${width.toFixed(2)}px`;
    sheetElement.style.height = `${height.toFixed(2)}px`;
    imageElement.style.width = `${imageWidth.toFixed(2)}px`;
    imageElement.style.height = `${imageHeight.toFixed(2)}px`;
    imageElement.style.transform = `translate3d(${(-((frame.x + sheetSpec.cropX) * scale)).toFixed(2)}px, ${(-((frame.y + sheetSpec.cropY) * scale)).toFixed(2)}px, 0)`;
  };
  const syncActFourPlayerTransformationAnimation = (): void => {
    stopActFourPlayerTransformAnimation();

    const transformActive = isActFourArtifactRitualPhase(actFourFinalePhase);
    if (!isActFourPoc || !transformActive) {
      return;
    }

    const sheetElement = target.querySelector<HTMLElement>('[data-act-four-player-transform-sheet]');
    if (!sheetElement) {
      return;
    }

    const sheetSpec = toActFourPlayerTransformSpriteSheetSpec(ACT_FOUR_PLAYER_TRANSFORM);
    const startedAt = actFourPlayerTransformAnimationStartedAt || performance.now();
    actFourPlayerTransformAnimationStartedAt = startedAt;

    const paint = (timestamp: number): void => {
      const stillTransforming = isActFourArtifactRitualPhase(actFourFinalePhase);
      if (!sheetElement.isConnected || !stillTransforming) {
        actFourPlayerTransformAnimationFrame = 0;
        return;
      }

      const elapsed = Math.max(timestamp - startedAt, 0);
      const frameIndex = Math.floor(elapsed / sheetSpec.frameDurationMs) % sheetSpec.frameCount;
      paintSpriteSheetFrame(sheetElement, sheetSpec, frameIndex);
      actFourPlayerTransformAnimationFrame = requestAnimationFrame(paint);
    };

    paint(performance.now());
  };
  const syncSpriteSheetAnimations = (): void => {
    stopSpriteSheetAnimation();

    const sheetElements = Array.from(
      target.querySelectorAll<HTMLElement>('[data-act-one-sheet-actor][data-act-one-sheet-pose]'),
    );
    const actFourPlayerBattleSheets = Array.from(
      target.querySelectorAll<HTMLElement>('[data-act-four-player-battle-sheet]'),
    );

    if (sheetElements.length === 0 && actFourPlayerBattleSheets.length === 0) {
      return;
    }

    const paintAll = (timestamp: number): void => {
      let hasConnectedSheet = false;

      sheetElements.forEach((sheetElement) => {
        if (!sheetElement.isConnected) {
          return;
        }

        const actorId = sheetElement.dataset.actOneSheetActor as
          | 'boss-prime'
          | ActOneEncounterActorId
          | undefined;
        const pose = sheetElement.dataset.actOneSheetPose;
        if (!actorId || !pose) {
          return;
        }

        const sheetSpec = getActOneSpriteSheetSpec(actorId, pose);
        if (!sheetSpec) {
          return;
        }

        hasConnectedSheet = true;
        const frameIndex = Math.floor(timestamp / sheetSpec.frameDurationMs) % sheetSpec.frameCount;
        paintSpriteSheetFrame(sheetElement, sheetSpec, frameIndex);
      });

      actFourPlayerBattleSheets.forEach((sheetElement) => {
        if (!sheetElement.isConnected) {
          return;
        }

        hasConnectedSheet = true;
        const frameIndex =
          Math.floor(timestamp / ACT_FOUR_PLAYER_BATTLE_STANCE.frameDurationMs) %
          ACT_FOUR_PLAYER_BATTLE_STANCE.frameCount;
        paintSpriteSheetFrame(sheetElement, ACT_FOUR_PLAYER_BATTLE_STANCE, frameIndex);
      });

      if (!hasConnectedSheet) {
        spriteSheetAnimationFrame = 0;
        return;
      }

      spriteSheetAnimationFrame = requestAnimationFrame(paintAll);
    };

    paintAll(performance.now());
  };
  const syncPlayerFacing = (): void => {
    target.querySelectorAll<HTMLElement>('.act-one-player__sprite').forEach((playerSprite) => {
      playerSprite.classList.toggle('is-facing-left', playerFacingDirection < 0);
    });
  };
	  const syncExploreMotionStyles = (): void => {
	    const stageTrack = target.querySelector<HTMLElement>('.act-one-stage__track');
	    if (stageTrack) {
	      applyTrackCameraStyles(stageTrack, cameraX());
	    }

	    const stageWorld = target.querySelector<HTMLElement>('.act-one-stage__world');
	    if (stageWorld) {
	      applyWorldCameraStyles(stageWorld, cameraX());
	    }

    const playerEl = target.querySelector<HTMLElement>('.act-one-player');
    if (playerEl) {
      playerEl.style.left = `${playerX.toFixed(2)}px`;
    }

    syncPlayerFacing();
  };
  const stopContinuousMovement = (options: { renderIdle?: boolean } = {}): void => {
    const { renderIdle = true } = options;

    if (movementFrame) {
      cancelAnimationFrame(movementFrame);
      movementFrame = 0;
    }
    movementTimestamp = 0;

    const wasMoving = playerIsMoving;
    playerIsMoving = false;

    if (wasMoving && renderIdle && mode === 'explore') {
      syncPlayerSpriteMarkup('standing');
      return;
    }

    syncPlayerFacing();
  };
  const cameraX = (): number => {
    const encounter = currentEncounter();
    const follow = followCameraX();

    if (!encounter) {
      return follow;
    }

    const locked = encounterLockCameraX(encounter);
    if (
      isActFourPoc &&
      actFourEncounterCameraX !== null &&
      mode === 'encounter-dialogue' &&
      isActFourRevealCameraLockedPhase(actFourFinalePhase)
    ) {
      return actFourEncounterCameraX;
    }

    if (mode !== 'explore' && mode !== 'intro-dialogue') {
      return locked;
    }

    return Math.min(follow, locked);
  };

  const syncViewportMetrics = (reason: 'initial' | 'resize'): void => {
    const previousWorldWidth = worldWidth;
    const progressRatio = previousWorldWidth > 0 ? playerX / previousWorldWidth : 0;
    const previousEncounter = currentEncounter();
    const previousEncounterOffset = previousEncounter ? previousEncounter.position - playerX : null;
    const { width, height } = readViewportSize();

    viewportWidth = width;
    viewportHeight = height;
    playerStartX = Math.round(viewportWidth * 0.16);
    moveStep = Math.max(28, Math.round(viewportWidth * 0.06));
    battleFrameInset = Math.round(viewportWidth * 0.25);
    followInset = Math.round(viewportWidth * 0.34);
    spriteScale = computeResponsiveSpriteScale(viewportWidth, viewportHeight);
    floorOffset = computeResponsiveFloorOffset(viewportHeight, spriteScale);
    battleUiLaneHeight = computeResponsiveBattleUiLaneHeight(viewportWidth, viewportHeight, spriteScale);
    updateEncounterPositions();

    if (reason === 'initial') {
      playerX = playerStartX;
      return;
    }

    const encounter = currentEncounter();
    if (encounter && mode !== 'explore' && mode !== 'intro-dialogue') {
      playerX =
        isActFourPoc &&
        isActFourRevealCameraLockedPhase(actFourFinalePhase)
          ? actFourRevealPlayerFrameX(encounter)
          : encounterPlayerFrameX(encounter);
      return;
    }

    if (mode === 'intro-dialogue') {
      playerX = playerStartX;
      return;
    }

    if (mode === 'explore' && previousEncounterOffset !== null) {
      const encounter = currentEncounter();
      if (encounter) {
        playerX = clamp(encounter.position - previousEncounterOffset, 80, worldWidth - 120);
        return;
      }
    }

    playerX = clamp(Math.round(progressRatio * worldWidth), 80, worldWidth - 120);
  };

  syncViewportMetrics('initial');

  const appendBattleLog = (copy: string): void => {
    battleLogEntries = [...battleLogEntries.slice(-3), copy];
  };

  const captureBattleFocusTarget = (): ActOneBattleFocusTarget => {
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement) || !target.contains(activeElement)) {
      return null;
    }

    const activeCardIndex = Number(activeElement.dataset.cardIndex);
    if (Number.isInteger(activeCardIndex) && activeCardIndex >= 0) {
      return {
        kind: 'card',
        index: activeCardIndex,
      };
    }

    if (activeElement.hasAttribute('data-end-turn')) {
      return { kind: 'end-turn' };
    }

    return null;
  };

  const isSameBattleFocusTarget = (
    first: ActOneBattleFocusTarget,
    second: ActOneBattleFocusTarget,
  ): boolean => {
    if (!first || !second || first.kind !== second.kind) {
      return first === second;
    }

    return first.kind === 'card' ? first.index === (second as { kind: 'card'; index: number }).index : true;
  };

  const isActFourBattleCardSelectionPhase = (): boolean =>
    isActFourPoc && mode === 'battle' && isActFourCardSelectionPhase(actFourFinalePhase);

  const getPlayableBattleCards = (): ActOneBattleCardSlot[] => {
    if (isActFourBattleCardSelectionPhase()) {
      return hand.map((card, index) => ({ card, index }));
    }

    if (isActFourPoc || mode !== 'battle') {
      return [];
    }

    return hand
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => card.cost <= energy);
  };

  const getBattleControlTargets = (): ActOneBattleControlTarget[] => {
    const playableCards = getPlayableBattleCards().map(({ index }) => ({ kind: 'card' as const, index }));

    if (isActFourPoc) {
      return playableCards;
    }

    if (mode !== 'battle') {
      return [];
    }

    return playableCards.length > 0 ? [...playableCards, { kind: 'end-turn' }] : [{ kind: 'end-turn' }];
  };

  const normalizeBattleFocusTarget = (preferredTarget: ActOneBattleFocusTarget): ActOneBattleFocusTarget => {
    const targets = getBattleControlTargets();
    if (targets.length === 0) {
      return null;
    }

    const matchedTarget = preferredTarget
      ? targets.find((candidate) => isSameBattleFocusTarget(candidate, preferredTarget))
      : undefined;

    if (matchedTarget) {
      return matchedTarget;
    }

    if (preferredTarget?.kind === 'card') {
      const cardTargets = targets.filter((candidate): candidate is { kind: 'card'; index: number } => candidate.kind === 'card');
      const sameOrNextCard = cardTargets.find((candidate) => candidate.index >= preferredTarget.index);
      return sameOrNextCard ?? cardTargets[cardTargets.length - 1] ?? targets[0] ?? null;
    }

    return targets[0] ?? null;
  };

  const getBattleFocusButton = (focusTarget: ActOneBattleFocusTarget): HTMLButtonElement | null => {
    if (!focusTarget) {
      return null;
    }

    if (focusTarget.kind === 'card') {
      return target.querySelector<HTMLButtonElement>(`[data-card-index="${focusTarget.index}"]:not([disabled])`);
    }

    return target.querySelector<HTMLButtonElement>('[data-end-turn]');
  };

  const setBattleFocusTarget = (nextTarget: ActOneBattleFocusTarget, shouldRender = true): void => {
    const normalizedTarget = normalizeBattleFocusTarget(nextTarget);
    const changed = !isSameBattleFocusTarget(battleFocusTarget, normalizedTarget);
    battleFocusTarget = normalizedTarget;

    if (shouldRender && changed) {
      render();
      return;
    }

    focusBattleControl(battleFocusTarget);
  };

  const moveBattleFocus = (direction: ActOneMoveDirection): void => {
    if (direction === 0) {
      return;
    }

    const targets = getBattleControlTargets();
    if (targets.length === 0) {
      return;
    }

    const currentTarget = normalizeBattleFocusTarget(battleFocusTarget ?? captureBattleFocusTarget());
    const currentIndex = currentTarget
      ? targets.findIndex((candidate) => isSameBattleFocusTarget(candidate, currentTarget))
      : -1;
    const nextIndex = currentIndex >= 0
      ? (currentIndex + direction + targets.length) % targets.length
      : direction > 0
        ? 0
        : targets.length - 1;

    setBattleFocusTarget(targets[nextIndex] ?? null);
  };

  const moveBattleFocusVertical = (direction: ActOneMoveDirection): void => {
    if (direction === 0) {
      return;
    }

    if (isActFourPoc) {
      moveBattleFocus(direction);
      return;
    }

    const targets = getBattleControlTargets();
    if (targets.length === 0) {
      return;
    }

    const endTurnTarget = targets.find((candidate) => candidate.kind === 'end-turn') ?? null;
    const firstCardTarget = targets.find((candidate) => candidate.kind === 'card') ?? null;
    setBattleFocusTarget(direction > 0 ? endTurnTarget : firstCardTarget ?? endTurnTarget);
  };

  const getPlayerTurnStartBattleFocusTarget = (): ActOneBattleFocusTarget => {
    const targets = getBattleControlTargets();
    return targets.find((candidate) => candidate.kind === 'card') ?? targets[0] ?? null;
  };

  const clickBattleFocusTarget = (): boolean => {
    const normalizedTarget = normalizeBattleFocusTarget(battleFocusTarget ?? captureBattleFocusTarget());
    battleFocusTarget = normalizedTarget;
    const button = getBattleFocusButton(normalizedTarget);
    if (!button || button.disabled) {
      return false;
    }

    button.click();
    return true;
  };

  const scrollBattleCardIntoView = (button: HTMLButtonElement): void => {
    if (!button.hasAttribute('data-card')) {
      return;
    }

    const cardStrip = button.closest<HTMLElement>('.hand-grid');
    if (!cardStrip) {
      return;
    }

    const cardRect = button.getBoundingClientRect();
    const stripRect = cardStrip.getBoundingClientRect();
    const edgePadding = 24;
    const leftOverflow = cardRect.left - stripRect.left - edgePadding;
    const rightOverflow = cardRect.right - stripRect.right + edgePadding;

    if (leftOverflow < 0) {
      cardStrip.scrollLeft += leftOverflow;
    } else if (rightOverflow > 0) {
      cardStrip.scrollLeft += rightOverflow;
    }
  };

  const focusBattleControl = (preferredTarget: ActOneBattleFocusTarget): void => {
    if (battleFocusFrame) {
      cancelAnimationFrame(battleFocusFrame);
    }

    battleFocusFrame = requestAnimationFrame(() => {
      battleFocusFrame = 0;

      if (mode !== 'battle' || !target.isConnected) {
        return;
      }

      const normalizedTarget = normalizeBattleFocusTarget(preferredTarget);
      battleFocusTarget = normalizedTarget;
      const nextFocus = getBattleFocusButton(normalizedTarget);

      if (!nextFocus || document.activeElement === nextFocus) {
        return;
      }

      nextFocus.focus({ preventScroll: true });
      scrollBattleCardIntoView(nextFocus);
    });
  };

  const renderCurrentActOneGoPrompt = (): string => {
    const encounter = currentEncounter();
    if (isActFourPoc || mode !== 'explore' || !actOneGoPromptVisible || encounter?.worldState !== 'idle') {
      return '';
    }

    return renderActOneGoPrompt();
  };

  const patchActOneGoPrompt = (): boolean => {
    const viewportEl = target.querySelector<HTMLElement>('.act-one-stage__viewport');
    if (!viewportEl) {
      return false;
    }

    viewportEl.querySelector<HTMLElement>('[data-act-one-go-prompt]')?.remove();
    const promptMarkup = renderCurrentActOneGoPrompt();
    if (promptMarkup) {
      viewportEl.insertAdjacentHTML('beforeend', promptMarkup);
    }

    return true;
  };

  const hideActOneGoPrompt = (): void => {
    if (!actOneGoPromptVisible) {
      return;
    }

    actOneGoPromptToken += 1;
    actOneGoPromptVisible = false;
    target.querySelector<HTMLElement>('[data-act-one-go-prompt]')?.remove();
  };

  const startActOneGoPrompt = (): void => {
    const encounter = currentEncounter();
    if (isActFourPoc || encounter?.worldState !== 'idle') {
      hideActOneGoPrompt();
      return;
    }

    actOneGoPromptVisible = true;
    const promptToken = actOneGoPromptToken + 1;
    actOneGoPromptToken = promptToken;

    schedule(() => {
      if (promptToken !== actOneGoPromptToken || !actOneGoPromptVisible) {
        return;
      }

      actOneGoPromptVisible = false;
      if (!patchActOneGoPrompt()) {
        render();
      }
    }, ACT_ONE_GO_PROMPT_DURATION_MS);
  };

  function handleDialogueOk(): void {
    if (mode === 'intro-dialogue') {
      const nextIntroDialogue = introDialogueSequence[introDialogueStep + 1];

      if (nextIntroDialogue) {
        introDialogueStep += 1;
        dialogue = nextIntroDialogue;
        setStatus(`${nextIntroDialogue.speakerLabel} продолжает.`);
        if (!patchDialogueOverlay()) {
          render();
        }
        return;
      }

      dialogue = null;
      mode = 'explore';
      audio.playHook(isActFourPoc ? AUDIO_HOOKS.actFour.approachStart : AUDIO_HOOKS.actOne.exploreStart);
      setStatus(
        isActFourPoc
          ? 'Идите вперёд к юбилейной инстанции. Она уже делает вид, что это плановое мероприятие.'
          : 'Управление включено. Идите вперёд, пока первое столкновение не проснётся.',
      );
      startActOneGoPrompt();
      render();
      return;
    }

    if (mode === 'encounter-dialogue') {
      const encounter = currentEncounter();
      if (isActFourPoc && actFourRevealZoomInProgress) {
        return;
      }

      if (isActFourPoc && actFourFinalePhase === 'boss-reveal-start') {
        startActFourRevealZoom();
        return;
      }

      if (encounter?.dialogueSequence?.length) {
        const nextDialogueStep = encounterDialogueStep + 1;
        const nextDialogue = encounter.dialogueSequence[nextDialogueStep];

        if (nextDialogue) {
          encounterDialogueStep = nextDialogueStep;
          dialogue = nextDialogue;
          setStatus(`${nextDialogue.speakerLabel} отвечает.`);
          if (!patchDialogueOverlay()) {
            render();
          }
          return;
        }
      }

      if (encounter && encounterDialogueStep === 0 && encounter.responseDialogue) {
        encounterDialogueStep = 1;
        dialogue = encounter.responseDialogue;
        setStatus(
          isActFourPoc
            ? 'Александр оценивает масштаб проблемы и мысленно ищет линейку.'
            : `${ACT_ONE_INTRO_DIALOGUE.speakerLabel} отвечает.`,
        );
        if (isActFourPoc && actFourFinalePhase === 'boss-reveal' && patchActFourRevealDialogue()) {
          return;
        }
        if (!patchDialogueOverlay()) {
          render();
        }
        return;
      }

      encounterDialogueStep = 0;
      dialogue = null;
      if (isActFourPoc) {
        startActFourZoomIn();
        return;
      }

      mode = 'fight-splash';
      setStatus('Схватка зафиксирована. Дальше бой.');
      if (!patchDialogueToFightSplash()) {
        render();
      }
      schedule(startBattle, 700);
      return;
    }

    if (mode === 'artifact-dialogue') {
      dialogue = null;
      setStatus(scene.outro);
      triggerVictory(scene.outro, 120);
    }
  }

  const collectActOneArtifact = (): void => {
    if (mode !== 'artifact-reveal') {
      return;
    }

    mode = 'artifact-flight';
    audio.stopMusic();
    audio.playHook(AUDIO_HOOKS.shared.collection);
    audio.playHook(AUDIO_HOOKS.actOne.artifactDrop);
    setStatus('Ядро календаря откликается на нажатие.');
    render();
    schedule(() => {
      mode = 'artifact-dialogue';
      dialogue = {
        speakerId: 'boss-prime',
        speakerLabel: ACT_ONE_INTRO_DIALOGUE.speakerLabel,
        lines: [scene.outro],
        anchor: 'player',
      };
      audio.playHook(AUDIO_HOOKS.actOne.artifactOutro);
      render();
    }, 760);
  };

  const continueRewardToast = (): void => {
    if (mode !== 'reward-toast') {
      return;
    }

    const completedEncounter = currentEncounter();
    if (completedEncounter) {
      completedEncounter.worldState = 'gone';
      if (
        !isActFourPoc &&
        (completedEncounter.id === 'arina-trofimova' || completedEncounter.id === 'slide-cultist')
      ) {
        audio.stopMusic();
      }
    }
    rewardToast = null;
    const nextEncounter = encounters[encounterIndex + 1];
    if (nextEncounter) {
      encounterIndex += 1;
      playerX = encounterApproachStartX(nextEncounter);
    }
    mode = 'explore';
    audio.playHook(AUDIO_HOOKS.actOne.exploreStart);
    setStatus(nextEncounter ? `Награда получена. Вперёд к ${nextEncounter.name}.` : scene.outro);
    startActOneGoPrompt();
    render();
  };

  const syncActFourCutsceneVideo = (): void => {
    const cutsceneVideo = target.querySelector<HTMLVideoElement>('[data-act-four-cutscene-video]');
    if (!cutsceneVideo || cutsceneVideo === actFourCutsceneVideo) {
      return;
    }

    actFourCutsceneVideo = cutsceneVideo;
    cutsceneVideo.addEventListener(
      'ended',
      () => {
        cutsceneVideo.pause();
        schedule(beginActFourCutsceneFade, ACT_FOUR_POST_SHOWDOWN_CUTSCENE_HOLD_MS);
      },
      { once: true },
    );
    cutsceneVideo.addEventListener('error', startActFourCredits, { once: true });
    cutsceneVideo.muted = true;
    cutsceneVideo.play().catch(() => {
      cutsceneVideo.controls = true;
    });
  };

  const finishActFourGiftVideo = (): void => {
    if (!isActFourPoc || actFourFinalePhase !== 'gift-video') {
      return;
    }

    actFourGiftVideo?.pause();
    actFourGiftVideo = null;
    actFourGiftWatched = true;
    actFourFinalePhase = 'credits';
    setStatus(ACT_FOUR_CREDITS_STATUS);
    render();
    revealActFourCreditsAction();
  };

  const syncActFourGiftVideo = (): void => {
    const giftVideo = target.querySelector<HTMLVideoElement>('[data-act-four-gift-video]');
    if (!giftVideo || giftVideo === actFourGiftVideo) {
      return;
    }

    actFourGiftVideo = giftVideo;
    const giftVideoLayer = target.querySelector<HTMLElement>('.act-four-gift-video');
    const revealGiftVideo = (): void => {
      if (actFourFinalePhase !== 'gift-video') {
        return;
      }

      window.requestAnimationFrame(() => {
        giftVideoLayer?.classList.add('is-ready');
      });
    };

    giftVideo.addEventListener('ended', finishActFourGiftVideo, { once: true });
    giftVideo.addEventListener('error', finishActFourGiftVideo, { once: true });
    giftVideo.addEventListener('loadeddata', revealGiftVideo, { once: true });
    giftVideo.addEventListener('playing', revealGiftVideo, { once: true });
    giftVideo.muted = false;
    giftVideo.volume = 1;
    giftVideo.play().catch(() => {
      giftVideo.muted = true;
      giftVideo.play().catch(() => {
        giftVideo.controls = true;
      });
    });
    if (giftVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      revealGiftVideo();
    }
  };

  const getActFourCreditsActionButton = (): HTMLButtonElement | null =>
    target.querySelector<HTMLButtonElement>(
      '[data-act-four-gift]:not([disabled]), [data-act-four-restart]:not([disabled])',
    );

  const clickActFourCreditsAction = (): boolean => {
    if (!isActFourPoc || actFourFinalePhase !== 'credits') {
      return false;
    }

    const actionButton = getActFourCreditsActionButton();
    if (!actionButton) {
      return false;
    }

    actionButton.click();
    return true;
  };

  const revealActFourCreditsAction = (): void => {
    const actionButton = target.querySelector<HTMLButtonElement>('[data-act-four-gift], [data-act-four-restart]');
    if (!actionButton || actFourFinalePhase !== 'credits') {
      return;
    }

    actionButton.disabled = false;
    actionButton.classList.add('is-visible');
    actionButton.focus({ preventScroll: true });
  };

  const syncPostRenderDom = (previousBattleFocus: ActOneBattleFocusTarget): void => {
    syncActFourCutsceneVideo();
    syncActFourGiftVideo();
    if (isActFourPoc && (actFourFinalePhase === 'credits' || actFourFinalePhase === 'gift-video')) {
      return;
    }

    if (mode === 'battle') {
      focusBattleControl(battleFocusTarget ?? previousBattleFocus);
    }
  };

  const handleTargetClick = (event: MouseEvent): void => {
    const source = event.target;
    if (!(source instanceof Element)) {
      return;
    }

    const control = source.closest<HTMLElement>(
      '[data-dialogue-ok], [data-card], [data-end-turn], [data-act-four-support-dialogue], [data-act-four-artifact-dialogue], [data-act-four-win-button], [data-act-four-gift], [data-act-four-restart], [data-artifact-collect], [data-reward-continue]',
    );
    if (!control || !target.contains(control)) {
      return;
    }

    if (control instanceof HTMLButtonElement && control.disabled) {
      return;
    }

    if (control.hasAttribute('data-dialogue-ok')) {
      handleDialogueOk();
      return;
    }

    if (control.hasAttribute('data-card')) {
      const cardIndex = Number(control.dataset.cardIndex);
      if (Number.isInteger(cardIndex) && cardIndex >= 0) {
        battleFocusTarget = { kind: 'card', index: cardIndex };
        playCard(cardIndex);
      }
      return;
    }

    if (control.hasAttribute('data-end-turn')) {
      battleFocusTarget = { kind: 'end-turn' };
      endTurn();
      return;
    }

    if (control.hasAttribute('data-act-four-support-dialogue')) {
      advanceActFourSupportDialogue();
      return;
    }

    if (control.hasAttribute('data-act-four-artifact-dialogue')) {
      advanceActFourArtifactDialogue();
      return;
    }

    if (control.hasAttribute('data-act-four-win-button')) {
      triggerActFourShowdownWin();
      return;
    }

    if (control.hasAttribute('data-act-four-gift')) {
      triggerActFourGiftVideo();
      return;
    }

    if (control.hasAttribute('data-act-four-restart')) {
      onRestart();
      return;
    }

    if (control.hasAttribute('data-artifact-collect')) {
      collectActOneArtifact();
      return;
    }

    if (control.hasAttribute('data-reward-continue')) {
      continueRewardToast();
    }
  };

  const tryPatchBattleUiOnly = (selectedBattleTarget: ActOneBattleFocusTarget, activeCameraX: number): boolean => {
    if (mode !== 'battle') {
      return false;
    }

    if (
      isActFourPoc &&
      isActFourShowdownOverlayPhase(actFourFinalePhase)
    ) {
      return false;
    }

    const viewportEl = target.querySelector<HTMLElement>('.act-one-stage__viewport');
    const trackEl = target.querySelector<HTMLElement>('.act-one-stage__track');
    const worldEl = target.querySelector<HTMLElement>('.act-one-stage__world');
    const playerEl = target.querySelector<HTMLElement>('.act-one-player');
    const encounterEls = Array.from(target.querySelectorAll<HTMLElement>('.act-one-encounter'));
    const visibleEncounters = encounters.filter(
      (encounter) => encounter.worldState !== 'gone' && encounter.worldState !== 'artifact',
    );

    if (!viewportEl || !trackEl || !worldEl || !playerEl || encounterEls.length !== visibleEncounters.length) {
      return false;
    }

    viewportEl.style.setProperty('--act-one-floor-offset', `${floorOffset}px`);
	    viewportEl.style.setProperty('--act-one-ui-lane-height', `${floorOffset}px`);
		    viewportEl.style.setProperty('--act-one-sprite-scale', `${spriteScale}`);
		    trackEl.style.width = `${worldWidth}px`;
		    applyTrackCameraStyles(trackEl, activeCameraX);
		    worldEl.style.width = `${worldWidth}px`;
		    applyWorldCameraStyles(worldEl, activeCameraX);
		    playerEl.style.left = `${playerX}px`;

    visibleEncounters.forEach((encounter, index) => {
      const encounterEl = encounterEls[index];
      if (encounterEl) {
        encounterEl.style.left = `${encounter.position}px`;
      }
    });

    if (isActFourPoc) {
      viewportEl.dataset.actFourPhase = actFourFinalePhase;

      const transformPlayerActive = isActFourArtifactRitualPhase(actFourFinalePhase);
      const hasTransformPlayer = playerEl.querySelector('[data-act-four-player-transform-sheet]') !== null;
      const hasBattlePlayer = playerEl.querySelector('[data-act-four-player-battle-sheet]') !== null;
      const shouldRefreshPlayerSprite =
        (transformPlayerActive && !hasTransformPlayer) || (!transformPlayerActive && !hasBattlePlayer);
      playerEl.classList.add('act-one-player--battle');
      if (shouldRefreshPlayerSprite) {
        stopActFourPlayerTransformAnimation();
        stopSpriteSheetAnimation();
        if (transformPlayerActive) {
          actFourPlayerTransformAnimationStartedAt = 0;
        }
        playerEl.innerHTML = renderActFourPlayerSprite('battle', playerFacingDirection, actFourFinalePhase);
        syncSpriteSheetAnimations();
      }

      const finaleMarkup = renderActFourFinaleOverlay(selectedBattleTarget);
      const finaleEl = target.querySelector<HTMLElement>('.act-four-finale-ui');
      if (finaleMarkup) {
        if (finaleEl) {
          if (finaleEl.outerHTML !== finaleMarkup) {
            finaleEl.outerHTML = finaleMarkup;
          }
        } else {
          viewportEl.insertAdjacentHTML('beforeend', finaleMarkup);
        }
      } else {
        finaleEl?.remove();
      }

      const supportMarkup = renderCurrentActFourSupportOverlay();
      const supportEl = target.querySelector<HTMLElement>('.act-four-support');
      if (supportMarkup) {
        if (supportEl) {
          if (supportEl.outerHTML !== supportMarkup) {
            supportEl.outerHTML = supportMarkup;
          }
        } else {
          viewportEl.insertAdjacentHTML('beforeend', supportMarkup);
        }
      } else {
        supportEl?.remove();
      }

      syncActFourPlayerTransformationAnimation();
      syncActFourSupportAnimation();
      scheduleActFourDialogueReposition();
      return true;
    }

    const battleUiEl = target.querySelector<HTMLElement>('.act-one-battle-ui');
    if (!battleUiEl) {
      return false;
    }

    battleUiEl.outerHTML = renderBattleOverlay(selectedBattleTarget);
    return true;
  };

  const setStatus = (copy: string, options: { battleLog?: boolean } = {}): void => {
    statusCopy = copy;
    onStatusChange(copy);
    if (options.battleLog) {
      appendBattleLog(copy);
    }
  };

  const nextBattleFxId = (): number => {
    battleFxId += 1;
    return battleFxId;
  };

  const queueFloater = (actor: ActOneBattleActor, text: string, kind: ActOneFloaterKind): void => {
    const id = nextBattleFxId();
    const durationMs = isActFourPoc && kind === 'zero' ? 1500 : 950;
    floaters = [...floaters, { id, actor, kind, text }];

    schedule(() => {
      floaters = floaters.filter((floater) => floater.id !== id);
      render();
    }, durationMs);
  };

  const triggerHealthBarFx = (
    actor: ActOneBattleActor,
    previousHp: number,
    nextHp: number,
    maxHp: number,
  ): void => {
    if (nextHp >= previousHp) {
      return;
    }

    const id = nextBattleFxId();
    healthBarFx = {
      ...healthBarFx,
      [actor]: {
        id,
        fromRatio: hpRatio(previousHp, maxHp),
        toRatio: hpRatio(nextHp, maxHp),
      },
    };

    schedule(() => {
      if (healthBarFx[actor]?.id !== id) {
        return;
      }

      healthBarFx = {
        ...healthBarFx,
        [actor]: null,
      };
      render();
    }, 720);
  };

  const resetBattlePresentation = (): void => {
    battleLogEntries = [];
    floaters = [];
    healthBarFx = {
      player: null,
      enemy: null,
    };
  };

  const syncBossCards = (): void => {
    const encounter = currentEncounter();
    if (!encounter?.boss) {
      return;
    }

    unlockedBossCards
      .filter((card) => !spentBossCards.has(card.id))
      .forEach((card) => {
        if (!hand.some((heldCard) => heldCard.id === card.id)) {
          hand.unshift({ ...card });
        }
      });
  };
  const syncActFourSupportCard = (): void => {
    if (!isActFourPoc || actFourSupportCardUsed) {
      return;
    }

    if (!hand.some((heldCard) => heldCard.id === ACT_FOUR_SUPPORT_CARD.id)) {
      hand.unshift({ ...ACT_FOUR_SUPPORT_CARD });
    }
  };

  const drawCards = (count: number): void => {
    while (hand.filter((card) => !card.persistent).length < count) {
      if (drawPile.length === 0) {
        drawPile = shuffle(discardPile.map((card) => ({ ...card })));
        discardPile = [];
      }
      const next = drawPile.shift();
      if (!next) {
        break;
      }
      hand.push(next);
    }

    syncBossCards();
    syncActFourSupportCard();
  };

  const updateEnemyIntent = (): void => {
    const encounter = currentEncounter();
    if (!encounter || encounter.worldState !== 'idle' || encounter.hp <= 0) {
      return;
    }

    if (encounter.boss) {
      const damage = turn % 2 === 0 ? 10 : 8;
      encounter.damage = damage;
      encounter.intent = formatEncounterIntent(encounter, damage);
      return;
    }

    const damage = encounter.id === 'slide-cultist' ? 5 + (turn % 2) : 4 + (turn % 2);
    encounter.damage = damage;
    encounter.intent = formatEncounterIntent(encounter, damage);
  };

  const startPlayerTurn = (intro?: string): void => {
    enemyTurnPending = false;
    playerBlock = 0;
    energy = 3;
    drawCards(5);
    updateEnemyIntent();
    battleFocusTarget = getPlayerTurnStartBattleFocusTarget();
    setStatus(intro ?? describeActOneTurnStart(turn, currentEncounter()), {
      battleLog: Boolean(intro),
    });
    render();
  };

  const triggerVictory = (copy: string, delay = 900): void => {
    if (victoryLocked) {
      return;
    }
    victoryLocked = true;
    setStatus(copy);
    render();
    schedule(() => onComplete(), delay);
  };

  const startBattle = (): void => {
    const encounter = currentEncounter();
    if (!encounter) {
      return;
    }

    playerX = encounterPlayerFrameX(encounter);
    mode = 'battle';
    audio.playHook(getBattleStartHook(encounter));
    encounter.hp = encounter.maxHp;
    encounter.alive = true;
    resetBattlePresentation();
    enemyTurnPending = false;
    discardPile = [];
    hand = [];
    drawPile = buildDeck();
    playerBlock = 0;
    energy = 3;
    turn = 1;
    battleFocusTarget = null;

    if (encounter.boss) {
      spentBossCards.clear();
    }

    if (isActFourPoc) {
      actFourFinalePhase = 'zero-cards';
      actFourZeroCardsPlayed = 0;
      actFourArtifactDialogueIndex = 0;
      actFourLastConsumedRelicId = null;
      actFourArtifactGainLine = null;
      actFourShowdownWinReady = false;
      actFourShowdownSfxPlayed = false;
      actFourEncounterCameraX = null;
      actFourConsumedRelicIds.clear();
      actFourSupportCardUsed = false;
      actFourSupportState = null;
      hand = ACT_FOUR_ZERO_DAMAGE_CARDS.map((card) => ({ ...card }));
      battleFocusTarget = null;
      setStatus('Карточная рамка включилась. Проверяем обычные атаки против юбилея, у которого HP записан как позиция.', {
        battleLog: true,
      });
      render();
      return;
    }

    startPlayerTurn(encounter.battleIntro);
  };

  const unlockBossCard = (card: CardState | undefined): void => {
    if (!card || unlockedBossCards.some((unlocked) => unlocked.id === card.id)) {
      return;
    }

    unlockedBossCards.push({ ...card });
    rewardToast = { ...card };
  };

  const resolveEncounterVictory = (): void => {
    const encounter = currentEncounter();
    if (!encounter) {
      return;
    }

    const rewardLine = encounter.rewardCopy ?? scene.outro;
    const victoryHook = isActFourPoc
      ? AUDIO_HOOKS.actFour.endingStart
      : encounter.boss
        ? AUDIO_HOOKS.actOne.bossVictory
        : encounter.id === 'arina-trofimova' || encounter.id === 'slide-cultist'
          ? null
          : AUDIO_HOOKS.actOne.battleVictory;
    if (victoryHook) {
      audio.playHook(victoryHook);
    }
    unlockBossCard(encounter.rewardCard);
    encounter.worldState = 'falling';
    mode = 'defeat-animation';
    setStatus(rewardLine, { battleLog: true });
    render();

    schedule(() => {
      if (isActFourPoc) {
        triggerVictory(scene.outro, 120);
        return;
      }

      if (encounter.boss) {
        encounter.worldState = 'artifact';
        mode = 'artifact-reveal';
        dialogue = null;
        setStatus(scene.outro);
        render();
        return;
      }

      playerIsMoving = false;
      mode = 'reward-toast';
      setStatus(`${rewardLine} Откройте награду и двигаемся дальше.`);
      render();
    }, 950);
  };

  const resolveEnemyTurn = (): void => {
    const encounter = currentEncounter();
    if (!encounter || encounter.hp <= 0 || encounter.alive === false) {
      resolveEncounterVictory();
      return;
    }

    const totalDamage = encounter.damage ?? 0;
    const previousHp = playerHp;
    const blocked = Math.min(playerBlock, totalDamage);
    const incoming = Math.max(totalDamage - blocked, 0);
    playerBlock = Math.max(playerBlock - totalDamage, 0);
    playerHp = Math.max(playerHp - incoming, 1);
    const dealt = previousHp - playerHp;

    if (blocked > 0) {
      queueFloater('player', 'Блок!', 'blocked');
    }

    if (dealt > 0) {
      triggerHealthBarFx('player', previousHp, playerHp, playerMaxHp);
      queueFloater('player', `-${dealt}`, 'damage');
    }

    turn += 1;
    startPlayerTurn(describeActOneEnemyResolution(encounter, blocked, dealt));
  };

  const setActFourSupportPhase = (phase: ActFourSupportPhase, dialogueIndex = 0): void => {
    actFourSupportState = { phase, dialogueIndex };
    actFourSupportAnimationStartedAt = performance.now();
    if (isActFourPoc) {
      const hookByPhase: Partial<Record<ActFourSupportPhase, string>> = {
        summon: AUDIO_HOOKS.actFour.valeraSummon,
        'idle-dialogue': AUDIO_HOOKS.actFour.valeraIdle,
        transform: AUDIO_HOOKS.actFour.valeraTransform,
        'second-transform': AUDIO_HOOKS.actFour.valeraSecondTransform,
        conjure: AUDIO_HOOKS.actFour.valeraConjure,
        'support-loop': AUDIO_HOOKS.actFour.valeraSupport,
        'reverse-summon': AUDIO_HOOKS.actFour.valeraReverseSummon,
      };
      const hook = hookByPhase[phase];
      if (hook) {
        audio.playHook(hook);
      }
    }
    render();
  };

  const getActFourSupportAnimationDuration = (phase: ActFourSupportPhase): number => {
    const sprite = ACT_FOUR_SUPPORT_CHARACTERS.valera.sprites[getActFourSupportAnimationId(phase)];
    return sprite.frameCount * sprite.frameDurationMs;
  };

  const startActFourSupportTransformationSequence = (): void => {
    setStatus(ACT_FOUR_SUPPORT_PHASE_DIALOGUE.transform.lines.join(' '), { battleLog: true });
    setActFourSupportPhase('transform', ACT_FOUR_SUPPORT_DIALOGUE.length - 1);
    schedule(() => {
      if (!actFourSupportState || actFourSupportState.phase !== 'transform') {
        return;
      }

      setStatus(ACT_FOUR_SUPPORT_PHASE_DIALOGUE['second-transform'].lines.join(' '), { battleLog: true });
      setActFourSupportPhase('second-transform', ACT_FOUR_SUPPORT_DIALOGUE.length - 1);
      schedule(() => {
        if (!actFourSupportState || actFourSupportState.phase !== 'second-transform') {
          return;
        }

        setStatus(ACT_FOUR_SUPPORT_PHASE_DIALOGUE.conjure.lines.join(' '), { battleLog: true });
        setActFourSupportPhase('conjure', ACT_FOUR_SUPPORT_DIALOGUE.length - 1);
        schedule(() => {
          if (!actFourSupportState || actFourSupportState.phase !== 'conjure') {
            return;
          }

          startActFourArtifactDialogue();
        }, getActFourSupportAnimationDuration('conjure') + 120);
      }, getActFourSupportAnimationDuration('second-transform') + 120);
    }, getActFourSupportAnimationDuration('transform') + 120);
  };

  const playActFourSupportCard = (card: CardState, handIndex: number): void => {
    if (!isActFourPoc || actFourSupportCardUsed) {
      return;
    }

    actFourSupportCardUsed = true;
    actFourFinalePhase = 'support-active';
    hand.splice(handIndex, 1);
    battleFocusTarget = null;
    audio.playHook(AUDIO_HOOKS.actFour.supportCardPlayed);
    setStatus(`«${card.name}» выбран. Валера входит в кадр через технический портал с лицом человека, который предупреждал.`, {
      battleLog: true,
    });
    setActFourSupportPhase('summon');
    schedule(() => {
      setStatus('Валера стабилизировался. Кажется, он действительно нашёл PDF финала в общей папке.', {
        battleLog: true,
      });
      setActFourSupportPhase('idle-dialogue');
    }, getActFourSupportAnimationDuration('summon') + 160);
  };

  const startActFourShowdown = (): void => {
    if (!isActFourPoc || (actFourFinalePhase !== 'panel-close' && actFourFinalePhase !== 'win-ready')) {
      return;
    }

    actFourFinalePhase = 'showdown';
    actFourShowdownStartedAt = performance.now();
    actFourShowdownWinReady = false;
    actFourSupportState = { phase: 'done', dialogueIndex: ACT_FOUR_SUPPORT_DIALOGUE.length - 1 };
    if (!actFourShowdownSfxPlayed) {
      actFourShowdownSfxPlayed = true;
      audio.playHook(AUDIO_HOOKS.actFour.showdownStart);
      schedule(() => {
        if (actFourFinalePhase === 'showdown') {
          audio.playHook(AUDIO_HOOKS.actFour.showdownMusic);
        }
      }, ACT_FOUR_SHOWDOWN_MUSIC_DELAY_MS);
    }
    setStatus('Аниме-панели активированы. Юбилей больше не изображает совещание: теперь это ударная церемония.');
    render();
    schedule(() => {
      if (actFourFinalePhase !== 'showdown') {
        return;
      }

      actFourShowdownWinReady = true;
      audio.playHook(AUDIO_HOOKS.actFour.winReady);
      setStatus(`Кнопка появилась между панелями. ${content.finalePrompt.copy}`);
      render();
      target.querySelector<HTMLButtonElement>('[data-act-four-win-button]')?.focus({ preventScroll: true });
    }, ACT_FOUR_SHOWDOWN_WIN_DELAY_MS);
  };

  const triggerActFourShowdownWin = (): void => {
    if (!isActFourPoc || actFourFinalePhase !== 'showdown' || !actFourShowdownWinReady) {
      return;
    }

    actFourShowdownWinReady = false;
    actFourFinalePhase = 'cutscene';
    actFourCutsceneFadeStarted = false;
    stopActFourShowdownAnimation();
    audio.playHook(AUDIO_HOOKS.actFour.pressToWin);
    setStatus('Катсцена включилась. Финальный кадр держится три секунды перед титрами.');
    render();
    schedule(
      beginActFourCutsceneFade,
      ACT_FOUR_POST_SHOWDOWN_CUTSCENE_FALLBACK_MS + ACT_FOUR_POST_SHOWDOWN_CUTSCENE_HOLD_MS,
    );
  };

  const beginActFourCutsceneFade = (): void => {
    if (!isActFourPoc || actFourFinalePhase !== 'cutscene' || actFourCutsceneFadeStarted) {
      return;
    }

    actFourCutsceneFadeStarted = true;
    target.querySelector<HTMLElement>('.act-four-cutscene')?.classList.add('is-ending');
    schedule(startActFourCredits, ACT_FOUR_POST_SHOWDOWN_CUTSCENE_FADE_MS);
  };

  const triggerActFourGiftVideo = (): void => {
    if (!isActFourPoc || actFourFinalePhase !== 'credits' || actFourGiftWatched) {
      return;
    }

    actFourFinalePhase = 'gift-video';
    audio.stopAll();
    setStatus('Подарок включился. После видео вернёмся к поздравлению.');
    render();
  };

  const startActFourCredits = (): void => {
    if (!isActFourPoc || actFourFinalePhase !== 'cutscene') {
      return;
    }

    actFourFinalePhase = 'credits';
    actFourGiftWatched = false;
    startActFourCreditsSequence({
      audio,
      isCreditsActive: () => actFourFinalePhase === 'credits',
      onActionReady: revealActFourCreditsAction,
      schedule,
    });
    setStatus(ACT_FOUR_CREDITS_STATUS);
    render();
  };

  const applyActFourDirectStart = (): boolean => {
    if (!isActFourPoc) {
      return false;
    }

    const directStart = (new URLSearchParams(window.location.search).get('act4') ?? '').toLowerCase();
    if (directStart !== 'ending' && directStart !== 'cutscene' && directStart !== 'credits') {
      return false;
    }

    const encounter = currentEncounter();
    if (encounter) {
      playerX = encounterPlayerFrameX(encounter);
      encounter.hp = encounter.maxHp;
      encounter.alive = true;
      encounter.worldState = 'idle';
    }

    mode = 'battle';
    hand = [];
    battleFocusTarget = null;
    enemyTurnPending = false;
    actFourSupportState = { phase: 'done', dialogueIndex: ACT_FOUR_SUPPORT_DIALOGUE.length - 1 };
    actFourEncounterCameraX = null;
    actFourShowdownWinReady = false;
    actFourShowdownSfxPlayed = true;
    resetBattlePresentation();

    if (directStart === 'credits') {
      actFourFinalePhase = 'credits';
      actFourGiftWatched = false;
      startActFourCreditsSequence({
        audio,
        isCreditsActive: () => actFourFinalePhase === 'credits',
        onActionReady: revealActFourCreditsAction,
        schedule,
      });
      setStatus(ACT_FOUR_CREDITS_STATUS);
      return true;
    }

    actFourFinalePhase = 'cutscene';
    actFourCutsceneFadeStarted = false;
    audio.playHook(AUDIO_HOOKS.actFour.pressToWin);
    setStatus('Катсцена включилась. Финальный кадр держится три секунды перед титрами.');
    schedule(
      beginActFourCutsceneFade,
      ACT_FOUR_POST_SHOWDOWN_CUTSCENE_FALLBACK_MS + ACT_FOUR_POST_SHOWDOWN_CUTSCENE_HOLD_MS,
    );
    return true;
  };

  const refreshActFourArtifactRitual = (): void => {
    syncActFourShellPhase();
    if (!patchActFourArtifactRitualUi()) {
      render();
    }
  };

  const startActFourPanelClose = (): void => {
    if (!isActFourPoc || actFourFinalePhase !== 'artifact-consuming') {
      return;
    }

    actFourFinalePhase = 'panel-close';
    actFourSupportState = { phase: 'done', dialogueIndex: ACT_FOUR_SUPPORT_DIALOGUE.length - 1 };
    stopActFourSupportAnimation();
    target.querySelector<HTMLElement>('.act-four-support')?.remove();
    actFourLastConsumedRelicId = null;
    actFourArtifactGainLine = null;
    setStatus('Артефакты приняты. Обычная физика больше не имеет юридической силы. Панели закрываются перед последним ударом.', {
      battleLog: true,
    });
    refreshActFourArtifactRitual();
    schedule(() => {
      if (!isActFourPoc || actFourFinalePhase !== 'panel-close') {
        return;
      }

      startActFourShowdown();
    }, ACT_FOUR_PANEL_CLOSE_DURATION_MS);
  };

  const runActFourArtifactConsumptionStep = (index: number): void => {
    if (!isActFourPoc || actFourFinalePhase !== 'artifact-consuming') {
      return;
    }

    const relics = getActFourRelics();
    const relic = relics[index];
    if (!relic) {
      startActFourPanelClose();
      return;
    }

    const artifactGainLine = getActFourRelicActivationLine(relic);
    actFourLastConsumedRelicId = relic.id;
    actFourArtifactGainLine = null;
    audio.playHook(AUDIO_HOOKS.actFour.artifactConsume);
    setStatus(`${relic.name} летит к Александру.`, { battleLog: true });
    refreshActFourArtifactRitual();

    schedule(() => {
      if (actFourFinalePhase !== 'artifact-consuming' || actFourLastConsumedRelicId !== relic.id) {
        return;
      }

      actFourConsumedRelicIds.add(relic.id);
      actFourArtifactGainLine = artifactGainLine;
      setStatus(artifactGainLine, { battleLog: true });
      refreshActFourArtifactRitual();
    }, ACT_FOUR_ARTIFACT_CONSUME_FLIGHT_MS);

    schedule(() => {
      if (actFourFinalePhase !== 'artifact-consuming') {
        return;
      }

      actFourLastConsumedRelicId = null;
      actFourArtifactGainLine = null;
      runActFourArtifactConsumptionStep(index + 1);
    }, ACT_FOUR_ARTIFACT_CONSUME_STEP_MS);
  };

  const startActFourArtifactConsumption = (): void => {
    if (!isActFourPoc || actFourFinalePhase !== 'artifact-dialogue') {
      return;
    }

    actFourFinalePhase = 'artifact-consuming';
    actFourLastConsumedRelicId = null;
    actFourArtifactGainLine = null;
    setStatus('Артефакты идут к Александру по одному, как согласования, которые внезапно вспомнили, зачем они тут.', {
      battleLog: true,
    });
    refreshActFourArtifactRitual();
    schedule(() => runActFourArtifactConsumptionStep(0), 180);
  };

  const startActFourArtifactDialogue = (): void => {
    actFourFinalePhase = 'artifact-dialogue';
    actFourArtifactDialogueIndex = 0;
    actFourLastConsumedRelicId = null;
    actFourArtifactGainLine = null;
    actFourPlayerTransformAnimationStartedAt = 0;
    actFourSupportState = {
      phase: 'support-loop',
      dialogueIndex: ACT_FOUR_SUPPORT_DIALOGUE.length - 1,
    };
    actFourSupportAnimationStartedAt = performance.now();
    hand = [];
    audio.playHook(AUDIO_HOOKS.actFour.artifactsStart);
    setStatus(ACT_FOUR_RELIC_CONSUMPTION_DIALOGUE[0]?.lines.join(' ') ?? content.transformation.introCopy, {
      battleLog: true,
    });
    render();
  };

  const advanceActFourArtifactDialogue = (): void => {
    if (!isActFourPoc || actFourFinalePhase !== 'artifact-dialogue') {
      return;
    }

    startActFourArtifactConsumption();
  };

  const advanceActFourSupportDialogue = (): void => {
    if (!actFourSupportState) {
      return;
    }

    if (actFourSupportState.phase !== 'idle-dialogue') {
      return;
    }

    const nextIndex = actFourSupportState.dialogueIndex + 1;
    if (nextIndex < ACT_FOUR_SUPPORT_DIALOGUE.length) {
      actFourSupportState = {
        ...actFourSupportState,
        dialogueIndex: nextIndex,
      };
      render();
      return;
    }

    startActFourSupportTransformationSequence();
  };

  const revealActFourSupportCard = (): void => {
    if (actFourSupportCardUsed || hand.some((heldCard) => heldCard.id === ACT_FOUR_SUPPORT_CARD.id)) {
      return;
    }

    actFourFinalePhase = 'support-ready';
    hand.unshift({ ...ACT_FOUR_SUPPORT_CARD });
    battleFocusTarget = { kind: 'card', index: 0 };
    audio.playHook(AUDIO_HOOKS.actFour.supportCardReveal);
    setStatus('Обычные методы закончились. В руке появляется карта «Вызов Валеры»: техподдержка с характером и гитарой.', {
      battleLog: true,
    });
  };

  const playActFourFinaleCard = (card: CardState, handIndex: number): void => {
    if (card.id === ACT_FOUR_SUPPORT_CARD.id) {
      playActFourSupportCard(card, handIndex);
      return;
    }

    const isZeroDamageCard = ACT_FOUR_ZERO_DAMAGE_CARDS.some((zeroCard) => zeroCard.id === card.id);
    if (!isZeroDamageCard || (actFourFinalePhase !== 'zero-cards' && actFourFinalePhase !== 'support-ready')) {
      return;
    }

    hand.splice(handIndex, 1);
    actFourZeroCardsPlayed += 1;
    audio.playHook(AUDIO_HOOKS.actFour.zeroCardPlayed);
    queueFloater('enemy', '0 DAMAGE', 'zero');
    setStatus(`«${card.name}» сыграна. Результат: 0 урона. Обычный метод официально вышел из чата.`, {
      battleLog: true,
    });

    if (actFourZeroCardsPlayed >= 2) {
      revealActFourSupportCard();
    } else {
      battleFocusTarget = normalizeBattleFocusTarget(battleFocusTarget);
    }

    render();
  };

  const playCard = (handIndex: number): void => {
    const encounter = currentEncounter();
    if (mode !== 'battle' || !encounter || !Number.isInteger(handIndex) || handIndex < 0) {
      return;
    }

    const card = hand[handIndex];
    if (!card) {
      return;
    }

    if (isActFourPoc) {
      playActFourFinaleCard(card, handIndex);
      return;
    }

    if (card.cost > energy) {
      setStatus(describeActOneEnergyShortage(card));
      battleFocusTarget = normalizeBattleFocusTarget(battleFocusTarget);
      render();
      return;
    }

    energy -= card.cost;
    hand.splice(handIndex, 1);
    if (card.persistent) {
      spentBossCards.add(card.id);
    } else {
      discardPile.push(card);
    }

    let status = describeActOneCardLead(card);

    if (card.block) {
      playerBlock += card.block;
      status = `${status} ${describeActOneBlockFollowup(card)}`;
    }

    const damage =
      encounter.boss && card.bossDamageRatio ? Math.ceil(encounter.maxHp * card.bossDamageRatio) : (card.damage ?? 0);

    if (damage > 0 && encounter.alive) {
      const previousHp = encounter.hp;
      encounter.hp = Math.max(encounter.hp - damage, 0);
      encounter.alive = encounter.hp > 0;
      const dealt = previousHp - encounter.hp;
      if (dealt > 0) {
        triggerHealthBarFx('enemy', previousHp, encounter.hp, encounter.maxHp);
        queueFloater('enemy', `-${dealt}`, 'damage');
      }
      status = `${status} ${describeActOneEnemyReaction(encounter)}`;
    }

    setStatus(status, { battleLog: true });

    if (!encounter.alive || encounter.hp <= 0) {
      resolveEncounterVictory();
      return;
    }

    syncBossCards();
    battleFocusTarget = normalizeBattleFocusTarget(battleFocusTarget);
    render();
  };

  const endTurn = (): void => {
    if (mode !== 'battle' || isActFourPoc || enemyTurnPending) {
      return;
    }

    enemyTurnPending = true;
    discardPile.push(...hand.filter((card) => !card.persistent));
    hand = hand.filter((card) => card.persistent);
    battleFocusTarget = { kind: 'end-turn' };
    setStatus(describeActOneEnemyTurnLead(currentEncounter() ?? encounters[encounterIndex]!));
    render();
    schedule(resolveEnemyTurn, 350);
  };

  const renderOpponentSprite = (encounter: ActOneEncounterState, battleStance: boolean): string =>
    isActFourPoc ? renderActFourBossSprite() : renderActOneOpponent(encounter, battleStance);

  const renderDialogueOverlay = (): string => {
    if (!dialogue) {
      return '';
    }

    const activeCameraX = cameraX();
    const encounter = currentEncounter();
    const cameraScale = isActFourPoc ? getActFourCameraScale() : 1;
    const anchorX =
      dialogue.anchor === 'enemy' && encounter
        ? projectWorldXToScreen(encounter.position, activeCameraX)
        : projectWorldXToScreen(playerX, activeCameraX);
    const bubbleWidth = Math.min(420, viewportWidth - 44);
    const bubbleLeft = clamp(anchorX - bubbleWidth / 2, 18, viewportWidth - bubbleWidth - 18);
    const estimatedTextWidth = Math.max(bubbleWidth - 40, 180);
    const approxCharsPerLine = Math.max(16, Math.floor(estimatedTextWidth / 8));
    const wrappedLineCount = dialogue.lines.reduce(
      (total, line) => total + Math.max(1, Math.ceil(line.length / approxCharsPerLine)),
      0,
    );
    const anchorSpriteHeight =
      dialogue.anchor === 'enemy' && encounter
        ? isActFourPoc
          ? ACT_FOUR_BOSS.sprite.displaySize * spriteScale
          : getActOneWorldHeight(encounter.id)
        : ACT_ONE_PLAYER_WORLD_HEIGHT;
    const estimatedBubbleHeight = 136 + wrappedLineCount * 26;
    const desiredBottom = floorOffset + anchorSpriteHeight * cameraScale + 18;
    const maxBubbleBottom = Math.max(floorOffset + 64, viewportHeight - estimatedBubbleHeight - 18);
    const bubbleBottom = clamp(desiredBottom, floorOffset + 64, maxBubbleBottom);

    return renderActOneDialogueOverlay({
      actFour: isActFourPoc,
      bottom: bubbleBottom,
      dialogue,
      left: bubbleLeft,
      width: bubbleWidth,
    });
  };

  const patchActFourRevealStage = (): HTMLElement | null => {
    if (!isActFourPoc) {
      return null;
    }

    const viewportEl = target.querySelector<HTMLElement>('.act-one-stage__viewport');
    const playerEl = target.querySelector<HTMLElement>('.act-one-player');
    if (!viewportEl || !playerEl || !syncActFourCameraDom()) {
      return null;
    }

    playerEl.classList.remove('act-one-player--battle');
    syncPlayerSpriteMarkup('standing');
    playerEl.style.left = `${playerX.toFixed(2)}px`;
    viewportEl.querySelector<HTMLElement>('.act-one-fight')?.remove();
    viewportEl.querySelector<HTMLElement>('.act-one-battle-ui')?.remove();
    viewportEl.querySelector<HTMLElement>('.act-four-finale-ui')?.remove();
    viewportEl.querySelector<HTMLElement>('.act-four-support')?.remove();
    return viewportEl;
  };

  const patchActFourExploreToBossReveal = (): boolean => {
    if (!isActFourPoc || mode !== 'encounter-dialogue' || actFourFinalePhase !== 'boss-reveal-start' || !dialogue) {
      return false;
    }

    if (!patchActFourRevealStage()) {
      return false;
    }

    return patchDialogueOverlay();
  };

  const patchActFourRevealZoomStart = (): boolean => {
    if (!isActFourPoc || mode !== 'encounter-dialogue' || actFourFinalePhase !== 'boss-reveal') {
      return false;
    }

    if (!patchActFourRevealStage()) {
      return false;
    }

    return patchDialogueOverlay();
  };

  const patchActFourRevealDialogue = (): boolean => {
    if (!isActFourPoc || mode !== 'encounter-dialogue' || actFourFinalePhase !== 'boss-reveal' || !dialogue) {
      return false;
    }

    return patchDialogueOverlay();
  };

  const patchDialogueOverlay = (): boolean => {
    const viewportEl = target.querySelector<HTMLElement>('.act-one-stage__viewport');
    if (!viewportEl) {
      return false;
    }

    viewportEl.querySelector<HTMLElement>('.act-one-dialogue')?.remove();
    const dialogueMarkup = renderDialogueOverlay();
    if (dialogueMarkup) {
      viewportEl.insertAdjacentHTML('beforeend', dialogueMarkup);
    }

    return true;
  };

  const patchFightSplashOverlay = (): boolean => {
    const viewportEl = target.querySelector<HTMLElement>('.act-one-stage__viewport');
    if (!viewportEl) {
      return false;
    }

    viewportEl.querySelector<HTMLElement>('.act-one-fight')?.remove();
    if (mode === 'fight-splash') {
      viewportEl.insertAdjacentHTML('beforeend', '<div class="act-one-fight">Fight!</div>');
    }

    return true;
  };

  const patchDialogueToFightSplash = (): boolean => {
    if (!patchDialogueOverlay()) {
      return false;
    }

    if (!patchFightSplashOverlay()) {
      return false;
    }

    return true;
  };

  const patchExploreToEncounterDialogue = (): boolean => {
    if (isActFourPoc || mode !== 'encounter-dialogue' || !dialogue) {
      return false;
    }

    const viewportEl = target.querySelector<HTMLElement>('.act-one-stage__viewport');
    const trackEl = target.querySelector<HTMLElement>('.act-one-stage__track');
    const worldEl = target.querySelector<HTMLElement>('.act-one-stage__world');
    const playerEl = target.querySelector<HTMLElement>('.act-one-player');

    if (!viewportEl || !trackEl || !worldEl || !playerEl) {
      return false;
    }

    playerEl.classList.remove('act-one-player--battle');
    syncPlayerSpriteMarkup('standing');
    syncExploreMotionStyles();
    viewportEl.querySelector<HTMLElement>('.act-one-fight')?.remove();
    viewportEl.querySelector<HTMLElement>('.act-one-battle-ui')?.remove();
    return patchDialogueOverlay();
  };

  const getCurrentActFourRelicTargetPosition = (): { x: number; y: number } =>
    getActFourRelicTargetLayout({
      floorOffset,
      playerScreenX: projectWorldXToScreen(playerX, cameraX()),
      playerTransformDisplaySize: ACT_FOUR_PLAYER_TRANSFORM.displaySize,
      spriteScale,
      viewportHeight,
    });

  const renderCurrentActFourRelicTokens = (): string => {
    const targetPosition = getCurrentActFourRelicTargetPosition();

    return renderActFourRelicTokens({
      consumedRelicIds: actFourConsumedRelicIds,
      entries: getActFourRelics().map((relic) => ({
        imagePath: getRelicImagePath(relic),
        relic,
      })),
      lastConsumedRelicId: actFourLastConsumedRelicId,
      relicTargetX: targetPosition.x,
      relicTargetY: targetPosition.y,
    });
  };

  const renderCurrentActFourArtifactGainLine = (): string => {
    const gainLinePosition = getActFourArtifactGainLineLayout({
      floorOffset,
      playerScreenX: projectWorldXToScreen(playerX, cameraX()),
      playerTransformDisplaySize: ACT_FOUR_PLAYER_TRANSFORM.displaySize,
      spriteScale,
      viewportHeight,
    });
    const relicColor =
      getActFourRelics().find((relic) => relic.id === actFourLastConsumedRelicId)?.color ?? 'var(--scene-accent)';

    return renderActFourArtifactGainLine({
      copy: actFourArtifactGainLine,
      left: gainLinePosition.x,
      relicColor,
      top: gainLinePosition.y,
    });
  };

  const renderCurrentActFourBossFeedback = (): string => {
    const encounter = currentEncounter();
    if (!encounter) {
      return '';
    }

    const activeCameraX = cameraX();

    return renderActFourBossFeedback({
      bossScreenX: projectWorldXToScreen(encounter.position, activeCameraX),
      floaters,
      floorOffset,
      playerScreenX: projectWorldXToScreen(playerX, activeCameraX),
      playerSpriteHeight: ACT_ONE_PLAYER_WORLD_HEIGHT * spriteScale,
      viewportHeight,
      viewportWidth,
    });
  };

  const getActFourDialogueLayout = (
    speakerId: string,
    lines: readonly string[],
    activeCameraX = cameraX(),
  ): ActFourDialogueLayout => {
    const className = getActFourDialogueSpeakerClass(speakerId);
    const anchor = className;
    const bubbleWidth = Math.min(className === 'system' ? 560 : 420, viewportWidth - 44);
    const estimatedTextWidth = Math.max(bubbleWidth - 42, 180);
    const approxCharsPerLine = Math.max(16, Math.floor(estimatedTextWidth / 8));
    const wrappedLineCount = lines.reduce(
      (total, line) => total + Math.max(1, Math.ceil(line.length / approxCharsPerLine)),
      1,
    );
    const estimatedBubbleHeight = 138 + wrappedLineCount * 26;
    const maxBubbleBottom = Math.max(floorOffset + 64, viewportHeight - estimatedBubbleHeight - 18);
    const minBubbleLeft = 18;
    const maxBubbleLeft = viewportWidth - bubbleWidth - 18;

    if (className === 'system') {
      const systemLeft = clamp(viewportWidth / 2 - bubbleWidth / 2, minBubbleLeft, maxBubbleLeft);
      const systemBottom = clamp(
        Math.max(118, viewportHeight * 0.24),
        floorOffset + 54,
        maxBubbleBottom,
      );

      return {
        className,
        anchor,
        style: `left:${systemLeft.toFixed(2)}px; width:${bubbleWidth.toFixed(2)}px; bottom:${systemBottom.toFixed(2)}px;`,
      };
    }

    const anchorX =
      className === 'player'
        ? projectWorldXToScreen(playerX, activeCameraX)
        : viewportWidth / 2;
    const bubbleLeft = clamp(anchorX - bubbleWidth / 2, minBubbleLeft, maxBubbleLeft);
    const tailX = clamp(anchorX - bubbleLeft, 38, bubbleWidth - 38);
    const desiredBottom =
      className === 'player'
        ? floorOffset + ACT_ONE_PLAYER_WORLD_HEIGHT * getActFourCameraScale() + 18
        : (() => {
            const supportPhase = actFourSupportState?.phase ?? 'idle-dialogue';
            const supportSprite = ACT_FOUR_SUPPORT_CHARACTERS.valera.sprites[getActFourSupportAnimationId(supportPhase)];
            const supportSpriteHeight = supportSprite.displaySize * spriteScale;
            const supportSpriteTop = viewportHeight / 2 - viewportHeight * 0.05 - supportSpriteHeight / 2;
            const headPointerY = supportSpriteTop + supportSpriteHeight * 0.32;

            return viewportHeight - headPointerY + 18;
          })();
    const bubbleBottom = clamp(desiredBottom, floorOffset + 64, maxBubbleBottom);

    return {
      className,
      anchor,
      style: `left:${bubbleLeft.toFixed(2)}px; width:${bubbleWidth.toFixed(2)}px; bottom:${bubbleBottom.toFixed(2)}px; --act-four-dialogue-tail-x:${tailX.toFixed(2)}px;`,
    };
  };

  const getActFourValeraDialogueAnchorRatio = (): ActFourDialogueAnchorRatio => {
    const supportPhase = actFourSupportState?.phase ?? 'idle-dialogue';
    const animationId = getActFourSupportAnimationId(supportPhase);

    return ACT_FOUR_DIALOGUE_VALERA_HEAD_ANCHORS[animationId];
  };

  const positionActFourAnchoredDialogues = (): void => {
    if (!isActFourPoc) {
      return;
    }

    const viewportElement = target.querySelector<HTMLElement>('.act-one-stage__viewport');
    if (!viewportElement) {
      return;
    }

    target
      .querySelectorAll<HTMLElement>('.act-four-support__dialogue, .act-four-artifact-dialogue')
      .forEach((dialogueElement) => {
        const anchor = dialogueElement.dataset.actFourDialogueAnchor as ActFourDialogueAnchor | undefined;
        const parentElement =
          dialogueElement.offsetParent instanceof HTMLElement ? dialogueElement.offsetParent : viewportElement;
        const parentRect = parentElement.getBoundingClientRect();
        const parentWidth = parentRect.width;
        const parentHeight = parentRect.height;

        if (!anchor || parentWidth <= 0 || parentHeight <= 0) {
          return;
        }

        const horizontalGap = Math.min(ACT_FOUR_DIALOGUE_EDGE_GAP_PX, Math.max(0, parentWidth / 2 - 1));
        const bubbleWidth = Math.max(
          220,
          Math.min(anchor === 'system' ? 560 : 420, parentWidth - horizontalGap * 2),
        );
        dialogueElement.style.width = `${bubbleWidth.toFixed(2)}px`;

        const bubbleRect = dialogueElement.getBoundingClientRect();
        const bubbleHeight = bubbleRect.height;
        const maxBottom = Math.max(
          ACT_FOUR_DIALOGUE_EDGE_GAP_PX,
          parentHeight - bubbleHeight - ACT_FOUR_DIALOGUE_EDGE_GAP_PX,
        );

        if (anchor === 'system') {
          const left = clamp(parentWidth / 2 - bubbleWidth / 2, horizontalGap, parentWidth - bubbleWidth - horizontalGap);
          const bottom = clamp(Math.max(118, parentHeight * 0.24), ACT_FOUR_DIALOGUE_EDGE_GAP_PX, maxBottom);

          dialogueElement.style.left = `${left.toFixed(2)}px`;
          dialogueElement.style.bottom = `${bottom.toFixed(2)}px`;
          dialogueElement.style.removeProperty('--act-four-dialogue-tail-x');
          return;
        }

        const anchorElement =
          anchor === 'player'
            ? target.querySelector<HTMLElement>('.act-one-player__sprite')
            : target.querySelector<HTMLElement>('.act-four-support__sprite');
        if (!anchorElement) {
          return;
        }

        const anchorRect = anchorElement.getBoundingClientRect();
        if (anchorRect.width <= 0 || anchorRect.height <= 0) {
          return;
        }

        const anchorRatio =
          anchor === 'player' ? ACT_FOUR_DIALOGUE_PLAYER_HEAD_ANCHOR : getActFourValeraDialogueAnchorRatio();
        const anchorX = anchorRect.left - parentRect.left + anchorRect.width * anchorRatio.x;
        const anchorY = anchorRect.top - parentRect.top + anchorRect.height * anchorRatio.y;
        const maxLeft = Math.max(horizontalGap, parentWidth - bubbleWidth - horizontalGap);
        const left = clamp(anchorX - bubbleWidth / 2, horizontalGap, maxLeft);
        const tailX = clamp(anchorX - left, 38, Math.max(38, bubbleWidth - 38));
        const bottom = clamp(
          parentHeight - anchorY + ACT_FOUR_DIALOGUE_TAIL_GAP_PX,
          ACT_FOUR_DIALOGUE_EDGE_GAP_PX,
          maxBottom,
        );

        dialogueElement.style.left = `${left.toFixed(2)}px`;
        dialogueElement.style.bottom = `${bottom.toFixed(2)}px`;
        dialogueElement.style.setProperty('--act-four-dialogue-tail-x', `${tailX.toFixed(2)}px`);
      });
  };

  const scheduleActFourDialogueReposition = (): void => {
    positionActFourAnchoredDialogues();
    requestAnimationFrame(positionActFourAnchoredDialogues);
  };

  const renderCurrentActFourArtifactDialogue = (
    artifactBeat: (typeof ACT_FOUR_RELIC_CONSUMPTION_DIALOGUE)[number],
    activeCameraX = cameraX(),
  ): string => {
    const layout = getActFourDialogueLayout(
      artifactBeat.speakerId ?? 'valera',
      artifactBeat.lines,
      activeCameraX,
    );

    return renderActFourArtifactDialogue({ artifactBeat, layout });
  };

  const patchActFourArtifactRitualUi = (): boolean => {
    if (
      !isActFourPoc ||
      !isActFourArtifactRitualPhase(actFourFinalePhase)
    ) {
      return false;
    }

    const artifactBeat = ACT_FOUR_RELIC_CONSUMPTION_DIALOGUE[actFourArtifactDialogueIndex];
    const finaleElement = target.querySelector<HTMLElement>('.act-four-finale-ui');
    const ritualElement = target.querySelector<HTMLElement>('.act-four-artifact-ritual');
    const dialogueElement = target.querySelector<HTMLElement>('.act-four-artifact-dialogue');
    const viewportElement = target.querySelector<HTMLElement>('.act-one-stage__viewport');
    const stripElement = ritualElement?.querySelector<HTMLElement>('.act-four-relic-strip');

    if (!ritualElement || !finaleElement || !viewportElement || !stripElement) {
      return false;
    }

    finaleElement.dataset.actFourFinalePhase = actFourFinalePhase;
    viewportElement.dataset.actFourPhase = actFourFinalePhase;
    ritualElement.dataset.artifactMode = actFourFinalePhase;

    const relicTargetPosition = getCurrentActFourRelicTargetPosition();
    getActFourRelics().forEach((relic, index) => {
      const tokenElement = ritualElement.querySelector<HTMLElement>(`[data-act-four-relic-token="${relic.id}"]`);
      if (!tokenElement) {
        return;
      }

      const tokenState = getActFourRelicTokenState({
        consumedRelicIds: actFourConsumedRelicIds,
        index,
        lastConsumedRelicId: actFourLastConsumedRelicId,
        relic,
        relicTargetX: relicTargetPosition.x,
        relicTargetY: relicTargetPosition.y,
      });
      tokenElement.className = tokenState.className;
      tokenElement.setAttribute('style', tokenState.style);
    });

    if (actFourFinalePhase === 'artifact-dialogue' && artifactBeat && dialogueElement) {
      const buttonElement = dialogueElement.querySelector<HTMLElement>('[data-act-four-artifact-dialogue]');
      if (!buttonElement) {
        return false;
      }

      dialogueElement.className = `act-four-artifact-dialogue act-four-artifact-dialogue--${getActFourDialogueSpeakerClass(artifactBeat.speakerId ?? 'valera')}`;
      dialogueElement.dataset.actFourArtifactSpeaker = artifactBeat.speakerId ?? 'valera';
      dialogueElement.dataset.actFourDialogueAnchor = getActFourDialogueSpeakerClass(artifactBeat.speakerId ?? 'valera');
      dialogueElement.setAttribute(
        'style',
        getActFourDialogueLayout(artifactBeat.speakerId ?? 'valera', artifactBeat.lines).style,
      );
      Array.from(dialogueElement.querySelectorAll('p')).forEach((paragraph) => paragraph.remove());
      buttonElement.insertAdjacentHTML('beforebegin', renderEyebrow(artifactBeat.speakerLabel));
      buttonElement.insertAdjacentHTML('beforebegin', renderTextParagraphs(artifactBeat.lines));
      scheduleActFourDialogueReposition();
      buttonElement.focus({ preventScroll: true });
      return true;
    }

    dialogueElement?.remove();

    const existingLine = ritualElement.querySelector<HTMLElement>('.act-four-artifact-gain-line');
    existingLine?.remove();
    if (actFourArtifactGainLine) {
      ritualElement.insertAdjacentHTML('beforeend', renderCurrentActFourArtifactGainLine());
    }

    if (actFourFinalePhase === 'panel-close' && !ritualElement.querySelector('.act-four-panel-close')) {
      ritualElement.insertAdjacentHTML('beforeend', renderActFourPanelClose());
    }

    return true;
  };

  const renderActFourFinaleOverlay = (selectedBattleTarget: ActOneBattleFocusTarget): string => {
    if (!isActFourPoc || mode !== 'battle') {
      return '';
    }

    if (isActFourShowdownOverlayPhase(actFourFinalePhase)) {
      return renderActFourShowdownOverlay({
        finalePhase: actFourFinalePhase,
        finalePromptLabel: content.finalePrompt.label,
        giftWatched: actFourGiftWatched,
        winReady: actFourShowdownWinReady,
      });
    }

    const activeHandCardIndex = selectedBattleTarget?.kind === 'card' ? selectedBattleTarget.index : hand.length > 0 ? 0 : null;
    const relicMarkup = renderCurrentActFourRelicTokens();
    const artifactBeat = ACT_FOUR_RELIC_CONSUMPTION_DIALOGUE[actFourArtifactDialogueIndex];
    const artifactPhaseActive = isActFourArtifactRitualPhase(actFourFinalePhase);
    const artifactDialogueMarkup =
      actFourFinalePhase === 'artifact-dialogue' && artifactBeat
        ? renderCurrentActFourArtifactDialogue(artifactBeat)
        : '';
    const artifactGainLineMarkup = artifactDialogueMarkup ? '' : renderCurrentActFourArtifactGainLine();
    const cardSelectionMarkup = isActFourCardSelectionPhase(actFourFinalePhase)
      ? renderActFourFinaleCardSelection({
          entries: hand.map((card, index) => ({
            artPath: getCardArtPath(card.id),
            card,
            index,
            selected: index === activeHandCardIndex,
          })),
        })
      : '';
    const artifactRitualMarkup = artifactPhaseActive
      ? renderActFourArtifactRitual({
          artifactDialogueMarkup,
          artifactGainLineMarkup,
          finalePhase: actFourFinalePhase,
          relicTokensMarkup: relicMarkup,
        })
      : '';

    return renderActFourFinaleShell({
      artifactRitualMarkup,
      bossFeedbackMarkup: renderCurrentActFourBossFeedback(),
      cardSelectionMarkup,
      finalePhase: actFourFinalePhase,
      winReadyMarkup: actFourFinalePhase === 'win-ready' ? renderActFourWinReady(content.finalePrompt.label) : '',
    });
  };

  const renderBattleOverlay = (selectedBattleTarget: ActOneBattleFocusTarget): string => {
    const current = currentEncounter();
    if (!current || (mode !== 'battle' && mode !== 'defeat-animation')) {
      return '';
    }

    if (isActFourPoc) {
      return renderActFourFinaleOverlay(selectedBattleTarget);
    }

    const playerRatio = hpRatio(playerHp, playerMaxHp);
    const enemyRatio = hpRatio(current.hp, current.maxHp);
    const battleLayout = computeActOneBattleOverlayLayout({
      activeCameraX: cameraX(),
      battleGroundOffset: floorOffset,
      enemyBattleHeight: getActOneBattleHeight(current.id),
      enemyWorldX: current.position,
      playerBattleHeight: ACT_ONE_PLAYER_BATTLE_HEIGHT,
      playerWorldX: playerX,
      viewportHeight,
      viewportWidth,
    });
    const recentBattleEntries = battleLogEntries.length > 0 ? battleLogEntries.slice(-3) : [statusCopy];
    const activeHandCardIndex = selectedBattleTarget?.kind === 'card' ? selectedBattleTarget.index : null;
    const endTurnSelected = selectedBattleTarget?.kind === 'end-turn';
    const handMarkup = hand
      .map((card, index) =>
        renderActOneHandCard({
          artPath: getCardArtPath(card.id),
          bossRelic: Boolean(current.boss && card.persistent),
          card,
          disabled: card.cost > energy,
          index,
          metaLabel: card.persistent ? 'Карта босса' : `Цена ${card.cost}`,
          selected: index === activeHandCardIndex,
          special: card.persistent,
        }),
      )
      .join('');
    const floaterMarkup = floaters
      .map((floater, index) => {
        const left = floater.actor === 'player' ? battleLayout.playerScreenX : battleLayout.enemyScreenX;
        const stackIndex = floaters.slice(0, index).filter((entry) => entry.actor === floater.actor).length;
        const bottom =
          (floater.actor === 'player' ? battleLayout.playerBarBottom : battleLayout.enemyBarBottom) -
          18 +
          stackIndex * 28;

        return renderActOneFloater({
          bottom,
          kind: floater.kind,
          left,
          text: floater.text,
        });
      })
      .join('');

    return renderActOneBattleOverlay({
      battleLogMarkup: renderActOneBattleLog({
        bottom: battleLayout.battleLogBottom,
        entries: recentBattleEntries,
        eyebrow: getActOneBattleLogEyebrow(current),
        left: battleLayout.battleLogLeft,
        width: battleLayout.battleLogWidth,
      }),
      battleUiLaneHeight,
      endTurnBottom: battleLayout.endTurnBottom,
      endTurnLeft: battleLayout.endTurnLeft,
      endTurnSelected,
      enemyHealthBarMarkup: renderActOneHealthBar({
        actor: 'enemy',
        bottom: battleLayout.enemyBarBottom,
        effect: healthBarFx.enemy,
        hp: current.hp,
        left: battleLayout.enemyScreenX,
        maxHp: current.maxHp,
        meta: current.intent ?? 'Ждёт следующую карту.',
        ratio: enemyRatio,
        title: getActOneBattleName(current),
      }),
      floaterMarkup,
      handMarkup,
      playerHealthBarMarkup: renderActOneHealthBar({
        actor: 'player',
        bottom: battleLayout.playerBarBottom,
        effect: healthBarFx.player,
        hp: playerHp,
        left: battleLayout.playerScreenX,
        maxHp: playerMaxHp,
        meta: `Защита ${playerBlock} | Энергия ${energy} / 3 | Ход ${turn}`,
        ratio: playerRatio,
        title: 'Александр',
      }),
    });
  };

  const renderArtifactReveal = (): string => {
    const encounter = currentEncounter();
    const artifactActive =
      mode === 'artifact-reveal' || mode === 'artifact-flight' || mode === 'artifact-dialogue';
    if (!encounter || encounter.worldState !== 'artifact' || !artifactActive) {
      return '';
    }

    const artifactState: ActOneArtifactRevealState =
      mode === 'artifact-flight' ? 'flight' : mode === 'artifact-dialogue' ? 'corner' : 'descending';

    return renderActOneArtifactReveal({
      artifactAlt: scene.relicReward?.name ?? 'Артефакт',
      artifactLabel: scene.relicReward?.name ?? 'артефакт',
      imagePath: ACT_ONE_ARTIFACT_IMAGE,
      interactive: mode === 'artifact-reveal',
      state: artifactState,
    });
  };

  const renderCurrentActFourSupportDialogue = (
    dialogueLine: DialogueSequenceDefinition,
    activeCameraX: number,
    interactive = true,
  ): string => {
    const speakerId = dialogueLine.speakerId ?? 'valera';

    return renderActFourSupportDialogue({
      dialogueLine,
      interactive,
      layout: getActFourDialogueLayout(speakerId, dialogueLine.lines, activeCameraX),
    });
  };

  const renderCurrentActFourSupportOverlay = (): string => {
    if (!isActFourPoc || !actFourSupportState || actFourSupportState.phase === 'done') {
      return '';
    }

    const dialogueLine =
      actFourSupportState.phase === 'idle-dialogue'
        ? ACT_FOUR_SUPPORT_DIALOGUE[actFourSupportState.dialogueIndex]
        : undefined;

    return renderActFourSupportOverlay({
      dialogueMarkup: dialogueLine ? renderCurrentActFourSupportDialogue(dialogueLine, cameraX()) : '',
      phase: actFourSupportState.phase,
    });
  };

  const render = (): void => {
    syncActFourShellPhase();
    const current = currentEncounter();
    const previousBattleFocus = mode === 'battle' ? captureBattleFocusTarget() : null;
    const selectedBattleTarget =
      mode === 'battle' ? normalizeBattleFocusTarget(battleFocusTarget ?? previousBattleFocus) : null;
    battleFocusTarget = selectedBattleTarget;
    const activeCameraX = cameraX();
    const isBattleStance = mode === 'battle' || mode === 'defeat-animation';
    const playerPose: ActOnePlayerPose = isBattleStance ? 'battle' : mode === 'explore' && playerIsMoving ? 'running' : 'standing';
    const patchedBattleUi = tryPatchBattleUiOnly(selectedBattleTarget, activeCameraX);
    const worldMarkup = encounters
      .map((encounter) => {
        if (encounter.worldState === 'gone') {
          return '';
        }

        if (encounter.worldState === 'artifact' && !(encounter.boss && mode === 'artifact-reveal')) {
          return '';
        }

        return renderActOneEncounterPlacement({
          left: encounter.position,
          opponentMarkup: renderOpponentSprite(encounter, isBattleStance && current?.id === encounter.id),
        });
      })
      .join('');
    const backgroundCyclesMarkup = renderActOneBackgroundCycles({
      backgroundImage: scene.backgroundImage,
      cycleCount: ACT_ONE_BACKGROUND_CYCLE_COUNT,
      viewportWidth,
    });
    const cinematicCamera = isActFourCameraCinematic();
    const trackStyle = [
      `width:${worldWidth}px`,
      `transform:${getTrackTransform(activeCameraX)}`,
      'transform-origin:left bottom',
    ].join(';');
    const worldStyle = [
      `width:${worldWidth}px`,
      `transform:${getWorldTransform()}`,
      `transform-origin:${getWorldTransformOrigin(activeCameraX)}`,
    ].join(';');

    const rewardMarkup =
      rewardToast && mode === 'reward-toast'
        ? renderActOneRewardToast({
            artPath: getCardArtPath(rewardToast.id),
            card: rewardToast,
          })
        : '';
    if (!patchedBattleUi) {
      target.innerHTML = renderActOneStageShell({
        actFourPhase: isActFourPoc ? actFourFinalePhase : null,
        artifactMarkup: renderArtifactReveal(),
        backgroundCyclesMarkup,
        battleMarkup: renderBattleOverlay(selectedBattleTarget),
        cinematicCamera,
        dialogueMarkup: renderDialogueOverlay(),
        fightSplashVisible: mode === 'fight-splash',
        floorOffset,
        goPromptMarkup: renderCurrentActOneGoPrompt(),
        playerBattleStance: isBattleStance,
        playerMarkup: isActFourPoc
          ? renderActFourPlayerSprite(playerPose, playerFacingDirection, actFourFinalePhase)
          : renderActOnePlayerSprite(playerPose, playerFacingDirection),
        playerX,
        rewardMarkup,
        spriteScale,
        supportMarkup: renderCurrentActFourSupportOverlay(),
        trackStyle,
        worldMarkup,
        worldStyle,
      });
		      syncSpriteSheetAnimations();
			      syncActFourPlayerTransformationAnimation();
			      syncActFourBossAnimation();
			      syncActFourSupportAnimation();
			      syncActFourShowdownAnimation();
			      scheduleActFourDialogueReposition();
			    }

    syncPostRenderDom(previousBattleFocus);
  };

  const maybeTriggerEncounter = (): boolean => {
    const encounter = currentEncounter();
    if (!encounter || mode !== 'explore' || encounter.worldState !== 'idle') {
      return false;
    }

    const activeCameraX = cameraX();
    const enemyScreenX = encounter.position - activeCameraX;
    const lockedCameraX = encounterLockCameraX(encounter);
    const framedForEncounter = enemyScreenX <= viewportWidth - battleFrameInset + 1;
    const actFourFootVisible = isActFourPoc && isActFourBossFootVisible(encounter, activeCameraX);
    const framingLocked = activeCameraX >= lockedCameraX - 1;

    if (isActFourPoc) {
      if (actFourFinalePhase === 'approach' && actFourFootVisible && !actFourFootNoticePlayed) {
        actFourFootNoticePlayed = true;
        audio.playHook(AUDIO_HOOKS.actFour.footNotice);
        setStatus('На краю кадра появляется юбилейная инстанция. Можно подойти ближе, если у числа нет приёмных часов.');
      }

      if (actFourFinalePhase === 'approach' && framingLocked) {
        startActFourBossRevealDialogue(encounter);
        return true;
      }

      return false;
    }

    if (framedForEncounter || actFourFootVisible || framingLocked) {
      hideActOneGoPrompt();
      playerX = encounterPlayerFrameX(encounter);
      encounterDialogueStep = 0;
      dialogue = encounter.dialogue;
      mode = 'encounter-dialogue';
      audio.playHook(getEncounterStartHook(encounter));
      setStatus(`${encounter.name} решил высказаться первым.`);
      if (!patchExploreToEncounterDialogue()) {
        render();
      }
      return true;
    }

    return false;
  };

  const stepContinuousMovement = (timestamp: number): void => {
    movementFrame = 0;

    if (mode !== 'explore') {
      stopContinuousMovement({ renderIdle: false });
      return;
    }

    const direction = resolveHeldMoveDirection();
    if (direction === 0) {
      stopContinuousMovement();
      return;
    }

    playerFacingDirection = direction;

    const deltaMs = movementTimestamp ? Math.min(timestamp - movementTimestamp, 64) : 16.67;
    movementTimestamp = timestamp;

    const movementDistance = moveStep * ACT_ONE_RUN_SPEED_STEPS_PER_SECOND * (deltaMs / 1000);
    const nextX = clamp(playerX + direction * movementDistance, 80, worldWidth - 120);
    const didMove = Math.abs(nextX - playerX) > 0.01;
    playerX = nextX;
    rewardToast = null;
    syncExploreMotionStyles();

    if (!didMove) {
      stopContinuousMovement();
      return;
    }

    if (maybeTriggerEncounter()) {
      stopContinuousMovement({ renderIdle: false });
      return;
    }

    movementFrame = requestAnimationFrame(stepContinuousMovement);
  };

  const syncContinuousMovement = (): void => {
    const direction = mode === 'explore' ? resolveHeldMoveDirection() : 0;

    if (direction === 0) {
      stopContinuousMovement();
      return;
    }

    playerFacingDirection = direction;

    if (!playerIsMoving) {
      playerIsMoving = true;
      rewardToast = null;
      syncPlayerSpriteMarkup('running');
    } else {
      syncPlayerFacing();
    }

    if (!movementFrame) {
      movementTimestamp = 0;
      movementFrame = requestAnimationFrame(stepContinuousMovement);
    }
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (mode === 'battle') {
      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
        event.preventDefault();
        if (!event.repeat) {
          moveBattleFocus(-1);
        }
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
        event.preventDefault();
        if (!event.repeat) {
          moveBattleFocus(1);
        }
        return;
      }

      if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
        event.preventDefault();
        if (!event.repeat) {
          moveBattleFocusVertical(-1);
        }
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
        event.preventDefault();
        if (!event.repeat) {
          moveBattleFocusVertical(1);
        }
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!event.repeat && clickActFourCreditsAction()) {
          return;
        }

        if (!event.repeat && clickBattleFocusTarget()) {
          return;
        }
      }
    }

    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
      event.preventDefault();
      leftInputHeld = true;
      preferredMoveDirection = -1;
      syncContinuousMovement();
    }

    if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
      event.preventDefault();
      rightInputHeld = true;
      preferredMoveDirection = 1;
      syncContinuousMovement();
    }
  };
  const handleKeyup = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
      leftInputHeld = false;
      syncContinuousMovement();
    }

    if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
      rightInputHeld = false;
      syncContinuousMovement();
    }
  };
  const clearMovementInput = (): void => {
    leftInputHeld = false;
    rightInputHeld = false;
    stopContinuousMovement();
  };

  const handleResize = (): void => {
    if (resizeFrame) {
      cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      syncViewportMetrics('resize');
      render();
    });
  };

  const unsubscribeGamepad = input.subscribe((state, previousState) => {
    if (
      Math.abs(state.moveX) > 0.01 ||
      Math.abs(state.moveY) > 0.01 ||
      state.confirm ||
      state.cancel ||
      state.shoot
    ) {
      audio.recoverPlayback();
      window.setTimeout(() => audio.recoverPlayback(), 0);
    }

    if (state.confirmPressed && clickActFourCreditsAction()) {
      return;
    }

    if (mode === 'battle') {
      const nextNavX: ActOneMoveDirection = state.moveX < -0.55 ? -1 : state.moveX > 0.55 ? 1 : 0;
      const previousNavX: ActOneMoveDirection = previousState.moveX < -0.55 ? -1 : previousState.moveX > 0.55 ? 1 : 0;
      const nextNavY: ActOneMoveDirection = state.moveY < -0.55 ? -1 : state.moveY > 0.55 ? 1 : 0;
      const previousNavY: ActOneMoveDirection = previousState.moveY < -0.55 ? -1 : previousState.moveY > 0.55 ? 1 : 0;

      if (nextNavX !== gamepadBattleNavX || nextNavX !== previousNavX) {
        gamepadBattleNavX = nextNavX;
        if (nextNavX !== 0) {
          moveBattleFocus(nextNavX);
        }
      }

      if (nextNavY !== gamepadBattleNavY || nextNavY !== previousNavY) {
        gamepadBattleNavY = nextNavY;
        if (nextNavY !== 0) {
          moveBattleFocusVertical(nextNavY);
        }
      }

      if (state.confirmPressed && clickBattleFocusTarget()) {
        return;
      }

      if (!state.confirmPressed) {
        return;
      }
    } else {
      gamepadBattleNavX = 0;
      gamepadBattleNavY = 0;
    }

    const nextDirection: ActOneMoveDirection = state.moveX < -0.45 ? -1 : state.moveX > 0.45 ? 1 : 0;
    if (nextDirection !== gamepadMoveDirection) {
      gamepadMoveDirection = nextDirection;
      if (nextDirection !== 0) {
        preferredMoveDirection = nextDirection;
      }
      syncContinuousMovement();
    }

    if (!state.confirmPressed) {
      return;
    }

    const activeButton =
      document.activeElement instanceof HTMLButtonElement && target.contains(document.activeElement)
        ? document.activeElement
        : null;
    const fallbackButton = target.querySelector<HTMLButtonElement>(
      '[data-dialogue-ok], [data-card]:not([disabled]), [data-act-four-support-dialogue], [data-act-four-artifact-dialogue], [data-act-four-win-button], [data-act-four-gift]:not([disabled]), [data-act-four-restart]:not([disabled]), [data-reward-continue], [data-artifact-collect], [data-end-turn]',
    );
    const button = activeButton ?? fallbackButton;
    if (!button?.disabled) {
      button?.click();
    }
  });

  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);
  window.addEventListener('blur', clearMovementInput);
  window.addEventListener('resize', handleResize);
  target.addEventListener('click', handleTargetClick);
  preloadCardArt();
  if (!applyActFourDirectStart()) {
    setStatus(statusCopy);
  }
  render();

  return () => {
    cardArtPreloadDisposed = true;
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('keyup', handleKeyup);
    window.removeEventListener('blur', clearMovementInput);
    window.removeEventListener('resize', handleResize);
    target.removeEventListener('click', handleTargetClick);
    unsubscribeGamepad();
	    scheduler.clear();
	    stopContinuousMovement({ renderIdle: false });
	    stopSpriteSheetAnimation();
		    stopActFourBossAnimation();
		    stopActFourShowdownAnimation();
		    stopActFourSupportAnimation();
    stopActFourPlayerTransformAnimation();
    actFourCutsceneVideo?.pause();
    actFourGiftVideo?.pause();
	    target.closest<HTMLElement>('.stage-shell')?.removeAttribute('data-act-four-phase');
	    if (battleFocusFrame) {
      cancelAnimationFrame(battleFocusFrame);
    }
    if (resizeFrame) {
      cancelAnimationFrame(resizeFrame);
    }
    target.innerHTML = '';
  };
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!];
  }
  return copy;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
