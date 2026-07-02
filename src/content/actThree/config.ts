import type { BossEncounterDefinition, RelicDefinition, SceneDefinition } from '../../types';

import { ACT_THREE_AUDIO } from './audio';

export type ActThreePhaseId =
  | 'checkpoint-one'
  | 'checkpoint-one-reward'
  | 'checkpoint-two'
  | 'checkpoint-two-reward'
  | 'shootout'
  | 'complete';

export interface ActThreeGuardDefinition {
  id: string;
  actorId: string;
  label: string;
  laneIndex: number;
  startZ: number;
  patrolLaneIndex?: number;
  patrolCycleMs?: number;
}

export interface ActThreeShootoutConfig {
  requiredHits: number;
  cycleDurationSeconds: number;
  telegraphStartSeconds: number;
  impactStartSeconds: number;
  vulnerabilityStartSeconds: number;
  vulnerabilityEndSeconds: number;
}

export type ActThreeMissionObjectiveId = 'deutsch-a1' | 'einbuergerungstest' | 'lea';

export interface ActThreeMissionPickupDefinition {
  spritePath: string;
  description: string;
  hudSlot: 'left' | 'right';
  scale: {
    x: number;
    y: number;
  };
}

export interface ActThreeMissionObjectiveDefinition {
  id: ActThreeMissionObjectiveId;
  label: string;
  targetLabel: string;
  pickup?: ActThreeMissionPickupDefinition;
}

export interface ActThreeMissionDefinition {
  title: string;
  objectives: readonly ActThreeMissionObjectiveDefinition[];
}

export const ACT_THREE_PROGRESS_LABELS = {
  checkpointOne: 'Phase 1 / 3',
  checkpointTwo: 'Phase 2 / 3',
  complete: 'Phase Complete',
} as const;

export const ACT_THREE_MISSION: ActThreeMissionDefinition = {
  title: 'МИССИЯ ПМЖ ЛЮБОЙ ЦЕНОЙ',
  objectives: [
    {
      id: 'deutsch-a1',
      label: 'Сделай вид, что Дойч А1 под контролем',
      targetLabel: 'Дойч А1',
      pickup: {
        spritePath: '/sprites/act-3/relics/a1-deutsch-zertifikat.png',
        description: 'Бумага о том, что Wasser заказан, артикли пережиты, а лицо почти не выдало внутренний Excel.',
        hudSlot: 'left',
        scale: { x: 2.15, y: 3.2 },
      },
    },
    {
      id: 'einbuergerungstest',
      label: 'Не дай тесту почувствовать власть',
      targetLabel: 'Айн Бюргер Тест',
      pickup: {
        spritePath: '/sprites/act-3/relics/einbuergerungstest-result.png',
        description: '33 вопроса позади. Тест понял: перед ним не турист, а папка с ногами.',
        hudSlot: 'right',
        scale: { x: 2.55, y: 2.55 },
      },
    },
    {
      id: 'lea',
      label: 'Убедить ЛЕА, что ты не мираж',
      targetLabel: 'ЛЕА (не принцесса)',
    },
  ],
};

export const ACT_THREE_GUARDS: readonly ActThreeGuardDefinition[] = [
  {
    id: 'checkpoint-one',
    actorId: 'a1-zertifikat',
    label: 'A1 Zertifikat, Small-Talk Sentinel',
    laneIndex: 1,
    startZ: -10,
  },
  {
    id: 'checkpoint-two',
    actorId: 'einbuergerungstest',
    label: 'Einburgerungstest, Lord of Thirty-Three Questions',
    laneIndex: 1,
    startZ: -30,
    patrolLaneIndex: 1,
    patrolCycleMs: 900,
  },
] as const;

export const ACT_THREE_DOCUMENTS_PICKUP = {
  actorId: 'complete-dossier',
  label: 'Folder of Complete Respectability',
  spawnYOffset: 0.7,
  dropOffsetZ: 0.6,
} as const;

