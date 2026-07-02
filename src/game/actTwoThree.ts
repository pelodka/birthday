import * as THREE from 'three';

import {
  ACT_TWO_COPY,
  ACT_TWO_DIALOGUE_PORTRAITS,
  ACT_TWO_ENEMY_DIALOGUE_PORTRAITS,
  ACT_TWO_PARTNER_DIALOGUE_PORTRAITS,
} from '../content/actTwo';
import { AUDIO_HOOKS } from '../audio/hooks';
import type { SceneAudioController } from '../audio/sceneAudio';
import type { GamepadInputManager } from '../input/gamepad';
import type { FallbackRigDefinition, SceneDefinition } from '../types';
import {
  createActTwoEnemyVisual,
  type EnemyAnimationCue,
  type EnemyVisualActorId,
} from './actTwoEnemyVisual';
import { applyActTwoSceneChrome, type ActTwoPhase } from './actTwoSceneChrome';
import {
  createActTwoPartyVisual,
  type PartyAnimationCue,
  type PartyAnimationMode,
} from './actTwoPartyVisual';
import { escapeAttribute, escapeCssValue, escapeHtml } from './domMarkup';
import { createScheduler } from './scheduler';

interface ActTwoThreeConfig {
  target: HTMLElement;
  scene: SceneDefinition;
  fallbackRig: FallbackRigDefinition;
  input: GamepadInputManager;
  audio: SceneAudioController;
  onComplete: () => void;
  onStatusChange: (copy: string) => void;
}

type BattleMenuMode = 'command' | 'ability' | 'target';
type AbilityId = 'limit-line' | 'all-hands' | 'phrase-burst' | 'briefing-wall';
type BattleCommand = 'attack' | 'ability' | 'guard';
type BattleAbilitySelection = AbilityId | 'back';

const BATTLE_COMMANDS: readonly BattleCommand[] = ['attack', 'ability', 'guard'];
const BATTLE_BACK_SELECTION: BattleAbilitySelection = 'back';

interface AbilityDefinition {
  id: AbilityId;
  name: string;
  cost: number;
  description: string;
  damage?: number;
  healAll?: number;
  shieldAll?: number;
}

interface ActorTemplate {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  mp?: number;
  maxMp?: number;
  damage?: number;
  accent: string;
  abilitySet?: 'boss-prime' | 'planner-mage';
  kind: 'party' | 'enemy';
  visualKind?: EnemyVisualActorId;
  boss?: boolean;
}

interface CombatantState extends ActorTemplate {
  guard: boolean;
  shield: number;
  alive: boolean;
}

interface EncounterDefinition {
  id: 'opening' | 'duo' | 'boss';
  label: string;
  intro: string;
  victory: string;
  enemies: ActorTemplate[];
  boss?: boolean;
}

interface PendingAction {
  kind: 'attack' | 'guard' | 'ability';
  abilityId?: AbilityId;
}

interface BattleState {
  encounter: EncounterDefinition;
  party: CombatantState[];
  enemies: CombatantState[];
  enemyVisuals: ActorVisual[];
  turnIndex: number;
  busy: boolean;
  menuMode: BattleMenuMode;
  pendingAction: PendingAction | null;
  selectedTargetId: string | null;
  selectedCommand: BattleCommand;
  selectedAbilityId: BattleAbilitySelection;
  status: string;
}

interface DialogueBeat {
  speakerId: string;
  speakerLabel: string;
  side: 'left' | 'right';
  text: string;
  accent: string;
  fancyName?: string;
  portraitSrc?: string;
  mirrorPortrait?: boolean;
  placeholderCode?: string;
  placeholderLabel?: string;
}

interface DialogueState {
  beats: DialogueBeat[];
  index: number;
  finalButtonLabel: string;
  onComplete: () => void;
}

interface ActorVisual {
  clearAnimationCue?: () => void;
  group: THREE.Group;
  setMotion: (time: number, movementBias?: number) => void;
  setAnimationMode?: (mode: PartyAnimationMode) => void;
  playAnimationCue?: (cue: PartyAnimationCue) => number;
  playEnemyCue?: (cue: EnemyAnimationCue) => number;
  getEnemyCueDuration?: (cue: EnemyAnimationCue) => number;
  dispose?: () => void;
}