export const ACT_THREE_SHOOTOUT: ActThreeShootoutConfig = {
  requiredHits: 3,
  cycleDurationSeconds: 2.8,
  telegraphStartSeconds: 0.4,
  impactStartSeconds: 1.7,
  vulnerabilityStartSeconds: 1,
  vulnerabilityEndSeconds: 2.2,
};

export const ACT_THREE_CHECKPOINT_REQUIRED_HITS = 2;

const ACT_THREE_BOSS_ENCOUNTER: BossEncounterDefinition = {
  id: 'lea-command-core',
  name: 'ЛЕА, хранительница терминов',
  role: 'Окно, которое сначала проверяет, существует ли окно',
  dramaticTagline: 'Бюрократический босс, который превращает ПМЖ в коридорный шутер и делает вид, что так было в письме.',
  comedicTheme: 'Термины, доказательства и административная серьёзность, которой очень нужен отпуск',
  introLine: 'Задача обновлена: подойти к окну и не дать окну сделать вид, что вы не знакомы.',
  victoryLine: 'Термин дрогнул. Папка улыбается внутренней скрепкой.',
  tauntLines: [
    'К окну подходят только по вызову, по судьбе и с лицом "я всё распечатал".',
    'Четыре ответа. Один шанс. Никакой отсебятины в графе "основание".',
    'Продвижение впечатляет. Термин всё ещё делает вид, что он занят.',
  ],
  attackPatternDescription:
    'First-person checkpoint assault with two ranged checkpoint shootouts, automatic loot rewards, and a closing LEA approval shootout.',
};

export const ACT_THREE_SCENE = {
  title: 'Berlin 2025: Permanent Residency Run',
  subtitle: 'Шутер по административному коридору',
  homage: 'Administrative corridor action parody',
  objective:
    'Пройдите берлинский коридор ПМЖ, переживите Дойч А1 и Айн Бюргер Тест, заберите бумажные трофеи и покажите ЛЕА папку без лишней лирики.',
  controls:
    'Use W/Up or left stick to advance, A/D or left stick to shift lanes, mouse or right stick to aim, and Space or R2 to fire.',
  intro:
    'Акт 3 становится коридорным шутером про ПМЖ: каждый чекпойнт спорит, каждый документ потом летит в инвентарь, а ЛЕА смотрит так, будто у прицела нет термина.',
  outro: 'ПМЖ добыт. Берлинский коридор делает вид, что так и планировал, и открывает дверь в юбилей.',
  mechanicsHighlights: ['Forward advance', 'Checkpoint shootouts', 'Auto loot rewards', 'LEA shootout'],
  enemyRoster: ['A1 Zertifikat', 'Einburgerungstest', 'LEA'],
  bossEncounter: ACT_THREE_BOSS_ENCOUNTER,
} as const;

export function createActThreeScene(relicReward: RelicDefinition): SceneDefinition {
  return {
    id: 'act-3-weekend',
    actNumber: 3,
    title: ACT_THREE_SCENE.title,
    subtitle: ACT_THREE_SCENE.subtitle,
    homage: ACT_THREE_SCENE.homage,
    visualEra: 'stealth-ops',
    runtime: 'three',
    objective: ACT_THREE_SCENE.objective,
    controls: ACT_THREE_SCENE.controls,
    intro: ACT_THREE_SCENE.intro,
    outro: ACT_THREE_SCENE.outro,
    mechanicsHighlights: [...ACT_THREE_SCENE.mechanicsHighlights],
    enemyRoster: [...ACT_THREE_SCENE.enemyRoster],
    audio: ACT_THREE_AUDIO,
    palette: {
      background: '#07151c',
      accent: '#57d7ff',
      ui: '#e7fbff',
    },
    bossEncounter: {
      ...ACT_THREE_SCENE.bossEncounter,
      tauntLines: [...ACT_THREE_SCENE.bossEncounter.tauntLines],
    },
    relicReward,
  };
}