const FIELD_STEP_DISTANCE = 1.1;
const STEPS_PER_ENCOUNTER = 5;
const FIELD_SPEED = 4.4;
const FIELD_X_LIMIT = 5.3;
const FIELD_Z_LIMIT = 3.7;
const ACT_TWO_ARTIFACT_FLIGHT_MS = 760;
const ACT_TWO_VICTORY_MIN_HOLD_MS = 2300;
const ACT_TWO_VICTORY_SETTLE_MS = 180;
const ACT_TWO_HIT_REACTION_LEAD_MS = 1500;
const ACT_TWO_HIT_REACTION_MAX_DELAY_RATIO = 0.58;
const ACT_TWO_DAMAGE_APPLY_INTO_HIT_MS = 220;
const ACT_TWO_PARTY_HIT_REACTION_FALLBACK_MS = 420;
const DIALOGUE_LINE_TARGET_CHARS = 72;
const DIALOGUE_SHOUT_LINE = 'Бегите, глупцы!';
const DIALOGUE_SENTENCE_PATTERN = /[^.!?…]+[.!?…]+[»"')\]]*|[^.!?…]+$/gu;
const actTwoUi = ACT_TWO_COPY.ui;
const actTwoDialogue = ACT_TWO_COPY.dialogue;
const actTwoStatus = ACT_TWO_COPY.status;
const actTwoCharacters = ACT_TWO_COPY.characters;
const actTwoEncounterNames = ACT_TWO_COPY.encounters;
const actTwoAbilities = ACT_TWO_COPY.abilities;

function renderDialogueInline(text: string, fancyName?: string): string {
  if (!fancyName || !text.includes(fancyName)) {
    return escapeHtml(text);
  }

  return text
    .split(fancyName)
    .map((part) => escapeHtml(part))
    .join(`<span class="act-two-poc__dialogue-fancy-name">${escapeHtml(fancyName)}</span>`);
}

function renderDialogueText(text: string, fancyName?: string): string {
  const manualLines = text.trim().split(/\n+/u);
  const renderManualLine = (lineText: string): string => {
    const sentences = lineText.trim().match(DIALOGUE_SENTENCE_PATTERN) ?? [lineText];
    const lines = sentences.reduce<Array<{ text: string; variant?: 'shout' }>>((result, sentence) => {
      const normalizedSentence = sentence.trim();
      const currentLine = result[result.length - 1];

      if (normalizedSentence === DIALOGUE_SHOUT_LINE) {
        result.push({ text: normalizedSentence, variant: 'shout' });
        return result;
      }

      if (
        !currentLine ||
        currentLine.variant === 'shout' ||
        currentLine.text.length + normalizedSentence.length + 1 > DIALOGUE_LINE_TARGET_CHARS
      ) {
        result.push({ text: normalizedSentence });
        return result;
      }

      currentLine.text = `${currentLine.text} ${normalizedSentence}`;
      return result;
    }, []);

    return lines
      .map((line) =>
        line.variant === 'shout'
          ? `<span class="act-two-poc__dialogue-shout">${escapeHtml(line.text)}</span>`
          : renderDialogueInline(line.text, fancyName),
      )
      .join('<br>');
  };

  return manualLines.map((lineText) => renderManualLine(lineText)).join('<br>');
}

const PARTY_TEMPLATES: Record<'boss-prime' | 'planner-mage', ActorTemplate> = {
  'boss-prime': {
    id: 'boss-prime',
    name: actTwoCharacters.heroName,
    hp: 42,
    maxHp: 42,
    mp: 12,
    maxMp: 12,
    accent: '#ffcf56',
    abilitySet: 'boss-prime',
    kind: 'party',
  },
  'planner-mage': {
    id: 'planner-mage',
    name: actTwoCharacters.partnerName,
    hp: 32,
    maxHp: 32,
    mp: 16,
    maxMp: 16,
    accent: '#ff6d8d',
    abilitySet: 'planner-mage',
    kind: 'party',
  },
};

const ABILITIES: Record<'boss-prime' | 'planner-mage', AbilityDefinition[]> = {
  'boss-prime': [
    {
      id: 'limit-line',
      name: actTwoAbilities.heroStrike.name,
      cost: 3,
      description: actTwoAbilities.heroStrike.description,
      damage: 12,
    },
    {
      id: 'all-hands',
      name: actTwoAbilities.heroSupport.name,
      cost: 3,
      description: actTwoAbilities.heroSupport.description,
      healAll: 5,
    },
  ],
  'planner-mage': [
    {
      id: 'phrase-burst',
      name: actTwoAbilities.partnerStrike.name,
      cost: 4,
      description: actTwoAbilities.partnerStrike.description,
      damage: 10,
    },
    {
      id: 'briefing-wall',
      name: actTwoAbilities.partnerSupport.name,
      cost: 3,
      description: actTwoAbilities.partnerSupport.description,
      shieldAll: 6,
    },
  ],
};

const ENCOUNTERS: EncounterDefinition[] = [
  {
    id: 'opening',
    label: 'Столкновение 1',
    intro: actTwoDialogue.opening[1]!,
    victory: actTwoStatus.openingVictory,
    enemies: [
      {
        id: 'taxi-migrant',
        name: actTwoEncounterNames.openingName,
        hp: 18,
        maxHp: 18,
        damage: 5,
        accent: '#57d7ff',
        kind: 'enemy',
        visualKind: 'taxi-migrant',
      },
    ],
  },
  {
    id: 'duo',
    label: 'Столкновение 2',
    intro: actTwoStatus.duoIntro,
    victory: actTwoStatus.duoVictory,
    enemies: [
      {
        id: 'anton-distorton',
        name: actTwoEncounterNames.duoFirstName,
        hp: 20,
        maxHp: 20,
        damage: 5,
        accent: '#57d7ff',
        kind: 'enemy',
        visualKind: 'anton-distorton',
      },
      {
        id: 'vadim-heavydim',
        name: actTwoEncounterNames.duoSecondName,
        hp: 19,
        maxHp: 19,
        damage: 4,
        accent: '#ff6d8d',
        kind: 'enemy',
        visualKind: 'vadim-heavydim',
      },
    ],
  },
  {
    id: 'boss',
    label: 'Босс',
    intro: ACT_TWO_COPY.scene.bossEncounter.introLine,
    victory: actTwoStatus.bossVictory,
    boss: true,
    enemies: [
      {
        id: 'giant-khinkali',
        name: actTwoEncounterNames.bossName,
        hp: 48,
        maxHp: 48,
        damage: 7,
        accent: '#ff6d8d',
        kind: 'enemy',
        visualKind: 'giant-khinkali',
        boss: true,
      },
    ],
  },
];

export function mountActTwoThree({
  target,
  scene,
  fallbackRig,
  input,
  audio,
  onComplete,
  onStatusChange,
}: ActTwoThreeConfig): () => void {
  target.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'act-two-poc';
  root.dataset.mode = 'explore';
  root.innerHTML = `
    <div class="act-two-poc__plate" style="background-image:${scene.backgroundImage ? `url('${scene.backgroundImage}')` : 'none'}"></div>
    <div class="act-two-poc__battle-plate" style="background-image:${scene.backgroundImage ? `url('${scene.backgroundImage}')` : 'none'}"></div>
    <div class="act-two-poc__hud" data-act-two-hud></div>
    <div class="act-two-poc__ui" data-act-two-ui></div>
    <div class="act-two-poc__transition" data-act-two-transition></div>
  `;
  target.appendChild(root);

  const hudEl = root.querySelector<HTMLElement>('[data-act-two-hud]')!;
  const uiEl = root.querySelector<HTMLElement>('[data-act-two-ui]')!;
  const transitionEl = root.querySelector<HTMLElement>('[data-act-two-transition]')!;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'stage__three-canvas stage__three-canvas--ps1 act-two-poc__canvas';
  root.appendChild(renderer.domElement);

  const world = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 100);
  const cameraTarget = new THREE.Vector3(0, 1.2, 0);
  const cameraPosition = new THREE.Vector3(0, 8.6, 9.6);
  camera.position.copy(cameraPosition);
  camera.lookAt(cameraTarget);

  const ambient = new THREE.AmbientLight(0xcbd6ff, 0.9);
  world.add(ambient);

  const hemisphere = new THREE.HemisphereLight(0xb8f4ff, 0x180f23, 1.35);
  world.add(hemisphere);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
  keyLight.position.set(6, 12, 8);
  world.add(keyLight);

  const battleRim = new THREE.PointLight(new THREE.Color(scene.palette.accent), 4.2, 28, 2);
  battleRim.position.set(0, 3.6, -4);
  world.add(battleRim);

  const battleStage = createBattleStage(scene.palette.accent);
  battleStage.visible = false;
  world.add(battleStage);

  const heroVisual = createPartyVisual('boss-prime', fallbackRig, '#ffcf56');
  heroVisual.group.position.set(0, 0, 1.2);
  world.add(heroVisual.group);

  let partnerVisual = createDormantActorVisual();
  let partnerVisualLoaded = false;
  partnerVisual.group.visible = false;
  world.add(partnerVisual.group);

  const fieldDecor = createFieldDecor();
  fieldDecor.visible = true;
  world.add(fieldDecor);

  const pressedKeys = new Set<string>();
  const scheduler = createScheduler();
  const { schedule } = scheduler;

  let frameId = 0;
  let phase: ActTwoPhase = 'explore';
  let battleState: BattleState | null = null;
  let encounterIndex = 0;
  let stepsSinceEncounter = 0;
  let distanceAccumulator = 0;
  let recruitedPartner = false;
  let currentPromptTitle: string = actTwoUi.fieldTitle;
  let currentPromptBody: string = actTwoUi.fieldBody;
  let previousTime = performance.now();
  let fieldFacing = new THREE.Vector2(0.65, -0.55).normalize();
  let completionQueued = false;
  let playerPortraitCursor = 0;
  let partnerPortraitCursor = 0;
  let dialogueState: DialogueState | null = null;
  let gamepadBattleAxisLatch: -1 | 0 | 1 = 0;
  const PARTNER_FOLLOW_DISTANCE = 1.22;
  const PARTNER_FOLLOW_SIDE_OFFSET = 0.42;
  const getPartnerFollowPosition = (
    heroPosition: THREE.Vector3 = heroVisual.group.position,
    facing: THREE.Vector2 = fieldFacing,
  ): THREE.Vector3 => new THREE.Vector3(
    heroPosition.x - facing.x * PARTNER_FOLLOW_DISTANCE + facing.y * PARTNER_FOLLOW_SIDE_OFFSET,
    0,
    heroPosition.z - facing.y * PARTNER_FOLLOW_DISTANCE - facing.x * PARTNER_FOLLOW_SIDE_OFFSET,
  );
  partnerVisual.group.position.copy(getPartnerFollowPosition(heroVisual.group.position));
  const savedFieldHeroPosition = new THREE.Vector3().copy(heroVisual.group.position);
  const savedFieldPartnerPosition = new THREE.Vector3().copy(partnerVisual.group.position);
  const syncPhaseChrome = (): void => {
    applyActTwoSceneChrome(
      {
        root,
        hudEl,
        transitionEl,
        battleStage,
        fieldDecor,
        hudEyebrow: actTwoUi.hudEyebrow,
        onStatusChange,
      },
      {
        phase,
        promptTitle: currentPromptTitle,
        promptBody: currentPromptBody,
      },
    );
  };
  const getPartyVisual = (actorId: string): ActorVisual | null => {
    if (actorId === 'boss-prime') {
      return heroVisual;
    }

    if (actorId === 'planner-mage') {
      return partnerVisual;
    }

    return null;
  };
  const getCueDelay = (cueDurationMs: number, fallbackMs: number): number =>
    cueDurationMs > 0 ? Math.max(cueDurationMs, fallbackMs) : fallbackMs;
  const getBattleStartHook = (encounter: EncounterDefinition): string =>
    encounter.id === 'boss'
      ? AUDIO_HOOKS.actTwo.battleStartBoss
      : encounter.id === 'duo'
        ? AUDIO_HOOKS.actTwo.battleStartDuo
        : AUDIO_HOOKS.actTwo.battleStartOpening;
  const getEncounterStartHook = (encounter: EncounterDefinition): string =>
    encounter.id === 'boss'
      ? AUDIO_HOOKS.actTwo.encounterStartBoss
      : encounter.id === 'duo'
        ? AUDIO_HOOKS.actTwo.encounterStartDuo
        : AUDIO_HOOKS.actTwo.encounterStartOpening;
  const getEnemyVisualForActor = (actorId: string): ActorVisual | null => {
    if (!battleState) {
      return null;
    }

    const index = battleState.enemies.findIndex((enemy) => enemy.id === actorId);
    return index >= 0 ? battleState.enemyVisuals[index] ?? null : null;
  };
  const getEnemyReactionCue = (targetActor: CombatantState, damage: number): EnemyAnimationCue =>
    targetActor.hp - damage <= 0 ? 'defeat' : 'hit';
  const getEnemyReactionDuration = (targetActor: CombatantState, damage: number): number => {
    const reactionCue = getEnemyReactionCue(targetActor, damage);
    const enemyVisual = getEnemyVisualForActor(targetActor.id);
    return getCueDelay(
      enemyVisual?.getEnemyCueDuration?.(reactionCue) ?? 0,
      reactionCue === 'defeat' ? 540 : 260,
    );
  };
  const getDamageApplyDelay = (reactionDurationMs: number): number =>
    Math.max(Math.min(ACT_TWO_DAMAGE_APPLY_INTO_HIT_MS, reactionDurationMs * 0.4), 80);
  const scheduleEnemyDamageReaction = (targetActor: CombatantState, damage: number, hitStatus: string, delay: number): void => {
    const reactionCue = getEnemyReactionCue(targetActor, damage);
    const targetActorId = targetActor.id;
    schedule(() => {
      if (!battleState) {
        return;
      }

      const enemy = battleState.enemies.find((entry) => entry.id === targetActorId);
      if (!enemy) {
        return;
      }

      const reactionDuration = getEnemyVisualForActor(targetActorId)?.playEnemyCue?.(reactionCue) ?? 0;
      renderBattleUi();

      schedule(() => {
        if (!battleState) {
          return;
        }

        const damagedEnemy = battleState.enemies.find((entry) => entry.id === targetActorId);
        if (!damagedEnemy) {
          return;
        }

        damagedEnemy.hp = Math.max(damagedEnemy.hp - damage, 0);
        damagedEnemy.alive = damagedEnemy.hp > 0;
        battleState.status = hitStatus;
        renderBattleUi();
      }, getDamageApplyDelay(reactionDuration || getEnemyReactionDuration(enemy, damage)));
    }, delay);
  };

  const loadPartnerVisual = (
    spawnPosition: THREE.Vector3 = getPartnerFollowPosition(heroVisual.group.position),
    rotationY: number = heroVisual.group.rotation.y,
  ): ActorVisual => {
    if (partnerVisualLoaded) {
      return partnerVisual;
    }

    const dormantGroup = partnerVisual.group;
    const loadedVisual = createPartyVisual('planner-mage', fallbackRig, '#ff6d8d');
    loadedVisual.group.position.copy(spawnPosition);
    loadedVisual.group.rotation.y = rotationY;
    loadedVisual.group.visible = recruitedPartner;

    world.remove(dormantGroup);
    world.add(loadedVisual.group);

    partnerVisual = loadedVisual;
    partnerVisualLoaded = true;
    return partnerVisual;
  };

  const setStatus = (title: string, body: string): void => {
    currentPromptTitle = title;
    currentPromptBody = body;
    syncPhaseChrome();
  };

  const resize = (): void => {
    const width = target.clientWidth || 1280;
    const height = target.clientHeight || 720;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const livingParty = (party: CombatantState[]): CombatantState[] => party.filter((ally) => ally.hp > 0);
  const livingEnemies = (enemies: CombatantState[]): CombatantState[] =>
    enemies.filter((enemy) => enemy.alive !== false && enemy.hp > 0);

  const updateMode = (nextPhase: ActTwoPhase): void => {
    phase = nextPhase;
    syncPhaseChrome();
  };

  const stageFieldDialogueView = (): void => {
    updateMode('dialogue');
    heroVisual.group.visible = true;
    heroVisual.setAnimationMode?.('field-idle');
    heroVisual.group.position.set(savedFieldHeroPosition.x, 0, savedFieldHeroPosition.z);
    partnerVisual.group.visible = recruitedPartner;
    partnerVisual.setAnimationMode?.('field-idle');
    partnerVisual.group.position.set(savedFieldPartnerPosition.x, 0, savedFieldPartnerPosition.z);
  };

  const makePlayerBeat = (text: string, options: Pick<DialogueBeat, 'fancyName'> = {}): DialogueBeat => {
    const portraitSrc = ACT_TWO_DIALOGUE_PORTRAITS[playerPortraitCursor % ACT_TWO_DIALOGUE_PORTRAITS.length]!;
    playerPortraitCursor += 1;
    return {
      speakerId: 'boss-prime',
      speakerLabel: PARTY_TEMPLATES['boss-prime'].name,
      side: 'left',
      text,
      accent: PARTY_TEMPLATES['boss-prime'].accent,
      portraitSrc,
      ...options,
    };
  };

  const makePartnerBeat = (text: string): DialogueBeat => {
    const portraitSrc =
      ACT_TWO_PARTNER_DIALOGUE_PORTRAITS[partnerPortraitCursor % ACT_TWO_PARTNER_DIALOGUE_PORTRAITS.length]!;
    partnerPortraitCursor += 1;
    return {
      speakerId: 'planner-mage',
      speakerLabel: PARTY_TEMPLATES['planner-mage'].name,
      side: 'right',
      text,
      accent: PARTY_TEMPLATES['planner-mage'].accent,
      portraitSrc,
      mirrorPortrait: true,
    };
  };

  const makeEnemyBeat = (
    speakerId: string,
    speakerLabel: string,
    text: string,
    accent: string,
    placeholderCode: string,
  ): DialogueBeat => {
    const portraitSrc =
      ACT_TWO_ENEMY_DIALOGUE_PORTRAITS[speakerId as keyof typeof ACT_TWO_ENEMY_DIALOGUE_PORTRAITS];
    return {
      speakerId,
      speakerLabel,
      side: 'right',
      text,
      accent,
      portraitSrc,
      placeholderCode: portraitSrc ? undefined : placeholderCode,
      placeholderLabel: portraitSrc ? undefined : actTwoUi.enemyPlaceholder,
    };
  };

  const getIntroDialogue = (): DialogueBeat[] => actTwoDialogue.intro.map((text) => makePlayerBeat(text));

  const getEncounterDialogue = (encounter: EncounterDefinition): DialogueBeat[] => {
    if (encounter.id === 'opening') {
      return [
        makePlayerBeat(actTwoDialogue.opening[0]!),
        makeEnemyBeat('taxi-migrant', actTwoEncounterNames.openingName, actTwoDialogue.opening[1]!, '#57d7ff', 'TM'),
        makePlayerBeat(actTwoDialogue.opening[2]!),
        makeEnemyBeat('taxi-migrant', actTwoEncounterNames.openingName, actTwoDialogue.opening[3]!, '#57d7ff', 'TM'),
      ];
    }

    if (encounter.id === 'duo') {
      return [
        makePlayerBeat(actTwoDialogue.duo[0]!),
        makePartnerBeat(actTwoDialogue.duo[1]!),
        makeEnemyBeat('anton-distorton', actTwoEncounterNames.duoFirstName, actTwoDialogue.duo[2]!, '#57d7ff', 'AD'),
        makeEnemyBeat(
          'vadim-heavydim',
          actTwoEncounterNames.duoSecondName,
          actTwoDialogue.duo[3]!,
          '#ff6d8d',
          'VH',
        ),
      ];
    }

    return [
      makePlayerBeat(actTwoDialogue.boss[0]!),
      makePartnerBeat(actTwoDialogue.boss[1]!),
      makeEnemyBeat('giant-khinkali', actTwoEncounterNames.bossName, actTwoDialogue.boss[2]!, '#ff6d8d', 'KH'),
      makeEnemyBeat('giant-khinkali', actTwoEncounterNames.bossName, actTwoDialogue.boss[3]!, '#ff6d8d', 'KH'),
    ];
  };

  const getPartnerJoinDialogue = (): DialogueBeat[] => [
    makePlayerBeat(actTwoDialogue.partnerJoin[0]!),
    makePlayerBeat(actTwoDialogue.partnerJoin[1]!, { fancyName: 'Андрей' }),
    makePartnerBeat(actTwoDialogue.partnerJoin[2]!),
    makePlayerBeat(actTwoDialogue.partnerJoin[3]!),
  ];

  const getPostSecondEncounterDialogue = (): DialogueBeat[] => [makePlayerBeat(actTwoDialogue.postSecond[0]!)];

  const getPostBossDialogue = (): DialogueBeat[] => [
    makePlayerBeat(actTwoDialogue.postBoss[0]!),
    makePartnerBeat(actTwoDialogue.postBoss[1]!),
    makePartnerBeat(actTwoDialogue.postBoss[2]!),
  ];

  const renderDialoguePortrait = (beat: DialogueBeat): string =>
    beat.portraitSrc
      ? `
        <div class="act-two-poc__dialogue-portrait-shell" style="--dialogue-accent:${escapeCssValue(beat.accent)}">
          <img
            class="act-two-poc__dialogue-portrait-image${beat.mirrorPortrait ? ' act-two-poc__dialogue-portrait-image--mirrored' : ''}"
            src="${escapeAttribute(beat.portraitSrc)}"
            alt="${escapeAttribute(`Портрет: ${beat.speakerLabel}`)}"
            decoding="async"
          >
        </div>
      `
      : `
        <div class="act-two-poc__dialogue-portrait-shell act-two-poc__dialogue-portrait-shell--placeholder" style="--dialogue-accent:${escapeCssValue(beat.accent)}">
          <span class="act-two-poc__dialogue-placeholder-code" aria-hidden="true">${escapeHtml(beat.placeholderCode ?? '??')}</span>
          <small>${escapeHtml(beat.placeholderLabel ?? actTwoUi.genericPlaceholder)}</small>
        </div>
      `;

  const renderDialogueState = (): void => {
    if (!dialogueState) {
      uiEl.innerHTML = '';
      return;
    }

    stageFieldDialogueView();
    const beat = dialogueState.beats[dialogueState.index]!;
    const isFinalBeat = dialogueState.index === dialogueState.beats.length - 1;
    const buttonLabel = isFinalBeat ? dialogueState.finalButtonLabel : actTwoUi.dialogueNext;
    const portraitMarkup = renderDialoguePortrait(beat);

    uiEl.innerHTML = `
      <section class="act-two-poc__dialogue-layer" data-act-two-dialogue>
        <article class="act-two-poc__dialogue-panel act-two-poc__dialogue-panel--${beat.side}">
          <div class="act-two-poc__dialogue-portrait act-two-poc__dialogue-portrait--${beat.side}">
            ${portraitMarkup}
          </div>
          <div class="act-two-poc__dialogue-copy">
            <h2>${escapeHtml(beat.speakerLabel)}</h2>
            <p data-act-two-dialogue-text>${renderDialogueText(beat.text, beat.fancyName)}</p>
            <div class="act-two-poc__dialogue-actions">
              <button class="app-button app-button--bright" data-act-two-dialogue-continue type="button">${escapeHtml(buttonLabel)}</button>
            </div>
          </div>
        </article>
      </section>
    `;

    uiEl.querySelector<HTMLButtonElement>('[data-act-two-dialogue-continue]')?.addEventListener('click', () => {
      if (!dialogueState) {
        return;
      }

      if (dialogueState.index < dialogueState.beats.length - 1) {
        dialogueState.index += 1;
        renderDialogueState();
        return;
      }

      const nextAction = dialogueState.onComplete;
      dialogueState = null;
      uiEl.innerHTML = '';
      nextAction?.();
    });
  };

  const renderDialogueSequence = (
    beats: DialogueBeat[],
    finalButtonLabel: string,
    action: () => void,
    audioHookId?: string,
  ): void => {
    if (audioHookId) {
      audio.playHook(audioHookId);
    }

    dialogueState = {
      beats,
      index: 0,
      finalButtonLabel,
      onComplete: action,
    };
    renderDialogueState();
  };

  const cloneCombatant = (template: ActorTemplate): CombatantState => ({
    ...template,
    hp: template.maxHp,
    mp: template.maxMp ?? template.mp,
    guard: false,
    shield: 0,
    alive: true,
  });

  const buildPartyForBattle = (): CombatantState[] => {
    const party = [cloneCombatant(PARTY_TEMPLATES['boss-prime'])];
    if (recruitedPartner) {
      party.push(cloneCombatant(PARTY_TEMPLATES['planner-mage']));
    }
    return party;
  };

  const clearEnemyVisuals = (): void => {
    battleState?.enemyVisuals.forEach((visual) => {
      world.remove(visual.group);
      visual.dispose?.();
    });
  };

  const getCurrentActor = (state: BattleState): CombatantState => {
    const order = [...livingParty(state.party), ...livingEnemies(state.enemies)];
    return order[state.turnIndex % order.length]!;
  };

  const getFirstLivingEnemyId = (state: BattleState): string | null => livingEnemies(state.enemies)[0]?.id ?? null;

  const ensureSelectedTarget = (): string | null => {
    if (!battleState) {
      return null;
    }

    const state = battleState;

    const hasCurrentTarget = state.selectedTargetId
      ? state.enemies.some((enemy) => enemy.id === state.selectedTargetId && enemy.hp > 0 && enemy.alive !== false)
      : false;

    if (!hasCurrentTarget) {
      state.selectedTargetId = getFirstLivingEnemyId(state);
    }

    return state.selectedTargetId;
  };

  const enterTargetingMode = (copy: string): void => {
    if (!battleState) {
      return;
    }

    battleState.menuMode = 'target';
    battleState.selectedTargetId = ensureSelectedTarget();
    battleState.status = copy;
    renderBattleUi();
  };

  const backOutOfTargeting = (): void => {
    if (!battleState) {
      return;
    }

    battleState.pendingAction = null;
    battleState.selectedTargetId = null;
    battleState.menuMode = 'command';
    battleState.status = 'Назад к командам.';
    renderBattleUi();
  };

  const cycleTargetSelection = (direction: 1 | -1): void => {
    if (!battleState || battleState.menuMode !== 'target' || battleState.busy) {
      return;
    }

    const enemies = livingEnemies(battleState.enemies);
    if (enemies.length === 0) {
      battleState.selectedTargetId = null;
      renderBattleUi();
      return;
    }

    const currentTargetId = ensureSelectedTarget() ?? enemies[0]!.id;
    const currentIndex = Math.max(
      enemies.findIndex((enemy) => enemy.id === currentTargetId),
      0,
    );
    const nextIndex = (currentIndex + direction + enemies.length) % enemies.length;
    battleState.selectedTargetId = enemies[nextIndex]!.id;
    battleState.status = `Цель захвачена: ${enemies[nextIndex]!.name}.`;
    renderBattleUi();
  };

  const getCommandLabel = (command: BattleCommand): string => {
    switch (command) {
      case 'attack':
        return actTwoUi.attack;
      case 'ability':
        return actTwoUi.ability;
      case 'guard':
        return actTwoUi.guard;
    }
  };

  const normalizeCommandSelection = (): BattleCommand => {
    if (!battleState) {
      return 'attack';
    }

    if (!BATTLE_COMMANDS.includes(battleState.selectedCommand)) {
      battleState.selectedCommand = 'attack';
    }

    return battleState.selectedCommand;
  };

  const getAbilityMenuSelections = (actor: CombatantState): BattleAbilitySelection[] => {
    const abilitySelections = actor.abilitySet
      ? ABILITIES[actor.abilitySet]
          .filter((ability) => (actor.mp ?? 0) >= ability.cost)
          .map((ability) => ability.id)
      : [];

    return [...abilitySelections, BATTLE_BACK_SELECTION];
  };

  const normalizeAbilitySelection = (actor: CombatantState): BattleAbilitySelection => {
    if (!battleState) {
      return BATTLE_BACK_SELECTION;
    }

    const selections = getAbilityMenuSelections(actor);
    if (!selections.includes(battleState.selectedAbilityId)) {
      battleState.selectedAbilityId = selections[0] ?? BATTLE_BACK_SELECTION;
    }

    return battleState.selectedAbilityId;
  };

  const cycleBattleMenuSelection = (direction: 1 | -1): void => {
    if (!battleState || battleState.busy) {
      return;
    }

    const actor = getCurrentActor(battleState);
    if (actor.kind !== 'party') {
      return;
    }

    if (battleState.menuMode === 'command') {
      const currentCommand = normalizeCommandSelection();
      const currentIndex = Math.max(BATTLE_COMMANDS.indexOf(currentCommand), 0);
      const nextIndex = (currentIndex + direction + BATTLE_COMMANDS.length) % BATTLE_COMMANDS.length;
      battleState.selectedCommand = BATTLE_COMMANDS[nextIndex]!;
      renderBattleUi();
      return;
    }

    if (battleState.menuMode === 'ability') {
      const selections = getAbilityMenuSelections(actor);
      const currentSelection = normalizeAbilitySelection(actor);
      const currentIndex = Math.max(selections.indexOf(currentSelection), 0);
      const nextIndex = (currentIndex + direction + selections.length) % selections.length;
      battleState.selectedAbilityId = selections[nextIndex] ?? BATTLE_BACK_SELECTION;
      renderBattleUi();
    }
  };

  const clickSelectedBattleControl = (): boolean => {
    if (!battleState || battleState.busy) {
      return false;
    }

    const actor = getCurrentActor(battleState);
    if (actor.kind !== 'party') {
      return false;
    }

    if (battleState.menuMode === 'target') {
      executePartyAction(ensureSelectedTarget() ?? undefined);
      return true;
    }

    if (battleState.menuMode === 'ability') {
      const selectedAbility = normalizeAbilitySelection(actor);
      const button =
        selectedAbility === BATTLE_BACK_SELECTION
          ? uiEl.querySelector<HTMLButtonElement>('[data-act-two-back]')
          : uiEl.querySelector<HTMLButtonElement>(`[data-act-two-ability="${selectedAbility}"]:not([disabled])`);

      if (!button?.disabled) {
        button?.click();
        return true;
      }

      return false;
    }

    const selectedCommand = normalizeCommandSelection();
    const button = uiEl.querySelector<HTMLButtonElement>(`[data-act-two-command="${selectedCommand}"]`);
    if (!button?.disabled) {
      button?.click();
      return true;
    }

    return false;
  };

  const focusSelectedBattleControl = (): void => {
    window.requestAnimationFrame(() => {
      if (phase !== 'battle' || !battleState || battleState.busy) {
        return;
      }

      let control: HTMLElement | null = null;
      const actor = getCurrentActor(battleState);
      if (actor.kind !== 'party') {
        return;
      }

      if (battleState.menuMode === 'target') {
        ensureSelectedTarget();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return;
      } else if (battleState.menuMode === 'ability') {
        const selectedAbility = normalizeAbilitySelection(actor);
        control =
          selectedAbility === BATTLE_BACK_SELECTION
            ? uiEl.querySelector<HTMLButtonElement>('[data-act-two-back]')
            : uiEl.querySelector<HTMLButtonElement>(`[data-act-two-ability="${selectedAbility}"]:not([disabled])`);
      } else {
        control = uiEl.querySelector<HTMLButtonElement>(`[data-act-two-command="${normalizeCommandSelection()}"]`);
      }

      if (control && document.activeElement !== control) {
        control.focus({ preventScroll: true });
      }
    });
  };

  const applyIncomingDamage = (targetActor: CombatantState, amount: number): number => {
    const guardedAmount = targetActor.guard ? Math.ceil(amount * 0.5) : amount;
    const absorbed = Math.min(targetActor.shield, guardedAmount);
    targetActor.shield = Math.max(targetActor.shield - guardedAmount, 0);
    targetActor.guard = false;
    const finalDamage = Math.max(guardedAmount - absorbed, 0);
    targetActor.hp = Math.max(targetActor.hp - finalDamage, 1);
    return finalDamage;
  };

  const getTargetEnemyPosition = (targetId?: string | null): THREE.Vector3 | null =>
    (targetId
      ? battleState?.enemyVisuals.find((_, index) => {
          const enemy = battleState?.enemies[index];
          return enemy?.id === targetId && Boolean(enemy.alive && enemy.hp > 0);
        })?.group.position
      : null) ??
    battleState?.enemyVisuals.find((_, index) => {
      const enemy = battleState?.enemies[index];
      return Boolean(enemy?.alive && enemy.hp > 0);
    })?.group.position ??
    null;

  const faceVisualTowardTarget = (visual: ActorVisual | null, targetPosition: THREE.Vector3 | null): void => {
    if (!visual || !targetPosition) {
      return;
    }

    visual.group.rotation.y = Math.atan2(
      targetPosition.x - visual.group.position.x,
      targetPosition.z - visual.group.position.z,
    );
  };

  const updateBattleVisualLayout = (): void => {
    heroVisual.group.position.set(-3.6, 0, 1.05);
    partnerVisual.group.position.set(-1.9, 0, -0.55);
    partnerVisual.group.visible = recruitedPartner && Boolean(battleState?.party.some((ally) => ally.id === 'planner-mage'));

    battleState?.enemyVisuals.forEach((visual, index) => {
      const enemy = battleState?.enemies[index];
      const x = battleState?.encounter.boss ? 3.35 : 3.3 + index * 1.95;
      const z = battleState?.encounter.boss ? 0.15 : index === 0 ? 0.8 : -1;
      visual.group.position.set(x, 0, z);
      visual.group.visible = Boolean(enemy);
    });

    const selectedTargetId = battleState?.selectedTargetId ?? null;
    const targetEnemyPosition = getTargetEnemyPosition(selectedTargetId);

    if (targetEnemyPosition) {
      faceVisualTowardTarget(heroVisual, targetEnemyPosition);
      faceVisualTowardTarget(partnerVisual, targetEnemyPosition);
    }

    battleState?.enemyVisuals.forEach((visual) => {
      visual.group.rotation.y = Math.atan2(
        heroVisual.group.position.x - visual.group.position.x,
        heroVisual.group.position.z - visual.group.position.z,
      );
    });
  };

  const beginExplore = (copy: string, title: string = actTwoUi.exploreResumedTitle): void => {
    updateMode('explore');
    audio.playHook(AUDIO_HOOKS.actTwo.exploreStart);
    heroVisual.group.visible = true;
    heroVisual.setAnimationMode?.('field-idle');
    heroVisual.group.position.y = 0;
    heroVisual.group.position.x = savedFieldHeroPosition.x;
    heroVisual.group.position.z = savedFieldHeroPosition.z;
    partnerVisual.group.visible = recruitedPartner;
    partnerVisual.setAnimationMode?.('field-idle');
    partnerVisual.group.position.x = savedFieldPartnerPosition.x;
    partnerVisual.group.position.z = savedFieldPartnerPosition.z;
    stepsSinceEncounter = 0;
    distanceAccumulator = 0;
    setStatus(title, copy);
  };

  const projectWorldToViewport = (
    object: THREE.Object3D,
    yOffset: number,
  ): { left: number; top: number } | null => {
    const projected = object.getWorldPosition(new THREE.Vector3());
    projected.y += yOffset;
    projected.project(camera);

    if (projected.z < -1 || projected.z > 1) {
      return null;
    }

    const width = renderer.domElement.clientWidth || target.clientWidth || 1280;
    const height = renderer.domElement.clientHeight || target.clientHeight || 720;
    return {
      left: (projected.x * 0.5 + 0.5) * width,
      top: (-projected.y * 0.5 + 0.5) * height,
    };
  };

  const renderBossArtifactDrop = (): void => {
    updateMode('artifact');
    audio.playHook(AUDIO_HOOKS.actTwo.artifactDrop);
    heroVisual.group.visible = true;
    heroVisual.setAnimationMode?.('field-idle');
    heroVisual.group.position.set(savedFieldHeroPosition.x, 0, savedFieldHeroPosition.z);
    partnerVisual.group.visible = recruitedPartner;
    partnerVisual.setAnimationMode?.('field-idle');
    partnerVisual.group.position.set(savedFieldPartnerPosition.x, 0, savedFieldPartnerPosition.z);
    const relicName = scene.relicReward?.name ?? 'Artifact';
    const relicLabel = scene.relicReward?.name ?? 'артефакт';
    setStatus(actTwoUi.artifactDropTitle, `${relicName} падает с неба. ${actTwoUi.collectArtifact}.`);
    const artifactVisual = scene.relicReward?.imagePath
      ? `<img class="act-two-poc__artifact-image" src="${escapeAttribute(scene.relicReward.imagePath)}" alt="" aria-hidden="true" decoding="async">`
      : `<span class="act-two-poc__artifact-emblem" aria-hidden="true">${escapeHtml(scene.relicReward?.pixelLabel ?? 'ACT2')}</span>`;

    uiEl.innerHTML = `
      <div class="act-two-poc__artifact-drop">
        <button
          class="act-two-poc__artifact-button is-descending"
          data-act-two-artifact
          type="button"
          aria-label="${escapeAttribute(`Забрать ${relicLabel}`)}"
        >
          ${artifactVisual}
          <span class="act-two-poc__artifact-copy">
            <strong>${escapeHtml(relicName)}</strong>
            <small>${escapeHtml(actTwoUi.collectArtifact)}</small>
          </span>
        </button>
      </div>
    `;

    uiEl.querySelector<HTMLButtonElement>('[data-act-two-artifact]')?.addEventListener('click', () => {
      if (completionQueued) {
        return;
      }

      completionQueued = true;
      audio.stopMusic();
      audio.playHook(AUDIO_HOOKS.shared.collection);
      const button = uiEl.querySelector<HTMLElement>('[data-act-two-artifact]');
      button?.classList.remove('is-descending');
      button?.classList.add('is-flight');
      setStatus(actTwoUi.artifactCollectedTitle, `${scene.relicReward?.name ?? 'Artifact'} улетает прямо в стойку реликвий.`);
      schedule(() => onComplete(), ACT_TWO_ARTIFACT_FLIGHT_MS + 160);
    });
  };

  const finishEncounter = (): void => {
    if (!battleState) {
      return;
    }

    const { encounter } = battleState;
    clearEnemyVisuals();
    battleState = null;
    uiEl.innerHTML = '';

    if (encounter.id === 'opening') {
      audio.playHook(AUDIO_HOOKS.actTwo.exploreStart);
      const partnerSpawnPosition = getPartnerFollowPosition(savedFieldHeroPosition);
      loadPartnerVisual(partnerSpawnPosition, heroVisual.group.rotation.y);
      recruitedPartner = true;
      partnerVisual.group.position.copy(partnerSpawnPosition);
      partnerVisual.group.rotation.y = heroVisual.group.rotation.y;
      savedFieldPartnerPosition.copy(partnerSpawnPosition);
      partnerVisual.group.visible = true;
      renderDialogueSequence(
        getPartnerJoinDialogue(),
        actTwoUi.continueExploration,
        () => beginExplore(encounter.victory),
        AUDIO_HOOKS.actTwo.partnerJoin,
      );
      return;
    }

    if (encounter.id === 'boss') {
      renderDialogueSequence(getPostBossDialogue(), actTwoUi.revealRelic, () => {
        setStatus('Босс побеждён', encounter.victory);
        renderBossArtifactDrop();
      }, AUDIO_HOOKS.actTwo.postBoss);
      return;
    }

    audio.playHook(AUDIO_HOOKS.actTwo.exploreStart);
    renderDialogueSequence(
      getPostSecondEncounterDialogue(),
      actTwoUi.walkOn,
      () => beginExplore(encounter.victory),
      AUDIO_HOOKS.actTwo.postSecondEncounter,
    );
  };

  const maybeFinishBattle = (): void => {
    if (!battleState || livingEnemies(battleState.enemies).length > 0) {
      return;
    }

    battleState.busy = true;
    battleState.status = battleState.encounter.victory;
    const victoryHook =
      battleState.encounter.id === 'boss'
        ? AUDIO_HOOKS.actTwo.bossVictory
        : battleState.encounter.id === 'opening'
          ? null
        : battleState.encounter.id === 'duo'
          ? null
          : AUDIO_HOOKS.actTwo.battleVictory;
    if (victoryHook) {
      audio.playHook(victoryHook);
    }
    const livingAllies = livingParty(battleState.party);
    const victoryDelay = Math.max(
      livingAllies.some((ally) => ally.id === 'boss-prime') ? heroVisual.playAnimationCue?.('battle-victory') ?? 0 : 0,
      livingAllies.some((ally) => ally.id === 'planner-mage') ? partnerVisual.playAnimationCue?.('battle-victory') ?? 0 : 0,
    );
    renderBattleUi();
    schedule(finishEncounter, getCueDelay(victoryDelay, ACT_TWO_VICTORY_MIN_HOLD_MS) + ACT_TWO_VICTORY_SETTLE_MS);
  };

  const advanceBattleTurn = (copy: string): void => {
    if (!battleState) {
      return;
    }

    heroVisual.clearAnimationCue?.();
    partnerVisual.clearAnimationCue?.();
    battleState.pendingAction = null;
    battleState.selectedTargetId = null;
    battleState.menuMode = 'command';
    battleState.selectedCommand = 'attack';
    battleState.selectedAbilityId = BATTLE_BACK_SELECTION;
    battleState.busy = false;
    battleState.turnIndex += 1;
    battleState.status = copy;
    renderBattleUi();
  };

  const pickRandomBattleLine = (lines: readonly string[]): string => lines[Math.floor(Math.random() * lines.length)]!;

  const describeEnemyAttack = (actor: CombatantState, targetActor: CombatantState, dealt: number): string => {
    if (actor.id === 'taxi-migrant') {
      return pickRandomBattleLine([
        `${actor.name} доказывает, что Яндекс не понимает братских цен, и снимает с ${targetActor.name} ${dealt} HP.`,
        `${actor.name} предлагает по дороге посмотреть Арарат, но сначала выбивает из ${targetActor.name} ${dealt} урона.`,
        `${actor.name} просит помочь машину толкнуть и заодно наносит ${targetActor.name} ${dealt} урона.`,
      ]);
    }

    if (actor.id === 'anton-distorton') {
      return pickRandomBattleLine([
        `${actor.name} орёт про настоящего колдуна и наносит ${targetActor.name} ${dealt} урона.`,
        `${actor.name} кричит "Панки хой, Горшок живой!" так громко, что ${targetActor.name} теряет ${dealt} HP.`,
        `${actor.name} ищет слова песен, находит слабое место и продавливает ${targetActor.name} на ${dealt} урона.`,
      ]);
    }

    if (actor.id === 'vadim-heavydim') {
      return pickRandomBattleLine([
        `${actor.name} объявляет, что всё идёт по плану, и ${targetActor.name} получает ${dealt} урона.`,
        `${actor.name} разворачивает армянское поле экспериментов и сносит ${targetActor.name} ${dealt} HP.`,
        `${actor.name} открывает окна, делает душно и наносит ${targetActor.name} ${dealt} урона.`,
      ]);
    }

    return `${actor.name} бьёт ${targetActor.name} и наносит ${dealt} урона.`;
  };

  const executeEnemyTurn = (): void => {
    if (!battleState) {
      return;
    }

    const actor = getCurrentActor(battleState);
    if (actor.kind !== 'enemy') {
      battleState.busy = false;
      renderBattleUi();
      return;
    }

    const targets = livingParty(battleState.party);
    const targetActor = targets[Math.floor(Math.random() * targets.length)] ?? targets[0];
    if (!targetActor) {
      battleState.busy = false;
      renderBattleUi();
      return;
    }

    const targetVisual = getPartyVisual(targetActor.id);
    const attackerVisual = getEnemyVisualForActor(actor.id);
    const damageAmount = actor.damage ?? 5;
    const targetActorId = targetActor.id;
    let finalStatus = `${actor.name} атакует ${targetActor.name}.`;

    faceVisualTowardTarget(targetVisual, attackerVisual?.group.position ?? null);
    const reactionDuration = getCueDelay(
      targetVisual?.playAnimationCue?.('battle-hit') ?? 0,
      ACT_TWO_PARTY_HIT_REACTION_FALLBACK_MS,
    );
    battleState.status = finalStatus;
    renderBattleUi();

    schedule(() => {
      if (!battleState) {
        return;
      }

      const damagedTarget = battleState.party.find((entry) => entry.id === targetActorId);
      if (!damagedTarget) {
        return;
      }

      const dealt = applyIncomingDamage(damagedTarget, damageAmount);
      finalStatus = describeEnemyAttack(actor, damagedTarget, dealt);
      battleState.status = finalStatus;
      renderBattleUi();
    }, getDamageApplyDelay(reactionDuration));

    schedule(() => {
      if (!battleState) {
        return;
      }

      maybeFinishBattle();
      if (battleState && livingEnemies(battleState.enemies).length > 0) {
        advanceBattleTurn(finalStatus);
      }
    }, reactionDuration);
  };

  const executePartyAction = (targetId?: string): void => {
    if (!battleState || battleState.busy || !battleState.pendingAction) {
      return;
    }

    const pendingAction = battleState.pendingAction;
    const resolvedTargetId = targetId ?? battleState.selectedTargetId ?? getFirstLivingEnemyId(battleState) ?? undefined;
    const actor = getCurrentActor(battleState);
    if (actor.kind !== 'party') {
      return;
    }

    battleState.busy = true;
    let status = `${actor.name} ждёт более точной команды.`;
    let actionDelayMs = 260;
    const actingVisual = getPartyVisual(actor.id);
    let damageReaction: { target: CombatantState; damage: number; hitStatus: string } | null = null;

    if (pendingAction.kind === 'guard') {
      actor.guard = true;
      status = `${actor.name} уходит в защиту с видом человека, который видел этот счёт и не дал чаевых.`;
      actionDelayMs = getCueDelay(actingVisual?.playAnimationCue?.('battle-guard') ?? 0, 260);
    }

    if (pendingAction.kind === 'attack') {
      const targetActor = battleState.enemies.find((enemy) => enemy.id === resolvedTargetId && enemy.hp > 0);
      if (!targetActor) {
        battleState.busy = false;
        return;
      }
      battleState.selectedTargetId = targetActor.id;
      updateBattleVisualLayout();
      faceVisualTowardTarget(actingVisual, getTargetEnemyPosition(targetActor.id));
      status = `${actor.name} атакует ${targetActor.name}.`;
      damageReaction = {
        target: targetActor,
        damage: 8,
        hitStatus: `${actor.name} атакует ${targetActor.name} и наносит 8 урона без протокола разногласий.`,
      };
      actionDelayMs = getCueDelay(actingVisual?.playAnimationCue?.('battle-attack') ?? 0, 260);
    }

    if (pendingAction.kind === 'ability') {
      const ability = actor.abilitySet
        ? ABILITIES[actor.abilitySet].find((entry) => entry.id === pendingAction.abilityId)
        : undefined;

      if (!ability || (actor.mp ?? 0) < ability.cost) {
        battleState.busy = false;
        battleState.status = 'Не хватает MP для этого навыка.';
        renderBattleUi();
        return;
      }

      actor.mp = Math.max((actor.mp ?? 0) - ability.cost, 0);

      if (ability.damage) {
        const targetActor = battleState.enemies.find((enemy) => enemy.id === resolvedTargetId && enemy.hp > 0);
        if (!targetActor) {
          battleState.busy = false;
          return;
        }
        battleState.selectedTargetId = targetActor.id;
        updateBattleVisualLayout();
        faceVisualTowardTarget(actingVisual, getTargetEnemyPosition(targetActor.id));
        status = `${actor.name} применяет «${ability.name}».`;
        damageReaction = {
          target: targetActor,
          damage: ability.damage,
          hitStatus: `${actor.name} применяет «${ability.name}». ${targetActor.name} получает ${ability.damage} урона и письмо без темы.`,
        };
      }

      if (ability.healAll) {
        battleState.party.forEach((ally) => {
          ally.hp = Math.min(ally.maxHp, ally.hp + ability.healAll!);
        });
        status = `${actor.name} применяет «${ability.name}». Группа восстанавливает ${ability.healAll} HP и веру, что такси было худшей частью дня.`;
      }

      if (ability.shieldAll) {
        battleState.party.forEach((ally) => {
          ally.shield += ability.shieldAll!;
        });
        status = `${actor.name} применяет «${ability.name}». Группа получает ${ability.shieldAll} щита и осанку людей с правильным контактом.`;
      }

      if (!ability.damage) {
        faceVisualTowardTarget(actingVisual, getTargetEnemyPosition(resolvedTargetId ?? battleState.selectedTargetId));
      }

      actionDelayMs = getCueDelay(actingVisual?.playAnimationCue?.('battle-skill') ?? 0, 260);
    }

    if (damageReaction) {
      const partyCueDelayMs = actionDelayMs;
      const hitStartDelayMs = Math.max(
        Math.min(
          partyCueDelayMs - ACT_TWO_HIT_REACTION_LEAD_MS,
          partyCueDelayMs * ACT_TWO_HIT_REACTION_MAX_DELAY_RATIO,
        ),
        0,
      );
      scheduleEnemyDamageReaction(
        damageReaction.target,
        damageReaction.damage,
        damageReaction.hitStatus,
        hitStartDelayMs,
      );
      actionDelayMs = Math.max(
        partyCueDelayMs,
        hitStartDelayMs + getEnemyReactionDuration(damageReaction.target, damageReaction.damage),
      );
    }

    const finalStatus = damageReaction?.hitStatus ?? status;
    battleState.status = status;
    renderBattleUi();
    schedule(() => {
      if (!battleState) {
        return;
      }

      maybeFinishBattle();
      if (battleState && livingEnemies(battleState.enemies).length > 0) {
        advanceBattleTurn(finalStatus);
      }
    }, actionDelayMs);
  };

  const renderAbilityButton = (ability: AbilityDefinition, actor: CombatantState, selectedAbility: BattleAbilitySelection): string => `
    <button class="menu-button ${selectedAbility === ability.id ? 'is-selected' : ''}" data-act-two-ability="${escapeAttribute(ability.id)}" type="button" ${
      (actor.mp ?? 0) < ability.cost ? 'disabled' : ''
    } aria-current="${selectedAbility === ability.id ? 'true' : 'false'}">
      <strong>${escapeHtml(ability.name)}</strong>
      <span>MP ${ability.cost}</span>
      <small>${escapeHtml(ability.description)}</small>
    </button>
  `;

  const renderBattleUi = (): void => {
    if (!battleState) {
      uiEl.innerHTML = '';
      return;
    }

    updateMode('battle');
    updateBattleVisualLayout();

    const state = battleState;
    const actor = getCurrentActor(state);
    const actorIsParty = actor.kind === 'party';
    const selectedTargetId = state.menuMode === 'target' ? ensureSelectedTarget() : state.selectedTargetId;
    const selectedCommand = actorIsParty ? normalizeCommandSelection() : 'attack';
    const selectedAbility = actorIsParty ? normalizeAbilitySelection(actor) : BATTLE_BACK_SELECTION;

    const actorAbilities = actorIsParty && actor.abilitySet
      ? ABILITIES[actor.abilitySet].map((ability) => renderAbilityButton(ability, actor, selectedAbility)).join('')
      : '';

    const combatantHudMarkup = [
      {
        actor: state.party.find((ally) => ally.id === 'boss-prime'),
        visual: heroVisual,
        yOffset: 2.75,
      },
      {
        actor: state.party.find((ally) => ally.id === 'planner-mage'),
        visual: partnerVisual,
        yOffset: 2.55,
      },
      ...state.enemies.map((enemy, index) => ({
        actor: enemy,
        visual: state.enemyVisuals[index]!,
        yOffset: enemy.boss ? 4.05 : 2.7,
      })),
    ]
      .map((entry) => {
        const combatant = entry.actor;
        if (!combatant) {
          return '';
        }

        const position = projectWorldToViewport(entry.visual.group, entry.yOffset);
        if (!position) {
          return '';
        }

        const hpRatio = Math.max((combatant.hp / combatant.maxHp) * 100, 0);
        const mpRatio = combatant.kind === 'party' && combatant.maxMp
          ? Math.max((((combatant.mp ?? 0) / combatant.maxMp) * 100), 0)
          : 0;
        const isActive = actor.id === combatant.id;
        const isTargeted = combatant.kind === 'enemy' && combatant.id === selectedTargetId;
        const isTargetable =
          actorIsParty &&
          state.menuMode === 'target' &&
          !state.busy &&
          combatant.kind === 'enemy' &&
          combatant.hp > 0 &&
          combatant.alive !== false;
        const isDefeated = combatant.hp <= 0 || combatant.alive === false;
        const targetAttributes = isTargetable
          ? `data-act-two-world-target="${escapeAttribute(combatant.id)}" aria-label="${escapeAttribute(`Target ${combatant.name}, HP ${combatant.hp} of ${combatant.maxHp}`)}"`
          : '';

        return `
          <article
            class="act-two-poc__actor-hud ${isActive ? 'is-active' : ''} ${isTargetable ? 'is-targetable' : ''} ${isTargeted ? 'is-targeted' : ''} ${
              isDefeated ? 'is-defeated' : ''
            }"
            style="left:${position.left}px; top:${position.top}px;"
            ${targetAttributes}
          >
            <strong>${escapeHtml(combatant.name)}</strong>
            <span class="act-two-poc__actor-stats">HP ${combatant.hp} / ${combatant.maxHp}</span>
            <span class="act-two-poc__actor-bar ${combatant.boss ? 'act-two-poc__actor-bar--boss' : ''}"><span style="width:${hpRatio}%"></span></span>
            ${
              combatant.kind === 'party'
                ? `
                  <span class="act-two-poc__actor-stats">MP ${combatant.mp ?? 0} / ${combatant.maxMp ?? 0}</span>
                  <span class="act-two-poc__actor-bar act-two-poc__actor-bar--mp"><span style="width:${mpRatio}%"></span></span>
                `
                : ''
            }
          </article>
        `;
      })
      .join('');

    const commandPanelPosition = actorIsParty
      ? projectWorldToViewport(actor.id === 'planner-mage' ? partnerVisual.group : heroVisual.group, 0.55)
      : null;

    const commandPanelMarkup =
      actorIsParty && !battleState.busy && battleState.menuMode !== 'target' && commandPanelPosition
        ? `
          <section
            class="act-two-poc__command-panel"
            style="left:${commandPanelPosition.left}px; top:${commandPanelPosition.top}px;"
          >
            <p class="eyebrow">${escapeHtml(actor.name)}</p>
            ${
              battleState.menuMode === 'ability'
                ? `
                  <div class="menu-grid">
                    ${actorAbilities}
                    <button class="menu-button ${selectedAbility === BATTLE_BACK_SELECTION ? 'is-selected' : ''}" data-act-two-back type="button" aria-current="${selectedAbility === BATTLE_BACK_SELECTION ? 'true' : 'false'}">${escapeHtml(actTwoUi.back)}</button>
                  </div>
                `
                : `
                    <div class="menu-grid">
                      ${BATTLE_COMMANDS.map((command) => `
                        <button class="menu-button ${selectedCommand === command ? 'is-selected' : ''}" data-act-two-command="${escapeAttribute(command)}" type="button" aria-current="${selectedCommand === command ? 'true' : 'false'}">${escapeHtml(getCommandLabel(command))}</button>
                      `).join('')}
                    </div>
                  `
            }
          </section>
        `
        : '';

    const captionCopy =
      actorIsParty && !battleState.busy && battleState.menuMode === 'target'
        ? actTwoUi.targetCaption
        : actorIsParty && !battleState.busy && battleState.menuMode === 'ability'
          ? `Выберите навык для ${actor.name}.`
          : battleState.status;
    const showBattleCaption = !(actorIsParty && !battleState.busy && battleState.menuMode === 'target');

    uiEl.innerHTML = `
      <div class="act-two-poc__battle-ui">
        <div class="act-two-poc__actor-huds">${combatantHudMarkup}</div>
        ${commandPanelMarkup}
        ${
          showBattleCaption
            ? `
              <div class="act-two-poc__battle-caption">
                <strong>${escapeHtml(actorIsParty && !battleState.busy ? `${actor.name} — ${actTwoUi.turnSuffix}` : actTwoUi.battlePhase)}</strong>
                <span>${escapeHtml(captionCopy)}</span>
              </div>
            `
            : ''
        }
      </div>
    `;

    focusSelectedBattleControl();

    if (!actorIsParty && !battleState.busy) {
      battleState.busy = true;
      schedule(executeEnemyTurn, 540);
      return;
    }

    if (!actorIsParty || battleState.busy) {
      return;
    }

    uiEl.querySelectorAll<HTMLElement>('[data-act-two-command]').forEach((button) => {
      button.addEventListener('click', () => {
        const command = button.dataset.actTwoCommand;
        if (!battleState || !command) {
          return;
        }

        battleState.selectedCommand = command as BattleCommand;
        if (command === 'attack') {
          battleState.pendingAction = { kind: 'attack' };
          enterTargetingMode('Выберите цель. Используйте WASD, стик или клик по маркеру.');
          return;
        }

        if (command === 'ability') {
          battleState.pendingAction = { kind: 'ability' };
          battleState.menuMode = 'ability';
          battleState.selectedAbilityId = getAbilityMenuSelections(actor)[0] ?? BATTLE_BACK_SELECTION;
          battleState.status = 'Откройте меню навыков.';
          renderBattleUi();
          return;
        }

        battleState.pendingAction = { kind: 'guard' };
        executePartyAction();
      });
    });

    uiEl.querySelectorAll<HTMLElement>('[data-act-two-ability]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!battleState) {
          return;
        }

        const abilityId = button.dataset.actTwoAbility as AbilityId | undefined;
        if (!abilityId) {
          return;
        }

        battleState.selectedAbilityId = abilityId;
        const ability = actor.abilitySet ? ABILITIES[actor.abilitySet].find((entry) => entry.id === abilityId) : undefined;
        battleState.pendingAction = { kind: 'ability', abilityId };

        if (ability?.damage) {
          enterTargetingMode(`Выбран навык «${ability.name}». Используйте WASD, стик или клик по маркеру.`);
          return;
        }

        executePartyAction();
      });
    });

    uiEl.querySelectorAll<HTMLElement>('[data-act-two-world-target]').forEach((button) => {
      button.addEventListener('click', () => {
        executePartyAction(button.dataset.actTwoWorldTarget);
      });
    });

    uiEl.querySelector<HTMLElement>('[data-act-two-back]')?.addEventListener('click', () => {
      if (!battleState) {
        return;
      }
      if (battleState.menuMode === 'target') {
        backOutOfTargeting();
        return;
      }

      battleState.pendingAction = null;
      battleState.selectedTargetId = null;
      battleState.selectedAbilityId = BATTLE_BACK_SELECTION;
      battleState.menuMode = 'command';
      battleState.status = 'Назад к командам.';
      renderBattleUi();
    });
  };

  const beginBattle = (encounter: EncounterDefinition): void => {
    audio.playHook(getBattleStartHook(encounter));

    if (recruitedPartner) {
      loadPartnerVisual();
    }

    battleState = {
      encounter,
      party: buildPartyForBattle(),
      enemies: encounter.enemies.map((enemy) => cloneCombatant(enemy)),
      enemyVisuals: encounter.enemies.map((enemy) => createEnemyVisual(enemy.visualKind ?? 'taxi-migrant', enemy.accent)),
      turnIndex: 0,
      busy: false,
      menuMode: 'command',
      pendingAction: null,
      selectedTargetId: null,
      selectedCommand: 'attack',
      selectedAbilityId: BATTLE_BACK_SELECTION,
      status: encounter.intro,
    };

    heroVisual.group.visible = true;
    partnerVisual.group.visible = recruitedPartner;
    heroVisual.setAnimationMode?.('battle-idle');
    partnerVisual.setAnimationMode?.('battle-idle');
    heroVisual.group.position.y = 0;
    partnerVisual.group.position.y = 0;

    battleState.enemyVisuals.forEach((visual) => {
      world.add(visual.group);
    });

    const battleStartDelay = Math.max(
      heroVisual.playAnimationCue?.('battle-start') ?? 0,
      recruitedPartner ? partnerVisual.playAnimationCue?.('battle-start') ?? 0 : 0,
    );
    battleState.busy = battleStartDelay > 0;
    updateBattleVisualLayout();
    renderBattleUi();
    if (battleStartDelay > 0) {
      schedule(() => {
        if (!battleState || battleState.encounter !== encounter) {
          return;
        }

        battleState.busy = false;
        renderBattleUi();
      }, getCueDelay(battleStartDelay, 320));
    }
  };

  const startEncounterTransition = (encounter: EncounterDefinition): void => {
    updateMode('transition');
    if (encounter.id !== 'boss' && encounter.id !== 'duo' && encounter.id !== 'opening') {
      audio.playHook(AUDIO_HOOKS.actTwo.encounterTransition);
    }
    setStatus(actTwoUi.battleIncomingTitle, encounter.intro);
    schedule(() => beginBattle(encounter), 640);
  };

  const triggerEncounter = (): void => {
    const encounter = ENCOUNTERS[encounterIndex];
    if (!encounter || phase !== 'explore') {
      return;
    }

    savedFieldHeroPosition.copy(heroVisual.group.position);
    savedFieldPartnerPosition.copy(partnerVisual.group.position);
    encounterIndex += 1;
    renderDialogueSequence(
      getEncounterDialogue(encounter),
      actTwoUi.engage,
      () => startEncounterTransition(encounter),
      getEncounterStartHook(encounter),
    );
  };

  const updateField = (dt: number, time: number): void => {
    const gamepadState = input.getState();
    const keyboardMoveX =
      (pressedKeys.has('arrowright') || pressedKeys.has('d') ? 1 : 0) -
      (pressedKeys.has('arrowleft') || pressedKeys.has('a') ? 1 : 0);
    const keyboardMoveZ =
      (pressedKeys.has('arrowdown') || pressedKeys.has('s') ? 1 : 0) -
      (pressedKeys.has('arrowup') || pressedKeys.has('w') ? 1 : 0);
    const moveX = THREE.MathUtils.clamp(keyboardMoveX + gamepadState.moveX, -1, 1);
    const moveZ = THREE.MathUtils.clamp(keyboardMoveZ + gamepadState.moveY, -1, 1);
    const moving = moveX !== 0 || moveZ !== 0;

    if (moving) {
      const direction = new THREE.Vector2(moveX, moveZ).normalize();
      fieldFacing.copy(direction);
      heroVisual.group.position.x = THREE.MathUtils.clamp(heroVisual.group.position.x + direction.x * FIELD_SPEED * dt, -FIELD_X_LIMIT, FIELD_X_LIMIT);
      heroVisual.group.position.z = THREE.MathUtils.clamp(heroVisual.group.position.z + direction.y * FIELD_SPEED * dt, -FIELD_Z_LIMIT, FIELD_Z_LIMIT);
      heroVisual.group.rotation.y = Math.atan2(direction.x, direction.y);

      distanceAccumulator += FIELD_SPEED * dt;
      while (distanceAccumulator >= FIELD_STEP_DISTANCE) {
        distanceAccumulator -= FIELD_STEP_DISTANCE;
        stepsSinceEncounter += 1;
        if (stepsSinceEncounter >= STEPS_PER_ENCOUNTER) {
          triggerEncounter();
          break;
        }
      }
    }

    heroVisual.setAnimationMode?.(moving ? 'field-move' : 'field-idle');
    heroVisual.setMotion(time, moving ? moveX : 0);

    if (recruitedPartner) {
      const followTarget = getPartnerFollowPosition(heroVisual.group.position);
      partnerVisual.group.visible = true;
      partnerVisual.group.position.lerp(followTarget, moving ? 0.12 : 0.08);
      partnerVisual.group.rotation.y = heroVisual.group.rotation.y;
      partnerVisual.setAnimationMode?.(moving ? 'field-move' : 'field-idle');
      partnerVisual.setMotion(time, moving ? moveX * 0.8 : 0);
      return;
    }

    partnerVisual.setAnimationMode?.('field-idle');
    partnerVisual.setMotion(time, 0);
  };

  const updateVisuals = (time: number, dt: number): void => {
    const fieldCameraPosition = new THREE.Vector3(0, 8.6, 9.6);
    const fieldCameraTarget = new THREE.Vector3(0, 0.8, 0.45);
    const battleCameraPosition = new THREE.Vector3(0.35, 4.5, 11.2);
    const battleCameraTarget = new THREE.Vector3(0.4, 1.3, 0);

    const desiredCameraPosition = phase === 'battle' ? battleCameraPosition : fieldCameraPosition;
    const desiredCameraTarget = phase === 'battle' ? battleCameraTarget : fieldCameraTarget;

    cameraPosition.lerp(desiredCameraPosition, 0.08);
    cameraTarget.lerp(desiredCameraTarget, 0.08);
    camera.position.copy(cameraPosition);
    camera.lookAt(cameraTarget);

    if (phase === 'explore') {
      updateField(dt, time);
      return;
    }

    if (phase === 'battle') {
      heroVisual.setAnimationMode?.('battle-idle');
      partnerVisual.setAnimationMode?.('battle-idle');
      heroVisual.setMotion(time, 0.2);
      partnerVisual.setMotion(time, -0.15);
      battleState?.enemyVisuals.forEach((visual, index) => {
        const enemy = battleState?.enemies[index];
        visual.setMotion(time, enemy?.boss ? 0.35 : 0.18);
      });
      return;
    }

    heroVisual.setAnimationMode?.('field-idle');
    heroVisual.setMotion(time, 0);
    partnerVisual.setAnimationMode?.('field-idle');
    partnerVisual.setMotion(time, 0);
  };

  const tick = (now: number): void => {
    const time = now / 1000;
    const dt = Math.min((now - previousTime) / 1000, 0.05);
    previousTime = now;

    updateVisuals(time, dt);
    renderer.render(world, camera);
    frameId = window.requestAnimationFrame(tick);
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (phase === 'dialogue' && dialogueState && (key === 'enter' || event.key === ' ')) {
      uiEl.querySelector<HTMLButtonElement>('[data-act-two-dialogue-continue]')?.click();
      event.preventDefault();
      return;
    }

    if (phase === 'battle' && battleState && !battleState.busy) {
      if (['arrowup', 'arrowleft', 'w', 'a'].includes(key)) {
        if (battleState.menuMode === 'target') {
          cycleTargetSelection(-1);
        } else {
          cycleBattleMenuSelection(-1);
        }
        event.preventDefault();
        return;
      }

      if (['arrowdown', 'arrowright', 's', 'd'].includes(key)) {
        if (battleState.menuMode === 'target') {
          cycleTargetSelection(1);
        } else {
          cycleBattleMenuSelection(1);
        }
        event.preventDefault();
        return;
      }

      if (key === 'enter' || event.key === ' ') {
        if (clickSelectedBattleControl()) {
          event.preventDefault();
          return;
        }
      }

      if (key === 'escape' || key === 'backspace') {
        handleGamepadCancel();
        event.preventDefault();
        return;
      }
    }

    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
      if (phase !== 'explore') {
        event.preventDefault();
        return;
      }
      pressedKeys.add(key);
      event.preventDefault();
    }
  };

  const handleKeyUp = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (pressedKeys.has(key)) {
      pressedKeys.delete(key);
      event.preventDefault();
    }
  };

  const clearMovementInput = (): void => {
    pressedKeys.clear();
  };

  const handleGamepadConfirm = (): void => {
    if (phase === 'dialogue' && dialogueState) {
      uiEl.querySelector<HTMLButtonElement>('[data-act-two-dialogue-continue]')?.click();
      return;
    }

    const artifactButton = uiEl.querySelector<HTMLButtonElement>('[data-act-two-artifact]');
    if (artifactButton) {
      artifactButton.click();
      return;
    }

    if (phase !== 'battle' || !battleState || battleState.busy) {
      return;
    }

    clickSelectedBattleControl();
  };

  const handleGamepadCancel = (): void => {
    if (phase !== 'battle' || !battleState || battleState.busy) {
      return;
    }

    if (battleState.menuMode === 'target') {
      backOutOfTargeting();
      return;
    }

    if (battleState.menuMode === 'ability') {
      battleState.pendingAction = null;
      battleState.selectedAbilityId = BATTLE_BACK_SELECTION;
      battleState.menuMode = 'command';
      battleState.status = 'Назад к командам.';
      renderBattleUi();
    }
  };

  const unsubscribeGamepad = input.subscribe((state) => {
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

    const strongestAxis = Math.abs(state.moveX) >= Math.abs(state.moveY) ? state.moveX : state.moveY;
    const targetDirection: -1 | 0 | 1 = strongestAxis < -0.65 ? -1 : strongestAxis > 0.65 ? 1 : 0;
    if (phase === 'battle' && battleState && !battleState.busy) {
      if (targetDirection !== 0 && gamepadBattleAxisLatch === 0) {
        gamepadBattleAxisLatch = targetDirection;
        if (battleState.menuMode === 'target') {
          cycleTargetSelection(targetDirection);
        } else {
          cycleBattleMenuSelection(targetDirection);
        }
      }
      if (targetDirection === 0) {
        gamepadBattleAxisLatch = 0;
      }
    } else {
      gamepadBattleAxisLatch = targetDirection;
    }

    if (state.confirmPressed) {
      handleGamepadConfirm();
    }

    if (state.cancelPressed) {
      handleGamepadCancel();
    }
  });

  window.addEventListener('resize', resize);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('blur', clearMovementInput);

  resize();
  frameId = window.requestAnimationFrame(tick);
  renderDialogueSequence(
    getIntroDialogue(),
    actTwoUi.startWalking,
    () =>
      beginExplore(
        actTwoUi.fieldBody,
        actTwoUi.fieldTitle,
      ),
    AUDIO_HOOKS.actTwo.introDialogue,
  );

  return () => {
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('blur', clearMovementInput);
    unsubscribeGamepad();
    window.cancelAnimationFrame(frameId);
    scheduler.clear();
    clearEnemyVisuals();
    heroVisual.dispose?.();
    partnerVisual.dispose?.();
    renderer.dispose();
    target.innerHTML = '';
  };
}

function createPartyVisual(
  actorId: 'boss-prime' | 'planner-mage',
  rig: FallbackRigDefinition,
  accentColor: string,
): ActorVisual {
  return createActTwoPartyVisual({
    actorId,
    rig,
    accentColor,
  });
}

function createDormantActorVisual(): ActorVisual {
  const group = new THREE.Group();
  group.visible = false;

  return {
    group,
    setMotion: () => {},
    setAnimationMode: () => {},
    playAnimationCue: () => 0,
    dispose: () => {},
  };
}

function createEnemyVisual(actorId: EnemyVisualActorId, accentColor: string): ActorVisual {
  return createActTwoEnemyVisual(actorId, accentColor);
}

function createBattleStage(accentColor: string): THREE.Group {
  const group = new THREE.Group();
  const accent = new THREE.Color(accentColor);

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(7.2, 8.3, 0.24, 18, 1),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#24182d'),
      emissive: accent.clone().multiplyScalar(0.14),
      flatShading: true,
      roughness: 0.92,
      metalness: 0.08,
    }),
  );
  floor.position.y = -0.18;
  group.add(floor);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(6.9, 0.12, 6, 24),
    new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.42,
      flatShading: true,
      roughness: 0.54,
      metalness: 0.12,
    }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.02;
  group.add(rim);

  return group;
}

function createFieldDecor(): THREE.Group {
  return new THREE.Group();
}
